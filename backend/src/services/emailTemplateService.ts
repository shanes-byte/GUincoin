import prisma from '../config/database';

export type EmailTemplateKey =
  | 'welcome'
  | 'manager_award_received'
  | 'manager_award_sent'
  | 'peer_transfer_received'
  | 'peer_transfer_sent'
  | 'peer_transfer_recipient_not_found'
  | 'wellness_approved'
  | 'wellness_rejected'
  | 'purchase_fulfilled'
  | 'role_assigned'
  | 'allotment_deposit';

export interface EmailTemplateDefinition {
  key: EmailTemplateKey;
  name: string;
  description: string;
  subject: string;
  html: string;
  variables: string[];
}

const defaultTemplates: EmailTemplateDefinition[] = [
  {
    key: 'welcome',
    name: 'Welcome Email',
    description: 'Sent to new users when they first sign up.',
    subject: 'Welcome to Guincoin Rewards, {{employeeName}}!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to Guincoin Rewards!</h2>
        <p>Hi {{employeeName}},</p>
        <p>Welcome to the Guincoin Rewards Platform! Your account has been successfully created.</p>
        <p>With Guincoin, you can:</p>
        <ul style="color: #374151; line-height: 1.8;">
          <li>Receive recognition awards from managers</li>
          <li>Send and receive peer-to-peer transfers</li>
          <li>Complete wellness tasks for rewards</li>
          <li>Redeem your Guincoins in the company store</li>
        </ul>
        <p>Log in to your account to get started: <a href="{{loginUrl}}" style="color: #2563eb;">{{loginUrl}}</a></p>
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          This is an automated message from the Guincoin Rewards Platform.
        </p>
      </div>
    `,
    variables: ['employeeName', 'loginUrl'],
  },
  {
    key: 'manager_award_received',
    name: 'Manager Award (Recipient)',
    description: 'Sent to an employee when a manager awards Guincoins.',
    subject: 'You received {{amount}} Guincoins!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">You've Received Guincoins!</h2>
        <p>Hi {{recipientName}},</p>
        <p><strong>{{managerName}}</strong> has awarded you <strong>{{amount}} Guincoins</strong>.</p>
        {{messageBlock}}
        <p>Your balance has been updated. Log in to your account to view your transaction history.</p>
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          This is an automated message from the Guincoin Rewards Platform.
        </p>
      </div>
    `,
    variables: ['recipientName', 'managerName', 'amount', 'messageBlock', 'message'],
  },
  {
    key: 'manager_award_sent',
    name: 'Manager Award (Sender)',
    description: 'Sent to the manager after a successful award.',
    subject: 'You awarded {{amount}} Guincoins to {{recipientName}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Award Sent</h2>
        <p>Hi {{managerName}},</p>
        <p>You awarded <strong>{{amount}} Guincoins</strong> to <strong>{{recipientName}}</strong>.</p>
        {{messageBlock}}
        <p>Your manager allotment has been updated.</p>
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          This is an automated message from the Guincoin Rewards Platform.
        </p>
      </div>
    `,
    variables: ['managerName', 'recipientName', 'amount', 'messageBlock', 'message'],
  },
  {
    key: 'peer_transfer_received',
    name: 'Peer Transfer (Recipient)',
    description: 'Sent to a recipient after a peer transfer posts.',
    subject: '{{senderName}} sent you {{amount}} Guincoins',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">You've Received Guincoins!</h2>
        <p>Hi {{recipientName}},</p>
        <p><strong>{{senderName}}</strong> has sent you <strong>{{amount}} Guincoins</strong>.</p>
        {{messageBlock}}
        <p>Your balance has been updated. Log in to your account to view your transaction history.</p>
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          This is an automated message from the Guincoin Rewards Platform.
        </p>
      </div>
    `,
    variables: ['recipientName', 'senderName', 'amount', 'messageBlock', 'message'],
  },
  {
    key: 'peer_transfer_sent',
    name: 'Peer Transfer (Sender)',
    description: 'Sent to the sender after a peer transfer posts.',
    subject: 'You sent {{amount}} Guincoins to {{recipientName}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Transfer Completed</h2>
        <p>Hi {{senderName}},</p>
        <p>You sent <strong>{{amount}} Guincoins</strong> to <strong>{{recipientName}}</strong>.</p>
        {{messageBlock}}
        <p>Your balance has been updated. Log in to your account to view your transaction history.</p>
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          This is an automated message from the Guincoin Rewards Platform.
        </p>
      </div>
    `,
    variables: ['senderName', 'recipientName', 'amount', 'messageBlock', 'message'],
  },
  {
    key: 'peer_transfer_recipient_not_found',
    name: 'Peer Transfer (Recipient Not Found)',
    description: 'Sent to an email address that is not yet registered.',
    subject: '{{senderName}} tried to send you {{amount}} Guincoins',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">You Have Pending Guincoins</h2>
        <p>Hi {{recipientName}},</p>
        <p><strong>{{senderName}}</strong> tried to send you <strong>{{amount}} Guincoins</strong>.</p>
        {{messageBlock}}
        <p>Sign in to accept the reward: <a href="{{signinUrl}}">{{signinUrl}}</a></p>
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          This is an automated message from the Guincoin Rewards Platform.
        </p>
      </div>
    `,
    variables: ['recipientName', 'recipientEmail', 'senderName', 'amount', 'messageBlock', 'message', 'signinUrl'],
  },
  {
    key: 'wellness_approved',
    name: 'Wellness Submission Approved',
    description: 'Sent to an employee when their wellness submission is approved.',
    subject: 'Your {{taskName}} submission has been approved',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Wellness Task Approved!</h2>
        <p>Hi {{employeeName}},</p>
        <p>Your submission for <strong>{{taskName}}</strong> has been approved.</p>
        <p>You have received <strong>{{amount}} Guincoins</strong> for completing this wellness task.</p>
        <p>Your balance has been updated. Log in to your account to view your transaction history.</p>
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          This is an automated message from the Guincoin Rewards Platform.
        </p>
      </div>
    `,
    variables: ['employeeName', 'taskName', 'amount'],
  },
  {
    key: 'wellness_rejected',
    name: 'Wellness Submission Rejected',
    description: 'Sent to an employee when their wellness submission is rejected.',
    subject: 'Your {{taskName}} submission needs attention',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Wellness Task Submission Update</h2>
        <p>Hi {{employeeName}},</p>
        <p>Your submission for <strong>{{taskName}}</strong> could not be approved at this time.</p>
        {{reasonBlock}}
        <p>Please review your submission and resubmit if needed. Log in to your account for more details.</p>
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          This is an automated message from the Guincoin Rewards Platform.
        </p>
      </div>
    `,
    variables: ['employeeName', 'taskName', 'reason', 'reasonBlock'],
  },
  {
    key: 'purchase_fulfilled',
    name: 'Store Purchase Fulfilled',
    description: 'Sent to an employee when their store purchase order is fulfilled.',
    subject: 'Your order for {{productName}} is on the way!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Order Fulfilled!</h2>
        <p>Hi {{employeeName}},</p>
        <p>Great news! Your order for <strong>{{productName}}</strong> has been fulfilled and is on the way to you.</p>
        {{trackingBlock}}
        <p>You can view your purchase history in your account.</p>
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          This is an automated message from the Guincoin Rewards Platform.
        </p>
      </div>
    `,
    variables: ['employeeName', 'productName', 'trackingNumber', 'trackingBlock'],
  },
  {
    key: 'role_assigned',
    name: 'Role Assigned',
    description: 'Sent to an employee when they are assigned a new role.',
    subject: 'You have been assigned the {{role}} role',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Role Assigned</h2>
        <p>Hi {{employeeName}},</p>
        <p>You have been assigned the <strong>{{role}}</strong> role on the Guincoin Rewards Platform.</p>
        <p>Log in to your account to explore your new capabilities.</p>
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          This is an automated message from the Guincoin Rewards Platform.
        </p>
      </div>
    `,
    variables: ['employeeName', 'role'],
  },
  {
    key: 'allotment_deposit',
    name: 'Allotment Deposit',
    description: 'Sent to a manager when an admin deposits into their allotment.',
    subject: '{{amount}} Guincoins deposited into your allotment',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Allotment Deposit</h2>
        <p>Hi {{managerName}},</p>
        <p><strong>{{amount}} Guincoins</strong> have been deposited into your manager allotment.</p>
        <p>Log in to your account to view your updated allotment balance.</p>
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          This is an automated message from the Guincoin Rewards Platform.
        </p>
      </div>
    `,
    variables: ['managerName', 'amount'],
  },
];

const templateMap = new Map(defaultTemplates.map((template) => [template.key, template]));

const normalize = (value: string | number | undefined | null) =>
  value === undefined || value === null ? '' : String(value);

/** Escape HTML special characters to prevent XSS in email templates */
const escapeHtml = (str: string): string =>
  str.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const interpolate = (content: string, variables: Record<string, string | number | undefined | null>) =>
  content.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const raw = normalize(variables[key]);
    // Don't escape variables that contain pre-built HTML blocks (messageBlock, reasonBlock, etc.)
    if (key.endsWith('Block')) return raw;
    return escapeHtml(raw);
  });

export const isTemplateKey = (key: string): key is EmailTemplateKey =>
  templateMap.has(key as EmailTemplateKey);

export const getDefaultTemplates = () => defaultTemplates.slice();

export async function listEmailTemplates() {
  const storedTemplates = await prisma.emailTemplate.findMany();
  const storedMap = new Map(storedTemplates.map((template) => [template.key, template]));

  return defaultTemplates.map((template) => {
    const stored = storedMap.get(template.key);
    return {
      key: template.key,
      name: template.name,
      description: template.description,
      subject: stored?.subject || template.subject,
      html: stored?.html || template.html,
      isEnabled: stored?.isEnabled ?? true,
      variables: template.variables,
    };
  });
}

export async function upsertEmailTemplate(
  key: EmailTemplateKey,
  data: { subject: string; html: string; isEnabled?: boolean }
) {
  const template = templateMap.get(key);
  if (!template) {
    throw new Error('Unknown email template');
  }

  return prisma.emailTemplate.upsert({
    where: { key },
    create: {
      key,
      name: template.name,
      subject: data.subject,
      html: data.html,
      isEnabled: data.isEnabled ?? true,
    },
    update: {
      subject: data.subject,
      html: data.html,
      isEnabled: data.isEnabled ?? true,
    },
  });
}

// Simple in-memory cache for stored templates with 5-minute TTL
const templateCache = new Map<string, { data: any; expiresAt: number }>();
const TEMPLATE_CACHE_TTL_MS = 5 * 60 * 1000;

async function getStoredTemplate(key: string) {
  const cached = templateCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }
  const stored = await prisma.emailTemplate.findUnique({ where: { key } });
  templateCache.set(key, { data: stored, expiresAt: Date.now() + TEMPLATE_CACHE_TTL_MS });
  return stored;
}

export async function renderTemplate(
  key: EmailTemplateKey,
  variables: Record<string, string | number | undefined | null>
) {
  const template = templateMap.get(key);
  if (!template) {
    throw new Error('Unknown email template');
  }

  const stored = await getStoredTemplate(key);
  const subjectTemplate = stored?.subject || template.subject;
  const htmlTemplate = stored?.html || template.html;
  const isEnabled = stored?.isEnabled ?? true;

  if (!isEnabled) {
    return null;
  }

  return {
    subject: interpolate(subjectTemplate, variables),
    html: interpolate(htmlTemplate, variables),
  };
}
