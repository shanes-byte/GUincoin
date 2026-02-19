/**
 * File upload service for handling document and image uploads.
 *
 * Provides secure file upload handling with:
 * - MIME type validation
 * - Magic number verification to prevent type spoofing
 * - Unique filename generation
 * - Configurable file size limits
 *
 * @module services/fileService
 */

import { Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

/** Maximum file size in bytes (default: 5MB) */
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880');

const uploadDir = process.env.UPLOAD_DIR || './uploads';
const publicUploadDir = path.join(uploadDir, 'store');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(publicUploadDir)) {
  fs.mkdirSync(publicUploadDir, { recursive: true });
}

// Magic number signatures for file type verification
const MAGIC_NUMBERS: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]], // GIF87a, GIF89a
};

/**
 * Verifies that a file's content matches its declared MIME type.
 *
 * Reads the first 8 bytes of the file and compares against known magic number signatures.
 * This prevents attackers from uploading malicious files with spoofed extensions.
 *
 * @param filePath - Path to the uploaded file
 * @param declaredMime - The MIME type declared by the client
 * @returns True if the file content matches the declared type, false otherwise
 */
function verifyFileMagicNumber(filePath: string, declaredMime: string): boolean {
  const signatures = MAGIC_NUMBERS[declaredMime];
  if (!signatures) return true; // No signature to check, allow

  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(8);
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    return signatures.some((sig) =>
      sig.every((byte, i) => buffer[i] === byte)
    );
  } catch {
    return false;
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow PDF and image files
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and image files are allowed.'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

// Post-upload middleware to verify magic numbers
export const verifyUploadedFile = (req: Request, res: any, next: any) => {
  if (!req.file) return next();

  const isValid = verifyFileMagicNumber(
    req.file.path,
    req.file.mimetype
  );

  if (!isValid) {
    // Delete the suspicious file
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'File content does not match its declared type' });
  }

  next();
};

const publicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, publicUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const publicUpload = multer({
  storage: publicStorage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

/**
 * Generates the full URL for accessing an uploaded file.
 *
 * @param filename - The unique filename generated during upload
 * @returns Full URL to access the file via the API
 */
// [ORIGINAL - 2026-02-19] Used absolute URL with BACKEND_URL, broke on other machines
// export const getFileUrl = (filename: string): string => {
//   const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
//   return `${baseUrl}/api/files/${filename}`;
// };
export const getFileUrl = (filename: string): string => {
  return `/api/files/${filename}`;
};

/**
 * Generates the full URL for accessing a public file (e.g., store product images).
 *
 * @param filename - The unique filename generated during upload
 * @returns Full URL to access the public file
 */
// [ORIGINAL - 2026-02-19] Same absolute URL issue
// export const getPublicFileUrl = (filename: string): string => {
//   const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
//   return `${baseUrl}/api/files/public/${filename}`;
// };
export const getPublicFileUrl = (filename: string): string => {
  return `/api/files/public/${filename}`;
};

/**
 * Returns the directory path for public uploads (store images).
 *
 * @returns Absolute path to the public upload directory
 */
export const getPublicUploadDir = (): string => publicUploadDir;
