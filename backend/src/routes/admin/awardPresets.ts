import express from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { z } from 'zod';
import { validate } from '../../middleware/validation';
import { AppError } from '../../utils/errors';

const router = express.Router();

// Require admin for all routes in this file
const requireAdmin = async (req: AuthRequest, _res: express.Response, next: express.NextFunction) => {
  try {
    const currentUser = await prisma.employee.findUnique({
      where: { id: req.user!.id },
    });
    if (!currentUser || !currentUser.isAdmin) {
      throw new AppError('Admin access required', 403);
    }
    next();
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/award-presets — List all presets (ordered by displayOrder)
router.get('/award-presets', requireAuth, requireAdmin, async (_req: AuthRequest, res, next) => {
  try {
    const presets = await prisma.awardPreset.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    res.json(presets.map(p => ({
      ...p,
      amount: Number(p.amount),
    })));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/award-presets — Create a preset
const createPresetSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100),
    amount: z.number().positive(),
    displayOrder: z.number().int().min(0).optional(),
  }),
});

router.post(
  '/award-presets',
  requireAuth,
  requireAdmin,
  validate(createPresetSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { title, amount, displayOrder } = req.body;

      const preset = await prisma.awardPreset.create({
        data: {
          title,
          amount,
          displayOrder: displayOrder ?? 0,
        },
      });

      res.status(201).json({
        ...preset,
        amount: Number(preset.amount),
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/admin/award-presets/:id — Update a preset
const updatePresetSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(1).max(100).optional(),
    amount: z.number().positive().optional(),
    displayOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
});

router.put(
  '/award-presets/:id',
  requireAuth,
  requireAdmin,
  validate(updatePresetSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const existing = await prisma.awardPreset.findUnique({
        where: { id: req.params.id },
      });

      if (!existing) {
        throw new AppError('Award preset not found', 404);
      }

      const preset = await prisma.awardPreset.update({
        where: { id: req.params.id },
        data: {
          ...(req.body.title !== undefined && { title: req.body.title }),
          ...(req.body.amount !== undefined && { amount: req.body.amount }),
          ...(req.body.displayOrder !== undefined && { displayOrder: req.body.displayOrder }),
          ...(req.body.isActive !== undefined && { isActive: req.body.isActive }),
        },
      });

      res.json({
        ...preset,
        amount: Number(preset.amount),
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/admin/award-presets/:id — Delete a preset
const deletePresetSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

router.delete(
  '/award-presets/:id',
  requireAuth,
  requireAdmin,
  validate(deletePresetSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const existing = await prisma.awardPreset.findUnique({
        where: { id: req.params.id },
      });

      if (!existing) {
        throw new AppError('Award preset not found', 404);
      }

      await prisma.awardPreset.delete({
        where: { id: req.params.id },
      });

      res.json({ message: 'Award preset deleted' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
