export type PageName = 'home' | 'store' | 'wellness' | 'games';

export const BANNER_DIMENSIONS = {
  hero: { width: 1200, height: 400 },
  sidebar: { width: 300, height: 250 },
  inline: { width: 728, height: 90 },
};

const bannerService = {
  async listBanners(_filters: {
    position?: string;
    campaignId?: string;
    isActive?: boolean;
  }): Promise<any[]> {
    return [];
  },

  async getBannerById(id: string): Promise<any> {
    return { id, imageUrl: '', isActive: true, position: 'hero' };
  },

  async createBanner(data: Record<string, unknown>): Promise<any> {
    return data;
  },

  async updateBanner(id: string, data: Record<string, unknown>): Promise<any> {
    return { id, ...data };
  },

  async updateBannerImage(
    id: string,
    imageUrl: string,
    _isExternal: boolean,
    _prompt?: string
  ): Promise<any> {
    return { id, imageUrl };
  },

  async deleteBanner(_id: string): Promise<void> {
    return;
  },

  async toggleBanner(id: string): Promise<any> {
    return { id, isActive: false };
  },
};

export default bannerService;
