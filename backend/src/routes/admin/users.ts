import express from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { z } from 'zod';
import { validate } from '../../middleware/validation';
import { AppError } from '../../utils/errors';
import accountService from '../../services/accountService';
import emailService from '../../services/emailService';
import allotmentService from '../../services/allotmentService';
import auditService, { extractRequestMetadata } from '../../services/auditService';
import { Prisma, PeriodType, TransactionType, TransactionStatus } from '@prisma/client';
import multer from 'multer';
import * as XLSX from 'xlsx';

const router = express.Router();

// Get all employees with their roles
router.get('/users', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    // Check if user is admin
    const currentUser = await prisma.employee.findUnique({
      where: { id: req.user!.id },
    });

    if (!currentUser || !currentUser.isAdmin) {
      throw new AppError('Admin access required', 403);
    }

    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isManager: true,
        isAdmin: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(employees);
  } catch (error) {
    next(error);
  }
});

// Create new employee
const createEmployeeSchema = z.object({
  body: z.object({
    email: z.string().email(),
    name: z.string().min(1),
    isManager: z.boolean().optional().default(false),
    isAdmin: z.boolean().optional().default(false),
  }),
});

router.post(
  '/users',
  requireAuth,
  validate(createEmployeeSchema),
  async (req: AuthRequest, res, next) => {
    try {
      // Check if user is admin
      const currentUser = await prisma.employee.findUnique({
        where: { id: req.user!.id },
      });

      if (!currentUser || !currentUser.isAdmin) {
        throw new AppError('Admin access required', 403);
      }

      const { email, name, isManager, isAdmin } = req.body;

      // Check if employee already exists
      const existingEmployee = await prisma.employee.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingEmployee) {
        throw new AppError('Employee with this email already exists', 400);
      }

      // Create employee
      const employee = await prisma.employee.create({
        data: {
          email: email.toLowerCase(),
          name,
          isManager: isManager || false,
          isAdmin: isAdmin || false,
        },
        select: {
          id: true,
          email: true,
          name: true,
          isManager: true,
          isAdmin: true,
          createdAt: true,
        },
      });

      // Create account for the employee
      await accountService.getOrCreateAccount(employee.id);

      // Determine role name for email
      const roleName =
        employee.isAdmin && employee.isManager
          ? 'Admin & Manager'
          : employee.isAdmin
          ? 'Admin'
          : employee.isManager
          ? 'Manager'
          : 'Employee';

      // Send email notification
      await emailService.sendRoleAssignedNotification(
        employee.email,
        employee.name,
        roleName
      );

      res.status(201).json(employee);
    } catch (error) {
      next(error);
    }
  }
);

// Update employee roles
const updateRolesSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    isManager: z.boolean().optional(),
    isAdmin: z.boolean().optional(),
  }),
});

router.put(
  '/users/:id/roles',
  requireAuth,
  validate(updateRolesSchema),
  async (req: AuthRequest, res, next) => {
    try {
      // Check if user is admin
      const currentUser = await prisma.employee.findUnique({
        where: { id: req.user!.id },
      });

      if (!currentUser || !currentUser.isAdmin) {
        throw new AppError('Admin access required', 403);
      }

      // Prevent admin from removing their own admin status
      if (req.params.id === req.user!.id && req.body.isAdmin === false) {
        throw new AppError('You cannot remove your own admin status', 400);
      }

      const employee = await prisma.employee.findUnique({
        where: { id: req.params.id },
      });

      if (!employee) {
        throw new AppError('Employee not found', 404);
      }

      const wasManager = employee.isManager;
      const wasAdmin = employee.isAdmin;
      const newIsManager = req.body.isManager !== undefined ? req.body.isManager : employee.isManager;
      const newIsAdmin = req.body.isAdmin !== undefined ? req.body.isAdmin : employee.isAdmin;

      const updated = await prisma.employee.update({
        where: { id: req.params.id },
        data: {
          isManager: newIsManager,
          isAdmin: newIsAdmin,
        },
        select: {
          id: true,
          email: true,
          name: true,
          isManager: true,
          isAdmin: true,
          createdAt: true,
        },
      });

      // Send email notification if role changed
      if ((wasManager !== newIsManager || wasAdmin !== newIsAdmin) && (newIsManager || newIsAdmin)) {
        const roleName =
          updated.isAdmin && updated.isManager
            ? 'Admin & Manager'
            : updated.isAdmin
            ? 'Admin'
            : updated.isManager
            ? 'Manager'
            : 'Employee';

        await emailService.sendRoleAssignedNotification(
          updated.email,
          updated.name,
          roleName
        );
      }

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// Get balance report (all users with balances and manager allotments)
router.get('/balances-report', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    // Check if user is admin
    const currentUser = await prisma.employee.findUnique({
      where: { id: req.user!.id },
    });

    if (!currentUser || !currentUser.isAdmin) {
      throw new AppError('Admin access required', 403);
    }

    // Get all employees with their accounts
    const employees = await prisma.employee.findMany({
      include: {
        account: true,
      },
      orderBy: { name: 'asc' },
    });

    // Build report data
    const reportData = await Promise.all(
      employees.map(async (employee) => {
        const account = employee.account || await accountService.getOrCreateAccount(employee.id);
        const balance = Number(account.balance);

        // For managers, get their current allotment
        let allotmentData = null;
        if (employee.isManager) {
          try {
            const allotment = await allotmentService.getCurrentAllotment(employee.id, PeriodType.monthly);
            allotmentData = {
              total: Number(allotment.amount),
              used: allotment.usedAmount,
              remaining: allotment.remaining,
              periodStart: allotment.periodStart.toISOString(),
              periodEnd: allotment.periodEnd.toISOString(),
            };
          } catch (error) {
            // If no allotment exists, set to null
            allotmentData = null;
          }
        }

        return {
          employeeId: employee.id,
          name: employee.name,
          email: employee.email,
          isManager: employee.isManager,
          isAdmin: employee.isAdmin,
          userBalance: balance,
          allotment: allotmentData,
        };
      })
    );

    // Calculate totals
    const totalUserBalances = reportData.reduce((sum, row) => sum + row.userBalance, 0);
    const totalAllotmentRemaining = reportData.reduce(
      (sum, row) => sum + (row.allotment?.remaining || 0),
      0
    );
    const totalInCirculation = totalUserBalances + totalAllotmentRemaining;

    res.json({
      reportData,
      totals: {
        totalUserBalances,
        totalAllotmentRemaining,
        totalInCirculation,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Deposit into (or deduct from) manager's allotment balance
const depositAllotmentSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    amount: z.number().refine(val => val !== 0, { message: 'Amount must be non-zero' }),
    description: z.string().optional(),
  }),
});

router.post(
  '/users/:id/allotment/deposit',
  requireAuth,
  validate(depositAllotmentSchema),
  async (req: AuthRequest, res, next) => {
    try {
      // Check if user is admin
      const currentUser = await prisma.employee.findUnique({
        where: { id: req.user!.id },
      });

      if (!currentUser || !currentUser.isAdmin) {
        throw new AppError('Admin access required', 403);
      }

      const { amount, description } = req.body;

      // If deducting, check sufficient balance
      if (amount < 0) {
        const currentAllotment = await allotmentService.getCurrentAllotment(req.params.id);
        const currentBalance = Number(currentAllotment.balance);
        if (currentBalance < Math.abs(amount)) {
          throw new AppError(
            `Insufficient allotment balance. Current: ${currentBalance.toFixed(2)}, requested deduction: ${Math.abs(amount).toFixed(2)}`,
            400
          );
        }
      }

      // Deposit into (or deduct from) manager's allotment
      const transaction = await allotmentService.depositAllotment(
        req.params.id,
        amount,
        description || (amount > 0 ? 'Allotment deposit' : 'Allotment deduction')
      );

      // Get updated allotment info
      const allotment = await allotmentService.getCurrentAllotment(req.params.id);

      // Get manager info for email notification (only for deposits)
      if (amount > 0) {
        const manager = await prisma.employee.findUnique({
          where: { id: req.params.id },
        });

        if (manager) {
          await emailService.sendAllotmentDepositNotification(
            manager.email,
            manager.name,
            amount
          );
        }
      }

      res.json({
        message: amount > 0 ? 'Allotment deposited successfully' : 'Allotment deducted successfully',
        transaction: {
          id: transaction.id,
          amount: Number(transaction.amount),
          description: transaction.description,
          createdAt: transaction.createdAt,
        },
        newBalance: Number(allotment.balance),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get manager's allotment details (for admin view)
router.get(
  '/users/:id/allotment',
  requireAuth,
  async (req: AuthRequest, res, next) => {
    try {
      // Check if user is admin
      const currentUser = await prisma.employee.findUnique({
        where: { id: req.user!.id },
      });

      if (!currentUser || !currentUser.isAdmin) {
        throw new AppError('Admin access required', 403);
      }

      // Check if target user is a manager
      const employee = await prisma.employee.findUnique({
        where: { id: req.params.id },
        include: { account: true },
      });

      if (!employee) {
        throw new AppError('Employee not found', 404);
      }

      if (!employee.isManager) {
        throw new AppError('Employee is not a manager', 400);
      }

      const allotment = await allotmentService.getCurrentAllotment(req.params.id);
      const depositHistory = await allotmentService.getDepositHistory(req.params.id, 10);
      const awardHistory = await allotmentService.getAwardHistory(req.params.id, 10);

      res.json({
        employee: {
          id: employee.id,
          name: employee.name,
          email: employee.email,
        },
        allotment: {
          balance: Number(allotment.balance),
          recurringBudget: Number(allotment.recurringBudget),
          usedThisPeriod: Number(allotment.usedThisPeriod),
          periodStart: allotment.periodStart,
          periodEnd: allotment.periodEnd,
        },
        recentDeposits: depositHistory.transactions.map((t: any) => ({
          id: t.id,
          amount: Number(t.amount),
          description: t.description,
          createdAt: t.createdAt,
          fromAdmin: t.sourceEmployee?.name || 'System',
        })),
        recentAwards: awardHistory.transactions.map((t: any) => ({
          id: t.id,
          amount: Number(t.amount),
          description: t.description,
          createdAt: t.createdAt,
          toEmployee: t.account?.employee?.name || 'Unknown',
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Set recurring budget for a manager
const setRecurringBudgetSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    amount: z.number().min(0),
    periodType: z.enum(['monthly', 'quarterly']).optional(),
  }),
});

router.put(
  '/users/:id/allotment/recurring',
  requireAuth,
  validate(setRecurringBudgetSchema),
  async (req: AuthRequest, res, next) => {
    try {
      // Check if user is admin
      const currentUser = await prisma.employee.findUnique({
        where: { id: req.user!.id },
      });

      if (!currentUser || !currentUser.isAdmin) {
        throw new AppError('Admin access required', 403);
      }

      const { amount, periodType } = req.body;

      await allotmentService.setRecurringBudget(
        req.params.id,
        amount,
        periodType === 'quarterly' ? PeriodType.quarterly : PeriodType.monthly
      );

      res.json({
        message: 'Recurring budget updated successfully',
        amount,
        periodType: periodType || 'monthly',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Adjust user's personal balance (admin only)
const adjustBalanceSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    amount: z.number().refine(val => val !== 0, { message: 'Amount must be non-zero' }),
    reason: z.string().min(1, 'Reason is required'),
  }),
});

router.post(
  '/users/:id/balance/adjust',
  requireAuth,
  validate(adjustBalanceSchema),
  async (req: AuthRequest, res, next) => {
    try {
      // Check if user is admin
      const currentUser = await prisma.employee.findUnique({
        where: { id: req.user!.id },
      });

      if (!currentUser || !currentUser.isAdmin) {
        throw new AppError('Admin access required', 403);
      }

      const { amount, reason } = req.body;

      // Use Serializable isolation to prevent race conditions
      const result = await prisma.$transaction(async (tx) => {
        const employee = await tx.employee.findUnique({
          where: { id: req.params.id },
          include: { account: true },
        });

        if (!employee) {
          throw new AppError('Employee not found', 404);
        }

        if (!employee.account) {
          throw new AppError('Employee has no account', 404);
        }

        // If deducting, check sufficient balance
        if (amount < 0) {
          const currentBalance = Number(employee.account.balance);
          if (currentBalance < Math.abs(amount)) {
            throw new AppError(
              `Insufficient balance. Current: ${currentBalance.toFixed(2)}, requested deduction: ${Math.abs(amount).toFixed(2)}`,
              400
            );
          }
        }

        // Create ledger transaction
        await tx.ledgerTransaction.create({
          data: {
            accountId: employee.account.id,
            transactionType: TransactionType.adjustment,
            amount: new Prisma.Decimal(amount),
            status: TransactionStatus.posted,
            postedAt: new Date(),
            description: `Admin adjustment: ${reason}`,
            sourceEmployeeId: req.user!.id,
            targetEmployeeId: employee.id,
          },
        });

        // Update account balance
        const updatedAccount = await tx.account.update({
          where: { id: employee.account.id },
          data: {
            balance: { increment: amount },
          },
        });

        return { employee, updatedBalance: Number(updatedAccount.balance) };
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });

      // Log audit event (outside transaction — non-critical)
      const requestMeta = extractRequestMetadata(req as any);
      auditService.logBalanceAdjustment(
        result.employee.account!.id,
        amount,
        reason,
        {
          actorId: req.user!.id,
          actorEmail: currentUser.email,
          metadata: { employeeId: req.params.id, employeeName: result.employee.name },
          ...requestMeta,
        }
      );

      res.json({
        message: `Balance ${amount > 0 ? 'credited' : 'debited'} successfully`,
        updatedBalance: result.updatedBalance,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Bulk create users from CSV/Excel upload
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/users/bulk', requireAuth, upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    // Check admin
    const currentUser = await prisma.employee.findUnique({
      where: { id: req.user!.id },
    });
    if (!currentUser || !currentUser.isAdmin) {
      throw new AppError('Admin access required', 403);
    }

    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    // Parse file with XLSX
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new AppError('Spreadsheet has no sheets', 400);
    }
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (rows.length === 0) {
      throw new AppError('Spreadsheet has no data rows', 400);
    }

    // Auto-detect email + name columns from headers
    const headers = Object.keys(rows[0]);
    const emailCol = headers.find(h => /email|mail/i.test(h));
    const nameCol = headers.find(h => /name|employee/i.test(h));

    if (!emailCol) {
      throw new AppError('Could not detect email column. Include a header containing "email" or "mail".', 400);
    }
    if (!nameCol) {
      throw new AppError('Could not detect name column. Include a header containing "name" or "employee".', 400);
    }

    // Get existing employees for dedup
    const existingEmails = new Set(
      (await prisma.employee.findMany({ select: { email: true } }))
        .map(e => e.email.toLowerCase())
    );

    let created = 0;
    let skipped = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rawEmail = String(row[emailCol] ?? '').trim().toLowerCase();
      const rawName = String(row[nameCol] ?? '').trim();

      if (!rawEmail || !rawName) {
        errors.push({ row: i + 2, message: 'Missing email or name' });
        continue;
      }

      // Basic email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
        errors.push({ row: i + 2, message: `Invalid email: ${rawEmail}` });
        continue;
      }

      if (existingEmails.has(rawEmail)) {
        skipped++;
        continue;
      }

      try {
        const employee = await prisma.employee.create({
          data: {
            email: rawEmail,
            name: rawName,
            isManager: false,
            isAdmin: false,
          },
        });
        await accountService.getOrCreateAccount(employee.id);
        existingEmails.add(rawEmail);
        created++;
      } catch (err: unknown) {
        errors.push({ row: i + 2, message: `Failed to create: ${rawEmail}` });
      }
    }

    res.json({ created, skipped, errors });
  } catch (error) {
    next(error);
  }
});

export default router;
