import express from 'express';
import path from 'path';
import fs from 'fs';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getPublicUploadDir } from '../services/fileService';

const router = express.Router();

// Serve public store images (no auth)
router.get('/public/:filename', (req, res) => {
  const filename = req.params.filename;
  const uploadDir = getPublicUploadDir();
  const filePath = path.join(uploadDir, filename);

  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(uploadDir);

  if (!resolvedPath.startsWith(resolvedDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(resolvedPath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.sendFile(resolvedPath, (err) => {
    if (err) {
      console.error('Error sending public file:', err);
      res.status(500).json({ error: 'Error serving file' });
    }
  });
});

// Serve banner images (no auth, public assets)
router.get('/banners/:filename', (req, res) => {
  const filename = req.params.filename;
  const bannerUploadDir = path.join(process.env.UPLOAD_DIR || './uploads', 'banners');
  const filePath = path.join(bannerUploadDir, filename);

  // Security: prevent directory traversal
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(bannerUploadDir);

  if (!resolvedPath.startsWith(resolvedDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(resolvedPath)) {
    return res.status(404).json({ error: 'Banner image not found' });
  }

  // Set caching headers for images
  res.setHeader('Cache-Control', 'public, max-age=86400');

  res.sendFile(resolvedPath, (err) => {
    if (err) {
      console.error('Error sending banner file:', err);
      res.status(500).json({ error: 'Error serving file' });
    }
  });
});

// Serve campaign images (no auth required for public campaign assets)
router.get('/campaigns/:campaignId/:filename', (req, res) => {
  const { campaignId, filename } = req.params;
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const filePath = path.join(uploadDir, 'campaigns', campaignId, filename);

  // Security: prevent directory traversal
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(path.join(uploadDir, 'campaigns'));

  if (!resolvedPath.startsWith(resolvedDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(resolvedPath)) {
    return res.status(404).json({ error: 'Campaign image not found' });
  }

  // Set caching headers for images
  res.setHeader('Cache-Control', 'public, max-age=86400');

  res.sendFile(resolvedPath, (err) => {
    if (err) {
      console.error('Error sending campaign file:', err);
      res.status(500).json({ error: 'Error serving file' });
    }
  });
});

// Serve uploaded files (require authentication)
router.get('/:filename', requireAuth, (req: AuthRequest, res) => {
  const filename = req.params.filename;
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const filePath = path.join(uploadDir, filename);

  // Security: prevent directory traversal
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(uploadDir);

  if (!resolvedPath.startsWith(resolvedDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Check if file exists
  if (!fs.existsSync(resolvedPath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.sendFile(resolvedPath, (err) => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(500).json({ error: 'Error serving file' });
    }
  });
});

export default router;
