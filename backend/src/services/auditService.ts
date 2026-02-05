/**
 * Audit Service for logging financial and administrative operations.
 *
 * Provides a centralized way to log sensitive operations for compliance,
 * debugging, and security monitoring. All financial operations should
 * be logged through this service.
 *
 * @module services/auditService
 */

import { AuditAction, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { Request } from 'express';

/**
 * Context for an audit log entry.
 */
interface AuditContext {
  /** Employee ID who performed the action */
  actorId?: string;
  /** Actor's email (denormalized for reporting) */
  actorEmail?: string;
  /** Type of entity affected (e.g., 'Employee', 'Transaction') */
  targetType?: string;
  /** ID of the affected entity */
  targetId?: string;
  /** Human-readable description of the action */
  description: string;
  /** Additional structured data about the action */
  metadata?: Record<string, unknown>;
  /** IP address from the request */
  ipAddress?: string;
  /** User agent from the request */
  userAgent?: string;
}

/**
 * Extracts request metadata for audit logging.
 *
 * @param req - Express request object
 * @returns Object containing IP address and user agent
 */
export function extractRequestMetadata(req: Request): { ipAddress?: string; userAgent?: string } {
  const forwarded = req.headers['x-forwarded-for'];
  const ipAddress = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.socket?.remoteAddress;

  return {
    ipAddress,
    userAgent: req.headers['user-agent'],
  };
}

/**
 * Audit Service class for logging operations.
 */
export class AuditService {
  /**
   * Logs an audit event to the database.
   *
   * @param action - The type of action being logged
   * @param context - Additional context about the action
   */
  async log(action: AuditAction, context: AuditContext): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action,
          actorId: context.actorId,
          actorEmail: context.actorEmail,
          targetType: context.targetType,
          targetId: context.targetId,
          description: context.description,
          metadata: context.metadata as Prisma.InputJsonValue | undefined,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });
    } catch (error) {
      // Don't throw - audit logging should not break the main operation
      console.error('[AuditService] Failed to log audit event:', error);
    }
  }

  /**
   * Logs a financial transaction event.
   */
  async logTransaction(
    action: 'transaction_created' | 'transaction_posted' | 'transaction_rejected',
    transactionId: string,
    context: Omit<AuditContext, 'targetType' | 'targetId'>
  ): Promise<void> {
    await this.log(action, {
      ...context,
      targetType: 'LedgerTransaction',
      targetId: transactionId,
    });
  }

  /**
   * Logs a balance adjustment event.
   */
  async logBalanceAdjustment(
    accountId: string,
    amount: number,
    reason: string,
    context: Omit<AuditContext, 'targetType' | 'targetId' | 'description'>
  ): Promise<void> {
    await this.log('balance_adjustment', {
      ...context,
      targetType: 'Account',
      targetId: accountId,
      description: `Balance adjustment: ${amount > 0 ? '+' : ''}${amount} - ${reason}`,
      metadata: {
        ...context.metadata,
        amount,
        reason,
      },
    });
  }

  /**
   * Logs a role change event.
   */
  async logRoleChange(
    employeeId: string,
    changes: { isManager?: boolean; isAdmin?: boolean },
    context: Omit<AuditContext, 'targetType' | 'targetId' | 'description'>
  ): Promise<void> {
    const changeDescriptions: string[] = [];
    if (changes.isManager !== undefined) {
      changeDescriptions.push(`isManager: ${changes.isManager}`);
    }
    if (changes.isAdmin !== undefined) {
      changeDescriptions.push(`isAdmin: ${changes.isAdmin}`);
    }

    await this.log('role_changed', {
      ...context,
      targetType: 'Employee',
      targetId: employeeId,
      description: `Role changed: ${changeDescriptions.join(', ')}`,
      metadata: {
        ...context.metadata,
        changes,
      },
    });
  }

  /**
   * Logs a store purchase event.
   */
  async logPurchase(
    action: 'purchase_created' | 'purchase_fulfilled' | 'purchase_cancelled',
    purchaseOrderId: string,
    context: Omit<AuditContext, 'targetType' | 'targetId'>
  ): Promise<void> {
    await this.log(action, {
      ...context,
      targetType: 'StorePurchaseOrder',
      targetId: purchaseOrderId,
    });
  }

  /**
   * Logs a wellness submission review event.
   */
  async logWellnessReview(
    action: 'wellness_submission_approved' | 'wellness_submission_rejected',
    submissionId: string,
    context: Omit<AuditContext, 'targetType' | 'targetId'>
  ): Promise<void> {
    await this.log(action, {
      ...context,
      targetType: 'WellnessSubmission',
      targetId: submissionId,
    });
  }

  /**
   * Logs a settings change event.
   */
  async logSettingsChange(
    settingType: string,
    changes: Record<string, unknown>,
    context: Omit<AuditContext, 'targetType' | 'targetId' | 'description'>
  ): Promise<void> {
    await this.log('settings_changed', {
      ...context,
      targetType: 'Settings',
      targetId: settingType,
      description: `Settings updated: ${settingType}`,
      metadata: {
        ...context.metadata,
        changes,
      },
    });
  }

  /**
   * Logs a security event.
   */
  async logSecurityEvent(
    action: 'admin_login' | 'permission_denied' | 'suspicious_activity',
    context: AuditContext
  ): Promise<void> {
    await this.log(action, context);
  }

  /**
   * Retrieves audit logs with filtering and pagination.
   */
  async getAuditLogs(options: {
    action?: AuditAction;
    actorId?: string;
    targetType?: string;
    targetId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {};

    if (options.action) where.action = options.action;
    if (options.actorId) where.actorId = options.actorId;
    if (options.targetType) where.targetType = options.targetType;
    if (options.targetId) where.targetId = options.targetId;

    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) (where.createdAt as Record<string, unknown>).gte = options.startDate;
      if (options.endDate) (where.createdAt as Record<string, unknown>).lte = options.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }
}

export default new AuditService();
