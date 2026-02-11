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

// [ORIGINAL - 2026-02-06] buildAwardCard included remainingBudget in public response — kept as fallback when DM is unavailable
/**
 * Build an award success card (includes budget — fallback when DM is unavailable)
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
 * Build a public award card (no budget info — visible to everyone in the space)
 */
export function buildPublicAwardCard(
  recipientName: string,
  amount: number,
  description: string
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
 * Build a private budget card (sent via DM to the manager only)
 */
export function buildPrivateBudgetCard(
  remainingBudget: number,
  recipientName: string,
  amount: number
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    {
      decoratedText: {
        startIcon: { knownIcon: GUINCOIN_ICON },
        topLabel: 'Remaining Budget',
        text: `<b>${remainingBudget.toLocaleString()}</b> Guincoins`,
      },
    },
    { divider: {} },
    {
      decoratedText: {
        topLabel: 'Last Award',
        text: `${amount.toLocaleString()} Guincoins to ${recipientName}`,
      },
    },
  ];

  const card: GoogleChatCardV2 = {
    cardId: 'budget-dm-card',
    card: {
      header: {
        title: 'Budget Update',
        subtitle: 'Guincoin Manager Budget',
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/account_balance_wallet/default/48px.svg',
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
 * Build a private balance card (sent via DM to the sender after a transfer)
 */
export function buildPrivateTransferBalanceCard(
  remainingBalance: number,
  recipientName: string,
  amount: number
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    {
      decoratedText: {
        startIcon: { knownIcon: GUINCOIN_ICON },
        topLabel: 'Remaining Balance',
        text: `<b>${remainingBalance.toLocaleString()}</b> Guincoins`,
      },
    },
    { divider: {} },
    {
      decoratedText: {
        topLabel: 'Last Transfer',
        text: `${amount.toLocaleString()} Guincoins to ${recipientName}`,
      },
    },
  ];

  const card: GoogleChatCardV2 = {
    cardId: 'transfer-balance-dm-card',
    card: {
      header: {
        title: 'Balance Update',
        subtitle: 'Guincoin Transfer',
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/account_balance_wallet/default/48px.svg',
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
 * Build an award amount picker card for the wizard flow.
 * Shows one button per preset — no custom amount option.
 */
// [ORIGINAL - 2026-02-10] Used award_select_amount (2-step wizard). Now award_dm_execute (single-click award).
// Added spaceName param so DM wizard can post public card back to original space.
export function buildAwardAmountPickerCard(
  targetEmail: string,
  targetName: string,
  presets: { title: string; amount: number }[],
  spaceName?: string | null
): GoogleChatResponse {
  const buttons: GoogleChatWidget['buttonList'] = {
    buttons: presets.map(preset => {
      const parameters = [
        { key: 'targetEmail', value: targetEmail },
        { key: 'targetName', value: targetName },
        { key: 'amount', value: preset.amount.toString() },
        { key: 'presetTitle', value: preset.title },
      ];
      if (spaceName) {
        parameters.push({ key: 'spaceName', value: spaceName });
      }
      return {
        text: `${preset.title} — ${preset.amount} gc`,
        onClick: {
          action: {
            function: 'award_dm_execute',
            parameters,
          },
        },
      };
    }),
  };

  const card: GoogleChatCardV2 = {
    cardId: 'award-wizard-amount',
    card: {
      header: {
        title: `Award to ${targetName}`,
        subtitle: 'Guincoin Manager Award',
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/stars/default/48px.svg',
        imageType: 'CIRCLE',
      },
      sections: [
        {
          header: 'Select Award Amount',
          widgets: [{ buttonList: buttons }],
        },
      ],
    },
  };

  return { cardsV2: [card] };
}

/**
 * Build the message prompt card (step 2 of wizard).
 * Offers "Send with this message" or "Skip — No Message".
 */
export function buildAwardMessagePromptCard(
  targetEmail: string,
  targetName: string,
  amount: number,
  presetTitle: string
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    {
      decoratedText: {
        topLabel: 'Message',
        text: `<b>${presetTitle}</b>`,
      },
    },
    { divider: {} },
    {
      buttonList: {
        buttons: [
          {
            text: 'Send with this message',
            onClick: {
              action: {
                function: 'award_confirm',
                parameters: [
                  { key: 'targetEmail', value: targetEmail },
                  { key: 'targetName', value: targetName },
                  { key: 'amount', value: amount.toString() },
                  { key: 'message', value: presetTitle },
                ],
              },
            },
            color: { red: 0.13, green: 0.55, blue: 0.13 },
          },
          {
            text: 'Skip — No Message',
            onClick: {
              action: {
                function: 'award_confirm',
                parameters: [
                  { key: 'targetEmail', value: targetEmail },
                  { key: 'targetName', value: targetName },
                  { key: 'amount', value: amount.toString() },
                  { key: 'message', value: '' },
                ],
              },
            },
          },
        ],
      },
    },
  ];

  const card: GoogleChatCardV2 = {
    cardId: 'award-wizard-message',
    card: {
      header: {
        title: `Award ${amount} gc to ${targetName}`,
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
