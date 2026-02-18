import prisma from '../config/database';
import { BannerPosition } from '@prisma/client';

export type PageName = 'home' | 'store' | 'wellness' | 'games';

// [ORIGINAL - 2026-02-18] Only had hero/sidebar/inline dimensions, no background type
// export const BANNER_DIMENSIONS = {
//   hero: { width: 1200, height: 400 },
//   sidebar: { width: 300, height: 250 },
//   inline: { width: 728, height: 90 },
// };
export const BANNER_DIMENSIONS: Record<string, { width: number; height: number }> = {
  hero: { width: 1200, height: 400 },
  sidebar: { width: 300, height: 250 },
  sidebar_left: { width: 160, height: 600 },
  sidebar_right: { width: 160, height: 600 },
  header: { width: 728, height: 90 },
  footer: { width: 728, height: 90 },
  inline: { width: 728, height: 90 },
  background: { width: 1920, height: 1080 },
};

// [ORIGINAL - 2026-02-18] All methods were stubs returning empty/mock data
// const bannerService = { async listBanners(...): Promise<any[]> { return []; }, ... };
const bannerService = {
  async listBanners(filters: {
    position?: string;
    campaignId?: string;
    isActive?: boolean;
  }): Promise<any[]> {
    const where: any = {};
    if (filters.position) {
      where.position = filters.position as BannerPosition;
    }
    if (filters.campaignId) {
      where.campaignId = filters.campaignId;
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    return prisma.banner.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      include: { campaign: { select: { id: true, name: true, status: true } } },
    });
  },

  async getBannerById(id: string): Promise<any> {
    return prisma.banner.findUniqueOrThrow({
      where: { id },
      include: { campaign: { select: { id: true, name: true, status: true } } },
    });
  },

  async createBanner(data: Record<string, unknown>): Promise<any> {
    const position = data.position as string;
    const dims = BANNER_DIMENSIONS[position] || { width: 1200, height: 400 };
    return prisma.banner.create({
      data: {
        name: data.name as string,
        position: data.position as BannerPosition,
        campaignId: (data.campaignId as string) || null,
        width: dims.width,
        height: dims.height,
        showOnDashboard: (data.showOnDashboard as boolean) ?? true,
        showOnTransfers: (data.showOnTransfers as boolean) ?? true,
        showOnStore: (data.showOnStore as boolean) ?? true,
        showOnWellness: (data.showOnWellness as boolean) ?? true,
        showOnManager: (data.showOnManager as boolean) ?? true,
        isActive: (data.isActive as boolean) ?? true,
        displayOrder: (data.displayOrder as number) ?? 0,
        imagePositionX: (data.imagePositionX as string) ?? 'center',
        imagePositionY: (data.imagePositionY as string) ?? 'center',
        textOverlay: data.textOverlay ? (data.textOverlay as any) : undefined,
      },
    });
  },

  async updateBanner(id: string, data: Record<string, unknown>): Promise<any> {
    return prisma.banner.update({
      where: { id },
      data: data as any,
    });
  },

  async updateBannerImage(
    id: string,
    imageUrl: string,
    isAiGenerated: boolean,
    aiPromptUsed?: string
  ): Promise<any> {
    return prisma.banner.update({
      where: { id },
      data: {
        imageUrl,
        isAiGenerated,
        ...(aiPromptUsed !== undefined ? { aiPromptUsed } : {}),
      },
    });
  },

  async deleteBanner(id: string): Promise<void> {
    await prisma.banner.delete({ where: { id } });
  },

  async toggleBanner(id: string): Promise<any> {
    const banner = await prisma.banner.findUniqueOrThrow({ where: { id } });
    const newActive = !banner.isActive;

    // If activating a background banner, deactivate all other background banners
    if (newActive && banner.position === 'background') {
      await prisma.banner.updateMany({
        where: {
          position: 'background',
          id: { not: id },
          isActive: true,
        },
        data: { isActive: false },
      });
    }

    return prisma.banner.update({
      where: { id },
      data: { isActive: newActive },
    });
  },

  async getActiveBackground(): Promise<any | null> {
    return prisma.banner.findFirst({
      where: {
        position: 'background',
        isActive: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  },
};

export default bannerService;
