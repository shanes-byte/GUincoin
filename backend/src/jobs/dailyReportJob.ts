import cron from 'node-cron';
import prisma from '../config/database';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { renderTemplate } from '../services/emailTemplateService';
import emailService from '../services/emailService';
import { TransactionService } from '../services/transactionService';

// [ORIGINAL - 2026-02-24] Local creditTypes array removed — now uses TransactionService.CREDIT_TYPES
const creditTypes = TransactionService.CREDIT_TYPES;

/**
 * Generates the daily report data and sends it to configured recipients.
 * Called by the cron job at 6 AM and by the manual trigger endpoint.
 */
export async function generateAndSendReport(): Promise<{ sent: number; skipped: boolean; error?: string }> {
  try {
    // 1. Read recipients
    const settings = await prisma.systemSettings.findUnique({ where: { id: 'system' } });
    const recipients = (settings?.dailyReportRecipients as string[] | null) ?? [];
    if (recipients.length === 0) {
      return { sent: 0, skipped: true };
    }

    // 2. All employees + balances
    const employees = await prisma.employee.findMany({
      include: { account: true },
      orderBy: { name: 'asc' },
    });

    // 3. Transactions from past 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentTxns = await prisma.ledgerTransaction.findMany({
      where: { status: TransactionStatus.posted, postedAt: { gte: since } },
      orderBy: { postedAt: 'desc' },
    });

    // Build employee name lookup map
    const empNameMap = new Map(employees.map(e => [e.id, e.name]));

    // 4. Compute totals
    const totalInCirculation = employees.reduce(
      (sum, e) => sum + Number(e.account?.balance ?? 0), 0
    );

    const totalTransferredToday = recentTxns
      .filter(t => t.transactionType === TransactionType.peer_transfer_sent)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalWellnessToday = recentTxns
      .filter(t => t.transactionType === TransactionType.wellness_reward)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // 5. Detect anomalies
    const anomalies: string[] = [];
    // Large transfers (>= 50 GC)
    for (const tx of recentTxns) {
      if (
        tx.transactionType === TransactionType.peer_transfer_sent &&
        Number(tx.amount) >= 50
      ) {
        anomalies.push(
          `Large transfer: ${empNameMap.get(tx.sourceEmployeeId ?? '') ?? 'Unknown'} sent ${Number(tx.amount).toFixed(2)} GC to ${empNameMap.get(tx.targetEmployeeId ?? '') ?? 'Unknown'}`
        );
      }
    }
    // Repeated sender→recipient pairs (>= 3 in 24h)
    const pairCounts = new Map<string, number>();
    for (const tx of recentTxns) {
      if (tx.transactionType === TransactionType.peer_transfer_sent && tx.sourceEmployeeId && tx.targetEmployeeId) {
        const key = `${tx.sourceEmployeeId}->${tx.targetEmployeeId}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
    for (const [pair, count] of pairCounts) {
      if (count >= 3) {
        const [srcId, tgtId] = pair.split('->');
        const src = employees.find(e => e.id === srcId)?.name ?? 'Unknown';
        const tgt = employees.find(e => e.id === tgtId)?.name ?? 'Unknown';
        anomalies.push(`Repeated transfers: ${src} → ${tgt} (${count} times in 24h)`);
      }
    }

    // 6. Build HTML tables
    const anomalySectionBlock = anomalies.length > 0
      ? `<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
           <h3 style="color: #991b1b; margin: 0 0 10px 0;">Anomalies Detected</h3>
           <ul style="margin: 0; padding-left: 20px; color: #991b1b;">
             ${anomalies.map(a => `<li>${a}</li>`).join('\n')}
           </ul>
         </div>`
      : '<p style="color: #059669;">No anomalies detected.</p>';

    let balancesTableBlock = `
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 8px; text-align: left;">Name</th>
            <th style="padding: 8px; text-align: left;">Email</th>
            <th style="padding: 8px; text-align: right;">Balance (GC)</th>
          </tr>
        </thead>
        <tbody>`;
    for (const emp of employees) {
      const bal = Number(emp.account?.balance ?? 0).toFixed(2);
      balancesTableBlock += `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 6px 8px;">${emp.name}</td>
            <td style="padding: 6px 8px;">${emp.email}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace;">${bal}</td>
          </tr>`;
    }
    balancesTableBlock += '</tbody></table>';

    let transactionsTableBlock: string;
    if (recentTxns.length === 0) {
      transactionsTableBlock = '<p style="color: #6b7280;">No transactions in the past 24 hours.</p>';
    } else {
      transactionsTableBlock = `
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
              <th style="padding: 8px; text-align: left;">Type</th>
              <th style="padding: 8px; text-align: left;">From</th>
              <th style="padding: 8px; text-align: left;">To</th>
              <th style="padding: 8px; text-align: right;">Amount</th>
              <th style="padding: 8px; text-align: left;">Time</th>
            </tr>
          </thead>
          <tbody>`;
      for (const tx of recentTxns) {
        const isCredit = creditTypes.includes(tx.transactionType);
        const color = isCredit ? '#059669' : '#dc2626';
        transactionsTableBlock += `
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 6px 8px;">${tx.transactionType}</td>
              <td style="padding: 6px 8px;">${empNameMap.get(tx.sourceEmployeeId ?? '') ?? '—'}</td>
              <td style="padding: 6px 8px;">${empNameMap.get(tx.targetEmployeeId ?? '') ?? '—'}</td>
              <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: ${color};">${Number(tx.amount).toFixed(2)}</td>
              <td style="padding: 6px 8px; font-size: 12px;">${tx.postedAt ? new Date(tx.postedAt).toLocaleTimeString() : '—'}</td>
            </tr>`;
      }
      transactionsTableBlock += '</tbody></table>';
    }

    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    // 7. Render template
    const rendered = await renderTemplate('daily_balance_report', {
      date,
      totalInCirculation: totalInCirculation.toFixed(2),
      totalTransferredToday: totalTransferredToday.toFixed(2),
      totalWellnessToday: totalWellnessToday.toFixed(2),
      anomalySectionBlock,
      balancesTableBlock,
      transactionsTableBlock,
    });

    if (!rendered) {
      return { sent: 0, skipped: true, error: 'Template disabled' };
    }

    // 8. Send to each recipient
    let sent = 0;
    for (const email of recipients) {
      const result = await emailService.sendRawEmail(email, rendered.subject, rendered.html);
      if (result.success) sent++;
    }

    console.log(`[DailyReport] Sent to ${sent}/${recipients.length} recipients`);
    return { sent, skipped: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[DailyReport] Failed:', message);
    return { sent: 0, skipped: false, error: message };
  }
}

/**
 * Initializes the cron job to run the daily report at 6:00 AM server time.
 */
export function initDailyReportJob() {
  cron.schedule('0 6 * * *', () => {
    console.log('[DailyReport] Running scheduled daily report...');
    generateAndSendReport();
  });
  console.log('[DailyReport] Cron job initialized (6:00 AM daily)');
}
