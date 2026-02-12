import prisma from '../config/database';
import transactionService from './transactionService';
import emailService from './emailService';

export class PendingTransferService {
  async createPendingTransfer(params: {
    senderEmployeeId: string;
    senderAccountId: string;
    recipientEmail: string;
    amount: number;
    message?: string;
    recipientNameFallback: string;
    senderName: string;
  }) {
    const normalizedEmail = params.recipientEmail.toLowerCase();

    // [ORIGINAL - 2026-02-12] createPendingTransaction + pendingTransfer.create were separate operations.
    // Wrapping in a single transaction for atomicity — if either fails, both roll back.
    const { pendingTransfer, senderTransaction } = await prisma.$transaction(async (tx) => {
      const senderTx = await tx.ledgerTransaction.create({
        data: {
          accountId: params.senderAccountId,
          transactionType: 'peer_transfer_sent',
          amount: params.amount,
          description: params.message || `Transfer to ${params.recipientNameFallback}`,
          status: 'pending',
          sourceEmployeeId: params.senderEmployeeId,
        },
      });

      const pending = await tx.pendingTransfer.create({
        data: {
          senderEmployeeId: params.senderEmployeeId,
          recipientEmail: normalizedEmail,
          amount: params.amount,
          message: params.message,
          senderTransactionId: senderTx.id,
        },
      });

      return { pendingTransfer: pending, senderTransaction: senderTx };
    });

    // Email send outside transaction — non-critical, should not block financial ops
    await emailService.sendPeerTransferRecipientNotFoundNotification(
      normalizedEmail,
      params.recipientNameFallback,
      params.senderName,
      params.amount,
      params.message
    );

    return { pendingTransfer, senderTransaction };
  }

  async claimPendingTransfers(recipientEmail: string) {
    const normalizedEmail = recipientEmail.toLowerCase();
    const recipient = await prisma.employee.findUnique({
      where: { email: normalizedEmail },
      include: { account: true },
    });

    if (!recipient || !recipient.account) {
      return [];
    }

    const pendingTransfers = await prisma.pendingTransfer.findMany({
      where: {
        recipientEmail: normalizedEmail,
        status: 'pending',
      },
      orderBy: { createdAt: 'asc' },
    });

    const claimedTransfers = [];

    for (const transfer of pendingTransfers) {
      try {
        const sender = await prisma.employee.findUnique({
          where: { id: transfer.senderEmployeeId },
        });

        // Wrap financial operations in a transaction
        await prisma.$transaction(async (tx) => {
          const recipientTransaction = await tx.ledgerTransaction.create({
            data: {
              accountId: recipient.account!.id,
              transactionType: 'peer_transfer_received',
              amount: transfer.amount,
              status: 'pending',
              description: transfer.message || `Transfer from ${sender?.name || 'Guincoin user'}`,
              sourceEmployeeId: transfer.senderEmployeeId,
              targetEmployeeId: recipient.id,
            },
          });

          const senderTransaction = await tx.ledgerTransaction.findUnique({
            where: { id: transfer.senderTransactionId },
          });

          if (senderTransaction?.status === 'pending') {
            await transactionService.postTransaction(senderTransaction.id, tx);
          }

          await transactionService.postTransaction(recipientTransaction.id, tx);

          await tx.pendingTransfer.update({
            where: { id: transfer.id },
            data: {
              status: 'claimed',
              claimedAt: new Date(),
            },
          });
        });

        // Send emails OUTSIDE the transaction (after commit)
        await emailService.sendPeerTransferNotification(
          recipient.email,
          recipient.name,
          sender?.name || 'Guincoin user',
          Number(transfer.amount),
          transfer.message || undefined
        );

        if (sender) {
          await emailService.sendPeerTransferSentNotification(
            sender.email,
            sender.name,
            recipient.name,
            Number(transfer.amount),
            transfer.message || undefined
          );
        }

        claimedTransfers.push(transfer);
      } catch (error) {
        console.error('Failed to claim pending transfer', transfer.id, error);
      }
    }

    return claimedTransfers;
  }

  async cancelPendingTransfer(transferId: string, senderEmployeeId: string) {
    const transfer = await prisma.pendingTransfer.findUnique({
      where: { id: transferId },
      include: {
        senderEmployee: true,
      },
    });

    if (!transfer) {
      throw new Error('Pending transfer not found');
    }

    if (transfer.senderEmployeeId !== senderEmployeeId) {
      throw new Error('You can only cancel your own transfers');
    }

    if (transfer.status !== 'pending') {
      throw new Error('Only pending transfers can be cancelled');
    }

    // Reject the pending transaction
    const senderTransaction = await prisma.ledgerTransaction.findUnique({
      where: { id: transfer.senderTransactionId },
    });

    if (senderTransaction && senderTransaction.status === 'pending') {
      await transactionService.rejectTransaction(senderTransaction.id);
    }

    // Update the pending transfer status to cancelled
    const updatedTransfer = await prisma.pendingTransfer.update({
      where: { id: transferId },
      data: {
        status: 'cancelled',
      },
    });

    return updatedTransfer;
  }
}

export default new PendingTransferService();
