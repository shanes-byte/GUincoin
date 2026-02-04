/**
 * Card builder functions for Google Chat formatted responses
 */

import {
  GoogleChatResponse,
  GoogleChatCardV2,
  GoogleChatSection,
  GoogleChatWidget,
  CommandName,
} from '../types/googleChat';

const GUINCOIN_ICON = 'DOLLAR'; // Known icon for coins
const SUCCESS_COLOR = { red: 0.13, green: 0.55, blue: 0.13 }; // Green
const ERROR_COLOR = { red: 0.86, green: 0.2, blue: 0.27 }; // Red
const INFO_COLOR = { red: 0.25, green: 0.47, blue: 0.85 }; // Blue

/**
 * Build a success card for completed operations
 */
export function buildSuccessCard(
  title: string,
  message: string,
  details?: { label: string; value: string }[]
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    {
      decoratedText: {
        startIcon: { knownIcon: 'STAR' },
        text: `<b>${message}</b>`,
      },
    },
  ];

  if (details && details.length > 0) {
    widgets.push({ divider: {} });
    for (const detail of details) {
      widgets.push({
        decoratedText: {
          topLabel: detail.label,
          text: detail.value,
        },
      });
    }
  }

  const card: GoogleChatCardV2 = {
    cardId: 'success-card',
    card: {
      header: {
        title,
        subtitle: 'Guincoin',
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/check_circle/default/48px.svg',
        imageType: 'CIRCLE',
      },
      sections: [{ widgets }],
    },
  };

  return { cardsV2: [card] };
}

/**
 * Build an error card for failed operations
 */
export function buildErrorCard(
  title: string,
  errorMessage: string,
  suggestion?: string
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    {
      decoratedText: {
        startIcon: { knownIcon: 'DESCRIPTION' },
        text: `<font color="#dc3545">${errorMessage}</font>`,
      },
    },
  ];

  if (suggestion) {
    widgets.push({ divider: {} });
    widgets.push({
      textParagraph: {
        text: `<i>${suggestion}</i>`,
      },
    });
  }

  const card: GoogleChatCardV2 = {
    cardId: 'error-card',
    card: {
      header: {
        title,
        subtitle: 'Guincoin',
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/error/default/48px.svg',
        imageType: 'CIRCLE',
      },
      sections: [{ widgets }],
    },
  };

  return { cardsV2: [card] };
}

/**
 * Build a balance card showing user's current balance
 */
export function buildBalanceCard(
  userName: string,
  balance: { posted: number; pending: number; total: number }
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    {
      decoratedText: {
        startIcon: { knownIcon: GUINCOIN_ICON },
        topLabel: 'Current Balance',
        text: `<b>${balance.total.toLocaleString()}</b> Guincoins`,
      },
    },
  ];

  if (balance.pending !== 0) {
    widgets.push({
      decoratedText: {
        topLabel: 'Posted',
        text: `${balance.posted.toLocaleString()} Guincoins`,
      },
    });
    widgets.push({
      decoratedText: {
        topLabel: 'Pending',
        text: `${balance.pending >= 0 ? '+' : ''}${balance.pending.toLocaleString()} Guincoins`,
      },
    });
  }

  const card: GoogleChatCardV2 = {
    cardId: 'balance-card',
    card: {
      header: {
        title: `${userName}'s Balance`,
        subtitle: 'Guincoin',
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/account_balance_wallet/default/48px.svg',
        imageType: 'CIRCLE',
      },
      sections: [{ widgets }],
    },
  };

  return { cardsV2: [card] };
}

/**
 * Build an award success card
 */
export function buildAwardCard(
  recipientName: string,
  amount: number,
  description: string,
  remainingBudget: number
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    {
      decoratedText: {
        startIcon: { knownIcon: 'STAR' },
        text: `<b>Awarded ${amount.toLocaleString()} Guincoins to ${recipientName}</b>`,
      },
    },
    { divider: {} },
    {
      decoratedText: {
        topLabel: 'Message',
        text: description || 'Award from manager',
      },
    },
    {
      decoratedText: {
        topLabel: 'Remaining Budget',
        text: `${remainingBudget.toLocaleString()} Guincoins`,
        startIcon: { knownIcon: GUINCOIN_ICON },
      },
    },
  ];

  const card: GoogleChatCardV2 = {
    cardId: 'award-card',
    card: {
      header: {
        title: 'Award Sent!',
        subtitle: 'Guincoin Manager Award',
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/stars/default/48px.svg',
        imageType: 'CIRCLE',
      },
      sections: [{ widgets }],
    },
  };

  return { cardsV2: [card] };
}

/**
 * Build a transfer success card
 */
export function buildTransferCard(
  recipientName: string,
  amount: number,
  message: string | undefined,
  isPending: boolean
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    {
      decoratedText: {
        startIcon: { knownIcon: 'SEND' },
        text: isPending
          ? `<b>Transfer of ${amount.toLocaleString()} Guincoins to ${recipientName} is pending</b>`
          : `<b>Sent ${amount.toLocaleString()} Guincoins to ${recipientName}</b>`,
      },
    },
  ];

  if (message) {
    widgets.push({ divider: {} });
    widgets.push({
      decoratedText: {
        topLabel: 'Message',
        text: message,
      },
    });
  }

  if (isPending) {
    widgets.push({ divider: {} });
    widgets.push({
      textParagraph: {
        text: '<i>The recipient will receive the coins once they sign in to Guincoin.</i>',
      },
    });
  }

  const card: GoogleChatCardV2 = {
    cardId: 'transfer-card',
    card: {
      header: {
        title: isPending ? 'Transfer Pending' : 'Transfer Complete!',
        subtitle: 'Guincoin Peer Transfer',
        imageUrl: isPending
          ? 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/schedule/default/48px.svg'
          : 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/check_circle/default/48px.svg',
        imageType: 'CIRCLE',
      },
      sections: [{ widgets }],
    },
  };

  return { cardsV2: [card] };
}

/**
 * Build a help card showing available commands
 */
export function buildHelpCard(isManager: boolean): GoogleChatResponse {
  const sections: GoogleChatSection[] = [];

  // General commands section
  const generalWidgets: GoogleChatWidget[] = [
    {
      decoratedText: {
        startIcon: { knownIcon: 'BOOKMARK' },
        text: '<b>/balance</b>',
        bottomLabel: 'Check your current Guincoin balance',
      },
    },
    {
      decoratedText: {
        startIcon: { knownIcon: 'BOOKMARK' },
        text: '<b>/transfer @user [amount] [message]</b>',
        bottomLabel: 'Send coins to a peer (e.g., /transfer @john 25 Thanks!)',
      },
    },
    {
      decoratedText: {
        startIcon: { knownIcon: 'BOOKMARK' },
        text: '<b>/help</b>',
        bottomLabel: 'Show this help message',
      },
    },
  ];

  sections.push({
    header: 'Available Commands',
    widgets: generalWidgets,
  });

  // Manager commands section
  if (isManager) {
    const managerWidgets: GoogleChatWidget[] = [
      {
        decoratedText: {
          startIcon: { knownIcon: 'STAR' },
          text: '<b>/award @user [amount] [message]</b>',
          bottomLabel: 'Award coins to an employee (e.g., /award @jane 50 Great work!)',
        },
      },
    ];

    sections.push({
      header: 'Manager Commands',
      widgets: managerWidgets,
    });
  }

  // Tips section
  const tipsWidgets: GoogleChatWidget[] = [
    {
      textParagraph: {
        text: '<i>Tip: Use @mentions to specify recipients. The amount must be a positive number.</i>',
      },
    },
  ];

  sections.push({
    header: 'Tips',
    widgets: tipsWidgets,
    collapsible: true,
    uncollapsibleWidgetsCount: 0,
  });

  const card: GoogleChatCardV2 = {
    cardId: 'help-card',
    card: {
      header: {
        title: 'Guincoin Help',
        subtitle: 'Available Commands',
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/help/default/48px.svg',
        imageType: 'CIRCLE',
      },
      sections,
    },
  };

  return { cardsV2: [card] };
}

/**
 * Build a simple text response (fallback for non-card scenarios)
 */
export function buildTextResponse(text: string): GoogleChatResponse {
  return { text };
}

/**
 * Build a welcome card when bot is added to a space
 */
export function buildWelcomeCard(): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    {
      textParagraph: {
        text: 'Thanks for adding me! I can help you manage Guincoins directly from Google Chat.',
      },
    },
    { divider: {} },
    {
      textParagraph: {
        text: 'Type <b>/help</b> to see available commands.',
      },
    },
  ];

  const card: GoogleChatCardV2 = {
    cardId: 'welcome-card',
    card: {
      header: {
        title: 'Welcome to Guincoin!',
        subtitle: 'Your rewards companion',
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/waving_hand/default/48px.svg',
        imageType: 'CIRCLE',
      },
      sections: [{ widgets }],
    },
  };

  return { cardsV2: [card] };
}
