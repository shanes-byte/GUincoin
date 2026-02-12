import express from 'express';
import emailTemplatesRoutes from './emailTemplates';
import wellnessRoutes from './wellness';
import storeRoutes from './store';
import purchasesRoutes from './purchases';
import usersRoutes from './users';
import googleChatRoutes from './googleChat';
import campaignsRoutes from './campaigns';
import bannersRoutes from './banners';
import gamesRoutes from './games';
import studioRoutes from './studio';
import settingsRoutes from './settings';

import awardPresetsRoutes from './awardPresets';

const router = express.Router();

// Mount all admin sub-routes
router.use(emailTemplatesRoutes);
router.use(wellnessRoutes);
router.use(storeRoutes);
router.use(purchasesRoutes);
router.use(usersRoutes);
router.use(googleChatRoutes);
router.use(campaignsRoutes);
router.use(bannersRoutes);
router.use('/games', gamesRoutes);
router.use(studioRoutes);
router.use('/settings', settingsRoutes);

router.use(awardPresetsRoutes);

export default router;
