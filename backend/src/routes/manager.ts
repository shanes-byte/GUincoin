import express, { NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, requireManager, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import allotmentService from '../services/allotmentService';
import emailService from '../services/emailService';
import prisma from '../config/database';

const router = express.Router();

// GET /api/manager/award-presets — List active presets (for Manager Portal + Google Chat)
router.get('/award-presets', requireAuth, async (_req: AuthRequest, res, next: NextFunction) => {
  try {
    const presets = await prisma.awardPreset.findMany({
      where: { isActive: true },
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

// Get current allotment
router.get('/allotment', requireManager, async (req: AuthRequest, res, next: NextFunction) => {
  try {
    const allotment = await allotmentService.getCurrentAllotment(req.user!.id);
    res.json(allotment);
  } catch (error) {
    next(error);
  }
});

// Award coins to employee
const awardSchema = z.object({
  body: z.object({
    employeeEmail: z.string().email(),
    amount: z.number().positive(),
    description: z.string().optional(),
  }),
});

router.post(
  '/award',
  requireManager,
  validate(awardSchema),
  async (req: AuthRequest, res, next: NextFunction) => {
    try {
      const { employeeEmail, amount, description } = req.body;

      // Award coins
      const transaction = await allotmentService.awardCoins(
        req.user!.id,
        employeeEmail,
        amount,
        description || ''
      );

      // Get recipient info for email
      const recipient = await prisma.employee.findUnique({
        where: { email: employeeEmail },
      });

      if (recipient) {
        // Send email notification
        await emailService.sendManagerAwardNotification(
          recipient.email,
          recipient.name,
          req.user!.name,
          amount,
          description
        );
      }

      await emailService.sendManagerAwardSentNotification(
        req.user!.email,
        req.user!.name,
        recipient?.name || employeeEmail,
        amount,
        description
      );

      res.json({
        message: 'Coins awarded successfully',
        transaction,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get award history
const historySchema = z.object({
  query: z.object({
    limit: z.string().optional().transform((val) => (val ? parseInt(val) : 50)),
    offset: z.string().optional().transform((val) => (val ? parseInt(val) : 0)),
  }),
});

router.get(
  '/history',
  requireManager,
  validate(historySchema),
  async (req: AuthRequest, res, next: NextFunction) => {
    try {
      const history = await allotmentService.getAwardHistory(
        req.user!.id,
        req.query.limit as unknown as number,
        req.query.offset as unknown as number
      );
      res.json(history);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
