import { PeriodType } from '@prisma/client';
import prisma from '../config/database';
import transactionService from './transactionService';

export class AllotmentService {
  // [ORIGINAL - 2026-02-24] Period date calculation was duplicated in getCurrentAllotment() and resetAllotments()
  // Extracted as a private helper to ensure consistent period boundary computation.
  /**
   * Calculate the start and end dates for the current period.
   * @param periodType - monthly or quarterly
   * @param now - reference date (defaults to current time)
   * @returns { periodStart, periodEnd } with end at 23:59:59 on the last day
   */
  private getPeriodBounds(periodType: PeriodType, now: Date = new Date()): { periodStart: Date; periodEnd: Date } {
    if (periodType === PeriodType.monthly) {
      return {
        periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
        periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };
    }
    // Quarterly
    const quarter = Math.floor(now.getMonth() / 3);
    return {
      periodStart: new Date(now.getFullYear(), quarter * 3, 1),
      periodEnd: new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59),
    };
  }

  /**
   * Get or create current period allotment for a manager
   */
  async getCurrentAllotment(managerId: string, periodType: PeriodType = PeriodType.monthly) {
    const now = new Date();
    const { periodStart, periodEnd } = this.getPeriodBounds(periodType, now);

    // Check for existing allotment first, create if not found
    const defaultAmount = 1000; // Can be made configurable
    const existing = await prisma.managerAllotment.findFirst({
      where: {
        managerId,
        periodType,
        periodStart: { lte: now },
        periodEnd: { gte: now },
      },
    });

    const allotment = existing
      ? existing
      : await prisma.managerAllotment.create({
          data: {
            managerId,
            periodType,
            amount: defaultAmount,
            periodStart,
            periodEnd,
          },
        });

    // Calculate used amount from posted manager awards in this period
    const usedAmount = await this.calculateUsedAmount(managerId, periodStart, periodEnd);

    // [ORIGINAL - 2026-02-10] spread leaked raw Prisma Decimal `amount` — now normalized
    return {
      ...allotment,
      amount: Number(allotment.amount),
      usedAmount: Number(usedAmount),
      remaining: Number(allotment.amount) - Number(usedAmount),
      balance: Number(allotment.amount) - Number(usedAmount),
      recurringBudget: Number(allotment.amount),
      usedThisPeriod: Number(usedAmount),
    };
  }

  /**
   * Calculate used amount from manager awards in a period
   */
  async calculateUsedAmount(managerId: string, periodStart: Date, periodEnd: Date) {
    const result = await prisma.ledgerTransaction.aggregate({
      where: {
        sourceEmployeeId: managerId,
        transactionType: 'manager_award',
        status: 'posted',
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  }

  /**
   * Check if manager can award the specified amount
   */
  async canAward(managerId: string, amount: number, periodType?: PeriodType) {
    const allotment = await this.getCurrentAllotment(managerId, periodType);
    return Number(allotment.remaining) >= amount;
  }

  /**
   * Award coins to an employee (creates pending transaction)
   * Uses a database transaction to prevent race conditions
   */
  async awardCoins(
    managerId: string,
    employeeEmail: string,
    amount: number,
    description: string
  ) {
    if (amount <= 0) {
      throw new Error('Award amount must be positive');
    }

    // Find employee first (outside transaction for read-only)
    const employee = await prisma.employee.findUnique({
      where: { email: employeeEmail },
      include: { account: true },
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    if (!employee.account) {
      throw new Error('Employee account not found');
    }

    // Wrap allotment check + transaction creation + posting in a DB transaction
    return await prisma.$transaction(async (tx) => {
      // Re-check allotment inside transaction to prevent race conditions
      const allotment = await this.getCurrentAllotment(managerId);
      if (Number(allotment.remaining) < amount) {
        throw new Error('Insufficient allotment remaining');
      }

      // Create pending transaction
      // [ORIGINAL - 2026-02-10] missing targetEmployeeId — transferReceiver was always null for awards
      const transaction = await tx.ledgerTransaction.create({
        data: {
          accountId: employee.account!.id,
          transactionType: 'manager_award',
          amount,
          status: 'pending',
          description: description || 'Award from manager',
          sourceEmployeeId: managerId,
          targetEmployeeId: employee.id,
        },
      });

      // Post immediately (manager awards are auto-posted)
      await transactionService.postTransaction(transaction.id, tx);

      return transaction;
    });
  }

  /**
   * Get award history for a manager
   */
  // [ORIGINAL - 2026-02-06] Did not include targetEmployee — fallback showed manager's own name
  async getAwardHistory(managerId: string, limit: number = 50, offset: number = 0) {
    const [transactions, total] = await Promise.all([
      prisma.ledgerTransaction.findMany({
        where: {
          sourceEmployeeId: managerId,
          transactionType: 'manager_award',
        },
        include: {
          account: {
            include: {
              employee: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          transferReceiver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.ledgerTransaction.count({
        where: {
          sourceEmployeeId: managerId,
          transactionType: 'manager_award',
        },
      }),
    ]);

    // [ORIGINAL - 2026-02-10] returned raw Prisma Decimal objects — serialized as strings in JSON
    return {
      transactions: transactions.map(tx => ({ ...tx, amount: Number(tx.amount) })),
      total,
      limit,
      offset,
    };
  }

  /**
   * Set recurring budget for a manager's allotment
   */
  async setRecurringBudget(managerId: string, amount: number, periodType: PeriodType) {
    const allotment = await this.getCurrentAllotment(managerId, periodType);
    return prisma.managerAllotment.update({
      where: { id: allotment.id },
      data: { amount },
    });
  }

  /**
   * Deposit coins into a manager's allotment
   */
  async depositAllotment(managerId: string, amount: number, description?: string) {
    const allotment = await this.getCurrentAllotment(managerId);
    const updated = await prisma.managerAllotment.update({
      where: { id: allotment.id },
      data: { amount: { increment: amount } },
    });
    return { ...updated, description: description || 'Allotment deposit' };
  }

  /**
   * Get deposit history for a manager
   */
  async getDepositHistory(managerId: string, limit?: number) {
    const allotments = await prisma.managerAllotment.findMany({
      where: { managerId },
      orderBy: { periodStart: 'desc' },
      take: limit || 20,
    });
    return { transactions: allotments as any[] };
  }

  /**
   * Reset allotments for a new period (typically called by a scheduled job)
   */
  // [ORIGINAL - 2026-02-24] resetAllotments had inline period calculation identical to getCurrentAllotment — now uses getPeriodBounds()
  async resetAllotments(periodType: PeriodType) {
    const { periodStart, periodEnd } = this.getPeriodBounds(periodType);

    // This would typically be called by an admin or scheduled job
    // For now, it's a manual operation
    // In production, this would create new allotments for all managers
  }
}

export default new AllotmentService();
