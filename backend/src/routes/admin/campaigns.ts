import express from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import campaignService, { CampaignTheme } from '../../services/campaignService';
import aiImageService from '../../services/aiImageService';
import campaignDistributionService, { RecipientType } from '../../services/campaignDistributionService';
import { AppError } from '../../utils/errors';
import { CampaignStatus } from '@prisma/client';

const router = express.Router();

// Schema for creating a campaign
const createCampaignSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().optional(),
    slug: z.string().min(1).max(50).optional(),
    startDate: z.string().datetime({ message: 'Invalid start date' }).optional().nullable(),
    endDate: z.string().datetime({ message: 'Invalid end date' }).optional().nullable(),
    theme: z.object({
      primaryColor: z.string(),
      primaryHoverColor: z.string(),
      primaryLightColor: z.string(),
      secondaryColor: z.string(),
      accentColor: z.string(),
      backgroundColor: z.string(),
      surfaceColor: z.string(),
      textPrimaryColor: z.string(),
      textSecondaryColor: z.string(),
      presetName: z.string().optional(),
      backgroundImageUrl: z.string().optional(),
      backgroundPattern: z.string().optional(),
      enableAnimations: z.boolean().optional(),
      animationType: z.enum(['confetti', 'particles', 'gradient', 'none']).optional(),
    }),
  }),
});

// Schema for updating a campaign
const updateCampaignSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    slug: z.string().min(1).max(50).optional(),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
    status: z.nativeEnum(CampaignStatus).optional(),
    theme: z.object({
      primaryColor: z.string(),
      primaryHoverColor: z.string(),
      primaryLightColor: z.string(),
      secondaryColor: z.string(),
      accentColor: z.string(),
      backgroundColor: z.string(),
      surfaceColor: z.string(),
      textPrimaryColor: z.string(),
      textSecondaryColor: z.string(),
      presetName: z.string().optional(),
      backgroundImageUrl: z.string().optional(),
      backgroundPattern: z.string().optional(),
      enableAnimations: z.boolean().optional(),
      animationType: z.enum(['confetti', 'particles', 'gradient', 'none']).optional(),
    }).optional(),
  }),
});

// Schema for linking a task
const linkTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    wellnessTaskId: z.string().uuid(),
    bonusMultiplier: z.number().min(0.1).max(10).optional(),
    displayOrder: z.number().int().min(0).optional(),
  }),
});

// Schema for creating an exclusive task
const createExclusiveTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    coinValue: z.number().positive(),
    displayOrder: z.number().int().min(0).optional(),
  }),
});

// Schema for updating a campaign task
const updateCampaignTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
    taskId: z.string().uuid(),
  }),
  body: z.object({
    bonusMultiplier: z.number().min(0.1).max(10).optional(),
    displayOrder: z.number().int().min(0).optional(),
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    coinValue: z.number().positive().optional(),
  }),
});

/**
 * GET /campaigns/test-openai
 * Test OpenAI connection (temporary debug endpoint)
 */
router.get('/campaigns/test-openai', requireAuth, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const isAvailable = aiImageService.isAvailable();
    const hasKey = !!process.env.OPENAI_API_KEY;
    const keyPrefix = process.env.OPENAI_API_KEY?.substring(0, 10) || 'not set';

    if (!isAvailable) {
      return res.json({
        status: 'not_configured',
        hasKey,
        keyPrefix: keyPrefix + '...',
        message: 'AI service is not available',
      });
    }

    // Try a simple API call to verify the key works
    const OpenAI = require('openai').default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // List models to verify API key works
    const models = await openai.models.list();
    const hasDalle = models.data.some((m: any) => m.id.includes('dall-e'));

    res.json({
      status: 'ok',
      hasKey: true,
      keyPrefix: keyPrefix + '...',
      hasDalle,
      modelCount: models.data.length,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      hasKey: !!process.env.OPENAI_API_KEY,
      keyPrefix: (process.env.OPENAI_API_KEY?.substring(0, 10) || 'not set') + '...',
      error: error.message,
      code: error.code,
      type: error.type,
    });
  }
});

/**
 * GET /campaigns
 * List all campaigns with optional filtering
 */
router.get('/campaigns', requireAuth, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const status = req.query.status as CampaignStatus | undefined;
    const search = req.query.search as string | undefined;

    const campaigns = await campaignService.listCampaigns({ status, search });

    // Normalize Decimal values
    const normalizedCampaigns = campaigns.map((campaign) => ({
      ...campaign,
      theme: campaign.theme as unknown as CampaignTheme,
    }));

    res.json(normalizedCampaigns);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /campaigns/active
 * Get the currently active campaign (for theming) - available to all authenticated users
 */
router.get('/campaigns/active', requireAuth, async (_req: AuthRequest, res, next) => {
  try {
    const campaign = await campaignService.getActiveCampaign();

    if (!campaign) {
      return res.json(null);
    }

    res.json({
      ...campaign,
      theme: campaign.theme as unknown as CampaignTheme,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /campaigns/theme-presets
 * Get available theme presets
 */
router.get('/campaigns/theme-presets', requireAuth, requireAdmin, async (_req: AuthRequest, res, next) => {
  try {
    const presets = campaignService.getThemePresets();
    res.json(presets);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /campaigns/:id
 * Get campaign details by ID
 */
router.get('/campaigns/:id', requireAuth, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const campaign = await campaignService.getCampaignById(req.params.id);

    // Get normalized campaign tasks
    const tasks = await campaignService.getCampaignTasks(campaign.id);

    res.json({
      ...campaign,
      theme: campaign.theme as unknown as CampaignTheme,
      campaignTasks: tasks,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /campaigns
 * Create a new campaign
 */
router.post(
  '/campaigns',
  requireAuth,
  requireAdmin,
  validate(createCampaignSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { name, description, slug, startDate, endDate, theme } = req.body;

      // Generate slug if not provided
      const campaignSlug = slug || campaignService.generateSlug(name);

      const campaign = await campaignService.createCampaign({
        name,
        description,
        slug: campaignSlug,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        theme: theme as CampaignTheme,
        createdById: req.user!.id,
      });

      res.status(201).json(campaign);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /campaigns/:id
 * Update a campaign
 */
router.put(
  '/campaigns/:id',
  requireAuth,
  requireAdmin,
  validate(updateCampaignSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { name, description, slug, startDate, endDate, status, theme } = req.body;

      const updateData: Parameters<typeof campaignService.updateCampaign>[1] = {};

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (slug !== undefined) updateData.slug = slug;
      if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
      if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
      if (status !== undefined) updateData.status = status;
      if (theme !== undefined) updateData.theme = theme as CampaignTheme;

      const campaign = await campaignService.updateCampaign(req.params.id, updateData);

      res.json(campaign);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /campaigns/:id
 * Archive a campaign (soft delete)
 */
router.delete('/campaigns/:id', requireAuth, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    await campaignService.archiveCampaign(req.params.id);
    res.json({ message: 'Campaign archived successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /campaigns/:id/activate
 * Activate a campaign
 */
router.post('/campaigns/:id/activate', requireAuth, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const campaign = await campaignService.activateCampaign(req.params.id);
    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /campaigns/:id/deactivate
 * Deactivate a campaign
 */
router.post('/campaigns/:id/deactivate', requireAuth, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const campaign = await campaignService.deactivateCampaign(req.params.id);
    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /campaigns/:id/toggle
 * Toggle a campaign's active status (activate if inactive, deactivate if active)
 */
router.post('/campaigns/:id/toggle', requireAuth, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const campaign = await campaignService.toggleCampaign(req.params.id);
    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /campaigns/:id/tasks
 * Get all tasks linked to a campaign
 */
router.get('/campaigns/:id/tasks', requireAuth, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const tasks = await campaignService.getCampaignTasks(req.params.id);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /campaigns/:id/tasks
 * Link an existing wellness task to a campaign
 */
router.post(
  '/campaigns/:id/tasks',
  requireAuth,
  requireAdmin,
  validate(linkTaskSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { wellnessTaskId, bonusMultiplier, displayOrder } = req.body;

      const campaignTask = await campaignService.linkTaskToCampaign(req.params.id, {
        wellnessTaskId,
        bonusMultiplier,
        displayOrder,
      });

      res.status(201).json(campaignTask);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /campaigns/:id/tasks/create
 * Create a campaign-exclusive task
 */
router.post(
  '/campaigns/:id/tasks/create',
  requireAuth,
  requireAdmin,
  validate(createExclusiveTaskSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { name, description, coinValue, displayOrder } = req.body;

      const campaignTask = await campaignService.createExclusiveTask(req.params.id, {
        name,
        description,
        coinValue,
        displayOrder,
      });

      res.status(201).json(campaignTask);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /campaigns/:id/tasks/:taskId
 * Update a campaign task (multiplier, order, etc.)
 */
router.put(
  '/campaigns/:id/tasks/:taskId',
  requireAuth,
  requireAdmin,
  validate(updateCampaignTaskSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const campaignTask = await campaignService.updateCampaignTask(req.params.taskId, req.body);
      res.json(campaignTask);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /campaigns/:id/tasks/:taskId
 * Unlink a task from a campaign
 */
router.delete('/campaigns/:id/tasks/:taskId', requireAuth, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    await campaignService.unlinkTask(req.params.id, req.params.taskId);
    res.json({ message: 'Task unlinked successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /campaigns/update-statuses
 * Manually trigger status updates (for scheduled -> active, active -> completed)
 */
router.post('/campaigns/update-statuses', requireAuth, requireAdmin, async (_req: AuthRequest, res, next) => {
  try {
    await campaignService.updateCampaignStatuses();
    res.json({ message: 'Campaign statuses updated' });
  } catch (error) {
    next(error);
  }
});

// =====================
// AI Image Generation
// =====================

const generateImagesSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    prompt: z.string().optional(),
    generateBanner: z.boolean().optional(),
    generatePoster: z.boolean().optional(),
    generateEmailBanner: z.boolean().optional(),
    generateChatImage: z.boolean().optional(),
    generateBackground: z.boolean().optional(),
  }),
});

/**
 * GET /campaigns/:id/ai-status
 * Check if AI image generation is available
 */
router.get('/campaigns/:id/ai-status', requireAuth, requireAdmin, async (_req: AuthRequest, res, next) => {
  try {
    res.json({
      available: aiImageService.isAvailable(),
      message: aiImageService.isAvailable()
        ? 'AI image generation is available'
        : 'AI image generation is not configured. Please set OPENAI_API_KEY.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /campaigns/:id/generate-images
 * Generate AI images for a campaign
 */
router.post(
  '/campaigns/:id/generate-images',
  requireAuth,
  requireAdmin,
  validate(generateImagesSchema),
  async (req: AuthRequest, res, next) => {
    try {
      if (!aiImageService.isAvailable()) {
        throw new AppError('AI image generation is not configured. Please set OPENAI_API_KEY.', 503);
      }

      const { prompt, generateBanner, generatePoster, generateEmailBanner, generateChatImage, generateBackground } = req.body;

      const results = await aiImageService.generateCampaignImages(req.params.id, prompt, {
        generateBanner,
        generatePoster,
        generateEmailBanner,
        generateChatImage,
        generateBackground,
      });

      res.json({
        message: 'Images generated successfully',
        images: results,
      });
    } catch (error) {
      next(error);
    }
  }
);

const regenerateImageSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
    type: z.enum(['banner', 'poster', 'emailBanner', 'chatImage', 'background']),
  }),
  body: z.object({
    prompt: z.string().optional(),
  }),
});

/**
 * POST /campaigns/:id/regenerate/:type
 * Regenerate a specific image type
 */
router.post(
  '/campaigns/:id/regenerate/:type',
  requireAuth,
  requireAdmin,
  validate(regenerateImageSchema),
  async (req: AuthRequest, res, next) => {
    try {
      if (!aiImageService.isAvailable()) {
        throw new AppError('AI image generation is not configured. Please set OPENAI_API_KEY.', 503);
      }

      const imageType = req.params.type as 'banner' | 'poster' | 'emailBanner' | 'chatImage' | 'background';
      const result = await aiImageService.regenerateImage(req.params.id, imageType, req.body.prompt);

      res.json({
        message: `${imageType} regenerated successfully`,
        image: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /campaigns/:id/assets
 * Get all generated assets for a campaign
 */
router.get('/campaigns/:id/assets', requireAuth, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const assets = await aiImageService.getCampaignAssets(req.params.id);
    res.json(assets);
  } catch (error) {
    next(error);
  }
});

// =====================
// Campaign Distribution
// =====================

const sendEmailSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    recipientType: z.enum(['all', 'managers', 'employees']).optional(),
  }),
});

/**
 * POST /campaigns/:id/send-email
 * Send campaign announcement email
 */
router.post(
  '/campaigns/:id/send-email',
  requireAuth,
  requireAdmin,
  validate(sendEmailSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const recipientType = (req.body.recipientType || 'all') as RecipientType;
      const result = await campaignDistributionService.sendCampaignEmail(req.params.id, recipientType);

      if (result.errors.length > 0) {
        res.status(207).json({
          message: `Email sent to ${result.recipientCount} recipients with ${result.errors.length} errors`,
          ...result,
        });
      } else {
        res.json({
          message: `Email sent successfully to ${result.recipientCount} recipients`,
          ...result,
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

const postChatSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    webhookUrl: z.string().url(),
  }),
});

/**
 * POST /campaigns/:id/post-chat
 * Post campaign announcement to Google Chat
 */
router.post(
  '/campaigns/:id/post-chat',
  requireAuth,
  requireAdmin,
  validate(postChatSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const result = await campaignDistributionService.postToGoogleChat(
        req.params.id,
        req.body.webhookUrl
      );

      if (result.success) {
        res.json({
          message: 'Campaign posted to Google Chat successfully',
          ...result,
        });
      } else {
        res.status(500).json({
          message: 'Failed to post to Google Chat',
          ...result,
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /campaigns/:id/distribution-status
 * Get distribution status for a campaign
 */
router.get('/campaigns/:id/distribution-status', requireAuth, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const status = await campaignDistributionService.getDistributionStatus(req.params.id);
    res.json(status);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /campaigns/:id/downloadable-assets
 * Get downloadable asset URLs for a campaign
 */
router.get('/campaigns/:id/downloadable-assets', requireAuth, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const assets = await campaignDistributionService.getDownloadableAssets(req.params.id);
    res.json(assets);
  } catch (error) {
    next(error);
  }
});

export default router;
