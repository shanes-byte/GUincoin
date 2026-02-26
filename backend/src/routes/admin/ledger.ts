import express from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { TransactionStatus } from '@prisma/client';
import { AppError } from '../../utils/errors';
import { TransactionService } from '../../services/transactionService';

const router = express.Router();

// [ORIGINAL - 2026-02-24] Local creditTypes/debitTypes arrays removed — now uses TransactionService.CREDIT_TYPES/DEBIT_TYPES
const creditTypes = TransactionService.CREDIT_TYPES;
const debitTypes = TransactionService.DEBIT_TYPES;

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
