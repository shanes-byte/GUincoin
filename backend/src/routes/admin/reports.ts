import express from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { AppError } from '../../utils/errors';

const router = express.Router();

// GET /stats — Aggregated analytics data for the reports dashboard
router.get('/stats', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const currentUser = await prisma.employee.findUnique({
      where: { id: req.user!.id },
    });

    if (!currentUser || !currentUser.isAdmin) {
      throw new AppError('Admin access required', 403);
    }

    // Transaction breakdown by type
    const transactionsByType = await prisma.ledgerTransaction.groupBy({
      by: ['transactionType'],
      _count: { id: true },
      _sum: { amount: true },
      where: { status: 'posted' },
    });

    // Daily activity for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyActivityRaw = await prisma.$queryRaw<
      Array<{ date: string; count: bigint; amount: string }>
    >`
      SELECT
        TO_CHAR("createdAt", 'YYYY-MM-DD') as date,
        COUNT(*)::bigint as count,
        COALESCE(SUM(ABS(amount)), 0)::text as amount
      FROM "LedgerTransaction"
      WHERE "createdAt" >= ${thirtyDaysAgo}
        AND status = 'posted'
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM-DD')
      ORDER BY date ASC
    `;

    const dailyActivity = dailyActivityRaw.map((row) => ({
      date: row.date,
      count: Number(row.count),
      amount: parseFloat(row.amount) || 0,
    }));

    // Gaming overview
    const gameStatsAgg = await prisma.gameStats.aggregate({
      _sum: {
        gamesPlayed: true,
        totalBet: true,
        totalWon: true,
      },
    });

    // Active jackpot pool
    const jackpotAgg = await prisma.jackpot.aggregate({
      where: { isActive: true },
      _sum: { balance: true },
    });

    const gamingOverview = {
      gamesPlayed: gameStatsAgg._sum.gamesPlayed || 0,
      totalWagered: Number(gameStatsAgg._sum.totalBet || 0),
      totalWon: Number(gameStatsAgg._sum.totalWon || 0),
      jackpotPool: Number(jackpotAgg._sum.balance || 0),
    };

    res.json({
      transactionsByType: transactionsByType.map((t) => ({
        type: t.transactionType,
        count: t._count.id,
        totalAmount: Number(t._sum.amount || 0),
      })),
      dailyActivity,
      gamingOverview,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
