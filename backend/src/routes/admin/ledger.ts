import express from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { AppError } from '../../utils/errors';

const router = express.Router();

const creditTypes: TransactionType[] = [
  TransactionType.manager_award,
  TransactionType.peer_transfer_received,
  TransactionType.wellness_reward,
  TransactionType.adjustment,
  TransactionType.game_win,
  TransactionType.game_refund,
  TransactionType.jackpot_win,
  TransactionType.daily_bonus,
  TransactionType.bulk_import,
  TransactionType.prediction_win,
];

const debitTypes: TransactionType[] = [
  TransactionType.peer_transfer_sent,
  TransactionType.store_purchase,
  TransactionType.game_bet,
  TransactionType.jackpot_contribution,
  TransactionType.allotment_deposit,
  TransactionType.prediction_bet,
];

// GET /reconcile — Compare computed balances vs stored balances
router.get('/reconcile', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const currentUser = await prisma.employee.findUnique({
      where: { id: req.user!.id },
    });

    if (!currentUser || !currentUser.isAdmin) {
      throw new AppError('Admin access required', 403);
    }

    const accounts = await prisma.account.findMany({
      include: { employee: { select: { id: true, name: true, email: true } } },
    });

    const discrepancies: Array<{
      accountId: string;
      employeeName: string;
      employeeEmail: string;
      storedBalance: number;
      computedBalance: number;
      difference: number;
    }> = [];

    for (const account of accounts) {
      const [credits, debits] = await Promise.all([
        prisma.ledgerTransaction.aggregate({
          where: {
            accountId: account.id,
            status: TransactionStatus.posted,
            transactionType: { in: creditTypes },
          },
          _sum: { amount: true },
        }),
        prisma.ledgerTransaction.aggregate({
          where: {
            accountId: account.id,
            status: TransactionStatus.posted,
            transactionType: { in: debitTypes },
          },
          _sum: { amount: true },
        }),
      ]);

      const computedBalance =
        Number(credits._sum.amount || 0) - Number(debits._sum.amount || 0);
      const storedBalance = Number(account.balance);
      const difference = Math.round((storedBalance - computedBalance) * 100) / 100;

      if (Math.abs(difference) >= 0.01) {
        discrepancies.push({
          accountId: account.id,
          employeeName: account.employee?.name ?? 'Unknown',
          employeeEmail: account.employee?.email ?? 'Unknown',
          storedBalance,
          computedBalance,
          difference,
        });
      }
    }

    res.json({
      isHealthy: discrepancies.length === 0,
      accountsChecked: accounts.length,
      discrepancies,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
