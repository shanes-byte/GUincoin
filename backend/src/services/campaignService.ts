import prisma from '../config/database';
import { Campaign, CampaignStatus, CampaignTask, Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';

/**
 * Theme configuration for campaigns.
 * Stored as JSON in the Campaign.theme field.
 */
export interface CampaignTheme {
  primaryColor: string;      // RGB values, e.g., "37 99 235"
  primaryHoverColor: string;
  primaryLightColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
  // Navigation text colors for better visibility
  navTextColor?: string;          // Active nav text color
  navTextInactiveColor?: string;  // Inactive nav text color
  navTextHoverColor?: string;     // Hover nav text color
  presetName?: string;       // Name of preset if used
  backgroundImageUrl?: string;
  backgroundPattern?: string;
  enableAnimations?: boolean;
  animationType?: 'confetti' | 'particles' | 'gradient' | 'none';
}

/**
 * Predefined theme presets for easy campaign setup.
 */
export const THEME_PRESETS: Record<string, CampaignTheme> = {
  default: {
    primaryColor: '37 99 235',
    primaryHoverColor: '29 78 216',
    primaryLightColor: '219 234 254',
    secondaryColor: '124 58 237',
    accentColor: '16 185 129',
    backgroundColor: '249 250 251',
    surfaceColor: '255 255 255',
    textPrimaryColor: '17 24 39',
    textSecondaryColor: '107 114 128',
    navTextColor: '17 24 39',          // gray-900
    navTextInactiveColor: '75 85 99',  // gray-600 (better contrast than gray-500)
    navTextHoverColor: '55 65 81',     // gray-700
    presetName: 'default',
    enableAnimations: false,
    animationType: 'none',
  },
  wellness_month: {
    primaryColor: '16 185 129',
    primaryHoverColor: '5 150 105',
    primaryLightColor: '209 250 229',
    secondaryColor: '20 184 166',
    accentColor: '34 197 94',
    backgroundColor: '240 253 244',
    surfaceColor: '255 255 255',
    textPrimaryColor: '17 24 39',
    textSecondaryColor: '107 114 128',
    navTextColor: '4 120 87',          // emerald-700
    navTextInactiveColor: '75 85 99',  // gray-600
    navTextHoverColor: '6 95 70',      // emerald-800
    presetName: 'wellness_month',
    enableAnimations: true,
    animationType: 'particles',
  },
  holiday: {
    primaryColor: '220 38 38',
    primaryHoverColor: '185 28 28',
    primaryLightColor: '254 226 226',
    secondaryColor: '22 163 74',
    accentColor: '234 179 8',
    backgroundColor: '254 249 242',
    surfaceColor: '255 255 255',
    textPrimaryColor: '17 24 39',
    textSecondaryColor: '107 114 128',
    navTextColor: '153 27 27',         // red-800
    navTextInactiveColor: '75 85 99',  // gray-600
    navTextHoverColor: '127 29 29',    // red-900
    presetName: 'holiday',
    enableAnimations: true,
    animationType: 'confetti',
  },
  summer_challenge: {
    primaryColor: '249 115 22',
    primaryHoverColor: '234 88 12',
    primaryLightColor: '255 237 213',
    secondaryColor: '14 165 233',
    accentColor: '245 158 11',
    backgroundColor: '255 251 235',
    surfaceColor: '255 255 255',
    textPrimaryColor: '17 24 39',
    textSecondaryColor: '107 114 128',
    navTextColor: '154 52 18',         // orange-800
    navTextInactiveColor: '75 85 99',  // gray-600
    navTextHoverColor: '124 45 18',    // orange-900
    presetName: 'summer_challenge',
    enableAnimations: true,
    animationType: 'gradient',
  },
  breast_cancer_awareness: {
    primaryColor: '236 72 153',
    primaryHoverColor: '219 39 119',
    primaryLightColor: '252 231 243',
    secondaryColor: '244 114 182',
    accentColor: '190 24 93',
    backgroundColor: '253 242 248',
    surfaceColor: '255 255 255',
    textPrimaryColor: '17 24 39',
    textSecondaryColor: '107 114 128',
    navTextColor: '157 23 77',         // pink-800
    navTextInactiveColor: '75 85 99',  // gray-600
    navTextHoverColor: '131 24 67',    // pink-900
    presetName: 'breast_cancer_awareness',
    enableAnimations: true,
    animationType: 'particles',
  },
  spirit_week: {
    primaryColor: '139 92 246',
    primaryHoverColor: '124 58 237',
    primaryLightColor: '237 233 254',
    secondaryColor: '236 72 153',
    accentColor: '14 165 233',
    backgroundColor: '250 245 255',
    surfaceColor: '255 255 255',
    textPrimaryColor: '17 24 39',
    textSecondaryColor: '107 114 128',
    navTextColor: '91 33 182',         // violet-800
    navTextInactiveColor: '75 85 99',  // gray-600
    navTextHoverColor: '76 29 149',    // violet-900
    presetName: 'spirit_week',
    enableAnimations: true,
    animationType: 'confetti',
  },
};

interface CreateCampaignInput {
  name: string;
  description?: string;
  slug: string;
  startDate?: Date | null;  // Optional - leave empty for no date restriction
  endDate?: Date | null;    // Optional - leave empty for no date restriction
  theme: CampaignTheme;
  createdById: string;
}

interface UpdateCampaignInput {
  name?: string;
  description?: string;
  slug?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  theme?: CampaignTheme;
  status?: CampaignStatus;
  bannerImageUrl?: string;
  posterImageUrl?: string;
  emailBannerUrl?: string;
  chatImageUrl?: string;
  aiPromptUsed?: string;
}

interface CampaignFilters {
  status?: CampaignStatus;
  search?: string;
}

interface LinkTaskInput {
  wellnessTaskId: string;
  bonusMultiplier?: number;
  displayOrder?: number;
}

interface CreateExclusiveTaskInput {
  name: string;
  description?: string;
  coinValue: number;
  displayOrder?: number;
}

/**
 * Service for managing wellness campaigns.
 * Handles campaign CRUD, theming, task linking, and status management.
 */
export class CampaignService {
  /**
   * Generate a URL-friendly slug from the campaign name.
   */
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50);
  }

  /**
   * Create a new campaign.
   */
  async createCampaign(data: CreateCampaignInput): Promise<Campaign> {
    // Check for slug uniqueness
    const existingSlug = await prisma.campaign.findUnique({
      where: { slug: data.slug },
    });

    if (existingSlug) {
      throw new AppError('Campaign with this slug already exists', 400);
    }

    // Validate dates only if both are provided
    if (data.startDate && data.endDate && data.startDate >= data.endDate) {
      throw new AppError('End date must be after start date', 400);
    }

    return prisma.campaign.create({
      data: {
        name: data.name,
        description: data.description,
        slug: data.slug,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        theme: data.theme as unknown as Prisma.InputJsonValue,
        createdById: data.createdById,
        status: 'draft',
      },
    });
  }

  /**
   * Update a campaign.
   */
  async updateCampaign(id: string, data: UpdateCampaignInput): Promise<Campaign> {
    const campaign = await this.getCampaignById(id);

    // Check slug uniqueness if changing
    if (data.slug && data.slug !== campaign.slug) {
      const existingSlug = await prisma.campaign.findUnique({
        where: { slug: data.slug },
      });

      if (existingSlug) {
        throw new AppError('Campaign with this slug already exists', 400);
      }
    }

    // Validate dates only if both are provided (either from update or existing)
    const startDate = data.startDate !== undefined ? data.startDate : campaign.startDate;
    const endDate = data.endDate !== undefined ? data.endDate : campaign.endDate;
    if (startDate && endDate && startDate >= endDate) {
      throw new AppError('End date must be after start date', 400);
    }

    // Build update data, allowing null values for dates
    const updateData: Prisma.CampaignUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.bannerImageUrl !== undefined) updateData.bannerImageUrl = data.bannerImageUrl;
    if (data.posterImageUrl !== undefined) updateData.posterImageUrl = data.posterImageUrl;
    if (data.emailBannerUrl !== undefined) updateData.emailBannerUrl = data.emailBannerUrl;
    if (data.chatImageUrl !== undefined) updateData.chatImageUrl = data.chatImageUrl;
    if (data.aiPromptUsed !== undefined) updateData.aiPromptUsed = data.aiPromptUsed;
    if (data.theme !== undefined) updateData.theme = data.theme as unknown as Prisma.InputJsonValue;

    return prisma.campaign.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Get a campaign by ID with full details.
   */
  async getCampaignById(id: string): Promise<Campaign & { campaignTasks: CampaignTask[] }> {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        campaignTasks: {
          include: {
            wellnessTask: true,
          },
          orderBy: { displayOrder: 'asc' },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }

    return campaign as Campaign & { campaignTasks: CampaignTask[] };
  }

  /**
   * Get the currently active campaign (for theming).
   * Returns the first active campaign. If the campaign has dates, checks if within range.
   * Campaigns without dates are always considered "in range" when active.
   */
  async getActiveCampaign(): Promise<Campaign | null> {
    const now = new Date();

    // First try to find an active campaign within date range (if dates exist)
    const campaign = await prisma.campaign.findFirst({
      where: {
        status: 'active',
        OR: [
          // Campaign has no date restrictions
          { startDate: null, endDate: null },
          // Campaign is within date range
          {
            startDate: { lte: now },
            endDate: { gte: now },
          },
          // Campaign has start date but no end date (started and ongoing)
          {
            startDate: { lte: now },
            endDate: null,
          },
          // Campaign has end date but no start date (not yet ended)
          {
            startDate: null,
            endDate: { gte: now },
          },
        ],
      },
      include: {
        campaignTasks: {
          include: {
            wellnessTask: true,
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return campaign;
  }

  /**
   * List campaigns with optional filtering.
   */
  async listCampaigns(filters?: CampaignFilters): Promise<Campaign[]> {
    const where: Prisma.CampaignWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.campaign.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            campaignTasks: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    });
  }

  /**
   * Activate a campaign.
   * Works from ANY status (not just draft). Auto-deactivates currently active campaign.
   * If campaign has dates and hasn't started yet, schedules it instead.
   */
  async activateCampaign(id: string): Promise<Campaign> {
    const campaign = await this.getCampaignById(id);
    const now = new Date();

    // If campaign has dates, validate them
    if (campaign.startDate && campaign.startDate > now) {
      // Schedule for future activation
      return prisma.campaign.update({
        where: { id },
        data: { status: 'scheduled' },
      });
    }

    if (campaign.endDate && campaign.endDate < now) {
      throw new AppError('Cannot activate a campaign that has already ended', 400);
    }

    // Deactivate any other active campaigns
    await prisma.campaign.updateMany({
      where: {
        status: 'active',
        id: { not: id },
      },
      data: { status: 'completed' },
    });

    return prisma.campaign.update({
      where: { id },
      data: { status: 'active' },
    });
  }

  /**
   * Toggle a campaign's active status.
   * If active, deactivates it. If inactive, activates it.
   */
  async toggleCampaign(id: string): Promise<Campaign> {
    const campaign = await this.getCampaignById(id);

    if (campaign.status === 'active') {
      // Deactivate
      return this.deactivateCampaign(id);
    } else {
      // Activate (works from any status)
      return this.activateCampaign(id);
    }
  }

  /**
   * Deactivate a campaign.
   */
  async deactivateCampaign(id: string): Promise<Campaign> {
    return prisma.campaign.update({
      where: { id },
      data: { status: 'completed' },
    });
  }

  /**
   * Archive a campaign.
   */
  async archiveCampaign(id: string): Promise<Campaign> {
    return prisma.campaign.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  /**
   * Link an existing wellness task to a campaign.
   */
  async linkTaskToCampaign(
    campaignId: string,
    input: LinkTaskInput
  ): Promise<CampaignTask> {
    // Verify campaign exists
    await this.getCampaignById(campaignId);

    // Verify wellness task exists
    const wellnessTask = await prisma.wellnessTask.findUnique({
      where: { id: input.wellnessTaskId },
    });

    if (!wellnessTask) {
      throw new AppError('Wellness task not found', 404);
    }

    // Check if already linked
    const existing = await prisma.campaignTask.findUnique({
      where: {
        campaignId_wellnessTaskId: {
          campaignId,
          wellnessTaskId: input.wellnessTaskId,
        },
      },
    });

    if (existing) {
      throw new AppError('Task is already linked to this campaign', 400);
    }

    return prisma.campaignTask.create({
      data: {
        campaignId,
        wellnessTaskId: input.wellnessTaskId,
        bonusMultiplier: input.bonusMultiplier || 1,
        displayOrder: input.displayOrder || 0,
      },
    });
  }

  /**
   * Create a campaign-exclusive task.
   */
  async createExclusiveTask(
    campaignId: string,
    input: CreateExclusiveTaskInput
  ): Promise<CampaignTask> {
    // Verify campaign exists
    await this.getCampaignById(campaignId);

    return prisma.campaignTask.create({
      data: {
        campaignId,
        wellnessTaskId: null,
        name: input.name,
        description: input.description,
        coinValue: input.coinValue,
        displayOrder: input.displayOrder || 0,
        bonusMultiplier: 1,
      },
    });
  }

  /**
   * Update a campaign task.
   */
  async updateCampaignTask(
    taskId: string,
    data: { bonusMultiplier?: number; displayOrder?: number; name?: string; description?: string; coinValue?: number }
  ): Promise<CampaignTask> {
    return prisma.campaignTask.update({
      where: { id: taskId },
      data,
    });
  }

  /**
   * Unlink a task from a campaign.
   */
  async unlinkTask(campaignId: string, taskId: string): Promise<void> {
    await prisma.campaignTask.delete({
      where: { id: taskId },
    });
  }

  /**
   * Get all theme presets.
   */
  getThemePresets(): Record<string, CampaignTheme> {
    return THEME_PRESETS;
  }

  /**
   * Update campaign image URLs after generation.
   */
  async updateCampaignImages(
    id: string,
    images: {
      bannerImageUrl?: string;
      posterImageUrl?: string;
      emailBannerUrl?: string;
      chatImageUrl?: string;
      aiPromptUsed?: string;
    }
  ): Promise<Campaign> {
    return prisma.campaign.update({
      where: { id },
      data: images,
    });
  }

  /**
   * Record email sent timestamp.
   */
  async markEmailSent(id: string): Promise<Campaign> {
    return prisma.campaign.update({
      where: { id },
      data: { emailSentAt: new Date() },
    });
  }

  /**
   * Record chat posted timestamp.
   */
  async markChatPosted(id: string): Promise<Campaign> {
    return prisma.campaign.update({
      where: { id },
      data: { chatPostedAt: new Date() },
    });
  }

  /**
   * Get campaign tasks for display.
   * Normalizes decimal values and includes wellness task details.
   */
  async getCampaignTasks(campaignId: string) {
    const tasks = await prisma.campaignTask.findMany({
      where: { campaignId },
      include: {
        wellnessTask: true,
      },
      orderBy: { displayOrder: 'asc' },
    });

    return tasks.map((task) => ({
      ...task,
      coinValue: task.coinValue ? Number(task.coinValue) : null,
      bonusMultiplier: Number(task.bonusMultiplier),
      wellnessTask: task.wellnessTask
        ? {
            ...task.wellnessTask,
            coinValue: Number(task.wellnessTask.coinValue),
          }
        : null,
    }));
  }

  /**
   * Check and auto-update campaign statuses based on dates.
   * Called periodically or on request.
   * Only affects campaigns that have dates set.
   */
  async updateCampaignStatuses(): Promise<void> {
    const now = new Date();

    // Activate scheduled campaigns that have started (only those with dates)
    await prisma.campaign.updateMany({
      where: {
        status: 'scheduled',
        startDate: { lte: now },
        OR: [
          { endDate: { gte: now } },
          { endDate: null },
        ],
      },
      data: { status: 'active' },
    });

    // Complete active campaigns that have ended (only those with end dates)
    await prisma.campaign.updateMany({
      where: {
        status: 'active',
        endDate: { lt: now },
        NOT: { endDate: null },
      },
      data: { status: 'completed' },
    });
  }
}

export default new CampaignService();
