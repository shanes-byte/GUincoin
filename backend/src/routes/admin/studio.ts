import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { studioService, CampaignTheme, ThemeMode } from '../../services/studioService';
// [ORIGINAL - 2026-02-06] No auth middleware was imported or applied — all routes were publicly accessible
import { requireAuth, requireAdmin } from '../../middleware/auth';

const router = Router();

// Theme validation schema
const themeSchema = z.object({
  primaryColor: z.string(),
  primaryHoverColor: z.string(),
  primaryLightColor: z.string(),
  secondaryColor: z.string(),
  accentColor: z.string(),
  backgroundColor: z.string(),
  surfaceColor: z.string(),
  textPrimaryColor: z.string(),
  textSecondaryColor: z.string(),
  navTextColor: z.string().optional(),
  navTextInactiveColor: z.string().optional(),
  navTextHoverColor: z.string().optional(),
  presetName: z.string().optional(),
  backgroundImageUrl: z.string().optional(),
  backgroundPattern: z.string().optional(),
  enableAnimations: z.boolean().optional(),
  animationType: z.enum(['confetti', 'particles', 'gradient', 'none']).optional(),
});

/**
 * GET /api/admin/studio/state
 * Get full studio state including settings, active campaign, and current theme
 */
router.get('/studio/state', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const state = await studioService.getStudioState();
    res.json(state);
  } catch (error) {
    console.error('Failed to get studio state:', error);
    res.status(500).json({ error: 'Failed to get studio state' });
  }
});

/**
 * GET /api/admin/studio/settings
 * Get current system settings
 */
router.get('/studio/settings', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const settings = await studioService.getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Failed to get settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

/**
 * PATCH /api/admin/theme/mode
 * Set theme mode (manual or campaign)
 */
router.patch('/theme/mode', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      mode: z.enum(['manual', 'campaign']),
    });

    const { mode } = schema.parse(req.body);
    const settings = await studioService.setThemeMode(mode as ThemeMode);
    res.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid mode', details: error.errors });
    }
    console.error('Failed to set theme mode:', error);
    res.status(500).json({ error: 'Failed to set theme mode' });
  }
});

/**
 * PATCH /api/admin/theme/manual
 * Set manual theme
 */
router.patch('/theme/manual', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      theme: themeSchema,
      switchToManualMode: z.boolean().optional().default(true),
    });

    const { theme, switchToManualMode } = schema.parse(req.body);
    const settings = await studioService.setManualTheme(theme as CampaignTheme, switchToManualMode);
    res.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid theme', details: error.errors });
    }
    console.error('Failed to set manual theme:', error);
    res.status(500).json({ error: 'Failed to set manual theme' });
  }
});

/**
 * GET /api/admin/theme/current
 * Get the current active theme (considering mode and campaign status)
 */
router.get('/theme/current', requireAuth, async (req: Request, res: Response) => {
  try {
    const theme = await studioService.getCurrentTheme();
    res.json(theme);
  } catch (error) {
    console.error('Failed to get current theme:', error);
    res.status(500).json({ error: 'Failed to get current theme' });
  }
});

/**
 * POST /api/admin/campaigns/:id/activate-full
 * Full campaign activation with optional theme, email, and chat rollout
 */
router.post('/campaigns/:id/activate-full', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const schema = z.object({
      applyTheme: z.boolean().optional().default(true),
      sendEmail: z.boolean().optional().default(false),
      postChat: z.boolean().optional().default(false),
      emailRecipientType: z.enum(['all', 'managers', 'employees']).optional(),
      chatWebhookUrl: z.string().url().optional(),
    });

    const options = schema.parse(req.body);
    const result = await studioService.activateCampaignFull(id, options);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid options', details: error.errors });
    }
    console.error('Failed to activate campaign:', error);
    res.status(500).json({ error: 'Failed to activate campaign' });
  }
});

export default router;
