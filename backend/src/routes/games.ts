/**
 * Game Routes - Player-facing game API
 *
 * Handles:
 * - Game configuration retrieval
 * - Playing games (instant win)
 * - Game history & statistics
 * - Leaderboard
 * - Daily bonus wheel
 * - Jackpots (view & spin)
 * - Provably fair verification
 */

import { Router } from 'express';
import { z } from 'zod';
import { GameType } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import prisma from '../config/database';
import { gameEngine, jackpotService } from '../services/games';

// [ORIGINAL - 2026-02-12] Stub that returned empty games array:
// const router = Router();
// router.get('/', (_req, res) => {
//   res.json({ games: [] });
// });
// export default router;

const router = Router();
router.use(requireAuth);

// =====================
// Constants
// =====================

const WHEEL_SEGMENTS = [
  { multiplier: 0, weight: 10, label: 'Lose', color: '#ef4444' },
  { multiplier: 0.5, weight: 20, label: '0.5x', color: '#f97316' },
  { multiplier: 1, weight: 25, label: '1x', color: '#eab308' },
  { multiplier: 1.5, weight: 15, label: '1.5x', color: '#84cc16' },
  { multiplier: 2, weight: 12, label: '2x', color: '#22c55e' },
  { multiplier: 3, weight: 8, label: '3x', color: '#14b8a6' },
  { multiplier: 5, weight: 5, label: '5x', color: '#3b82f6' },
  { multiplier: 10, weight: 3, label: '10x', color: '#8b5cf6' },
  { multiplier: 0.5, weight: 15, label: '0.5x', color: '#f97316' },
  { multiplier: 1, weight: 12, label: '1x', color: '#eab308' },
];

const DAILY_BONUS_PRIZES = [0.5, 1, 1.5, 2, 3, 5, 0.25, 1, 0.5, 2];

const DEFAULT_PAYOUTS: Record<string, number> = {
  coin_flip: 1.95,
  dice_roll: 5.8,
  spin_wheel: 1.0,
  higher_lower: 1.9,
  scratch_card: 2.0,
  daily_bonus: 1.0,
};

// =====================
// Validation Schemas
// =====================

const playSchema = z.object({
  body: z.object({
    gameType: z.nativeEnum(GameType),
    bet: z.number().nonnegative(),
    prediction: z.any().optional(),
    clientSeed: z.string().optional(),
  }),
});

const verifySchema = z.object({
  body: z.object({
    serverSeed: z.string(),
    clientSeed: z.string(),
    nonce: z.number().int().nonnegative(),
    expectedOutcome: z.any(),
    maxValue: z.number().positive(),
  }),
});

const jackpotSpinSchema = z.object({
  body: z.object({
    jackpotId: z.string().uuid(),
    betAmount: z.number().positive(),
    clientSeed: z.string().optional(),
  }),
});

// =====================
// 1. GET /config — Get all enabled web game configs
// =====================

router.get('/config', async (req: AuthRequest, res, next) => {
  try {
    const configs = await prisma.gameConfig.findMany({
      where: {
        enabled: true,
        availableOnWeb: true,
      },
      orderBy: { displayOrder: 'asc' },
    });

    const result = configs.map((config) => ({
      id: config.id,
      gameType: config.gameType,
      enabled: config.enabled,
      minBet: Number(config.minBet),
      maxBet: Number(config.maxBet),
      payoutMultiplier: config.payoutMultiplier
        ? Number(config.payoutMultiplier)
        : DEFAULT_PAYOUTS[config.gameType] ?? null,
      jackpotContributionRate: Number(config.jackpotContributionRate),
      availableOnWeb: config.availableOnWeb,
      displayOrder: config.displayOrder,
      customConfig: config.customConfig,
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// =====================
// 2. GET /config/:type — Get config for a specific game type
// =====================

router.get('/config/:type', async (req: AuthRequest, res, next) => {
  try {
    const gameType = req.params.type as GameType;

    // Validate that the type is a valid GameType
    if (!Object.values(GameType).includes(gameType)) {
      return res.status(400).json({ error: 'Invalid game type' });
    }

    const config = await prisma.gameConfig.findUnique({
      where: { gameType },
    });

    if (!config) {
      // Return defaults from engine
      const engineConfig = await gameEngine.getGameConfig(gameType);
      return res.json({
        gameType,
        ...engineConfig,
        payoutMultiplier: engineConfig.payoutMultiplier ?? DEFAULT_PAYOUTS[gameType] ?? null,
        displayOrder: 0,
        uiMetadata: getUiMetadata(gameType),
      });
    }

    res.json({
      id: config.id,
      gameType: config.gameType,
      enabled: config.enabled,
      minBet: Number(config.minBet),
      maxBet: Number(config.maxBet),
      payoutMultiplier: config.payoutMultiplier
        ? Number(config.payoutMultiplier)
        : DEFAULT_PAYOUTS[config.gameType] ?? null,
      jackpotContributionRate: Number(config.jackpotContributionRate),
      availableOnWeb: config.availableOnWeb,
      displayOrder: config.displayOrder,
      customConfig: config.customConfig,
      uiMetadata: getUiMetadata(config.gameType),
    });
  } catch (error) {
    next(error);
  }
});

// =====================
// 3. POST /play — Play a game
// =====================

router.post('/play', validate(playSchema), async (req: AuthRequest, res, next) => {
  try {
    const { gameType, bet, prediction, clientSeed } = req.body;
    const employeeId = req.user!.id;

    // Route daily_bonus to its dedicated handler
    if (gameType === GameType.daily_bonus) {
      const result = await gameEngine.playDailyBonus(employeeId);
      return res.json({
        game: result.game,
        result: result.result,
        balance: result.balance,
      });
    }

    const result = await gameEngine.playGame({
      employeeId,
      gameType,
      bet,
      prediction,
      clientSeed,
    });

    res.json({
      game: result.game,
      result: result.result,
      balance: result.balance,
    });
  } catch (error) {
    next(error);
  }
});

// =====================
// 4. GET /history — Get player's game history
// =====================

router.get('/history', async (req: AuthRequest, res, next) => {
  try {
    const employeeId = req.user!.id;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const type = req.query.type as GameType | undefined;

    const where: any = {
      participants: {
        some: { employeeId },
      },
    };

    if (type && Object.values(GameType).includes(type)) {
      where.type = type;
    }

    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          participants: {
            where: { employeeId },
            select: {
              betAmount: true,
              prediction: true,
              payout: true,
              isWinner: true,
              joinedAt: true,
            },
          },
        },
      }),
      prisma.game.count({ where }),
    ]);

    res.json({
      games: games.map((g) => {
        const participant = g.participants[0];
        return {
          id: g.id,
          type: g.type,
          status: g.status,
          result: g.result,
          createdAt: g.createdAt,
          completedAt: g.completedAt,
          participant: participant
            ? {
                betAmount: Number(participant.betAmount),
                prediction: participant.prediction,
                payout: participant.payout ? Number(participant.payout) : null,
                isWinner: participant.isWinner,
                joinedAt: participant.joinedAt,
              }
            : null,
        };
      }),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

// =====================
// 5. GET /stats — Get player's game statistics
// =====================

router.get('/stats', async (req: AuthRequest, res, next) => {
  try {
    const employeeId = req.user!.id;

    const stats = await prisma.gameStats.findUnique({
      where: { employeeId },
    });

    if (!stats) {
      return res.json({
        gamesPlayed: 0,
        gamesWon: 0,
        winRate: 0,
        totalBet: 0,
        totalWon: 0,
        netProfit: 0,
        currentWinStreak: 0,
        longestWinStreak: 0,
        statsByGame: {},
        jackpotsWon: 0,
        totalJackpotWinnings: 0,
      });
    }

    res.json({
      gamesPlayed: stats.gamesPlayed,
      gamesWon: stats.gamesWon,
      winRate: stats.gamesPlayed > 0 ? stats.gamesWon / stats.gamesPlayed : 0,
      totalBet: Number(stats.totalBet),
      totalWon: Number(stats.totalWon),
      netProfit: Number(stats.netProfit),
      currentWinStreak: stats.currentWinStreak,
      longestWinStreak: stats.longestWinStreak,
      statsByGame: stats.statsByGame,
      jackpotsWon: stats.jackpotsWon,
      totalJackpotWinnings: Number(stats.totalJackpotWinnings),
    });
  } catch (error) {
    next(error);
  }
});

// =====================
// 6. GET /leaderboard — Get leaderboard
// =====================

router.get('/leaderboard', async (req: AuthRequest, res, next) => {
  try {
    const employeeId = req.user!.id;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const period = (req.query.period as string) || 'all';

    // Build date filter based on period
    let dateFilter: Date | undefined;
    const now = new Date();
    if (period === 'week') {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // For 'all' period, use GameStats directly
    if (!dateFilter) {
      const leaderboard = await prisma.gameStats.findMany({
        take: limit,
        orderBy: { netProfit: 'desc' },
        include: {
          employee: {
            select: { id: true, name: true },
          },
        },
      });

      // Get current user's rank
      const userStats = await prisma.gameStats.findUnique({
        where: { employeeId },
      });

      let userRank: number | null = null;
      if (userStats) {
        const higherCount = await prisma.gameStats.count({
          where: {
            netProfit: { gt: userStats.netProfit },
          },
        });
        userRank = higherCount + 1;
      }

      return res.json({
        leaderboard: leaderboard.map((entry, index) => ({
          rank: index + 1,
          employeeId: entry.employeeId,
          name: entry.employee.name,
          gamesPlayed: entry.gamesPlayed,
          gamesWon: entry.gamesWon,
          winRate: entry.gamesPlayed > 0 ? entry.gamesWon / entry.gamesPlayed : 0,
          netProfit: Number(entry.netProfit),
          totalBet: Number(entry.totalBet),
          totalWon: Number(entry.totalWon),
          longestWinStreak: entry.longestWinStreak,
        })),
        currentUser: {
          rank: userRank,
          stats: userStats
            ? {
                gamesPlayed: userStats.gamesPlayed,
                gamesWon: userStats.gamesWon,
                netProfit: Number(userStats.netProfit),
                totalBet: Number(userStats.totalBet),
                totalWon: Number(userStats.totalWon),
              }
            : null,
        },
      });
    }

    // For period-based leaderboard, aggregate from GameParticipant
    const periodLeaderboard = await prisma.gameParticipant.groupBy({
      by: ['employeeId'],
      where: {
        joinedAt: { gte: dateFilter },
        game: { status: 'completed' },
      },
      _sum: {
        betAmount: true,
        payout: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          payout: 'desc',
        },
      },
      take: limit,
    });

    // Get employee names
    const employeeIds = periodLeaderboard.map((e) => e.employeeId);
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, name: true },
    });
    const employeeMap = new Map(employees.map((e) => [e.id, e.name]));

    // Calculate current user's rank for the period
    let userRank: number | null = null;
    const userPeriodStats = await prisma.gameParticipant.aggregate({
      where: {
        employeeId,
        joinedAt: { gte: dateFilter },
        game: { status: 'completed' },
      },
      _sum: {
        betAmount: true,
        payout: true,
      },
      _count: true,
    });

    if (userPeriodStats._count > 0) {
      const userPayout = Number(userPeriodStats._sum.payout) || 0;
      const userBet = Number(userPeriodStats._sum.betAmount) || 0;
      const userNet = userPayout - userBet;

      // Count how many players have a higher net profit in this period
      // This is approximate using payout ordering
      const allPeriodPlayers = await prisma.gameParticipant.groupBy({
        by: ['employeeId'],
        where: {
          joinedAt: { gte: dateFilter },
          game: { status: 'completed' },
        },
        _sum: {
          betAmount: true,
          payout: true,
        },
      });

      let higherCount = 0;
      for (const player of allPeriodPlayers) {
        const pNet =
          (Number(player._sum.payout) || 0) - (Number(player._sum.betAmount) || 0);
        if (pNet > userNet) higherCount++;
      }
      userRank = higherCount + 1;
    }

    res.json({
      leaderboard: periodLeaderboard.map((entry, index) => {
        const totalBet = Number(entry._sum.betAmount) || 0;
        const totalWon = Number(entry._sum.payout) || 0;
        return {
          rank: index + 1,
          employeeId: entry.employeeId,
          name: employeeMap.get(entry.employeeId) || 'Unknown',
          gamesPlayed: entry._count,
          netProfit: totalWon - totalBet,
          totalBet,
          totalWon,
        };
      }),
      currentUser: {
        rank: userRank,
        stats: userPeriodStats._count > 0
          ? {
              gamesPlayed: userPeriodStats._count,
              netProfit:
                (Number(userPeriodStats._sum.payout) || 0) -
                (Number(userPeriodStats._sum.betAmount) || 0),
              totalBet: Number(userPeriodStats._sum.betAmount) || 0,
              totalWon: Number(userPeriodStats._sum.payout) || 0,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// =====================
// 7. GET /daily-bonus/status — Get daily bonus status
// =====================

router.get('/daily-bonus/status', async (req: AuthRequest, res, next) => {
  try {
    const employeeId = req.user!.id;

    // Start of today (UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Tomorrow midnight (UTC)
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    // Check if player already spun today
    const todaySpin = await prisma.dailyBonusSpin.findFirst({
      where: {
        employeeId,
        createdAt: { gte: today },
      },
    });

    // Get last 7 spins
    const recentSpins = await prisma.dailyBonusSpin.findMany({
      where: { employeeId },
      take: 7,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      canPlay: !todaySpin,
      nextAvailable: todaySpin ? tomorrow.toISOString() : null,
      wheelConfig: {
        segments: DAILY_BONUS_PRIZES.map((prize, index) => ({
          index,
          prize,
          label: `${prize} GC`,
        })),
      },
      recentSpins: recentSpins.map((spin) => ({
        id: spin.id,
        prize: Number(spin.prize),
        segmentIndex: spin.segmentIndex,
        createdAt: spin.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// =====================
// 8. GET /jackpots — Get active jackpots
// =====================

router.get('/jackpots', async (req: AuthRequest, res, next) => {
  try {
    const jackpots = await prisma.jackpot.findMany({
      where: { isActive: true },
      orderBy: { balance: 'desc' },
    });

    res.json(
      jackpots.map((j) => ({
        id: j.id,
        name: j.name,
        type: j.type,
        balance: Number(j.balance),
        contributionRate: Number(j.contributionRate),
        minWinAmount: j.minWinAmount ? Number(j.minWinAmount) : null,
        lastWonAt: j.lastWonAt,
        lastWonAmount: j.lastWonAmount ? Number(j.lastWonAmount) : null,
        createdAt: j.createdAt,
      }))
    );
  } catch (error) {
    next(error);
  }
});

// =====================
// 9. GET /jackpots/:id — Get jackpot details
// =====================

router.get('/jackpots/:id', async (req: AuthRequest, res, next) => {
  try {
    const jackpot = await prisma.jackpot.findUnique({
      where: { id: req.params.id },
    });

    if (!jackpot) {
      return res.status(404).json({ error: 'Jackpot not found' });
    }

    // Recent contributions (last 20)
    const recentContributions = await prisma.jackpotContribution.findMany({
      where: { jackpotId: jackpot.id },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: { id: true, name: true },
        },
      },
    });

    // Top contributors (by total amount)
    const topContributors = await prisma.jackpotContribution.groupBy({
      by: ['employeeId'],
      where: { jackpotId: jackpot.id },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    // Get names for top contributors
    const topContributorIds = topContributors.map((c) => c.employeeId);
    const topEmployees = await prisma.employee.findMany({
      where: { id: { in: topContributorIds } },
      select: { id: true, name: true },
    });
    const employeeNameMap = new Map(topEmployees.map((e) => [e.id, e.name]));

    res.json({
      id: jackpot.id,
      name: jackpot.name,
      type: jackpot.type,
      balance: Number(jackpot.balance),
      contributionRate: Number(jackpot.contributionRate),
      minWinAmount: jackpot.minWinAmount ? Number(jackpot.minWinAmount) : null,
      isActive: jackpot.isActive,
      lastWonAt: jackpot.lastWonAt,
      lastWonAmount: jackpot.lastWonAmount ? Number(jackpot.lastWonAmount) : null,
      createdAt: jackpot.createdAt,
      recentContributions: recentContributions.map((c) => ({
        id: c.id,
        employeeName: c.employee.name,
        amount: Number(c.amount),
        createdAt: c.createdAt,
      })),
      topContributors: topContributors.map((c) => ({
        employeeId: c.employeeId,
        name: employeeNameMap.get(c.employeeId) || 'Unknown',
        totalContributed: Number(c._sum.amount) || 0,
        contributionCount: c._count,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// =====================
// 10. POST /jackpots/spin — Spin jackpot (not implemented)
// =====================

router.post('/jackpots/spin', validate(jackpotSpinSchema), async (_req: AuthRequest, res, next) => {
  try {
    res.status(501).json({ error: 'Coming soon' });
  } catch (error) {
    next(error);
  }
});

// =====================
// 11. POST /verify — Verify provably fair outcome
// =====================

router.post('/verify', validate(verifySchema), async (req: AuthRequest, res, next) => {
  try {
    const { serverSeed, clientSeed, nonce, expectedOutcome, maxValue } = req.body;

    const verification = await gameEngine.verifyOutcome({
      serverSeed,
      clientSeed,
      nonce,
      expectedOutcome,
      maxValue,
    });

    res.json(verification);
  } catch (error) {
    next(error);
  }
});

// =====================
// Helpers
// =====================

/**
 * Returns UI metadata for a given game type (segments, visual config, etc.)
 */
function getUiMetadata(gameType: GameType | string): Record<string, unknown> {
  switch (gameType) {
    case 'spin_wheel':
      return {
        segments: WHEEL_SEGMENTS,
        animationDuration: 4000,
      };
    case 'daily_bonus':
      return {
        prizes: DAILY_BONUS_PRIZES,
        segments: DAILY_BONUS_PRIZES.map((prize, index) => ({
          index,
          prize,
          label: `${prize} GC`,
        })),
      };
    case 'coin_flip':
      return {
        options: ['heads', 'tails'],
      };
    case 'dice_roll':
      return {
        minValue: 1,
        maxValue: 6,
      };
    case 'higher_lower':
      return {
        cardRange: { min: 1, max: 13 },
        suits: ['hearts', 'diamonds', 'clubs', 'spades'],
      };
    case 'scratch_card':
      return {
        gridSize: { rows: 3, cols: 3 },
      };
    default:
      return {};
  }
}

export default router;
