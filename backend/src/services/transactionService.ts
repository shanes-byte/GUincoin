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
      let balanceChange = 0;
      const creditTypes: TransactionType[] = [
        TransactionType.manager_award,
        TransactionType.peer_transfer_received,
        TransactionType.wellness_reward,
        TransactionType.adjustment,
        TransactionType.game_win,
        TransactionType.game_refund,
        TransactionType.jackpot_win,
        TransactionType.daily_bonus,
        TransactionType.bulk_import,
      ];
      const debitTypes: TransactionType[] = [
        TransactionType.peer_transfer_sent,
        TransactionType.store_purchase,
        TransactionType.game_bet,
        TransactionType.jackpot_contribution,
        TransactionType.allotment_deposit,
      ];

      if (creditTypes.includes(transaction.transactionType)) {
        balanceChange = Number(transaction.amount);
      } else if (debitTypes.includes(transaction.transactionType)) {
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
    return await prisma.$transaction(async (tx) => {
      return await executePost(tx);
    });
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
  async getAccountBalance(accountId: string, includePending: boolean = false) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        transactions: {
          where: includePending
            ? {}
            : {
                status: TransactionStatus.posted,
              },
        },
      },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    if (includePending) {
      // Calculate balance including pending
      const pendingTotal = account.transactions
        .filter((t) => t.status === TransactionStatus.pending)
        .reduce((sum, t) => {
          if (
            t.transactionType === TransactionType.manager_award ||
            t.transactionType === TransactionType.peer_transfer_received ||
            t.transactionType === TransactionType.wellness_reward ||
            t.transactionType === TransactionType.adjustment
          ) {
            return sum + Number(t.amount);
          } else if (
            t.transactionType === TransactionType.peer_transfer_sent ||
            t.transactionType === TransactionType.store_purchase
          ) {
            return sum - Number(t.amount);
          }
          return sum;
        }, 0);

      return {
        posted: Number(account.balance),
        pending: pendingTotal,
        total: Number(account.balance) + pendingTotal,
      };
    }

    return {
      posted: Number(account.balance),
      pending: 0,
      total: Number(account.balance),
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

    return {
      transactions,
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
  async getPendingTransactions(accountId: string) {
    return await prisma.ledgerTransaction.findMany({
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
  }
}

export default new TransactionService();
