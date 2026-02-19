import express from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { AppError } from '../../utils/errors';
import { generateAndSendReport } from '../../jobs/dailyReportJob';

const router = express.Router();

const recipientsSchema = z.object({
  recipients: z.array(z.string().email()),
});

// GET /recipients — list configured daily report recipients
router.get('/recipients', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const currentUser = await prisma.employee.findUnique({ where: { id: req.user!.id } });
    if (!currentUser?.isAdmin) throw new AppError('Admin access required', 403);

    const settings = await prisma.systemSettings.findUnique({ where: { id: 'system' } });
    const recipients = (settings?.dailyReportRecipients as string[] | null) ?? [];
    res.json({ recipients });
  } catch (error) {
    next(error);
  }
});

// PUT /recipients — update daily report recipients
router.put('/recipients', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const currentUser = await prisma.employee.findUnique({ where: { id: req.user!.id } });
    if (!currentUser?.isAdmin) throw new AppError('Admin access required', 403);

    const parsed = recipientsSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid recipient list. Each entry must be a valid email address.', 400);
    }

    await prisma.systemSettings.upsert({
      where: { id: 'system' },
      create: { id: 'system', dailyReportRecipients: parsed.data.recipients },
      update: { dailyReportRecipients: parsed.data.recipients },
    });

    res.json({ recipients: parsed.data.recipients });
  } catch (error) {
    next(error);
  }
});

// POST /trigger — send report now (for testing)
router.post('/trigger', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const currentUser = await prisma.employee.findUnique({ where: { id: req.user!.id } });
    if (!currentUser?.isAdmin) throw new AppError('Admin access required', 403);

    const result = await generateAndSendReport();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
