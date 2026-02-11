/**
 * Google Chat Service
 * Handles request verification, command parsing, authorization, and command execution
 */

import { ChatCommandStatus, ChatProvider, PeriodType } from '@prisma/client';
import prisma from '../config/database';
import allotmentService from './allotmentService';
import transactionService from './transactionService';
import {
  GoogleChatResponse,
  CommandResult,
} from '../types/googleChat';
import {
  buildErrorCard,
  buildBalanceCard,
  buildAwardCard,
  buildPublicAwardCard,
  buildPrivateBudgetCard,
  buildTransferCard,
  buildPrivateTransferBalanceCard,
  buildHelpCard,
  buildTextResponse,
  buildAwardAmountPickerCard,
  buildAwardMessagePromptCard,
} from '../utils/googleChatCards';
import { env } from '../config/env';
import { google } from 'googleapis';

// Slash command IDs (configured in Google Chat API)
const COMMAND_IDS = {
  help: 1,
  balance: 2,
  transfer: 3,
  award: 4,
};

export class GoogleChatService {
  /**
   * Extract normalized event data from various Google Chat event formats
   */
  private normalizeEvent(rawEvent: any): {
    userEmail: string | null;
    messageText: string;
    commandId: number | null;
    spaceName: string | null;
    messageId: string | null;
    mentionedUserEmail: string | null;
  } {
    // Handle nested chat structure (new format from 2024+)
    const chatData = rawEvent.chat || rawEvent;

    // Get user email - check multiple possible locations
    let userEmail: string | null = null;
    if (chatData.user?.email) {
      userEmail = chatData.user.email.toLowerCase();
    } else if (rawEvent.user?.email) {
      userEmail = rawEvent.user.email.toLowerCase();
    }

    // Get message and command info
    let messageText = '';
    let commandId: number | null = null;
    let spaceName: string | null = null;
    let messageId: string | null = null;
    let mentionedUserEmail: string | null = null;

    // Resolve the message object from whichever format Google Chat uses:
    // 1. appCommandPayload.message (slash commands without args)
    // 2. messagePayload.message (slash commands with args/mentions)
    // 3. chatData.message or rawEvent.message (old format)
    let message: any = null;

    if (chatData.appCommandPayload) {
      const payload = chatData.appCommandPayload;

      // Get command ID from appCommandMetadata
      if (payload.appCommandMetadata?.appCommandId) {
        commandId = Number(payload.appCommandMetadata.appCommandId);
      }

      message = payload.message;

      // Get space name from payload
      if (payload.space?.name) {
        spaceName = payload.space.name;
      }
    }
    // [ORIGINAL - 2026-02-05] Did not handle messagePayload format (slash commands with args/mentions)
    else if (chatData.messagePayload) {
      message = chatData.messagePayload.message;

      // Get space name from messagePayload
      if (chatData.messagePayload.space?.name) {
        spaceName = chatData.messagePayload.space.name;
      }
    }
    else if (chatData.message || rawEvent.message) {
      message = chatData.message || rawEvent.message;
    }

    // Extract data from the resolved message object
    if (message) {
      messageText = message.argumentText || message.text || '';
      messageId = message.name || null;

      // Get command ID from slashCommand field
      if (!commandId && message.slashCommand?.commandId) {
        commandId = Number(message.slashCommand.commandId);
      }

      // Extract mentioned user email from annotations
      if (message.annotations) {
        const userMention = message.annotations.find(
          (a: any) => a.type === 'USER_MENTION' && a.userMention?.user?.email
        );
        if (userMention) {
          mentionedUserEmail = userMention.userMention.user.email.toLowerCase();
        }
      }
    }

    // Get space name from various locations
    if (!spaceName) {
      spaceName = chatData.space?.name || rawEvent.space?.name || null;
    }

    console.log('[GoogleChat] Normalized: user=%s cmd=%s mention=%s', userEmail, commandId, mentionedUserEmail);

    return { userEmail, messageText, commandId, spaceName, messageId, mentionedUserEmail };
  }

  /**
   * Determine event type from the raw event
   */
  // [ORIGINAL - 2026-02-08] Did not detect CARD_CLICKED or cardClickedPayload
  private getEventType(rawEvent: any): string {
    // Old format
    if (rawEvent.type) {
      return rawEvent.type;
    }

    const chatData = rawEvent.chat || rawEvent;

    // New format — detect CARD_CLICKED before MESSAGE
    if (chatData.cardClickedPayload) {
      return 'CARD_CLICKED';
    }

    // New format - determine from structure
    if (chatData.appCommandPayload) {
      return 'MESSAGE';
    }

    if (chatData.eventType) {
      return chatData.eventType;
    }

    // Default to MESSAGE if we have message content
    if (chatData.message || chatData.messagePayload) {
      return 'MESSAGE';
    }

    return 'UNKNOWN';
  }

  /**
   * Create an audit log entry
   */
  async createAuditLog(
    userEmail: string | null,
    commandName: string | null,
    messageText: string | null,
    spaceName: string | null,
    messageId: string | null,
    status: ChatCommandStatus,
    // [ORIGINAL - 2026-02-05] eventType was hardcoded to 'MESSAGE'
    eventType: string = 'MESSAGE',
    errorMessage?: string,
    transactionId?: string
  ): Promise<string> {
    const audit = await prisma.chatCommandAudit.create({
      data: {
        provider: ChatProvider.google_chat,
        eventType,
        messageId,
        spaceName,
        userEmail,
        commandText: messageText,
        commandName,
        status,
        errorMessage,
        transactionId,
      },
    });

    return audit.id;
  }

  /**
   * Update an existing audit log entry
   */
  async updateAuditLog(
    auditId: string,
    status: ChatCommandStatus,
    errorMessage?: string,
    transactionId?: string
  ): Promise<void> {
    await prisma.chatCommandAudit.update({
      where: { id: auditId },
      data: {
        status,
        errorMessage,
        transactionId,
      },
    });
  }

  /**
   * Look up employee by email
   */
  async findEmployeeByEmail(email: string) {
    return prisma.employee.findUnique({
      where: { email: email.toLowerCase() },
      include: { account: true },
    });
  }

  /**
   * Execute the /balance command
   */
  async executeBalance(userEmail: string): Promise<CommandResult> {
    const employee = await this.findEmployeeByEmail(userEmail);

    if (!employee) {
      return {
        success: false,
        message: 'You are not registered in Guincoin. Please sign in at the web app first.',
      };
    }

    if (!employee.account) {
      return {
        success: false,
        message: 'Your account is not set up. Please sign in at the web app first.',
      };
    }

    const balance = await transactionService.getAccountBalance(employee.account.id, true);

    return {
      success: true,
      message: 'Balance retrieved successfully',
      data: {
        userName: employee.name,
        balance,
      },
    };
  }

  /**
   * Execute the /award command (managers only)
   */
  async executeAward(
    managerEmail: string,
    targetEmail: string,
    amount: number,
    description: string
  ): Promise<CommandResult> {
    const manager = await this.findEmployeeByEmail(managerEmail);

    if (!manager) {
      return { success: false, message: 'You are not registered in Guincoin.' };
    }

    if (!manager.isManager) {
      return { success: false, message: 'Only managers can use the /award command.' };
    }

    if (amount <= 0) {
      return { success: false, message: 'Award amount must be a positive number.' };
    }

    const target = await this.findEmployeeByEmail(targetEmail);

    if (!target) {
      return { success: false, message: `Employee "${targetEmail}" is not registered in Guincoin.` };
    }

    if (target.id === manager.id) {
      return { success: false, message: 'You cannot award coins to yourself.' };
    }

    try {
      const canAward = await allotmentService.canAward(manager.id, amount);
      if (!canAward) {
        const allotment = await allotmentService.getCurrentAllotment(manager.id);
        return {
          success: false,
          message: `Insufficient budget. You have ${allotment.remaining.toLocaleString()} Guincoins remaining this period.`,
        };
      }

      const transaction = await allotmentService.awardCoins(
        manager.id,
        targetEmail,
        amount,
        description || `Award from ${manager.name} via Google Chat`
      );

      const allotment = await allotmentService.getCurrentAllotment(manager.id);

      return {
        success: true,
        message: 'Award sent successfully',
        transactionId: transaction.id,
        data: {
          recipientName: target.name,
          amount,
          description: description || `Award from ${manager.name}`,
          remainingBudget: allotment.remaining,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Execute the /transfer command
   */
  async executeTransfer(
    senderEmail: string,
    targetEmail: string,
    amount: number,
    message?: string
  ): Promise<CommandResult> {
    const sender = await this.findEmployeeByEmail(senderEmail);

    if (!sender) {
      return { success: false, message: 'You are not registered in Guincoin.' };
    }

    if (!sender.account) {
      return { success: false, message: 'Your account is not set up. Please sign in at the web app first.' };
    }

    if (amount <= 0) {
      return { success: false, message: 'Transfer amount must be a positive number.' };
    }

    if (targetEmail.toLowerCase() === senderEmail.toLowerCase()) {
      return { success: false, message: 'You cannot send coins to yourself.' };
    }

    try {
      const balance = await transactionService.getAccountBalance(sender.account.id, true);
      if (balance.total < amount) {
        return {
          success: false,
          message: `Insufficient balance. You have ${balance.total.toLocaleString()} Guincoins available.`,
        };
      }

      const now = new Date();
      const limit = await prisma.peerTransferLimit.findFirst({
        where: {
          employeeId: sender.id,
          periodType: PeriodType.monthly,
          periodStart: { lte: now },
          periodEnd: { gte: now },
        },
      });

      if (limit) {
        const usedAmount = await prisma.ledgerTransaction.aggregate({
          where: {
            sourceEmployeeId: sender.id,
            transactionType: 'peer_transfer_sent',
            status: { in: ['posted', 'pending'] },
            createdAt: { gte: limit.periodStart, lte: limit.periodEnd },
          },
          _sum: { amount: true },
        });

        const used = Number(usedAmount._sum.amount || 0);
        if (used + amount > Number(limit.maxAmount)) {
          const remaining = Number(limit.maxAmount) - used;
          return {
            success: false,
            message: `Transfer limit exceeded. You have ${remaining.toLocaleString()} Guincoins remaining this month.`,
          };
        }
      }

      const recipient = await this.findEmployeeByEmail(targetEmail);

      if (!recipient) {
        const workspaceDomain = env.GOOGLE_WORKSPACE_DOMAIN;
        if (workspaceDomain && !targetEmail.toLowerCase().endsWith(`@${workspaceDomain.toLowerCase()}`)) {
          return { success: false, message: 'Recipient email must be from your organization.' };
        }

        const senderTransaction = await transactionService.createPendingTransaction(
          sender.account.id,
          'peer_transfer_sent',
          amount,
          message || `Pending transfer to ${targetEmail}`,
          sender.id
        );

        await prisma.pendingTransfer.create({
          data: {
            senderEmployeeId: sender.id,
            recipientEmail: targetEmail.toLowerCase(),
            amount,
            message,
            senderTransactionId: senderTransaction.id,
          },
        });

        // Get updated balance after pending transfer
        const pendingBalance = await transactionService.getAccountBalance(sender.account.id, true);

        return {
          success: true,
          message: 'Transfer pending',
          transactionId: senderTransaction.id,
          data: { recipientName: targetEmail, amount, message, isPending: true, remainingBalance: pendingBalance.total },
        };
      }

      if (!recipient.account) {
        return { success: false, message: `${recipient.name}'s account is not set up yet.` };
      }

      const result = await prisma.$transaction(async (tx) => {
        const sentTransaction = await tx.ledgerTransaction.create({
          data: {
            accountId: sender.account!.id,
            transactionType: 'peer_transfer_sent',
            amount,
            description: message || `Transfer to ${recipient.name} via Google Chat`,
            status: 'pending',
            sourceEmployeeId: sender.id,
          },
        });

        const receivedTransaction = await tx.ledgerTransaction.create({
          data: {
            accountId: recipient.account!.id,
            transactionType: 'peer_transfer_received',
            amount,
            description: message || `Transfer from ${sender.name} via Google Chat`,
            status: 'pending',
            sourceEmployeeId: sender.id,
            targetEmployeeId: recipient.id,
          },
        });

        await transactionService.postTransaction(sentTransaction.id, tx);
        await transactionService.postTransaction(receivedTransaction.id, tx);

        return sentTransaction;
      });

      // Get updated balance after transfer
      const updatedBalance = await transactionService.getAccountBalance(sender.account.id, true);

      return {
        success: true,
        message: 'Transfer completed successfully',
        transactionId: result.id,
        data: { recipientName: recipient.name, amount, message, isPending: false, remainingBalance: updatedBalance.total },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Parse transfer/award arguments from message text
   * When mentionedEmail is provided (from annotations), uses it as the target
   * and only parses amount + message from text.
   * Otherwise falls back to parsing target from text (email format required).
   */
  // [ORIGINAL - 2026-02-05] Only handled simple @user amount message regex, no annotation support
  private parseArguments(text: string, mentionedEmail: string | null): { target: string; amount: number; message: string } | null {
    // Remove the command prefix if present
    const cleaned = text.replace(/^\/?(?:transfer|award)\s*/i, '').trim();

    if (!cleaned && !mentionedEmail) {
      return null;
    }

    // If we have a mentioned email from annotations, use it as the target
    // and parse the remaining text for just amount + message
    if (mentionedEmail) {
      // Strip everything before the first number (the @mention text)
      const amountMatch = cleaned.match(/(\d+(?:\.\d{1,2})?)\s*(.*)?$/);
      if (amountMatch) {
        return {
          target: mentionedEmail,
          amount: parseFloat(amountMatch[1]),
          message: amountMatch[2]?.trim() || '',
        };
      }
      // Mentioned user but no amount provided
      return null;
    }

    // No annotation — parse target from text (must be email, no spaces)
    // Strip Google Chat mention wrapper and mailto: links
    const normalized = cleaned
      .replace(/<mailto:([^|>]+)\|[^>]*>/g, '$1')
      .replace(/<([^>]+)>/g, '$1');

    // Match: @user or user (email), then amount, then optional message
    const match = normalized.match(/^@?(\S+)\s+(\d+(?:\.\d{1,2})?)\s*(.*)?$/);

    if (!match) {
      console.warn('[GoogleChat] parseArguments failed for:', normalized);
      return null;
    }

    return {
      target: match[1],
      amount: parseFloat(match[2]),
      message: match[3]?.trim() || '',
    };
  }

  /**
   * Check if DM sending is available (service account configured)
   */
  private isDmAvailable(): boolean {
    return !!env.GOOGLE_CHAT_SERVICE_ACCOUNT_KEY;
  }

  /**
   * Send a direct message to a user via Google Chat API
   * Requires GOOGLE_CHAT_SERVICE_ACCOUNT_KEY env var (service account JSON)
   */
  async sendDirectMessage(userEmail: string, message: GoogleChatResponse): Promise<void> {
    if (!env.GOOGLE_CHAT_SERVICE_ACCOUNT_KEY) {
      console.warn('[GoogleChat] DM feature disabled — GOOGLE_CHAT_SERVICE_ACCOUNT_KEY not set');
      return;
    }

    try {
      const credentials = JSON.parse(env.GOOGLE_CHAT_SERVICE_ACCOUNT_KEY);

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/chat.bot'],
      });

      const chat = google.chat({ version: 'v1', auth });

      // Find existing DM space with the user
      let spaceName: string | null = null;

      try {
        const dmSpace = await chat.spaces.findDirectMessage({ name: `users/${userEmail}` });
        spaceName = dmSpace.data.name || null;
      } catch {
        // DM space doesn't exist yet — create one via spaces.setup
        try {
          const setupResponse = await chat.spaces.setup({
            requestBody: {
              space: { spaceType: 'DIRECT_MESSAGE' },
              memberships: [{ member: { name: `users/${userEmail}`, type: 'HUMAN' } }],
            },
          });
          spaceName = setupResponse.data.name || null;
        } catch (setupError) {
          console.error('[GoogleChat] Failed to create DM space for %s:', userEmail, setupError);
          return;
        }
      }

      if (!spaceName) {
        console.error('[GoogleChat] No DM space name resolved for %s', userEmail);
        return;
      }

      // Send the message card
      await chat.spaces.messages.create({
        parent: spaceName,
        requestBody: message,
      });

      console.log('[GoogleChat] Budget DM sent to %s', userEmail);
    } catch (error) {
      // DM failure is non-fatal — log and continue
      console.error('[GoogleChat] Failed to send DM to %s:', userEmail, error);
    }
  }

  /**
   * Post a message to a Google Chat space via the API
   * Used to post public award cards back to the original space after DM wizard completes
   */
  async postMessageToSpace(spaceName: string, message: GoogleChatResponse): Promise<void> {
    if (!env.GOOGLE_CHAT_SERVICE_ACCOUNT_KEY) {
      console.warn('[GoogleChat] Cannot post to space — GOOGLE_CHAT_SERVICE_ACCOUNT_KEY not set');
      return;
    }

    try {
      const credentials = JSON.parse(env.GOOGLE_CHAT_SERVICE_ACCOUNT_KEY);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/chat.bot'],
      });
      const chat = google.chat({ version: 'v1', auth });

      await chat.spaces.messages.create({
        parent: spaceName,
        requestBody: message,
      });

      console.log('[GoogleChat] Public card posted to space %s', spaceName);
    } catch (error) {
      // Non-fatal — log and continue
      console.error('[GoogleChat] Failed to post to space %s:', spaceName, error);
    }
  }

  /**
   * Handle CARD_CLICKED events from the award wizard flow
   */
  private async handleCardClicked(rawEvent: any): Promise<GoogleChatResponse> {
    // Extract action info from various possible locations
    const chatData = rawEvent.chat || rawEvent;
    const clickedPayload = chatData.cardClickedPayload || rawEvent;
    const action = clickedPayload?.action || clickedPayload?.message?.action || rawEvent.action;
    const common = rawEvent.common || chatData.common || {};

    const functionName = action?.actionMethodName || action?.function || common?.invokedFunction || '';
    const paramsList: { key: string; value: string }[] = action?.parameters || [];

    // Convert parameter array to key-value map
    const params: Record<string, string> = {};
    for (const p of paramsList) {
      params[p.key] = p.value;
    }

    // Get user email for audit logging
    let userEmail: string | null = null;
    if (chatData.user?.email) {
      userEmail = chatData.user.email.toLowerCase();
    } else if (rawEvent.user?.email) {
      userEmail = rawEvent.user.email.toLowerCase();
    }

    console.log('[GoogleChat] CARD_CLICKED: function=%s user=%s params=%j', functionName, userEmail, params);

    // Audit log the click event
    const auditId = await this.createAuditLog(
      userEmail,
      `card_click:${functionName}`,
      JSON.stringify(params),
      null,
      null,
      ChatCommandStatus.received,
      'CARD_CLICKED'
    );

    try {
      // [ORIGINAL - 2026-02-10] Had award_select_amount (public 2-step wizard) and award_confirm handlers.
      // Replaced with award_dm_execute: single-click award from private DM picker card.
      if (functionName === 'award_dm_execute') {
        // Single-click award: execute immediately from DM preset button
        const { targetEmail, targetName, amount, presetTitle, spaceName } = params;
        if (!targetEmail || !targetName || !amount || !presetTitle) {
          await this.updateAuditLog(auditId, ChatCommandStatus.failed, 'Missing wizard parameters');
          return {
            ...buildErrorCard('Wizard Error', 'Missing parameters. Please start over with /award.'),
            actionResponse: { type: 'UPDATE_MESSAGE' },
          };
        }

        if (!userEmail) {
          await this.updateAuditLog(auditId, ChatCommandStatus.failed, 'Unknown user');
          return {
            ...buildErrorCard('Error', 'Unable to identify you. Please try again.'),
            actionResponse: { type: 'UPDATE_MESSAGE' },
          };
        }

        await this.updateAuditLog(auditId, ChatCommandStatus.authorized);
        const result = await this.executeAward(
          userEmail,
          targetEmail,
          parseFloat(amount),
          presetTitle
        );

        if (result.success) {
          await this.updateAuditLog(auditId, ChatCommandStatus.succeeded, undefined, result.transactionId);

          const recipientName = result.data?.recipientName as string;
          const awardAmount = result.data?.amount as number;
          const description = result.data?.description as string;
          const remainingBudget = result.data?.remainingBudget as number;

          // Post public award card to the original space (fire-and-forget)
          if (spaceName) {
            this.postMessageToSpace(spaceName, buildPublicAwardCard(recipientName, awardAmount, description));
          }

          // Update the DM card with budget info for the manager
          return {
            ...buildPrivateBudgetCard(remainingBudget, recipientName, awardAmount),
            actionResponse: { type: 'UPDATE_MESSAGE' },
          };
        } else {
          await this.updateAuditLog(auditId, ChatCommandStatus.failed, result.message);
          return {
            ...buildErrorCard('Award Error', result.message),
            actionResponse: { type: 'UPDATE_MESSAGE' },
          };
        }
      }

      if (functionName === 'award_select_amount') {
        // Legacy handler — kept for any in-flight old-format cards
        await this.updateAuditLog(auditId, ChatCommandStatus.failed, 'Legacy wizard — please use /award again');
        return {
          ...buildErrorCard('Please Try Again', 'This award card has expired. Please use /award again.'),
          actionResponse: { type: 'UPDATE_MESSAGE' },
        };
      }

      if (functionName === 'award_confirm') {
        // Legacy handler — kept for any in-flight old-format cards
        await this.updateAuditLog(auditId, ChatCommandStatus.failed, 'Legacy wizard — please use /award again');
        return {
          ...buildErrorCard('Please Try Again', 'This award card has expired. Please use /award again.'),
          actionResponse: { type: 'UPDATE_MESSAGE' },
        };
      }

      // Unknown action
      await this.updateAuditLog(auditId, ChatCommandStatus.failed, `Unknown action: ${functionName}`);
      return {
        ...buildErrorCard('Unknown Action', 'Unrecognized card action.'),
        actionResponse: { type: 'UPDATE_MESSAGE' },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('[GoogleChat] CARD_CLICKED error:', errorMessage);
      await this.updateAuditLog(auditId, ChatCommandStatus.failed, errorMessage);
      return {
        ...buildErrorCard('Error', errorMessage),
        actionResponse: { type: 'UPDATE_MESSAGE' },
      };
    }
  }

  /**
   * Handle incoming Google Chat webhook event
   */
  async handleEvent(rawEvent: any): Promise<GoogleChatResponse> {
    // Determine actual event type for audit logging
    const eventType = this.getEventType(rawEvent);

    // Delegate CARD_CLICKED events to the wizard handler
    if (eventType === 'CARD_CLICKED') {
      return this.handleCardClicked(rawEvent);
    }

    // Normalize the event data
    const { userEmail, messageText, commandId, spaceName, messageId, mentionedUserEmail } = this.normalizeEvent(rawEvent);

    // Check for user email
    if (!userEmail) {
      console.error('[GoogleChat] No user email found in event');
      return { text: 'Unable to identify user.' };
    }

    // Determine command from ID or text
    let commandName: string | null = null;

    if (commandId === COMMAND_IDS.help) {
      commandName = 'help';
    } else if (commandId === COMMAND_IDS.balance) {
      commandName = 'balance';
    } else if (commandId === COMMAND_IDS.transfer) {
      commandName = 'transfer';
    } else if (commandId === COMMAND_IDS.award) {
      commandName = 'award';
    } else {
      // Try to parse from text
      const lower = messageText.toLowerCase().trim();
      if (lower.startsWith('/help') || lower === 'help') {
        commandName = 'help';
      } else if (lower.startsWith('/balance') || lower === 'balance') {
        commandName = 'balance';
      } else if (lower.startsWith('/transfer') || lower.startsWith('transfer')) {
        commandName = 'transfer';
      } else if (lower.startsWith('/award') || lower.startsWith('award')) {
        commandName = 'award';
      }
    }

    console.log('[GoogleChat] %s command=%s user=%s', eventType, commandName || 'help', userEmail);

    try {
      // [ORIGINAL - 2026-02-06] Help/unknown commands returned before audit log — audit tab showed no data
      // Create audit log for ALL commands (including help)
      const auditId = await this.createAuditLog(
        userEmail,
        commandName || 'help',
        messageText,
        spaceName,
        messageId,
        ChatCommandStatus.received,
        eventType
      );

      // Handle help command
      if (commandName === 'help' || !commandName) {
        await this.updateAuditLog(auditId, ChatCommandStatus.succeeded);
        return buildHelpCard(false);
      }

      if (commandName === 'balance') {
        await this.updateAuditLog(auditId, ChatCommandStatus.authorized);
        const result = await this.executeBalance(userEmail);

        if (result.success) {
          await this.updateAuditLog(auditId, ChatCommandStatus.succeeded);
          return buildBalanceCard(
            result.data?.userName as string,
            result.data?.balance as { posted: number; pending: number; total: number }
          );
        } else {
          await this.updateAuditLog(auditId, ChatCommandStatus.failed, result.message);
          return buildErrorCard('Balance Error', result.message);
        }
      }

      if (commandName === 'transfer') {
        const args = this.parseArguments(messageText, mentionedUserEmail);

        if (!args) {
          await this.updateAuditLog(auditId, ChatCommandStatus.failed, 'Invalid arguments');
          return buildErrorCard(
            'Transfer Usage',
            'Type the command with a recipient, amount, and optional message.',
            'Example: /transfer @Landon 50 Great work! — or — /transfer user@guinco.com 50 Thanks!'
          );
        }

        await this.updateAuditLog(auditId, ChatCommandStatus.authorized);
        const result = await this.executeTransfer(userEmail, args.target, args.amount, args.message);

        if (result.success) {
          await this.updateAuditLog(auditId, ChatCommandStatus.succeeded, undefined, result.transactionId);

          const recipientName = result.data?.recipientName as string;
          const transferAmount = result.data?.amount as number;
          const transferMessage = result.data?.message as string | undefined;
          const isPending = result.data?.isPending as boolean;
          const remainingBalance = result.data?.remainingBalance as number;

          // DM sender their updated balance privately (same pattern as /award)
          if (this.isDmAvailable()) {
            this.sendDirectMessage(
              userEmail,
              buildPrivateTransferBalanceCard(remainingBalance, recipientName, transferAmount)
            );
          }

          return buildTransferCard(recipientName, transferAmount, transferMessage, isPending);
        } else {
          await this.updateAuditLog(auditId, ChatCommandStatus.failed, result.message);
          return buildErrorCard('Transfer Error', result.message);
        }
      }

      if (commandName === 'award') {
        const employee = await this.findEmployeeByEmail(userEmail);

        if (!employee?.isManager) {
          await this.updateAuditLog(auditId, ChatCommandStatus.rejected, 'Not a manager');
          return buildErrorCard('Unauthorized', 'Only managers can use the /award command.');
        }

        const args = this.parseArguments(messageText, mentionedUserEmail);

        // [ORIGINAL - 2026-02-08] Missing args returned error card. Now launches preset wizard when user is mentioned but no amount.
        // [ORIGINAL - 2026-02-10] Returned picker card publicly — other users could see and click buttons.
        // Now sends picker as DM to the manager so only they can interact with it.
        if (!args) {
          // If we have a mentioned user, launch the wizard via DM
          if (mentionedUserEmail) {
            const activePresets = await prisma.awardPreset.findMany({
              where: { isActive: true },
              orderBy: { displayOrder: 'asc' },
            });

            if (activePresets.length > 0 && this.isDmAvailable()) {
              // Resolve the mentioned user's display name
              const target = await this.findEmployeeByEmail(mentionedUserEmail);
              const targetName = target?.name || mentionedUserEmail;

              // Send the picker card privately to the manager via DM
              this.sendDirectMessage(
                userEmail,
                buildAwardAmountPickerCard(
                  mentionedUserEmail,
                  targetName,
                  activePresets.map(p => ({ title: p.title, amount: Number(p.amount) })),
                  spaceName
                )
              );

              await this.updateAuditLog(auditId, ChatCommandStatus.succeeded);
              return buildTextResponse('Check your DMs for the award options.');
            }
          }

          // Fallback: no presets, no mentioned user, or DM unavailable — show usage error
          await this.updateAuditLog(auditId, ChatCommandStatus.failed, 'Invalid arguments');
          return buildErrorCard(
            'Award Usage',
            'Type the command with a recipient, amount, and optional message.',
            'Example: /award @Landon 25 Great presentation! — or — /award user@guinco.com 25 Nice job!'
          );
        }

        await this.updateAuditLog(auditId, ChatCommandStatus.authorized);
        const result = await this.executeAward(userEmail, args.target, args.amount, args.message);

        if (result.success) {
          await this.updateAuditLog(auditId, ChatCommandStatus.succeeded, undefined, result.transactionId);

          const recipientName = result.data?.recipientName as string;
          const awardAmount = result.data?.amount as number;
          const description = result.data?.description as string;
          const remainingBudget = result.data?.remainingBudget as number;

          // [ORIGINAL - 2026-02-06] Returned buildAwardCard (with budget visible to all)
          // Now: public card (no budget) + DM budget to manager, with fallback
          if (this.isDmAvailable()) {
            // Fire-and-forget DM with budget info to the manager
            this.sendDirectMessage(
              userEmail,
              buildPrivateBudgetCard(remainingBudget, recipientName, awardAmount)
            );

            // Return public card (no budget) visible to everyone
            return buildPublicAwardCard(recipientName, awardAmount, description);
          }

          // Fallback: DM not configured — include budget in public card (original behavior)
          return buildAwardCard(recipientName, awardAmount, description, remainingBudget);
        } else {
          await this.updateAuditLog(auditId, ChatCommandStatus.failed, result.message);
          return buildErrorCard('Award Error', result.message);
        }
      }

      // Unknown command - return help (no DB needed)
      return buildHelpCard(false);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('[GoogleChat] Error:', errorMessage);
      // Return simple error response (audit log may not exist in debug mode)
      return { text: `Error: ${errorMessage}` };
    }
  }
}

export default new GoogleChatService();
