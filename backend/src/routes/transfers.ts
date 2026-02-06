import express, { NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import prisma from '../config/database';
import transactionService from '../services/transactionService';
import emailService from '../services/emailService';
import pendingTransferService from '../services/pendingTransferService';
import { PeriodType } from '@prisma/client';

const router = express.Router();

// Get transfer limits
router.get('/limits', requireAuth, async (req: AuthRequest, res, next: NextFunction) => {
  try {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    let limit = await prisma.peerTransferLimit.findFirst({
      where: {
        employeeId: req.user!.id,
        periodType: PeriodType.monthly,
        periodStart: { lte: now },
        periodEnd: { gte: now },
      },
    });

    // Default limit if none exists
    if (!limit) {
      const defaultLimit = 500; // Can be made configurable
      limit = await prisma.peerTransferLimit.create({
        data: {
          employeeId: req.user!.id,
          periodType: PeriodType.monthly,
          maxAmount: defaultLimit,
          periodStart,
          periodEnd,
        },
      });
    }

    // [ORIGINAL - 2026-02-06] status: 'posted' — display didn't match validation which includes pending
    // Calculate used amount (include pending to match validation in /send route)
    const usedAmount = await prisma.ledgerTransaction.aggregate({
      where: {
        sourceEmployeeId: req.user!.id,
        transactionType: 'peer_transfer_sent',
        status: { in: ['posted', 'pending'] },
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      _sum: {
        amount: true,
      },
    });

    res.json({
      ...limit,
      usedAmount: Number(usedAmount._sum.amount || 0),
      remaining:
        Number(limit.maxAmount) - Number(usedAmount._sum.amount || 0),
    });
  } catch (error) {
    next(error);
  }
});

// Send coins to peer
const sendTransferSchema = z.object({
  body: z.object({
    recipientEmail: z.string().email(),
    amount: z.number().positive(),
    message: z.string().optional(),
  }),
});

router.post(
  '/send',
  requireAuth,
  validate(sendTransferSchema),
  async (req: AuthRequest, res, next: NextFunction) => {
    try {
      const { recipientEmail, amount, message } = req.body;
      const normalizedRecipientEmail = recipientEmail.toLowerCase();

      // Check if sending to self
      if (normalizedRecipientEmail === req.user!.email.toLowerCase()) {
        return res.status(400).json({ error: 'Cannot send coins to yourself' });
      }

      // Use a transaction with serializable isolation to prevent race conditions
      const result = await prisma.$transaction(async (tx) => {
        // Get sender with lock
        const sender = await tx.employee.findUnique({
          where: { id: req.user!.id },
        });

        if (!sender) {
          throw new Error('Employee not found');
        }

        // Get sender account
        const senderAccount = await tx.account.findUnique({
          where: { employeeId: sender.id },
        });

        if (!senderAccount) {
          throw new Error('Account not found');
        }

        // [ORIGINAL - 2026-02-06] Balance check via aggregate of all posted amounts + pending negatives
        // Replaced: use account.balance (authoritative, maintained by postTransaction()) minus pending outbound
        const pendingDebits = await tx.ledgerTransaction.aggregate({
          where: {
            accountId: senderAccount.id,
            status: 'pending',
            transactionType: { in: ['peer_transfer_sent', 'store_purchase'] },
          },
          _sum: { amount: true },
        });
        const availableBalance = Number(senderAccount.balance) - Number(pendingDebits._sum.amount || 0);

        if (availableBalance < amount) {
          throw new Error('Insufficient balance');
        }

        // Check transfer limits
        const limits = await tx.peerTransferLimit.findFirst({
          where: {
            employeeId: req.user!.id,
            periodType: PeriodType.monthly,
            periodStart: { lte: new Date() },
            periodEnd: { gte: new Date() },
          },
        });

        if (limits) {
          const usedAmount = await tx.ledgerTransaction.aggregate({
            where: {
              sourceEmployeeId: req.user!.id,
              transactionType: 'peer_transfer_sent',
              status: { in: ['posted', 'pending'] },
              createdAt: {
                gte: limits.periodStart,
                lte: limits.periodEnd,
              },
            },
            _sum: {
              amount: true,
            },
          });

          const used = Number(usedAmount._sum.amount || 0);
          if (used + amount > Number(limits.maxAmount)) {
            throw new Error('Transfer limit exceeded');
          }
        }

        // Get recipient
        const recipient = await tx.employee.findUnique({
          where: { email: normalizedRecipientEmail },
          include: { account: true },
        });

        if (!recipient) {
          // Handle pending transfer for unknown recipient
          const workspaceDomain = process.env.GOOGLE_WORKSPACE_DOMAIN;
          if (workspaceDomain && !normalizedRecipientEmail.endsWith(workspaceDomain)) {
            throw new Error('Recipient email is not eligible');
          }

          // Create pending transfer transaction (use peer_transfer_sent type, stays pending)
          // [ORIGINAL - 2026-02-06] amount was: -amount (caused double-negation when postTransaction negates debit types)
          const senderTransaction = await tx.ledgerTransaction.create({
            data: {
              accountId: senderAccount.id,
              transactionType: 'peer_transfer_sent',
              amount: amount,
              description: message || `Pending transfer to ${normalizedRecipientEmail}`,
              status: 'pending',
              sourceEmployeeId: req.user!.id,
            },
          });

          const pendingTransfer = await tx.pendingTransfer.create({
            data: {
              senderEmployeeId: sender.id,
              recipientEmail: normalizedRecipientEmail,
              amount,
              message,
              senderTransactionId: senderTransaction.id,
            },
          });

          return {
            type: 'pending' as const,
            sender,
            pendingTransfer,
          };
        }

        if (!recipient.account) {
          throw new Error('Recipient account not found');
        }

        // Create and post transactions atomically
        // [ORIGINAL - 2026-02-06] sentTransaction amount was: -amount (double-negation bug)
        // [ORIGINAL - 2026-02-06] posting was manual status update, not postTransaction() — balance never changed
        const sentTransaction = await tx.ledgerTransaction.create({
          data: {
            accountId: senderAccount.id,
            transactionType: 'peer_transfer_sent',
            amount: amount,
            description: message || `Transfer to ${recipient.name}`,
            status: 'pending',
            sourceEmployeeId: req.user!.id,
          },
        });

        const receivedTransaction = await tx.ledgerTransaction.create({
          data: {
            accountId: recipient.account.id,
            transactionType: 'peer_transfer_received',
            amount: amount,
            description: message || `Transfer from ${sender.name}`,
            status: 'pending',
            sourceEmployeeId: req.user!.id,
            targetEmployeeId: recipient.id,
          },
        });

        // Post both transactions via transactionService (updates account.balance)
        await transactionService.postTransaction(sentTransaction.id, tx);
        await transactionService.postTransaction(receivedTransaction.id, tx);

        return {
          type: 'completed' as const,
          sender,
          recipient,
          sentTransaction,
        };
      }, {
        isolationLevel: 'Serializable',
      });

      // Handle response and emails outside of transaction
      if (result.type === 'pending') {
        // Send notification email for pending transfer (outside transaction)
        emailService.sendPeerTransferRecipientNotFoundNotification(
          normalizedRecipientEmail,
          normalizedRecipientEmail,
          result.sender.name,
          amount,
          message
        ).catch(console.error);

        return res.status(202).json({
          message: 'Transfer pending until recipient signs in',
          pendingTransfer: result.pendingTransfer,
        });
      }

      // Send email notifications (outside transaction)
      emailService.sendPeerTransferNotification(
        result.recipient.email,
        result.recipient.name,
        result.sender.name,
        amount,
        message
      ).catch(console.error);

      emailService.sendPeerTransferSentNotification(
        result.sender.email,
        result.sender.name,
        result.recipient.name,
        amount,
        message
      ).catch(console.error);

      res.json({
        message: 'Transfer completed successfully',
        transaction: result.sentTransaction,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get transfer history
router.get('/history', requireAuth, async (req: AuthRequest, res, next: NextFunction) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.user!.id },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const account = await prisma.account.findUnique({
      where: { employeeId: employee.id },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // [ORIGINAL - 2026-02-06] Only fetched peer_transfer_sent — received transfers were invisible
    const [sentHistory, receivedHistory] = await Promise.all([
      transactionService.getTransactionHistory(account.id, {
        transactionType: 'peer_transfer_sent' as any,
      }),
      transactionService.getTransactionHistory(account.id, {
        transactionType: 'peer_transfer_received' as any,
      }),
    ]);

    // Merge and sort by createdAt descending
    const allTransactions = [
      ...sentHistory.transactions,
      ...receivedHistory.transactions,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      transactions: allTransactions,
      total: sentHistory.total + receivedHistory.total,
    });
  } catch (error) {
    next(error);
  }
});

// Get pending transfers
router.get('/pending', requireAuth, async (req: AuthRequest, res, next: NextFunction) => {
  try {
    const pendingTransfers = await prisma.pendingTransfer.findMany({
      where: {
        senderEmployeeId: req.user!.id,
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(pendingTransfers);
  } catch (error) {
    next(error);
  }
});

// Cancel a pending transfer
router.post('/:transferId/cancel', requireAuth, async (req: AuthRequest, res, next: NextFunction) => {
  try {
    const { transferId } = req.params;

    const cancelledTransfer = await pendingTransferService.cancelPendingTransfer(
      transferId,
      req.user!.id
    );

    res.json({
      message: 'Transfer cancelled successfully',
      transfer: cancelledTransfer,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
