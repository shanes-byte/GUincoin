import { Router, Request, Response } from 'express';
import multer from 'multer';
import bulkImportService from '../../services/bulkImportService';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { PendingImportBalanceStatus } from '@prisma/client';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream', // Sometimes CSV files come through as this
    ];
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(csv|xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  },
});

/**
 * POST /admin/bulk-import/upload
 * Upload spreadsheet file(s) and get parsed data with column headers
 */
router.post(
  '/upload',
  requireAuth,
  requireAdmin,
  upload.fields([
    { name: 'balanceFile', maxCount: 1 },
    { name: 'emailFile', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      if (!files?.balanceFile?.[0]) {
        return res.status(400).json({ error: 'Balance file is required' });
      }

      const balanceFile = files.balanceFile[0];
      const balanceData = bulkImportService.parseSpreadsheet(balanceFile.buffer, balanceFile.originalname);
      const balanceHeaders = bulkImportService.getColumnHeaders(balanceData);

      let emailData: Record<string, unknown>[] = [];
      let emailHeaders: string[] = [];

      if (files.emailFile?.[0]) {
        const emailFile = files.emailFile[0];
        emailData = bulkImportService.parseSpreadsheet(emailFile.buffer, emailFile.originalname);
        emailHeaders = bulkImportService.getColumnHeaders(emailData);
      }

      res.json({
        balanceFile: {
          filename: balanceFile.originalname,
          rowCount: balanceData.length,
          headers: balanceHeaders,
          preview: balanceData.slice(0, 5),
        },
        emailFile: files.emailFile?.[0] ? {
          filename: files.emailFile[0].originalname,
          rowCount: emailData.length,
          headers: emailHeaders,
          preview: emailData.slice(0, 5),
        } : null,
      });
    } catch (error) {
      console.error('Upload error:', error);
      const message = error instanceof Error ? error.message : 'Failed to parse file';
      res.status(400).json({ error: message });
    }
  }
);

/**
 * POST /admin/bulk-import/preview
 * Preview merged data with name matching
 */
router.post(
  '/preview',
  requireAuth,
  requireAdmin,
  upload.fields([
    { name: 'balanceFile', maxCount: 1 },
    { name: 'emailFile', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const { balanceMapping, emailMapping } = req.body;

      if (!files?.balanceFile?.[0]) {
        return res.status(400).json({ error: 'Balance file is required' });
      }

      const parsedBalanceMapping = typeof balanceMapping === 'string' ? JSON.parse(balanceMapping) : balanceMapping;

      const balanceFile = files.balanceFile[0];
      const balanceRawData = bulkImportService.parseSpreadsheet(balanceFile.buffer, balanceFile.originalname);
      const balanceData = bulkImportService.extractBalanceData(balanceRawData, parsedBalanceMapping);

      let mergedRows;

      if (files.emailFile?.[0] && emailMapping) {
        const parsedEmailMapping = typeof emailMapping === 'string' ? JSON.parse(emailMapping) : emailMapping;
        const emailFile = files.emailFile[0];
        const emailRawData = bulkImportService.parseSpreadsheet(emailFile.buffer, emailFile.originalname);
        const emailData = bulkImportService.extractEmailData(emailRawData, parsedEmailMapping);

        mergedRows = bulkImportService.mergeDataFiles(balanceData, emailData);
      } else {
        // [ORIGINAL - 2026-02-06] Used balanceRawData[index] but index was from filtered balanceData —
        // after extractBalanceData filters out empty/zero rows, indices no longer match balanceRawData.
        // Fix: build email map from raw data before filtering, keyed by name.
        const emailByName: Record<string, string> = {};
        if (parsedBalanceMapping.emailColumn) {
          for (const rawRow of balanceRawData) {
            const name = parsedBalanceMapping.nameColumn
              ? String(rawRow[parsedBalanceMapping.nameColumn] || '').trim()
              : '';
            const email = String(rawRow[parsedBalanceMapping.emailColumn] || '').toLowerCase().trim();
            if (name && email) {
              emailByName[name] = email;
            }
          }
        }

        // Single file with email column - create merged rows directly
        mergedRows = balanceData.map((row, index) => ({
          name: row.name,
          email: emailByName[row.name] || '',
          amount: row.amount,
          market: row.market,
          confidence: 1,
          matchType: 'auto' as const,
          balanceRowIndex: index,
        }));
      }

      // Group by confidence level
      // [ORIGINAL - 2026-02-06] Medium threshold was 0.7, noMatch was < 0.7 — lowered to 0.5
      const highConfidence = mergedRows.filter(r => r.confidence >= 0.9 && r.email);
      const mediumConfidence = mergedRows.filter(r => r.confidence >= 0.5 && r.confidence < 0.9 && r.email);
      const noMatch = mergedRows.filter(r => !r.email || r.confidence < 0.5);

      res.json({
        rows: mergedRows,
        summary: {
          total: mergedRows.length,
          highConfidence: highConfidence.length,
          mediumConfidence: mediumConfidence.length,
          noMatch: noMatch.length,
          totalAmount: mergedRows.reduce((sum, r) => sum + r.amount, 0),
        },
      });
    } catch (error) {
      console.error('Preview error:', error);
      const message = error instanceof Error ? error.message : 'Failed to preview data';
      res.status(400).json({ error: message });
    }
  }
);

/**
 * POST /admin/bulk-import/validate
 * Validate import data before processing
 */
router.post('/validate', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { rows } = req.body;

    if (!rows || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'Rows array is required' });
    }

    const validationResult = await bulkImportService.validateImportData(rows);

    res.json(validationResult);
  } catch (error) {
    console.error('Validation error:', error);
    const message = error instanceof Error ? error.message : 'Validation failed';
    res.status(400).json({ error: message });
  }
});

/**
 * POST /admin/bulk-import/create
 * Create and process an import job
 */
router.post('/create', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, rows, columnMapping } = req.body;
    const user = req.user as { id: string };

    if (!name || !rows || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'Name and rows are required' });
    }

    const result = await bulkImportService.createImportJob({
      name,
      createdById: user.id,
      rows,
      columnMapping: columnMapping || {},
    });

    res.json(result);
  } catch (error) {
    console.error('Create import error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create import job';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /admin/bulk-import/jobs
 * List all import jobs
 */
router.get('/jobs', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await bulkImportService.getImportJobs({ limit, offset });

    res.json(result);
  } catch (error) {
    console.error('Get jobs error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get import jobs';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /admin/bulk-import/jobs/:id
 * Get details for a specific import job
 */
router.get('/jobs/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const job = await bulkImportService.getImportJob(id);

    if (!job) {
      return res.status(404).json({ error: 'Import job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Get job error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get import job';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /admin/bulk-import/jobs/:id/send-invitations
 * Send invitation emails for all pending balances in a job
 */
router.post('/jobs/:id/send-invitations', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await bulkImportService.sendBulkInvitations(id);

    res.json({
      message: `Sent ${result.sent} invitation(s)`,
      ...result,
    });
  } catch (error) {
    console.error('Send invitations error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send invitations';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /admin/bulk-import/pending
 * List all pending import balances
 */
router.get('/pending', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as PendingImportBalanceStatus | undefined;
    const email = req.query.email as string | undefined;

    const result = await bulkImportService.getPendingBalances({ status, email, limit, offset });

    res.json(result);
  } catch (error) {
    console.error('Get pending balances error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get pending balances';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /admin/bulk-import/pending/:id/send-invitation
 * Send invitation email for a single pending balance
 */
router.post('/pending/:id/send-invitation', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const success = await bulkImportService.sendInvitationEmail(id);

    if (!success) {
      return res.status(400).json({ error: 'Failed to send invitation or balance is not pending' });
    }

    res.json({ message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('Send invitation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send invitation';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /admin/bulk-import/pending/:id/expire
 * Expire (cancel) a pending import balance
 */
router.post('/pending/:id/expire', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const success = await bulkImportService.expirePendingBalance(id);

    if (!success) {
      return res.status(400).json({ error: 'Failed to expire balance or balance is not pending' });
    }

    res.json({ message: 'Balance expired successfully' });
  } catch (error) {
    console.error('Expire balance error:', error);
    const message = error instanceof Error ? error.message : 'Failed to expire balance';
    res.status(500).json({ error: message });
  }
});

export default router;
