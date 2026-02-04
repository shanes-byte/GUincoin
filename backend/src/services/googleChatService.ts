/**
 * Google Chat Service
 * Handles request verification, command parsing, authorization, and command execution
 */

import { ChatCommandStatus, ChatProvider, PeriodType } from '@prisma/client';
import prisma from '../config/database';
import allotmentService from './allotmentService';
import transactionService from './transactionService';
import {
  GoogleChatEvent,
  GoogleChatResponse,
  ParsedCommand,
  CommandName,
  CommandResult,
} from '../types/googleChat';
import {
  buildSuccessCard,
  buildErrorCard,
  buildBalanceCard,
  buildAwardCard,
  buildTransferCard,
  buildHelpCard,
  buildWelcomeCard,
  buildTextResponse,
} from '../utils/googleChatCards';
import { env } from '../config/env';

// Command patterns for parsing
const COMMAND_PATTERNS: Record<CommandName, RegExp> = {
  award: /^\/award\s+(?:@?(\S+))\s+(\d+(?:\.\d{1,2})?)\s*(.*)?$/i,
  balance: /^\/balance\s*$/i,
  transfer: /^\/transfer\s+(?:@?(\S+))\s+(\d+(?:\.\d{1,2})?)\s*(.*)?$/i,
  help: /^\/help\s*$/i,
};

export class GoogleChatService {
  /**
   * Verify the request is from Google Chat
   *
   * Note: Google Chat no longer provides a simple verification token in the UI.
   * Instead, they use Service Account authentication with Bearer tokens.
   *
   * For now, we perform basic validation that the request has the expected
   * Google Chat event structure. The webhook URL itself is private and only
   * known to Google, providing a layer of security.
   *
   * For additional security, you could implement Bearer token (JWT) verification
   * using Google's public keys.
   */
  verifyRequest(event: GoogleChatEvent): boolean {
    // If a verification token is configured (legacy), check it
    const verificationToken = env.GOOGLE_CHAT_VERIFICATION_TOKEN;
    if (verificationToken && event.token) {
      return event.token === verificationToken;
    }

    // Basic structural validation - ensure this looks like a Google Chat event
    if (!event.type) {
      console.error('[GoogleChat] Invalid event: missing type');
      return false;
    }

    const validEventTypes = ['MESSAGE', 'ADDED_TO_SPACE', 'REMOVED_FROM_SPACE', 'CARD_CLICKED'];
    if (!validEventTypes.includes(event.type)) {
      console.error('[GoogleChat] Invalid event type:', event.type);
      return false;
    }

    // For MESSAGE events, verify we have user info
    if (event.type === 'MESSAGE' && !event.user) {
      console.error('[GoogleChat] Invalid MESSAGE event: missing user');
      return false;
    }

    return true;
  }

  /**
   * Parse the command from the event message
   */
  parseCommand(event: GoogleChatEvent): ParsedCommand | null {
    const messageText = event.message?.argumentText?.trim() || event.message?.text?.trim();

    if (!messageText) {
      return null;
    }

    // Try to match each command pattern
    for (const [command, pattern] of Object.entries(COMMAND_PATTERNS)) {
      const match = messageText.match(pattern);
      if (match) {
        const parsed: ParsedCommand = {
          command: command as CommandName,
          rawText: messageText,
        };

        if (command === 'award' || command === 'transfer') {
          // Extract target from @mention or direct text
          let targetEmail = match[1];

          // Check if there's a user mention annotation
          const userMention = event.message?.annotations?.find(
            (a) => a.type === 'USER_MENTION' && a.userMention?.user?.email
          );

          if (userMention?.userMention?.user?.email) {
            targetEmail = userMention.userMention.user.email;
          } else if (targetEmail && !targetEmail.includes('@')) {
            // If it's just a name without @, try to construct email
            // This is a fallback - Google Chat should provide the email via annotation
            targetEmail = targetEmail.toLowerCase();
          }

          parsed.targetEmail = targetEmail?.toLowerCase();
          parsed.targetMention = match[1];
          parsed.amount = parseFloat(match[2]);
          parsed.message = match[3]?.trim() || undefined;
        }

        return parsed;
      }
    }

    return null;
  }

  /**
   * Create an audit log entry
   */
  async createAuditLog(
    event: GoogleChatEvent,
    command: ParsedCommand | null,
    status: ChatCommandStatus,
    errorMessage?: string,
    transactionId?: string
  ): Promise<string> {
    const audit = await prisma.chatCommandAudit.create({
      data: {
        provider: ChatProvider.google_chat,
        eventType: event.type,
        messageId: event.message?.name,
        spaceName: event.space?.name,
        threadName: event.message?.thread?.name,
        userEmail: event.user?.email?.toLowerCase(),
        commandText: command?.rawText || event.message?.text,
        commandName: command?.command,
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
   * Check if an employee is a manager
   */
  async isManager(employeeId: string): Promise<boolean> {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { isManager: true },
    });
    return employee?.isManager ?? false;
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
    // Find the manager
    const manager = await this.findEmployeeByEmail(managerEmail);

    if (!manager) {
      return {
        success: false,
        message: 'You are not registered in Guincoin.',
      };
    }

    if (!manager.isManager) {
      return {
        success: false,
        message: 'Only managers can use the /award command.',
      };
    }

    // Validate amount
    if (amount <= 0) {
      return {
        success: false,
        message: 'Award amount must be a positive number.',
      };
    }

    // Check target exists
    const target = await this.findEmployeeByEmail(targetEmail);

    if (!target) {
      return {
        success: false,
        message: `Employee "${targetEmail}" is not registered in Guincoin.`,
      };
    }

    // Check if awarding to self
    if (target.id === manager.id) {
      return {
        success: false,
        message: 'You cannot award coins to yourself.',
      };
    }

    try {
      // Check allotment before awarding
      const canAward = await allotmentService.canAward(manager.id, amount);
      if (!canAward) {
        const allotment = await allotmentService.getCurrentAllotment(manager.id);
        return {
          success: false,
          message: `Insufficient budget. You have ${allotment.remaining.toLocaleString()} Guincoins remaining this period.`,
        };
      }

      // Execute the award
      const transaction = await allotmentService.awardCoins(
        manager.id,
        targetEmail,
        amount,
        description || `Award from ${manager.name} via Google Chat`
      );

      // Get updated allotment
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        message: errorMessage,
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
    // Find sender
    const sender = await this.findEmployeeByEmail(senderEmail);

    if (!sender) {
      return {
        success: false,
        message: 'You are not registered in Guincoin.',
      };
    }

    if (!sender.account) {
      return {
        success: false,
        message: 'Your account is not set up. Please sign in at the web app first.',
      };
    }

    // Validate amount
    if (amount <= 0) {
      return {
        success: false,
        message: 'Transfer amount must be a positive number.',
      };
    }

    // Check if transferring to self
    if (targetEmail.toLowerCase() === senderEmail.toLowerCase()) {
      return {
        success: false,
        message: 'You cannot send coins to yourself.',
      };
    }

    try {
      // Check balance
      const balance = await transactionService.getAccountBalance(sender.account.id, true);
      if (balance.total < amount) {
        return {
          success: false,
          message: `Insufficient balance. You have ${balance.total.toLocaleString()} Guincoins available.`,
        };
      }

      // Check transfer limits
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

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
            createdAt: {
              gte: limit.periodStart,
              lte: limit.periodEnd,
            },
          },
          _sum: { amount: true },
        });

        const used = Number(usedAmount._sum.amount || 0);
        if (used + amount > Number(limit.maxAmount)) {
          const remaining = Number(limit.maxAmount) - used;
          return {
            success: false,
            message: `Transfer limit exceeded. You have ${remaining.toLocaleString()} Guincoins remaining in your transfer limit this month.`,
          };
        }
      }

      // Find recipient
      const recipient = await this.findEmployeeByEmail(targetEmail);

      if (!recipient) {
        // Create pending transfer for unknown recipient
        const workspaceDomain = env.GOOGLE_WORKSPACE_DOMAIN;
        if (workspaceDomain && !targetEmail.toLowerCase().endsWith(`@${workspaceDomain.toLowerCase()}`)) {
          return {
            success: false,
            message: 'Recipient email must be from your organization.',
          };
        }

        // Create pending transfer
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
          data: {
            recipientName: targetEmail,
            amount,
            message,
            isPending: true,
          },
        };
      }

      if (!recipient.account) {
        return {
          success: false,
          message: `${recipient.name}'s account is not set up yet.`,
        };
      }

      // Execute the transfer using a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create sender transaction
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

        // Create recipient transaction
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

        // Post both transactions
        await transactionService.postTransaction(sentTransaction.id, tx);
        await transactionService.postTransaction(receivedTransaction.id, tx);

        return sentTransaction;
      });

      return {
        success: true,
        message: 'Transfer completed successfully',
        transactionId: result.id,
        data: {
          recipientName: recipient.name,
          amount,
          message,
          isPending: false,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Handle incoming Google Chat webhook event
   */
  async handleEvent(event: GoogleChatEvent): Promise<GoogleChatResponse> {
    // Handle non-message events
    if (event.type === 'ADDED_TO_SPACE') {
      return buildWelcomeCard();
    }

    if (event.type === 'REMOVED_FROM_SPACE') {
      // No response needed when removed
      return buildTextResponse('');
    }

    if (event.type !== 'MESSAGE') {
      return buildTextResponse('');
    }

    // Verify request
    if (!this.verifyRequest(event)) {
      console.error('[GoogleChat] Request verification failed');
      return buildErrorCard('Verification Failed', 'Unable to verify this request.');
    }

    // Get user email
    const userEmail = event.user?.email?.toLowerCase();
    if (!userEmail) {
      return buildErrorCard('Error', 'Unable to identify user. Please ensure your email is visible.');
    }

    // Parse the command
    const command = this.parseCommand(event);

    // Create audit log
    const auditId = await this.createAuditLog(
      event,
      command,
      ChatCommandStatus.received
    );

    // Handle unrecognized command
    if (!command) {
      await this.updateAuditLog(auditId, ChatCommandStatus.failed, 'Unrecognized command');

      // Check if user is registered and if they're a manager for help
      const employee = await this.findEmployeeByEmail(userEmail);
      return buildHelpCard(employee?.isManager ?? false);
    }

    try {
      let result: CommandResult;

      switch (command.command) {
        case 'balance':
          await this.updateAuditLog(auditId, ChatCommandStatus.authorized);
          result = await this.executeBalance(userEmail);
          break;

        case 'help':
          await this.updateAuditLog(auditId, ChatCommandStatus.authorized);
          const employee = await this.findEmployeeByEmail(userEmail);
          await this.updateAuditLog(auditId, ChatCommandStatus.succeeded);
          return buildHelpCard(employee?.isManager ?? false);

        case 'award':
          // Check authorization (manager only)
          const awardManager = await this.findEmployeeByEmail(userEmail);
          if (!awardManager?.isManager) {
            await this.updateAuditLog(auditId, ChatCommandStatus.rejected, 'User is not a manager');
            return buildErrorCard(
              'Unauthorized',
              'Only managers can use the /award command.',
              'Use /help to see available commands for your role.'
            );
          }

          if (!command.targetEmail || !command.amount) {
            await this.updateAuditLog(auditId, ChatCommandStatus.failed, 'Missing required parameters');
            return buildErrorCard(
              'Invalid Command',
              'Missing required parameters.',
              'Usage: /award @user [amount] [message]'
            );
          }

          await this.updateAuditLog(auditId, ChatCommandStatus.authorized);
          result = await this.executeAward(
            userEmail,
            command.targetEmail,
            command.amount,
            command.message || ''
          );
          break;

        case 'transfer':
          if (!command.targetEmail || !command.amount) {
            await this.updateAuditLog(auditId, ChatCommandStatus.failed, 'Missing required parameters');
            return buildErrorCard(
              'Invalid Command',
              'Missing required parameters.',
              'Usage: /transfer @user [amount] [message]'
            );
          }

          await this.updateAuditLog(auditId, ChatCommandStatus.authorized);
          result = await this.executeTransfer(
            userEmail,
            command.targetEmail,
            command.amount,
            command.message
          );
          break;

        default:
          await this.updateAuditLog(auditId, ChatCommandStatus.failed, 'Unknown command');
          return buildErrorCard('Unknown Command', 'Command not recognized.', 'Type /help for available commands.');
      }

      // Update audit log with result
      if (result.success) {
        await this.updateAuditLog(auditId, ChatCommandStatus.succeeded, undefined, result.transactionId);
      } else {
        await this.updateAuditLog(auditId, ChatCommandStatus.failed, result.message);
      }

      // Build response based on command and result
      return this.buildResponse(command.command, result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      await this.updateAuditLog(auditId, ChatCommandStatus.failed, errorMessage);
      return buildErrorCard('Error', errorMessage, 'Please try again or contact support.');
    }
  }

  /**
   * Build the appropriate response card based on command and result
   */
  private buildResponse(command: CommandName, result: CommandResult): GoogleChatResponse {
    if (!result.success) {
      return buildErrorCard('Command Failed', result.message);
    }

    switch (command) {
      case 'balance':
        return buildBalanceCard(
          result.data?.userName as string,
          result.data?.balance as { posted: number; pending: number; total: number }
        );

      case 'award':
        return buildAwardCard(
          result.data?.recipientName as string,
          result.data?.amount as number,
          result.data?.description as string,
          result.data?.remainingBudget as number
        );

      case 'transfer':
        return buildTransferCard(
          result.data?.recipientName as string,
          result.data?.amount as number,
          result.data?.message as string | undefined,
          result.data?.isPending as boolean
        );

      default:
        return buildSuccessCard('Success', result.message);
    }
  }
}

export default new GoogleChatService();
