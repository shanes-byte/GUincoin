import { getTransporter, getFromEmail, getFromName } from '../config/email';
import { renderTemplate } from './emailTemplateService';

/**
 * Escape HTML special characters to prevent XSS in email templates
 */
const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export class EmailService {
  private frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  // [ORIGINAL - 2026-02-24] messageBlock construction was repeated 5 times with identical HTML
  // Extracted as a private helper to centralize the styled message block template.
  /**
   * Builds a styled HTML block for optional messages in email templates.
   * @param message - The message text to display (will be HTML-escaped)
   * @param bgColor - CSS background color (default: light gray)
   * @returns HTML string or empty string if no message
   */
  private buildMessageBlock(message?: string, bgColor: string = '#f3f4f6'): string {
    if (!message) return '';
    return `<p style="background: ${bgColor}; padding: 15px; border-radius: 5px; margin: 20px 0;">"${escapeHtml(message)}"</p>`;
  }

  /**
   * Send email notification
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
    try {
      const transporter = await getTransporter();
      const fromEmail = await getFromEmail();
      const fromName = await getFromName();

      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html,
      });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown email error';
      console.error('Error sending email:', message);
      // Don't throw - email failures shouldn't break the application
      return { success: false, error: message };
    }
  }

  /**
   * Public wrapper for sendEmail — lets callers (e.g. daily report job)
   * send arbitrary emails without duplicating transporter logic.
   */
  async sendRawEmail(to: string, subject: string, html: string) {
    return this.sendEmail(to, subject, html);
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeNotification(
    employeeEmail: string,
    employeeName: string
  ) {
    const rendered = await renderTemplate('welcome', {
      employeeName,
      loginUrl: this.frontendUrl,
    });

    if (!rendered) return;
    await this.sendEmail(employeeEmail, rendered.subject, rendered.html);
  }

  /**
   * Send notification for manager award
   */
  async sendManagerAwardNotification(
    recipientEmail: string,
    recipientName: string,
    managerName: string,
    amount: number,
    message?: string
  ) {
    const messageBlock = this.buildMessageBlock(message);

    const rendered = await renderTemplate('manager_award_received', {
      recipientName,
      managerName,
      amount,
      message,
      messageBlock,
    });

    if (!rendered) return;
    await this.sendEmail(recipientEmail, rendered.subject, rendered.html);
  }

  /**
   * Send confirmation for manager award to manager
   */
  async sendManagerAwardSentNotification(
    managerEmail: string,
    managerName: string,
    recipientName: string,
    amount: number,
    message?: string
  ) {
    const messageBlock = this.buildMessageBlock(message);

    const rendered = await renderTemplate('manager_award_sent', {
      managerName,
      recipientName,
      amount,
      message,
      messageBlock,
    });

    if (!rendered) return;
    await this.sendEmail(managerEmail, rendered.subject, rendered.html);
  }

  /**
   * Send notification for peer transfer
   */
  async sendPeerTransferNotification(
    recipientEmail: string,
    recipientName: string,
    senderName: string,
    amount: number,
    message?: string
  ) {
    const messageBlock = this.buildMessageBlock(message);

    const rendered = await renderTemplate('peer_transfer_received', {
      recipientName,
      senderName,
      amount,
      message,
      messageBlock,
    });

    if (!rendered) return;
    await this.sendEmail(recipientEmail, rendered.subject, rendered.html);
  }

  /**
   * Send confirmation for peer transfer to sender
   */
  async sendPeerTransferSentNotification(
    senderEmail: string,
    senderName: string,
    recipientName: string,
    amount: number,
    message?: string
  ) {
    const messageBlock = this.buildMessageBlock(message);

    const rendered = await renderTemplate('peer_transfer_sent', {
      senderName,
      recipientName,
      amount,
      message,
      messageBlock,
    });

    if (!rendered) return;
    await this.sendEmail(senderEmail, rendered.subject, rendered.html);
  }

  /**
   * Send notification when recipient is not found
   */
  async sendPeerTransferRecipientNotFoundNotification(
    recipientEmail: string,
    recipientName: string,
    senderName: string,
    amount: number,
    message?: string
  ) {
    const messageBlock = this.buildMessageBlock(message);

    const rendered = await renderTemplate('peer_transfer_recipient_not_found', {
      recipientName,
      recipientEmail,
      senderName,
      amount,
      message,
      messageBlock,
      signinUrl: `${this.frontendUrl}/login`,
    });

    if (!rendered) return;
    await this.sendEmail(recipientEmail, rendered.subject, rendered.html);
  }

  /**
   * Send notification for wellness approval
   */
  async sendWellnessApprovalNotification(
    employeeEmail: string,
    employeeName: string,
    taskName: string,
    amount: number
  ) {
    const rendered = await renderTemplate('wellness_approved', {
      employeeName,
      taskName,
      amount,
    });

    if (!rendered) return;
    await this.sendEmail(employeeEmail, rendered.subject, rendered.html);
  }

  /**
   * Send notification for wellness rejection
   */
  async sendWellnessRejectionNotification(
    employeeEmail: string,
    employeeName: string,
    taskName: string,
    reason?: string
  ) {
    const reasonBlock = reason
      ? `<p style="background: #fee2e2; padding: 15px; border-radius: 5px; margin: 20px 0;"><strong>Reason:</strong> ${escapeHtml(reason)}</p>`
      : '';

    const rendered = await renderTemplate('wellness_rejected', {
      employeeName,
      taskName,
      reason,
      reasonBlock,
    });

    if (!rendered) return;
    await this.sendEmail(employeeEmail, rendered.subject, rendered.html);
  }

  /**
   * Send notification for purchase fulfillment
   */
  async sendPurchaseFulfilledNotification(
    employeeEmail: string,
    employeeName: string,
    productName: string,
    trackingNumber?: string
  ) {
    const trackingBlock = trackingNumber
      ? `<p style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;"><strong>Tracking Number:</strong> ${escapeHtml(trackingNumber)}</p>`
      : '';

    const rendered = await renderTemplate('purchase_fulfilled', {
      employeeName,
      productName,
      trackingNumber,
      trackingBlock,
    });

    if (!rendered) return;
    await this.sendEmail(employeeEmail, rendered.subject, rendered.html);
  }

  /**
   * Send notification when a role is assigned to an employee
   */
  async sendRoleAssignedNotification(
    employeeEmail: string,
    employeeName: string,
    role: string
  ) {
    const rendered = await renderTemplate('role_assigned', {
      employeeName,
      role,
    });

    if (!rendered) return;
    await this.sendEmail(employeeEmail, rendered.subject, rendered.html);
  }

  /**
   * Send notification when allotment deposit is made
   */
  async sendAllotmentDepositNotification(
    managerEmail: string,
    managerName: string,
    amount: number
  ) {
    const rendered = await renderTemplate('allotment_deposit', {
      managerName,
      amount,
    });

    if (!rendered) return;
    await this.sendEmail(managerEmail, rendered.subject, rendered.html);
  }

  /**
   * Send invitation email for bulk imported balance
   */
  async sendBulkImportInvitation(
    recipientEmail: string,
    recipientName: string,
    amount: number
  ) {
    const rendered = await renderTemplate('bulk_import_invitation', {
      recipientName,
      amount,
      signinUrl: `${this.frontendUrl}/login`,
    });

    if (!rendered) return;
    await this.sendEmail(recipientEmail, rendered.subject, rendered.html);
  }
}

export default new EmailService();
