import express, { NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import prisma from '../config/database';
import transactionService from '../services/transactionService';

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Accounts
 *     description: Account balance and transaction management
 */

/**
 * @openapi
 * /api/accounts/balance:
 *   get:
 *     tags: [Accounts]
 *     summary: Get account balance
 *     description: Returns the current balance of the authenticated user's account
 *     responses:
 *       200:
 *         description: Account balance information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: number
 *                   format: decimal
 *                   description: Current available balance
 *                 pendingBalance:
 *                   type: number
 *                   format: decimal
 *                   description: Balance including pending transactions
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Account not found
 */
// Get account balance
router.get('/balance', requireAuth, async (req: AuthRequest, res, next: NextFunction) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.user!.id },
      include: { account: true },
    });

    if (!employee || !employee.account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const balance = await transactionService.getAccountBalance(
      employee.account.id,
      true
    );

    res.json(balance);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/accounts/full-balance:
 *   get:
 *     tags: [Accounts]
 *     summary: Get full balance including allotment
 *     description: Returns the personal balance and (if manager) allotment balance
 *     responses:
 *       200:
 *         description: Full balance information
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Account not found
 */
// Get full balance (personal + allotment)
router.get('/full-balance', requireAuth, async (req: AuthRequest, res, next: NextFunction) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.user!.id },
      include: { account: true },
    });

    if (!employee || !employee.account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const personal = await transactionService.getAccountBalance(
      employee.account.id,
      true
    );

    const allotment = employee.isManager
      ? {
          posted: Number(employee.account.allotmentBalance),
          pending: 0,
          total: Number(employee.account.allotmentBalance),
        }
      : null;

    res.json({
      personal,
      allotment,
      isManager: employee.isManager,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/accounts/transactions:
 *   get:
 *     tags: [Accounts]
 *     summary: Get transaction history
 *     description: Returns paginated transaction history for the authenticated user
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of transactions to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of transactions to skip
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, posted, rejected]
 *         description: Filter by transaction status
 *       - in: query
 *         name: transactionType
 *         schema:
 *           type: string
 *           enum: [manager_award, peer_transfer_sent, peer_transfer_received, wellness_reward, adjustment]
 *         description: Filter by transaction type
 *     responses:
 *       200:
 *         description: List of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 total:
 *                   type: integer
 *                   description: Total number of transactions
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Account not found
 */
// Get transaction history
const transactionHistorySchema = z.object({
  query: z.object({
    limit: z.string().optional().transform((val) => (val ? parseInt(val) : 50)),
    offset: z.string().optional().transform((val) => (val ? parseInt(val) : 0)),
    status: z.enum(['pending', 'posted', 'rejected']).optional(),
    transactionType: z
      .enum([
        'manager_award',
        'peer_transfer_sent',
        'peer_transfer_received',
        'wellness_reward',
        'adjustment',
      ])
      .optional(),
  }),
});

router.get(
  '/transactions',
  requireAuth,
  validate(transactionHistorySchema),
  async (req: AuthRequest, res, next: NextFunction) => {
    try {
      const employee = await prisma.employee.findUnique({
        where: { id: req.user!.id },
        include: { account: true },
      });

      if (!employee || !employee.account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      const history = await transactionService.getTransactionHistory(
        employee.account.id,
        {
          limit: req.query.limit as unknown as number,
          offset: req.query.offset as unknown as number,
          status: req.query.status as any,
          transactionType: req.query.transactionType as any,
        }
      );

      res.json(history);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/accounts/pending:
 *   get:
 *     tags: [Accounts]
 *     summary: Get pending transactions
 *     description: Returns all pending transactions for the authenticated user
 *     responses:
 *       200:
 *         description: List of pending transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Account not found
 */
router.get('/pending', requireAuth, async (req: AuthRequest, res, next: NextFunction) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.user!.id },
      include: { account: true },
    });

    if (!employee || !employee.account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const pending = await transactionService.getPendingTransactions(
      employee.account.id
    );

    res.json(pending);
  } catch (error) {
    next(error);
  }
});

export default router;
