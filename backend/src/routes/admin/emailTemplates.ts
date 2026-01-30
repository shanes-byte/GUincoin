import express from 'express';
import { z } from 'zod';
import { requireAdmin, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import {
  isTemplateKey,
  listEmailTemplates,
  upsertEmailTemplate,
} from '../../services/emailTemplateService';
import { AppError } from '../../utils/errors';

const router = express.Router();

const emailTemplateUpdateSchema = z.object({
  params: z.object({
    key: z.string(),
  }),
  body: z.object({
    subject: z.string().min(1),
    html: z.string().min(1),
    isEnabled: z.boolean().optional(),
  }),
});

// Get email templates
router.get('/email-templates', requireAdmin, async (_req: AuthRequest, res, next) => {
  try {
    const templates = await listEmailTemplates();
    res.json(templates);
  } catch (error) {
    next(error);
  }
});

// Update email template
router.put(
  '/email-templates/:key',
  requireAdmin,
  validate(emailTemplateUpdateSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { key } = req.params;
      if (!isTemplateKey(key)) {
        throw new AppError('Email template not found', 404);
      }

      const { subject, html, isEnabled } = req.body;
      const updated = await upsertEmailTemplate(key, { subject, html, isEnabled });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
