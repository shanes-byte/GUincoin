import * as XLSX from 'xlsx';
import prisma from '../config/database';
import transactionService from './transactionService';
import emailService from './emailService';
import accountService from './accountService';
import { BulkImportStatus, PendingImportBalanceStatus, TransactionType, TransactionStatus } from '@prisma/client';

// =====================
// Types
// =====================

export interface ParsedName {
  first: string;
  last: string;
  middle?: string;
  original: string;
}

export interface BalanceRow {
  name: string;
  amount: number;
  market?: string;
}

export interface EmailRow {
  name: string;
  email: string;
}

export interface MergedRow {
  name: string;
  email: string;
  amount: number;
  market?: string;
  confidence: number;
  matchType: 'auto' | 'manual' | 'none';
  balanceRowIndex: number;
  emailRowIndex?: number;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: {
    totalRows: number;
    validRows: number;
    registeredUsers: number;
    unregisteredUsers: number;
    duplicates: number;
  };
}

export interface ColumnMapping {
  nameColumn: string;
  amountColumn: string;
  emailColumn?: string;
  marketColumn?: string;
}

export interface ImportJobResult {
  jobId: string;
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ row: number; message: string }>;
}

// =====================
// Name Parsing & Matching
// =====================

/**
 * Parse a name string in "Last, First Middle" format
 */
export function parseName(name: string): ParsedName {
  const normalized = name.trim();

  // Handle "Last, First Middle" format
  if (normalized.includes(',')) {
    const [lastPart, firstPart] = normalized.split(',').map(s => s.trim());
    const firstParts = firstPart?.split(/\s+/) || [];
    return {
      last: lastPart.toLowerCase(),
      first: (firstParts[0] || '').toLowerCase(),
      middle: firstParts.slice(1).join(' ').toLowerCase() || undefined,
      original: normalized,
    };
  }

  // Handle "First Last" format
  const parts = normalized.split(/\s+/);
  if (parts.length >= 2) {
    return {
      first: parts[0].toLowerCase(),
      last: parts[parts.length - 1].toLowerCase(),
      middle: parts.length > 2 ? parts.slice(1, -1).join(' ').toLowerCase() : undefined,
      original: normalized,
    };
  }

  // Single word name
  return {
    first: normalized.toLowerCase(),
    last: '',
    original: normalized,
  };
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity between two strings (0-1)
 */
function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

/**
 * Calculate overall similarity between two parsed names
 * Weight: 60% last name, 40% first name
 */
export function calculateNameSimilarity(a: ParsedName, b: ParsedName): number {
  const lastSimilarity = stringSimilarity(a.last, b.last);
  const firstSimilarity = stringSimilarity(a.first, b.first);

  // If first names are exact match, use middle name as tiebreaker
  if (firstSimilarity === 1 && a.middle && b.middle) {
    const middleSimilarity = stringSimilarity(a.middle, b.middle);
    return lastSimilarity * 0.55 + firstSimilarity * 0.35 + middleSimilarity * 0.1;
  }

  return lastSimilarity * 0.6 + firstSimilarity * 0.4;
}

/**
 * Get confidence level based on similarity score
 */
// [ORIGINAL - 2026-02-06] Medium threshold was 0.7 — lowered to 0.5
export function getConfidenceLevel(similarity: number): 'high' | 'medium' | 'low' {
  if (similarity >= 0.9) return 'high';
  if (similarity >= 0.5) return 'medium';
  return 'low';
}

// =====================
// Spreadsheet Parsing
// =====================

/**
 * Parse a spreadsheet file (CSV or Excel) to JSON
 */
export function parseSpreadsheet(buffer: Buffer, filename: string): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to JSON with header row
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    raw: false, // Convert numbers to strings for consistent handling
    defval: '', // Default empty cells to empty string
  });

  return data;
}

/**
 * Get column headers from spreadsheet data
 */
export function getColumnHeaders(data: Record<string, unknown>[]): string[] {
  if (data.length === 0) return [];
  return Object.keys(data[0]);
}

/**
 * Extract balance data from parsed spreadsheet
 */
export function extractBalanceData(
  data: Record<string, unknown>[],
  mapping: { nameColumn: string; amountColumn: string; marketColumn?: string }
): BalanceRow[] {
  return data.map((row, index) => {
    const nameValue = row[mapping.nameColumn];
    const amountValue = row[mapping.amountColumn];
    const marketValue = mapping.marketColumn ? row[mapping.marketColumn] : undefined;

    // Parse amount - handle various formats
    let amount = 0;
    if (typeof amountValue === 'number') {
      amount = amountValue;
    } else if (typeof amountValue === 'string') {
      // Remove currency symbols, commas, etc.
      const cleaned = amountValue.replace(/[^0-9.-]/g, '');
      amount = parseFloat(cleaned) || 0;
    }

    return {
      name: String(nameValue || '').trim(),
      amount,
      market: marketValue ? String(marketValue).trim() : undefined,
    };
  }).filter(row => row.name && row.amount > 0);
}

/**
 * Extract email data from parsed spreadsheet
 */
export function extractEmailData(
  data: Record<string, unknown>[],
  mapping: { nameColumn: string; emailColumn: string }
): EmailRow[] {
  return data.map(row => ({
    name: String(row[mapping.nameColumn] || '').trim(),
    email: String(row[mapping.emailColumn] || '').trim().toLowerCase(),
  })).filter(row => row.name && row.email);
}

// =====================
// Data Merging
// =====================

/**
 * Merge balance data with email data using name matching
 */
export function mergeDataFiles(
  balanceData: BalanceRow[],
  emailData: EmailRow[]
): MergedRow[] {
  const results: MergedRow[] = [];
  const usedEmailIndices = new Set<number>();

  for (let i = 0; i < balanceData.length; i++) {
    const balanceRow = balanceData[i];
    const balanceName = parseName(balanceRow.name);

    let bestMatch: { index: number; similarity: number } | null = null;

    // Find best matching email row
    for (let j = 0; j < emailData.length; j++) {
      if (usedEmailIndices.has(j)) continue;

      const emailRow = emailData[j];
      const emailName = parseName(emailRow.name);
      const similarity = calculateNameSimilarity(balanceName, emailName);

      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { index: j, similarity };
      }
    }

    // [ORIGINAL - 2026-02-06] Threshold was 0.7 — lowered to 0.5 to catch more near-matches
    if (bestMatch && bestMatch.similarity >= 0.5) {
      // Match found
      const emailRow = emailData[bestMatch.index];
      usedEmailIndices.add(bestMatch.index);

      results.push({
        name: balanceRow.name,
        email: emailRow.email,
        amount: balanceRow.amount,
        market: balanceRow.market,
        confidence: bestMatch.similarity,
        matchType: bestMatch.similarity >= 0.9 ? 'auto' : 'manual',
        balanceRowIndex: i,
        emailRowIndex: bestMatch.index,
      });
    } else {
      // No match found
      results.push({
        name: balanceRow.name,
        email: '',
        amount: balanceRow.amount,
        market: balanceRow.market,
        confidence: bestMatch?.similarity || 0,
        matchType: 'none',
        balanceRowIndex: i,
      });
    }
  }

  return results;
}

// =====================
// Validation
// =====================

/**
 * Validate merged import data
 */
export async function validateImportData(rows: MergedRow[]): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const seenEmails = new Map<string, number>();
  let registeredCount = 0;
  let unregisteredCount = 0;
  let duplicateCount = 0;

  // Get all existing employees for email validation
  const existingEmails = new Set(
    (await prisma.employee.findMany({ select: { email: true } }))
      .map(e => e.email.toLowerCase())
  );

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    // Check for missing email
    if (!row.email) {
      errors.push({
        row: rowNum,
        field: 'email',
        message: 'Email address is required',
        severity: 'error',
      });
      continue;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row.email)) {
      errors.push({
        row: rowNum,
        field: 'email',
        message: `Invalid email format: ${row.email}`,
        severity: 'error',
      });
      continue;
    }

    // Check for duplicates in import
    if (seenEmails.has(row.email)) {
      warnings.push({
        row: rowNum,
        field: 'email',
        message: `Duplicate email (first seen in row ${seenEmails.get(row.email)})`,
        severity: 'warning',
      });
      duplicateCount++;
    } else {
      seenEmails.set(row.email, rowNum);
    }

    // Check for negative/zero amounts
    if (row.amount <= 0) {
      errors.push({
        row: rowNum,
        field: 'amount',
        message: 'Amount must be greater than 0',
        severity: 'error',
      });
      continue;
    }

    // Check for very large amounts (warning)
    if (row.amount > 10000) {
      warnings.push({
        row: rowNum,
        field: 'amount',
        message: `Large amount: ${row.amount} Guincoins`,
        severity: 'warning',
      });
    }

    // Check if user exists
    if (existingEmails.has(row.email)) {
      registeredCount++;
    } else {
      unregisteredCount++;
    }
  }

  const validRows = rows.filter((_, i) =>
    !errors.some(e => e.row === i + 1 && e.severity === 'error')
  ).length;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalRows: rows.length,
      validRows,
      registeredUsers: registeredCount,
      unregisteredUsers: unregisteredCount,
      duplicates: duplicateCount,
    },
  };
}

// =====================
// Import Job Processing
// =====================

/**
 * Create and process a bulk import job
 */
export async function createImportJob(params: {
  name: string;
  createdById: string;
  rows: MergedRow[];
  columnMapping: ColumnMapping;
}): Promise<ImportJobResult> {
  const { name, createdById, rows, columnMapping } = params;

  // Filter to only rows with valid emails
  const validRows = rows.filter(r => r.email && r.amount > 0);

  // Create the job
  const job = await prisma.bulkImportJob.create({
    data: {
      name,
      createdById,
      totalRows: validRows.length,
      columnMapping: columnMapping as any,
      status: BulkImportStatus.processing,
    },
  });

  const errors: Array<{ row: number; message: string }> = [];
  let successCount = 0;
  let processedRows = 0;

  // Get all existing employees
  const existingEmployees = await prisma.employee.findMany({
    select: { id: true, email: true, account: { select: { id: true } } },
  });
  const employeeMap = new Map(existingEmployees.map(e => [e.email.toLowerCase(), e]));

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];
    processedRows++;

    try {
      const employee = employeeMap.get(row.email.toLowerCase());

      if (employee && employee.account) {
        // User exists - create and post transaction immediately
        const transaction = await transactionService.createPendingTransaction(
          employee.account.id,
          TransactionType.bulk_import,
          row.amount,
          `Bulk import: ${name}`,
          createdById,
          employee.id
        );

        await transactionService.postTransaction(transaction.id);
        successCount++;
      } else {
        // User doesn't exist - create pending balance
        await prisma.pendingImportBalance.create({
          data: {
            importJobId: job.id,
            recipientEmail: row.email.toLowerCase(),
            recipientName: row.name,
            amount: row.amount,
            status: PendingImportBalanceStatus.pending,
          },
        });
        successCount++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ row: i + 1, message });
    }

    // Update progress every 10 rows
    if (processedRows % 10 === 0) {
      await prisma.bulkImportJob.update({
        where: { id: job.id },
        data: { processedRows },
      });
    }
  }

  // Finalize job
  await prisma.bulkImportJob.update({
    where: { id: job.id },
    data: {
      status: errors.length === 0 ? BulkImportStatus.completed : BulkImportStatus.completed,
      processedRows: validRows.length,
      successCount,
      errorCount: errors.length,
      errorLog: errors.length > 0 ? errors : undefined,
      completedAt: new Date(),
    },
  });

  return {
    jobId: job.id,
    totalRows: validRows.length,
    processedRows: validRows.length,
    successCount,
    errorCount: errors.length,
    errors,
  };
}

// =====================
// Pending Balance Claiming
// =====================

/**
 * Claim all pending import balances for an email address
 * Called during OAuth login
 */
export async function claimPendingImportBalances(recipientEmail: string): Promise<number> {
  const normalizedEmail = recipientEmail.toLowerCase();

  // Get the employee with their account
  const employee = await prisma.employee.findUnique({
    where: { email: normalizedEmail },
    include: { account: true },
  });

  if (!employee || !employee.account) {
    return 0;
  }

  // Find all pending import balances for this email
  const pendingBalances = await prisma.pendingImportBalance.findMany({
    where: {
      recipientEmail: normalizedEmail,
      status: PendingImportBalanceStatus.pending,
    },
    include: {
      importJob: true,
    },
  });

  if (pendingBalances.length === 0) {
    return 0;
  }

  let claimedCount = 0;

  for (const pending of pendingBalances) {
    try {
      await prisma.$transaction(async (tx) => {
        // Create and post the transaction
        const transaction = await tx.ledgerTransaction.create({
          data: {
            accountId: employee.account!.id,
            transactionType: TransactionType.bulk_import,
            amount: pending.amount,
            status: TransactionStatus.pending,
            description: `Imported balance from: ${pending.importJob.name}`,
            targetEmployeeId: employee.id,
          },
        });

        await transactionService.postTransaction(transaction.id, tx);

        // Update the pending balance
        await tx.pendingImportBalance.update({
          where: { id: pending.id },
          data: {
            status: PendingImportBalanceStatus.claimed,
            transactionId: transaction.id,
            claimedAt: new Date(),
          },
        });
      });

      claimedCount++;
    } catch (error) {
      console.error('Failed to claim pending import balance:', pending.id, error);
    }
  }

  // Send notification if any balances were claimed
  if (claimedCount > 0) {
    const totalAmount = pendingBalances.reduce((sum, p) => sum + Number(p.amount), 0);

    // Note: We could send a notification email here
    console.log(`[BulkImport] Claimed ${claimedCount} pending balances (${totalAmount} Guincoins) for ${normalizedEmail}`);
  }

  return claimedCount;
}

// =====================
// Invitation Emails
// =====================

/**
 * Send invitation email for a single pending balance
 */
export async function sendInvitationEmail(pendingId: string): Promise<boolean> {
  const pending = await prisma.pendingImportBalance.findUnique({
    where: { id: pendingId },
    include: { importJob: true },
  });

  if (!pending || pending.status !== PendingImportBalanceStatus.pending) {
    return false;
  }

  try {
    await emailService.sendBulkImportInvitation(
      pending.recipientEmail,
      pending.recipientName || pending.recipientEmail.split('@')[0],
      Number(pending.amount)
    );

    await prisma.pendingImportBalance.update({
      where: { id: pendingId },
      data: { inviteSentAt: new Date() },
    });

    return true;
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    return false;
  }
}

/**
 * Send invitation emails for all pending balances in a job
 */
export async function sendBulkInvitations(jobId: string): Promise<{ sent: number; failed: number }> {
  const pendingBalances = await prisma.pendingImportBalance.findMany({
    where: {
      importJobId: jobId,
      status: PendingImportBalanceStatus.pending,
      inviteSentAt: null,
    },
  });

  let sent = 0;
  let failed = 0;

  for (const pending of pendingBalances) {
    const success = await sendInvitationEmail(pending.id);
    if (success) {
      sent++;
    } else {
      failed++;
    }

    // Rate limit: wait 100ms between emails
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { sent, failed };
}

/**
 * Expire a pending import balance (cancel it)
 */
export async function expirePendingBalance(pendingId: string): Promise<boolean> {
  const pending = await prisma.pendingImportBalance.findUnique({
    where: { id: pendingId },
  });

  if (!pending || pending.status !== PendingImportBalanceStatus.pending) {
    return false;
  }

  await prisma.pendingImportBalance.update({
    where: { id: pendingId },
    data: { status: PendingImportBalanceStatus.expired },
  });

  return true;
}

// =====================
// Query Functions
// =====================

/**
 * Get all import jobs with summary stats
 */
export async function getImportJobs(options?: { limit?: number; offset?: number }) {
  const [jobs, total] = await Promise.all([
    prisma.bulkImportJob.findMany({
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { pendingBalances: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.bulkImportJob.count(),
  ]);

  return { jobs, total };
}

/**
 * Get details for a specific import job
 */
export async function getImportJob(jobId: string) {
  const job = await prisma.bulkImportJob.findUnique({
    where: { id: jobId },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      pendingBalances: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!job) {
    return null;
  }

  // Calculate stats
  const stats = {
    totalPending: job.pendingBalances.filter(p => p.status === 'pending').length,
    totalClaimed: job.pendingBalances.filter(p => p.status === 'claimed').length,
    totalExpired: job.pendingBalances.filter(p => p.status === 'expired').length,
    invitesSent: job.pendingBalances.filter(p => p.inviteSentAt).length,
  };

  return { ...job, stats };
}

/**
 * Get all pending import balances
 */
export async function getPendingBalances(options?: {
  status?: PendingImportBalanceStatus;
  email?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};

  if (options?.status) {
    where.status = options.status;
  }
  if (options?.email) {
    where.recipientEmail = { contains: options.email.toLowerCase() };
  }

  const [balances, total] = await Promise.all([
    prisma.pendingImportBalance.findMany({
      where,
      include: {
        importJob: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.pendingImportBalance.count({ where }),
  ]);

  return { balances, total };
}

export default {
  parseName,
  calculateNameSimilarity,
  getConfidenceLevel,
  parseSpreadsheet,
  getColumnHeaders,
  extractBalanceData,
  extractEmailData,
  mergeDataFiles,
  validateImportData,
  createImportJob,
  claimPendingImportBalances,
  sendInvitationEmail,
  sendBulkInvitations,
  expirePendingBalance,
  getImportJobs,
  getImportJob,
  getPendingBalances,
};
