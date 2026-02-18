import { Router } from 'express';
import bannerService from '../services/bannerService';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ banners: [] });
});

// [ORIGINAL - 2026-02-18] No active-background endpoint existed
/**
 * GET /api/banners/active-background
 * Public (no auth) — returns the active background image URL for use on unauthenticated pages (e.g. login).
 */
router.get('/active-background', async (_req, res) => {
  try {
    const banner = await bannerService.getActiveBackground();
    if (banner && banner.imageUrl) {
      res.json({ imageUrl: banner.imageUrl });
    } else {
      res.json({ imageUrl: null });
    }
  } catch (error) {
    console.error('Failed to get active background:', error);
    res.json({ imageUrl: null });
  }
});

export default router;
