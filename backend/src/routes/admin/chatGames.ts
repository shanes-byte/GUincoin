/**
 * Admin Chat Games Routes
 *
 * Allows admins/GMs to view and manage chat games (Encrypted Office, Skill Shot).
 */

import { Router } from 'express';
import { requireAuth, AuthRequest, requireGameMaster } from '../../middleware/auth';
import prisma from '../../config/database';
import chatGameService from '../../services/chatGameService';

const router = Router();
router.use(requireAuth);
router.use(requireGameMaster);

// GET /admin/chat-games — List all chat games (with pagination)
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const status = req.query.status as string | undefined;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [games, total] = await Promise.all([
      prisma.chatGame.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          participants: {
            include: {
              employee: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.chatGame.count({ where }),
    ]);

    res.json({
      games: games.map(g => ({
        id: g.id,
        type: g.type,
        status: g.status,
        spaceName: g.spaceName,
        threadName: g.threadName,
        createdBy: g.createdBy,
        participants: g.participants.map(p => ({
          id: p.id,
          employeeId: p.employeeId,
          name: p.employee.name,
          score: p.score,
          isWinner: p.isWinner,
        })),
        startedAt: g.startedAt,
        completedAt: g.completedAt,
        expiresAt: g.expiresAt,
        createdAt: g.createdAt,
      })),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    });
  } catch (error) {
    next(error);
  }
});

// GET /admin/chat-games/:id — Get chat game details
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const game = await chatGameService.getGameById(req.params.id);

    res.json({
      id: game.id,
      type: game.type,
      status: game.status,
      spaceName: game.spaceName,
      threadName: game.threadName,
      config: game.config,
      state: game.state,
      result: game.result,
      participants: game.participants.map((p: any) => ({
        id: p.id,
        employeeId: p.employeeId,
        name: p.employee.name,
        email: p.employee.email,
        score: p.score,
        isWinner: p.isWinner,
        progress: p.progress,
        lastActionAt: p.lastActionAt,
      })),
      startedAt: game.startedAt,
      completedAt: game.completedAt,
      expiresAt: game.expiresAt,
      createdAt: game.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

// POST /admin/chat-games/:id/cancel — Cancel an active chat game
router.post('/:id/cancel', async (req: AuthRequest, res, next) => {
  try {
    const game = await chatGameService.endGame(req.params.id, req.user!.id);
    res.json({
      id: game.id,
      status: game.status,
      completedAt: game.completedAt,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
