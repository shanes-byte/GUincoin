import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../services/api';

/**
 * Theme configuration for campaigns.
 * Matches the CampaignTheme interface from the backend.
 */
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
  // Navigation text colors for better visibility
  navTextColor?: string;
  navTextInactiveColor?: string;
  navTextHoverColor?: string;
  presetName?: string;
  backgroundImageUrl?: string;
  backgroundPattern?: string;
  enableAnimations?: boolean;
  animationType?: 'confetti' | 'particles' | 'gradient' | 'none';
}

/**
 * Campaign data from the API.
 */
export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'archived';
  startDate: string | null;  // Optional - may be null
  endDate: string | null;    // Optional - may be null
  theme: CampaignTheme;
  bannerImageUrl: string | null;
  posterImageUrl: string | null;
  emailBannerUrl: string | null;
  chatImageUrl: string | null;
  createdAt: string;
  campaignTasks?: CampaignTask[];
}

export interface CampaignTask {
  id: string;
  campaignId: string;
  wellnessTaskId: string | null;
  name: string | null;
  description: string | null;
  coinValue: number | null;
  bonusMultiplier: number;
  displayOrder: number;
  wellnessTask?: {
    id: string;
    name: string;
    description: string | null;
    coinValue: number;
    frequencyRule: string;
  } | null;
}

interface ThemeContextType {
  activeCampaign: Campaign | null;
  theme: CampaignTheme | null;
  isLoading: boolean;
  error: string | null;
  refreshTheme: () => Promise<void>;
  daysRemaining: number | null;
  isCampaignActive: boolean;
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
  navTextColor: '17 24 39',          // gray-900
  navTextInactiveColor: '75 85 99',  // gray-600 (better contrast)
  navTextHoverColor: '55 65 81',     // gray-700
  enableAnimations: false,
  animationType: 'none',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Local storage key for cached theme
const THEME_CACHE_KEY = 'guincoin_active_campaign_theme';
const THEME_CACHE_EXPIRY_KEY = 'guincoin_active_campaign_theme_expiry';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Apply theme colors to CSS variables.
 */
function applyTheme(theme: CampaignTheme): void {
  const root = document.documentElement;

  root.style.setProperty('--color-primary', theme.primaryColor);
  root.style.setProperty('--color-primary-hover', theme.primaryHoverColor);
  root.style.setProperty('--color-primary-light', theme.primaryLightColor);
  root.style.setProperty('--color-secondary', theme.secondaryColor);
  root.style.setProperty('--color-accent', theme.accentColor);
  root.style.setProperty('--color-background', theme.backgroundColor);
  root.style.setProperty('--color-surface', theme.surfaceColor);
  root.style.setProperty('--color-text-primary', theme.textPrimaryColor);
  root.style.setProperty('--color-text-secondary', theme.textSecondaryColor);

  // Navigation text colors
  root.style.setProperty('--color-nav-text', theme.navTextColor || '17 24 39');
  root.style.setProperty('--color-nav-text-inactive', theme.navTextInactiveColor || '75 85 99');
  root.style.setProperty('--color-nav-text-hover', theme.navTextHoverColor || '55 65 81');

  // Campaign-specific styles
  if (theme.backgroundImageUrl) {
    root.style.setProperty('--campaign-bg-image', `url(${theme.backgroundImageUrl})`);
  } else {
    root.style.setProperty('--campaign-bg-image', 'none');
  }

  if (theme.backgroundPattern) {
    root.style.setProperty('--campaign-bg-pattern', theme.backgroundPattern);
  } else {
    root.style.setProperty('--campaign-bg-pattern', 'none');
  }
}

/**
 * Calculate days remaining until campaign ends.
 * Returns null if no end date is set.
 */
function calculateDaysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [theme, setTheme] = useState<CampaignTheme>(DEFAULT_THEME);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Try to load cached theme immediately to prevent flash
  useEffect(() => {
    try {
      const cachedTheme = localStorage.getItem(THEME_CACHE_KEY);
      const expiry = localStorage.getItem(THEME_CACHE_EXPIRY_KEY);

      if (cachedTheme && expiry) {
        const expiryTime = parseInt(expiry, 10);
        if (Date.now() < expiryTime) {
          const parsed = JSON.parse(cachedTheme) as Campaign;
          setActiveCampaign(parsed);
          setTheme(parsed.theme);
          applyTheme(parsed.theme);
        }
      }
    } catch (err) {
      // Ignore cache errors
    }
  }, []);

  const refreshTheme = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get<Campaign | null>('/admin/campaigns/active');
      const campaign = response.data;

      if (campaign) {
        setActiveCampaign(campaign);
        setTheme(campaign.theme);
        applyTheme(campaign.theme);

        // Cache the theme
        localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(campaign));
        localStorage.setItem(THEME_CACHE_EXPIRY_KEY, (Date.now() + CACHE_DURATION_MS).toString());
      } else {
        setActiveCampaign(null);
        setTheme(DEFAULT_THEME);
        applyTheme(DEFAULT_THEME);

        // Clear cache
        localStorage.removeItem(THEME_CACHE_KEY);
        localStorage.removeItem(THEME_CACHE_EXPIRY_KEY);
      }
    } catch (err) {
      // On error, fall back to default theme
      setError('Failed to load campaign theme');
      setTheme(DEFAULT_THEME);
      applyTheme(DEFAULT_THEME);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch active campaign on mount
  useEffect(() => {
    refreshTheme();
  }, [refreshTheme]);

  // Calculate derived values
  const daysRemaining = activeCampaign ? calculateDaysRemaining(activeCampaign.endDate) : null;
  const isCampaignActive = activeCampaign !== null && activeCampaign.status === 'active';

  return (
    <ThemeContext.Provider
      value={{
        activeCampaign,
        theme,
        isLoading,
        error,
        refreshTheme,
        daysRemaining,
        isCampaignActive,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { DEFAULT_THEME };
