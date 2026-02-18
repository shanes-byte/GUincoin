import { Prisma } from '@prisma/client';
import prisma from '../config/database';

export interface CampaignTheme {
  primaryColor: string;
  primaryHoverColor: string;
  primaryLightColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
  navTextColor?: string;
  navTextInactiveColor?: string;
  navTextHoverColor?: string;
  presetName?: string;
  backgroundImageUrl?: string;
  backgroundPattern?: string;
  enableAnimations?: boolean;
  animationType?: 'confetti' | 'particles' | 'gradient' | 'none';
}

export type ThemeMode = 'manual' | 'campaign';

export interface SystemSettings {
  id: string;
  themeMode: ThemeMode;
  manualTheme: CampaignTheme | null;
  updatedAt: Date;
}

export interface StudioState {
  settings: SystemSettings;
  activeCampaign: {
    id: string;
    name: string;
    status: string;
    theme: CampaignTheme;
  } | null;
  currentTheme: CampaignTheme;
}

const DEFAULT_THEME: CampaignTheme = {
  primaryColor: '37 99 235',
  primaryHoverColor: '29 78 216',
  primaryLightColor: '219 234 254',
  secondaryColor: '124 58 237',
  accentColor: '16 185 129',
  backgroundColor: '249 250 251',
  surfaceColor: '255 255 255',
  textPrimaryColor: '17 24 39',
  textSecondaryColor: '107 114 128',
  navTextColor: '17 24 39',
  navTextInactiveColor: '75 85 99',
  navTextHoverColor: '55 65 81',
  enableAnimations: false,
  animationType: 'none',
};

// Default settings when SystemSettings table doesn't exist or is empty
const DEFAULT_SETTINGS: SystemSettings = {
  id: 'system',
  themeMode: 'campaign',
  manualTheme: null,
  updatedAt: new Date(),
};

/**
 * Safely parse JSON to CampaignTheme
 */
function parseTheme(json: Prisma.JsonValue | null): CampaignTheme | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return null;
  }
  // Validate that it has required fields
  const obj = json as Record<string, unknown>;
  if (typeof obj.primaryColor === 'string' && typeof obj.backgroundColor === 'string') {
    return obj as unknown as CampaignTheme;
  }
  return null;
}

class StudioService {
  /**
   * Check if SystemSettings table exists and is accessible
   */
  private async isSystemSettingsAvailable(): Promise<boolean> {
    try {
      // Try to query the table - this will fail if it doesn't exist
      await (prisma as any).systemSettings?.findUnique({ where: { id: 'system' } });
      return true;
    } catch (error) {
      // Table doesn't exist or isn't accessible
      console.warn('SystemSettings table not available:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Get or create system settings
   */
  async getSettings(): Promise<SystemSettings> {
    try {
      // Check if the table is available
      if (!(await this.isSystemSettingsAvailable())) {
        return DEFAULT_SETTINGS;
      }

      let settings = await (prisma as any).systemSettings.findUnique({
        where: { id: 'system' },
      });

      if (!settings) {
        settings = await (prisma as any).systemSettings.create({
          data: {
            id: 'system',
            themeMode: 'campaign',
            manualTheme: Prisma.JsonNull,
          },
        });
      }

      return {
        id: settings.id,
        themeMode: (settings.themeMode as ThemeMode) || 'campaign',
        manualTheme: parseTheme(settings.manualTheme),
        updatedAt: settings.updatedAt,
      };
    } catch (error) {
      console.error('Error getting settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Get the full studio state including settings, active campaign, and current theme
   */
  async getStudioState(): Promise<StudioState> {
    const settings = await this.getSettings();

    // Get active campaign
    let activeCampaign = null;
    try {
      const campaign = await prisma.campaign.findFirst({
        where: { status: 'active' },
        select: {
          id: true,
          name: true,
          status: true,
          theme: true,
        },
      });

      if (campaign) {
        activeCampaign = {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          theme: parseTheme(campaign.theme) || DEFAULT_THEME,
        };
      }
    } catch (error) {
      console.error('Error getting active campaign:', error);
    }

    // Determine current theme based on mode
    let currentTheme: CampaignTheme;
    if (settings.themeMode === 'manual' && settings.manualTheme) {
      currentTheme = settings.manualTheme;
    } else if (activeCampaign) {
      currentTheme = activeCampaign.theme;
    } else {
      currentTheme = DEFAULT_THEME;
    }

    return {
      settings,
      activeCampaign,
      currentTheme,
    };
  }

  /**
   * Set the theme mode (manual or campaign)
   */
  async setThemeMode(mode: ThemeMode): Promise<SystemSettings> {
    try {
      if (!(await this.isSystemSettingsAvailable())) {
        return { ...DEFAULT_SETTINGS, themeMode: mode };
      }

      const settings = await (prisma as any).systemSettings.upsert({
        where: { id: 'system' },
        update: { themeMode: mode },
        create: {
          id: 'system',
          themeMode: mode,
          manualTheme: Prisma.JsonNull,
        },
      });

      return {
        id: settings.id,
        themeMode: settings.themeMode as ThemeMode,
        manualTheme: parseTheme(settings.manualTheme),
        updatedAt: settings.updatedAt,
      };
    } catch (error) {
      console.error('Error setting theme mode:', error);
      return { ...DEFAULT_SETTINGS, themeMode: mode };
    }
  }

  /**
   * Set manual theme (and optionally switch to manual mode)
   */
  async setManualTheme(
    theme: CampaignTheme,
    switchToManualMode = true
  ): Promise<SystemSettings> {
    try {
      if (!(await this.isSystemSettingsAvailable())) {
        return {
          ...DEFAULT_SETTINGS,
          themeMode: switchToManualMode ? 'manual' : 'campaign',
          manualTheme: theme,
        };
      }

      const settings = await (prisma as any).systemSettings.upsert({
        where: { id: 'system' },
        update: {
          manualTheme: theme as unknown as Prisma.InputJsonValue,
          ...(switchToManualMode ? { themeMode: 'manual' } : {}),
        },
        create: {
          id: 'system',
          themeMode: switchToManualMode ? 'manual' : 'campaign',
          manualTheme: theme as unknown as Prisma.InputJsonValue,
        },
      });

      return {
        id: settings.id,
        themeMode: settings.themeMode as ThemeMode,
        manualTheme: parseTheme(settings.manualTheme),
        updatedAt: settings.updatedAt,
      };
    } catch (error) {
      console.error('Error setting manual theme:', error);
      return {
        ...DEFAULT_SETTINGS,
        themeMode: switchToManualMode ? 'manual' : 'campaign',
        manualTheme: theme,
      };
    }
  }

  /**
   * Get the current active theme (considering mode and campaign status)
   */
  async getCurrentTheme(): Promise<CampaignTheme> {
    const state = await this.getStudioState();
    return state.currentTheme;
  }

  /**
   * Set or clear the background image URL in SystemSettings.manualTheme.
   * Sets themeMode to 'manual' if setting an image, preserves existing theme colors.
   */
  async setBackgroundImage(imageUrl: string | null): Promise<SystemSettings> {
    try {
      if (!(await this.isSystemSettingsAvailable())) {
        return { ...DEFAULT_SETTINGS, themeMode: 'manual', manualTheme: imageUrl ? { ...DEFAULT_THEME, backgroundImageUrl: imageUrl } : null };
      }

      const current = await this.getSettings();
      const currentTheme = current.manualTheme || await this.getCurrentTheme();

      const updatedTheme: CampaignTheme = {
        ...currentTheme,
        backgroundImageUrl: imageUrl || undefined,
      };

      // If clearing the image, remove the key entirely
      if (!imageUrl) {
        delete updatedTheme.backgroundImageUrl;
      }

      return this.setManualTheme(updatedTheme, true);
    } catch (error) {
      console.error('Error setting background image:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Full campaign activation with optional distribution
   */
  async activateCampaignFull(
    campaignId: string,
    options: {
      applyTheme?: boolean;
      sendEmail?: boolean;
      postChat?: boolean;
      emailRecipientType?: 'all' | 'managers' | 'employees';
      chatWebhookUrl?: string;
    } = {}
  ): Promise<{
    campaign: any;
    themeApplied: boolean;
    emailSent: boolean;
    chatPosted: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let themeApplied = false;
    let emailSent = false;
    let chatPosted = false;

    try {
      // 1. Activate the campaign
      const campaign = await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'active' },
        include: {
          campaignTasks: true,
        },
      });

      // 2. Deactivate other campaigns
      await prisma.campaign.updateMany({
        where: {
          id: { not: campaignId },
          status: 'active',
        },
        data: { status: 'completed' },
      });

      // 3. Apply theme (switch to campaign mode)
      if (options.applyTheme !== false) {
        try {
          await this.setThemeMode('campaign');
          themeApplied = true;
        } catch (err) {
          errors.push(`Failed to apply theme: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      // 4. Send email (if requested)
      if (options.sendEmail) {
        // TODO: Integrate with campaignDistributionService
        emailSent = false;
        errors.push('Email distribution not yet implemented');
      }

      // 5. Post to chat (if requested)
      if (options.postChat && options.chatWebhookUrl) {
        // TODO: Integrate with campaignDistributionService
        chatPosted = false;
        errors.push('Chat posting not yet implemented');
      }

      return {
        campaign,
        themeApplied,
        emailSent,
        chatPosted,
        errors,
      };
    } catch (error) {
      throw new Error(`Failed to activate campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const studioService = new StudioService();
