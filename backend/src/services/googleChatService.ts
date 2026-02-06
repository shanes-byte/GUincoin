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
  buildTransferCard,
  buildHelpCard,
  buildTextResponse,
} from '../utils/googleChatCards';
import { env } from '../config/env';

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

    // Check for appCommandPayload (slash command via newest format 2024+)
    if (chatData.appCommandPayload) {
      const payload = chatData.appCommandPayload;

      // Get command ID from appCommandMetadata (new location)
      if (payload.appCommandMetadata?.appCommandId) {
        // [ORIGINAL - 2026-02-05] commandId = payload.appCommandMetadata.appCommandId;
        commandId = Number(payload.appCommandMetadata.appCommandId);
      }

      // Get message content if present
      const message = payload.message;
      if (message) {
        messageText = message.argumentText || message.text || '';
        messageId = message.name || null;

        // Also check for command ID in message.slashCommand (backup)
        if (!commandId && message.slashCommand?.commandId) {
          // [ORIGINAL - 2026-02-05] commandId = message.slashCommand.commandId;
          commandId = Number(message.slashCommand.commandId);
        }
      }

      // Get space name from payload
      if (payload.space?.name) {
        spaceName = payload.space.name;
      }
    }
    // Check for direct message (old format)
    else if (chatData.message || rawEvent.message) {
      const message = chatData.message || rawEvent.message;
      messageText = message.argumentText || message.text || '';
      messageId = message.name || null;

      if (message.slashCommand?.commandId) {
        // [ORIGINAL - 2026-02-05] commandId = message.slashCommand.commandId;
        commandId = Number(message.slashCommand.commandId);
      }
    }

    // Get space name from various locations
    if (!spaceName) {
      spaceName = chatData.space?.name || rawEvent.space?.name || null;
    }

    console.log('[GoogleChat] Normalized event:', { userEmail, messageText, commandId, spaceName });

    return { userEmail, messageText, commandId, spaceName, messageId };
  }

  /**
   * Determine event type from the raw event
   */
  private getEventType(rawEvent: any): string {
    // Old format
    if (rawEvent.type) {
      return rawEvent.type;
    }

    const chatData = rawEvent.chat || rawEvent;

    // New format - determine from structure
    if (chatData.appCommandPayload) {
      return 'MESSAGE';
    }

    if (chatData.eventType) {
      return chatData.eventType;
    }

    // Default to MESSAGE if we have message content
    if (chatData.message) {
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

        return {
          success: true,
          message: 'Transfer pending',
          transactionId: senderTransaction.id,
          data: { recipientName: targetEmail, amount, message, isPending: true },
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

      return {
        success: true,
        message: 'Transfer completed successfully',
        transactionId: result.id,
        data: { recipientName: recipient.name, amount, message, isPending: false },
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
   */
  private parseArguments(text: string): { target: string; amount: number; message: string } | null {
    // Remove the command prefix if present
    const cleaned = text.replace(/^\/?(?:transfer|award)\s*/i, '').trim();

    // Match: @user or user, then amount, then optional message
    const match = cleaned.match(/^@?(\S+)\s+(\d+(?:\.\d{1,2})?)\s*(.*)?$/);

    if (!match) {
      return null;
    }

    return {
      target: match[1],
      amount: parseFloat(match[2]),
      message: match[3]?.trim() || '',
    };
  }

  /**
   * Handle incoming Google Chat webhook event
   */
  async handleEvent(rawEvent: any): Promise<GoogleChatResponse> {
    console.log('[GoogleChat] handleEvent START');
    console.log('[GoogleChat] Raw event:', JSON.stringify(rawEvent, null, 2).substring(0, 500));

    // Determine actual event type for audit logging
    const eventType = this.getEventType(rawEvent);

    // Normalize the event data
    console.log('[GoogleChat] Normalizing event...');
    const { userEmail, messageText, commandId, spaceName, messageId } = this.normalizeEvent(rawEvent);

    console.log('[GoogleChat] Normalized:', { userEmail, messageText, commandId, spaceName });

    // Check for user email
    if (!userEmail) {
      console.error('[GoogleChat] No user email found');
      return { text: 'Unable to identify user.' };
    }

    console.log('[GoogleChat] Processing command for user:', userEmail);

    // Determine command from ID or text
    let commandName: string | null = null;

    console.log('[GoogleChat] Determining command from ID:', commandId);

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

    console.log('[GoogleChat] Command determined:', commandName);

    // [ORIGINAL - 2026-02-05] const debugSkipDB = true;
    const debugSkipDB = false;

    try {
      // Handle commands - help first (most common for testing)
      if (commandName === 'help' || !commandName) {
        console.log('[GoogleChat] Handling HELP command');

        // Return immediately without any database calls for debugging
        if (debugSkipDB) {
          console.log('[GoogleChat] DEBUG: Returning simple help response (no DB)');
          const response = {
            text: `*Guincoin Commands*\n\n` +
              `/balance - Check your coin balance\n` +
              `/transfer @user amount message - Send coins\n` +
              `/help - Show this help\n` +
              `/award @user amount message - Award coins (managers only)\n` +
              `\nBot is working! User: ${userEmail}`,
          };
          console.log('[GoogleChat] DEBUG: Response prepared:', JSON.stringify(response));
          return response;
        }

        // Create audit log
        const auditId = await this.createAuditLog(
          userEmail,
          commandName,
          messageText,
          spaceName,
          messageId,
          ChatCommandStatus.received,
          eventType
        );

        await this.updateAuditLog(auditId, ChatCommandStatus.succeeded);
        const employee = await this.findEmployeeByEmail(userEmail);
        console.log('[GoogleChat] Returning help response for:', userEmail);

        // Return the card response - use buildHelpCard
        return buildHelpCard(employee?.isManager ?? false);
      }

      // Create audit log for non-help commands
      const auditId = await this.createAuditLog(
        userEmail,
        commandName,
        messageText,
        spaceName,
        messageId,
        ChatCommandStatus.received,
        eventType
      );

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
        const args = this.parseArguments(messageText);

        if (!args) {
          await this.updateAuditLog(auditId, ChatCommandStatus.failed, 'Invalid arguments');
          return buildErrorCard('Invalid Command', 'Usage: /transfer @user amount [message]');
        }

        await this.updateAuditLog(auditId, ChatCommandStatus.authorized);
        const result = await this.executeTransfer(userEmail, args.target, args.amount, args.message);

        if (result.success) {
          await this.updateAuditLog(auditId, ChatCommandStatus.succeeded, undefined, result.transactionId);
          return buildTransferCard(
            result.data?.recipientName as string,
            result.data?.amount as number,
            result.data?.message as string | undefined,
            result.data?.isPending as boolean
          );
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

        const args = this.parseArguments(messageText);

        if (!args) {
          await this.updateAuditLog(auditId, ChatCommandStatus.failed, 'Invalid arguments');
          return buildErrorCard('Invalid Command', 'Usage: /award @user amount [message]');
        }

        await this.updateAuditLog(auditId, ChatCommandStatus.authorized);
        const result = await this.executeAward(userEmail, args.target, args.amount, args.message);

        if (result.success) {
          await this.updateAuditLog(auditId, ChatCommandStatus.succeeded, undefined, result.transactionId);
          return buildAwardCard(
            result.data?.recipientName as string,
            result.data?.amount as number,
            result.data?.description as string,
            result.data?.remainingBudget as number
          );
        } else {
          await this.updateAuditLog(auditId, ChatCommandStatus.failed, result.message);
          return buildErrorCard('Award Error', result.message);
        }
      }

      // Unknown command - return help
      console.log('[GoogleChat] Unknown command, returning help');
      if (debugSkipDB) {
        return { text: 'Unknown command. Use /help to see available commands.' };
      }
      const employee = await this.findEmployeeByEmail(userEmail);
      return buildHelpCard(employee?.isManager ?? false);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('[GoogleChat] Error:', errorMessage);
      // Return simple error response (audit log may not exist in debug mode)
      return { text: `Error: ${errorMessage}` };
    }
  }
}

export default new GoogleChatService();
