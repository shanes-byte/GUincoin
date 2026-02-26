import { Prisma, TransactionType, TransactionStatus } from '@prisma/client';
import prisma from '../config/database';

type TransactionClient = Prisma.TransactionClient;

/**
 * Service for managing Guincoin ledger transactions.
 *
 * Handles the complete transaction lifecycle including creation, posting,
 * rejection, and balance calculations. All financial operations should
 * go through this service to ensure consistency.
 *
 * @example
 * // Award coins to an employee
 * const tx = await transactionService.createPendingTransaction(
 *   accountId,
 *   'manager_award',
 *   100,
 *   'Great work on the project!'
 * );
 * await transactionService.postTransaction(tx.id);
 */
export class TransactionService {
  // [ORIGINAL - 2026-02-24] creditTypes and debitTypes were duplicated inline in postTransaction() and getAccountBalance()
  // Extracted as static class-level constants to ensure single source of truth for credit/debit classification.
  /** Transaction types that credit (increase) an account balance */
  static readonly CREDIT_TYPES: TransactionType[] = [
    TransactionType.manager_award,
    TransactionType.peer_transfer_received,
    TransactionType.wellness_reward,
    TransactionType.adjustment,
    TransactionType.game_win,
    TransactionType.game_refund,
    TransactionType.jackpot_win,
    TransactionType.daily_bonus,
    TransactionType.bulk_import,
    TransactionType.prediction_win,
  ];

  /** Transaction types that debit (decrease) an account balance */
  static readonly DEBIT_TYPES: TransactionType[] = [
    TransactionType.peer_transfer_sent,
    TransactionType.store_purchase,
    TransactionType.game_bet,
    TransactionType.jackpot_contribution,
    TransactionType.allotment_deposit,
    TransactionType.prediction_bet,
  ];

  /**
   * Creates a pending transaction in the ledger.
   *
   * Pending transactions do not affect account balances until posted.
   * This allows for approval workflows (e.g., wellness submissions).
   *
   * @param accountId - The account to create the transaction for
   * @param transactionType - Type of transaction (manager_award, peer_transfer_sent, etc.)
   * @param amount - Transaction amount in Guincoins (positive number)
   * @param description - Optional description for the transaction
   * @param sourceEmployeeId - For transfers, the employee sending coins
   * @param targetEmployeeId - For transfers, the employee receiving coins
   * @param wellnessSubmissionId - For wellness rewards, link to the submission
   * @returns The created pending transaction
   */
  async createPendingTransaction(
    accountId: string,
    transactionType: TransactionType,
    amount: number,
    description?: string,
    sourceEmployeeId?: string,
    targetEmployeeId?: string,
    wellnessSubmissionId?: string
  ) {
    return await prisma.ledgerTransaction.create({
      data: {
        accountId,
        transactionType,
        amount,
        status: TransactionStatus.pending,
        description,
        sourceEmployeeId,
        targetEmployeeId,
        wellnessSubmissionId,
      },
    });
  }

  /**
   * Post a pending transaction (update balance and mark as posted)
   * @param transactionId - The ID of the transaction to post
   * @param tx - Optional Prisma transaction client. If provided, uses this client instead of creating a new transaction.
   */
  async postTransaction(transactionId: string, tx?: TransactionClient) {
    const executePost = async (client: TransactionClient) => {
      const transaction = await client.ledgerTransaction.findUnique({
        where: { id: transactionId },
        include: { account: true },
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== TransactionStatus.pending) {
        throw new Error('Transaction is not pending');
      }

      // Update balance based on transaction type
      // [ORIGINAL - 2026-02-06] prediction_win and prediction_bet were missing — caused "Unknown transaction type" throw
      // [ORIGINAL - 2026-02-24] Inline creditTypes/debitTypes arrays extracted to class-level CREDIT_TYPES/DEBIT_TYPES
      let balanceChange = 0;
      if (TransactionService.CREDIT_TYPES.includes(transaction.transactionType)) {
        balanceChange = Number(transaction.amount);
      } else if (TransactionService.DEBIT_TYPES.includes(transaction.transactionType)) {
        balanceChange = -Number(transaction.amount);
      } else {
        throw new Error(`Unknown transaction type: ${transaction.transactionType}`);
      }

      // Prevent negative balances on debits
      if (balanceChange < 0) {
        const currentBalance = Number(transaction.account.balance);
        if (currentBalance + balanceChange < 0) {
          throw new Error('Insufficient funds');
        }
      }

      // Update account balance
      await client.account.update({
        where: { id: transaction.accountId },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      });

      // Mark transaction as posted
      const updatedTransaction = await client.ledgerTransaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.posted,
          postedAt: new Date(),
        },
      });

      return updatedTransaction;
    };

    // If transaction client is provided, use it directly
    if (tx) {
      return await executePost(tx);
    }

    // Otherwise, create a new transaction
    // [ORIGINAL - 2026-02-19] Used default isolation; callers passing their own tx already use Serializable
    return await prisma.$transaction(async (tx) => {
      return await executePost(tx);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  /**
   * Rejects a pending transaction.
   *
   * Rejected transactions do not affect account balances.
   * Use this for declined wellness submissions, cancelled transfers, etc.
   *
   * @param transactionId - The ID of the transaction to reject
   * @param reason - Optional reason for rejection (for audit purposes)
   * @returns The updated transaction with rejected status
   */
  async rejectTransaction(transactionId: string, reason?: string) {
    return await prisma.ledgerTransaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.rejected,
      },
    });
  }

  /**
   * Gets the current balance for an account.
   *
   * @param accountId - The account ID to get balance for
   * @param includePending - If true, includes pending transactions in calculation
   * @returns Object containing posted, pending, and total balances
   *
   * @example
   * // Get only posted balance
   * const { total } = await transactionService.getAccountBalance(accountId);
   *
   * @example
   * // Get balance including pending
   * const { posted, pending, total } = await transactionService.getAccountBalance(accountId, true);
   */
  // [ORIGINAL - 2026-02-06] Loaded ALL transactions into memory; pending calc only covered 6 of 16 types
  async getAccountBalance(accountId: string, includePending: boolean = false) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    if (!includePending) {
      return {
        posted: Number(account.balance),
        pending: 0,
        total: Number(account.balance),
      };
    }

    // Use aggregate queries instead of loading all transactions
    // [ORIGINAL - 2026-02-24] Inline pendingCreditTypes/pendingDebitTypes extracted to class-level CREDIT_TYPES/DEBIT_TYPES
    const [pendingCredits, pendingDebits] = await Promise.all([
      prisma.ledgerTransaction.aggregate({
        where: {
          accountId,
          status: TransactionStatus.pending,
          transactionType: { in: TransactionService.CREDIT_TYPES },
        },
        _sum: { amount: true },
      }),
      prisma.ledgerTransaction.aggregate({
        where: {
          accountId,
          status: TransactionStatus.pending,
          transactionType: { in: TransactionService.DEBIT_TYPES },
        },
        _sum: { amount: true },
      }),
    ]);

    const pendingTotal =
      Number(pendingCredits._sum.amount || 0) - Number(pendingDebits._sum.amount || 0);

    return {
      posted: Number(account.balance),
      pending: pendingTotal,
      total: Number(account.balance) + pendingTotal,
    };
  }

  /**
   * Gets paginated transaction history for an account.
   *
   * Transactions are ordered by creation date (newest first).
   * Includes source employee information for transfers and awards.
   *
   * @param accountId - The account ID to get history for
   * @param options - Pagination and filter options
   * @param options.limit - Maximum records to return (default: 50)
   * @param options.offset - Records to skip for pagination (default: 0)
   * @param options.status - Filter by transaction status
   * @param options.transactionType - Filter by transaction type
   * @returns Paginated transaction list with total count
   */
  async getTransactionHistory(
    accountId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: TransactionStatus;
      transactionType?: TransactionType;
    }
  ) {
    const where: Prisma.LedgerTransactionWhereInput = { accountId };
    if (options?.status) {
      where.status = options.status;
    }
    if (options?.transactionType) {
      where.transactionType = options.transactionType;
    }

    const [transactions, total] = await Promise.all([
      prisma.ledgerTransaction.findMany({
        where,
        include: {
          sourceEmployee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      prisma.ledgerTransaction.count({ where }),
    ]);

    // [ORIGINAL - 2026-02-10] returned raw Prisma Decimal objects — serialized as strings in JSON
    return {
      transactions: transactions.map(tx => ({ ...tx, amount: Number(tx.amount) })),
      total,
      limit: options?.limit || 50,
      offset: options?.offset || 0,
    };
  }

  /**
   * Gets all pending transactions for an account.
   *
   * Includes related data such as source employee and wellness submission details.
   * Useful for displaying pending approvals to users.
   *
   * @param accountId - The account ID to get pending transactions for
   * @returns Array of pending transactions with related data
   */
  // [ORIGINAL - 2026-02-10] returned raw Prisma Decimal objects — serialized as strings in JSON
  async getPendingTransactions(accountId: string) {
    const transactions = await prisma.ledgerTransaction.findMany({
      where: {
        accountId,
        status: TransactionStatus.pending,
      },
      include: {
        sourceEmployee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        wellnessSubmission: {
          include: {
            wellnessTask: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map(tx => ({ ...tx, amount: Number(tx.amount) }));
  }
}

export default new TransactionService();
