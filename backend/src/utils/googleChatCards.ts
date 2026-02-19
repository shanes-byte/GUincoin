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

// ─────────────────────────────────────────────────────────────
// Chat Game Card Builders (added 2026-02-12)
// ─────────────────────────────────────────────────────────────

/**
 * Build the card shown when an Encrypted Office cipher game starts.
 */
export function buildCipherStartCard(
  gameName: string,
  difficulty: string,
  encryptedText: string,
  layers: number,
  gameId: string
): GoogleChatResponse {
  const difficultyColor =
    difficulty === 'hard'
      ? '#dc3545'
      : difficulty === 'medium'
        ? '#f59e0b'
        : '#22c55e';

  const widgets: GoogleChatWidget[] = [
    {
      decoratedText: {
        topLabel: 'Difficulty',
        text: `<font color="${difficultyColor}"><b>${difficulty.toUpperCase()}</b></font>`,
        startIcon: { knownIcon: 'STAR' },
      },
    },
    {
      decoratedText: {
        topLabel: 'Layers to Solve',
        text: `<b>${layers}</b>`,
      },
    },
    {
      decoratedText: {
        topLabel: 'Hint Tokens',
        text: '<b>3</b> available',
        startIcon: { knownIcon: 'DESCRIPTION' },
      },
    },
    { divider: {} },
    {
      textParagraph: {
        text: '<b>Encrypted Text:</b>',
      },
    },
    {
      textParagraph: {
        text: `<code>${encryptedText}</code>`,
      },
    },
    { divider: {} },
    {
      textParagraph: {
        text: '<i>Use <b>/games solve &lt;answer&gt;</b> to attempt a solution or <b>/games hint</b> to use a hint token.</i>',
      },
    },
  ];

  const card: GoogleChatCardV2 = {
    cardId: `cipher-start-${gameId}`,
    card: {
      header: {
        title: 'Encrypted Office',
        subtitle: `${gameName} — ${difficulty.toUpperCase()}`,
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/lock/default/48px.svg',
        imageType: 'CIRCLE',
      },
      sections: [{ widgets }],
    },
  };

  return { cardsV2: [card] };
}

/**
 * Build the card shown when a hint is used in the cipher game.
 */
export function buildCipherHintCard(
  hint: string,
  hintsRemaining: number
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    {
      textParagraph: {
        text: `<b>Hint:</b> ${hint}`,
      },
    },
    { divider: {} },
    {
      decoratedText: {
        topLabel: 'Hint Tokens Remaining',
        text: `<b>${hintsRemaining}</b>`,
        startIcon: { knownIcon: 'DESCRIPTION' },
      },
    },
  ];

  const card: GoogleChatCardV2 = {
    cardId: 'cipher-hint-card',
    card: {
      header: {
        title: 'Hint Revealed',
        subtitle: 'Encrypted Office',
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/lightbulb/default/48px.svg',
        imageType: 'CIRCLE',
      },
      sections: [{ widgets }],
    },
  };

  return { cardsV2: [card] };
}

/**
 * Build the card shown when a cipher layer is solved.
 */
export function buildCipherLayerSolvedCard(
  playerName: string,
  layerNumber: number,
  totalLayers: number,
  pointsEarned: number,
  nextEncryptedText?: string
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    {
      decoratedText: {
        startIcon: { knownIcon: 'STAR' },
        text: `<font color="#22c55e"><b>${playerName}</b> solved layer ${layerNumber}!</font>`,
      },
    },
    {
      decoratedText: {
        topLabel: 'Progress',
        text: `<b>${layerNumber}</b> of <b>${totalLayers}</b> layers`,
      },
    },
    {
      decoratedText: {
        topLabel: 'Points Earned',
        text: `<b>+${pointsEarned}</b>`,
        startIcon: { knownIcon: GUINCOIN_ICON },
      },
    },
  ];

  if (nextEncryptedText) {
    widgets.push({ divider: {} });
    widgets.push({
      textParagraph: {
        text: '<b>Next Layer:</b>',
      },
    });
    widgets.push({
      textParagraph: {
        text: `<code>${nextEncryptedText}</code>`,
      },
    });
  }

  const card: GoogleChatCardV2 = {
    cardId: 'cipher-layer-solved-card',
    card: {
      header: {
        title: 'Layer Solved!',
        subtitle: `Encrypted Office — Layer ${layerNumber} of ${totalLayers}`,
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/check_circle/default/48px.svg',
        imageType: 'CIRCLE',
      },
      sections: [{ widgets }],
    },
  };

  return { cardsV2: [card] };
}

/**
 * Build the card shown when the cipher game is fully solved.
 */
export function buildCipherCompleteCard(
  winnerName: string,
  totalScore: number,
  coinsAwarded: number,
  difficulty: string
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    {
      textParagraph: {
        text: `<font color="#22c55e"><b>${winnerName} cracked the cipher!</b></font>`,
      },
    },
    { divider: {} },
    {
      decoratedText: {
        topLabel: 'Difficulty',
        text: `<b>${difficulty.toUpperCase()}</b>`,
      },
    },
    {
      decoratedText: {
        topLabel: 'Total Score',
        text: `<b>${totalScore.toLocaleString()}</b> points`,
      },
    },
    {
      decoratedText: {
        topLabel: 'Guincoins Earned',
        text: `<font color="#22c55e"><b>+${coinsAwarded.toLocaleString()}</b></font> Guincoins`,
        startIcon: { knownIcon: GUINCOIN_ICON },
      },
    },
  ];

  const card: GoogleChatCardV2 = {
    cardId: 'cipher-complete-card',
    card: {
      header: {
        title: 'Cipher Complete!',
        subtitle: 'Encrypted Office — Victory',
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/trophy/default/48px.svg',
        imageType: 'CIRCLE',
      },
      sections: [{ widgets }],
    },
  };

  return { cardsV2: [card] };
}

/**
 * Build the card shown when a Skill Shot game starts.
 */
export function buildSkillShotStartCard(
  rounds: number,
  range: number,
  currentRound: number,
  gameId: string
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    {
      decoratedText: {
        topLabel: 'Round',
        text: `<b>${currentRound}</b> of <b>${rounds}</b>`,
      },
    },
    {
      decoratedText: {
        topLabel: 'Range',
        text: `<b>1</b> to <b>${range}</b>`,
      },
    },
    { divider: {} },
    {
      textParagraph: {
        text: '<b>How to play:</b>',
      },
    },
    {
      textParagraph: {
        text: 'Guess the hidden number! The closest bid wins the round.',
      },
    },
    {
      decoratedText: {
        startIcon: { knownIcon: 'BOOKMARK' },
        text: '<b>/games bid &lt;number&gt;</b>',
        bottomLabel: 'Place a standard bid',
      },
    },
    {
      decoratedText: {
        startIcon: { knownIcon: 'BOOKMARK' },
        text: '<b>/games bid &lt;number&gt; double</b>',
        bottomLabel: 'Double Risk — 2x points if closest, but lose points if not',
      },
    },
  ];

  const card: GoogleChatCardV2 = {
    cardId: `skillshot-start-${gameId}`,
    card: {
      header: {
        title: 'Skill Shot',
        subtitle: `Round ${currentRound} of ${rounds}`,
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/target/default/48px.svg',
        imageType: 'CIRCLE',
      },
      sections: [{ widgets }],
    },
  };

  return { cardsV2: [card] };
}

/**
 * Build the card showing Skill Shot round results.
 */
export function buildSkillShotRoundResultCard(
  roundNumber: number,
  target: number,
  winnerName: string | null,
  scores: Array<{ name: string; bid: number; points: number; doubleRisk: boolean }>,
  nextRound: boolean
): GoogleChatResponse {
  const sections: GoogleChatSection[] = [];

  // Target reveal section
  const targetWidgets: GoogleChatWidget[] = [
    {
      decoratedText: {
        topLabel: 'Target Number',
        text: `<font color="#3b82f6"><b>${target}</b></font>`,
        startIcon: { knownIcon: 'STAR' },
      },
    },
  ];

  if (winnerName) {
    targetWidgets.push({
      decoratedText: {
        topLabel: 'Round Winner',
        text: `<font color="#22c55e"><b>${winnerName}</b></font>`,
      },
    });
  } else {
    targetWidgets.push({
      textParagraph: {
        text: '<i>No winner this round.</i>',
      },
    });
  }

  sections.push({ header: 'Results', widgets: targetWidgets });

  // Scores section — sorted by closeness (points descending)
  const scoreWidgets: GoogleChatWidget[] = scores.map((entry, index) => {
    const distance = Math.abs(entry.bid - target);
    const doubleLabel = entry.doubleRisk ? ' <font color="#dc3545">[2x]</font>' : '';
    const pointsColor = entry.points >= 0 ? '#22c55e' : '#dc3545';
    const pointsSign = entry.points >= 0 ? '+' : '';

    return {
      decoratedText: {
        topLabel: `${entry.name}${doubleLabel}`,
        text: `Bid: <b>${entry.bid}</b> (off by ${distance}) — <font color="${pointsColor}"><b>${pointsSign}${entry.points}</b> pts</font>`,
      },
    } as GoogleChatWidget;
  });

  sections.push({ header: 'All Bids', widgets: scoreWidgets });

  // Next round prompt
  if (nextRound) {
    sections.push({
      widgets: [
        {
          textParagraph: {
            text: '<i>Next round starting soon — place your bids!</i>',
          },
        },
      ],
    });
  }

  const card: GoogleChatCardV2 = {
    cardId: `skillshot-round-${roundNumber}`,
    card: {
      header: {
        title: `Round ${roundNumber} Results`,
        subtitle: 'Skill Shot',
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/target/default/48px.svg',
        imageType: 'CIRCLE',
      },
      sections,
    },
  };

  return { cardsV2: [card] };
}

/**
 * Build the final results card for a Skill Shot game.
 */
export function buildSkillShotFinalCard(
  rankings: Array<{ name: string; totalScore: number; coinsAwarded: number }>,
  rounds: number
): GoogleChatResponse {
  const sections: GoogleChatSection[] = [];

  const rankingWidgets: GoogleChatWidget[] = rankings.map((player, index) => {
    const position = index + 1;
    const positionLabel =
      position === 1
        ? '1st'
        : position === 2
          ? '2nd'
          : position === 3
            ? '3rd'
            : `#${position}`;

    const coinsText =
      player.coinsAwarded > 0
        ? ` — <font color="#22c55e"><b>+${player.coinsAwarded.toLocaleString()}</b> gc</font>`
        : '';

    return {
      decoratedText: {
        topLabel: `${positionLabel} — ${player.name}`,
        text: `<b>${player.totalScore.toLocaleString()}</b> points${coinsText}`,
        startIcon: { knownIcon: GUINCOIN_ICON },
      },
    } as GoogleChatWidget;
  });

  sections.push({ header: 'Final Rankings', widgets: rankingWidgets });

  sections.push({
    widgets: [
      {
        textParagraph: {
          text: `<i>Game complete — ${rounds} rounds played.</i>`,
        },
      },
    ],
  });

  const card: GoogleChatCardV2 = {
    cardId: 'skillshot-final-card',
    card: {
      header: {
        title: 'Skill Shot — Final Results',
        subtitle: 'Game Over',
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/trophy/default/48px.svg',
        imageType: 'CIRCLE',
      },
      sections,
    },
  };

  return { cardsV2: [card] };
}

/**
 * Build a card listing all active games in the space.
 */
export function buildActiveGamesCard(
  games: Array<{
    id: string;
    type: string;
    status: string;
    playerCount: number;
    createdAt: string;
    expiresAt: string | null;
  }>
): GoogleChatResponse {
  if (games.length === 0) {
    const widgets: GoogleChatWidget[] = [
      {
        textParagraph: {
          text: '<i>No active games. Start one with <b>/games start &lt;type&gt;</b></i>',
        },
      },
    ];

    const card: GoogleChatCardV2 = {
      cardId: 'active-games-empty',
      card: {
        header: {
          title: 'Active Games',
          subtitle: 'Guincoin Games',
          imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/sports_esports/default/48px.svg',
          imageType: 'CIRCLE',
        },
        sections: [{ widgets }],
      },
    };

    return { cardsV2: [card] };
  }

  const sections: GoogleChatSection[] = [];

  for (const game of games) {
    const gameWidgets: GoogleChatWidget[] = [
      {
        decoratedText: {
          topLabel: 'Type',
          text: `<b>${game.type}</b>`,
        },
      },
      {
        decoratedText: {
          topLabel: 'Status',
          text: game.status,
        },
      },
      {
        decoratedText: {
          topLabel: 'Players',
          text: `<b>${game.playerCount}</b>`,
        },
      },
    ];

    if (game.expiresAt) {
      gameWidgets.push({
        decoratedText: {
          topLabel: 'Expires',
          text: game.expiresAt,
        },
      });
    }

    sections.push({
      header: `Game ${game.id.slice(0, 8)}`,
      widgets: gameWidgets,
      collapsible: games.length > 2,
      uncollapsibleWidgetsCount: 2,
    });
  }

  const card: GoogleChatCardV2 = {
    cardId: 'active-games-card',
    card: {
      header: {
        title: 'Active Games',
        subtitle: `${games.length} game${games.length !== 1 ? 's' : ''} in progress`,
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/sports_esports/default/48px.svg',
        imageType: 'CIRCLE',
      },
      sections,
    },
  };

  return { cardsV2: [card] };
}

// ─────────────────────────────────────────────────────────────
// Casual Game Card Builders (added 2026-02-19)
// ─────────────────────────────────────────────────────────────

const GAME_COLOR = { red: 0.55, green: 0.22, blue: 0.86 }; // Purple accent for casual games

// --- Word Scramble ---

export function buildScrambleStartCard(
  rounds: number, difficulty: string, scrambledWord: string, gameId: string
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    { decoratedText: { topLabel: 'Difficulty', text: `<b>${difficulty.toUpperCase()}</b>`, startIcon: { knownIcon: 'STAR' } } },
    { decoratedText: { topLabel: 'Rounds', text: `<b>${rounds}</b>` } },
    { divider: {} },
    { textParagraph: { text: '<b>Unscramble this word:</b>' } },
    { textParagraph: { text: `<code>${scrambledWord}</code>` } },
    { divider: {} },
    { textParagraph: { text: '<i>Use <b>/games answer &lt;word&gt;</b> to guess!</i>' } },
  ];
  return { cardsV2: [{ cardId: `scramble-start-${gameId}`, card: { header: { title: 'Word Scramble', subtitle: `Round 1 of ${rounds} — ${difficulty.toUpperCase()}`, imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/sports_esports/default/48px.svg', imageType: 'CIRCLE' }, sections: [{ widgets }] } }] };
}

export function buildScrambleRoundResultCard(
  playerName: string, originalWord: string, round: number, total: number, scores: Record<string, number>
): GoogleChatResponse {
  const scoreList = Object.entries(scores).sort(([, a], [, b]) => b - a).map(([, s], i) => `${i + 1}.`).join(', ');
  const widgets: GoogleChatWidget[] = [
    { decoratedText: { startIcon: { knownIcon: 'STAR' }, text: `<font color="#22c55e"><b>${playerName}</b> got it!</font>` } },
    { decoratedText: { topLabel: 'Word', text: `<b>${originalWord}</b>` } },
    { decoratedText: { topLabel: 'Round', text: `<b>${round}</b> of <b>${total}</b>` } },
  ];
  return { cardsV2: [{ cardId: `scramble-round-${round}`, card: { header: { title: 'Correct!', subtitle: `Word Scramble — Round ${round}`, imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/check_circle/default/48px.svg', imageType: 'CIRCLE' }, sections: [{ widgets }] } }] };
}

export function buildScrambleNextRoundCard(
  round: number, total: number, scrambledWord: string
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    { textParagraph: { text: '<b>Unscramble this word:</b>' } },
    { textParagraph: { text: `<code>${scrambledWord}</code>` } },
    { divider: {} },
    { textParagraph: { text: '<i>Use <b>/games answer &lt;word&gt;</b> to guess!</i>' } },
  ];
  return { cardsV2: [{ cardId: `scramble-next-${round}`, card: { header: { title: 'Word Scramble', subtitle: `Round ${round} of ${total}`, imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/sports_esports/default/48px.svg', imageType: 'CIRCLE' }, sections: [{ widgets }] } }] };
}

export function buildScrambleWinnerCard(
  rankings: { name: string; score: number }[], totalRounds: number
): GoogleChatResponse {
  const sections: GoogleChatSection[] = [];
  const rankWidgets: GoogleChatWidget[] = rankings.map((p, i) => ({
    decoratedText: { topLabel: `${i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `#${i + 1}`} — ${p.name}`, text: `<b>${p.score}</b> words solved` },
  }));
  sections.push({ header: 'Final Rankings', widgets: rankWidgets });
  sections.push({ widgets: [{ textParagraph: { text: `<i>Game complete — ${totalRounds} rounds played.</i>` } }] });
  return { cardsV2: [{ cardId: 'scramble-winner', card: { header: { title: 'Word Scramble — Final Results', subtitle: 'Game Over', imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/trophy/default/48px.svg', imageType: 'CIRCLE' }, sections } }] };
}

// --- Emoji Decoder ---

export function buildEmojiStartCard(
  rounds: number, category: string, emojis: string, gameId: string
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    { decoratedText: { topLabel: 'Category', text: `<b>${category.toUpperCase()}</b>`, startIcon: { knownIcon: 'STAR' } } },
    { decoratedText: { topLabel: 'Rounds', text: `<b>${rounds}</b>` } },
    { divider: {} },
    { textParagraph: { text: '<b>What do these emojis represent?</b>' } },
    { textParagraph: { text: `<font size="18">${emojis}</font>` } },
    { divider: {} },
    { textParagraph: { text: '<i>Use <b>/games answer &lt;your guess&gt;</b> to guess!</i>' } },
  ];
  return { cardsV2: [{ cardId: `emoji-start-${gameId}`, card: { header: { title: 'Emoji Decoder', subtitle: `Round 1 of ${rounds} — ${category.toUpperCase()}`, imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/sports_esports/default/48px.svg', imageType: 'CIRCLE' }, sections: [{ widgets }] } }] };
}

export function buildEmojiSolvedCard(
  playerName: string, emojis: string, answer: string, round: number, scores: Record<string, number>
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    { decoratedText: { startIcon: { knownIcon: 'STAR' }, text: `<font color="#22c55e"><b>${playerName}</b> decoded it!</font>` } },
    { decoratedText: { topLabel: 'Emojis', text: emojis } },
    { decoratedText: { topLabel: 'Answer', text: `<b>${answer}</b>` } },
  ];
  return { cardsV2: [{ cardId: `emoji-solved-${round}`, card: { header: { title: 'Decoded!', subtitle: `Emoji Decoder — Round ${round}`, imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/check_circle/default/48px.svg', imageType: 'CIRCLE' }, sections: [{ widgets }] } }] };
}

export function buildEmojiNextPuzzleCard(
  round: number, total: number, emojis: string, categoryHint: string
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    { textParagraph: { text: '<b>What do these emojis represent?</b>' } },
    { textParagraph: { text: `<font size="18">${emojis}</font>` } },
    { divider: {} },
    { decoratedText: { topLabel: 'Hint', text: `Category: <b>${categoryHint}</b>` } },
    { textParagraph: { text: '<i>Use <b>/games answer &lt;your guess&gt;</b> to guess!</i>' } },
  ];
  return { cardsV2: [{ cardId: `emoji-next-${round}`, card: { header: { title: 'Emoji Decoder', subtitle: `Round ${round} of ${total}`, imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/sports_esports/default/48px.svg', imageType: 'CIRCLE' }, sections: [{ widgets }] } }] };
}

export function buildEmojiWinnerCard(
  rankings: { name: string; score: number }[], totalRounds: number
): GoogleChatResponse {
  const sections: GoogleChatSection[] = [];
  const rankWidgets: GoogleChatWidget[] = rankings.map((p, i) => ({
    decoratedText: { topLabel: `${i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `#${i + 1}`} — ${p.name}`, text: `<b>${p.score}</b> puzzles solved` },
  }));
  sections.push({ header: 'Final Rankings', widgets: rankWidgets });
  sections.push({ widgets: [{ textParagraph: { text: `<i>Game complete — ${totalRounds} rounds played.</i>` } }] });
  return { cardsV2: [{ cardId: 'emoji-winner', card: { header: { title: 'Emoji Decoder — Final Results', subtitle: 'Game Over', imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/trophy/default/48px.svg', imageType: 'CIRCLE' }, sections } }] };
}

// --- Trivia Blitz ---

export function buildTriviaStartCard(
  questionCount: number, category: string, gameId: string
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    { decoratedText: { topLabel: 'Category', text: `<b>${category.toUpperCase()}</b>`, startIcon: { knownIcon: 'STAR' } } },
    { decoratedText: { topLabel: 'Questions', text: `<b>${questionCount}</b>` } },
    { divider: {} },
    { textParagraph: { text: '<b>How to play:</b>' } },
    { textParagraph: { text: 'Answer trivia questions with A, B, C, or D. First correct answer scores!' } },
    { decoratedText: { startIcon: { knownIcon: 'BOOKMARK' }, text: '<b>/games answer &lt;A|B|C|D&gt;</b>', bottomLabel: 'Submit your answer' } },
    { decoratedText: { startIcon: { knownIcon: 'BOOKMARK' }, text: '<b>/games next</b>', bottomLabel: 'GM advances to next question' } },
  ];
  return { cardsV2: [{ cardId: `trivia-start-${gameId}`, card: { header: { title: 'Trivia Blitz', subtitle: `${questionCount} Questions — ${category.toUpperCase()}`, imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/quiz/default/48px.svg', imageType: 'CIRCLE' }, sections: [{ widgets }] } }] };
}

export function buildTriviaQuestionCard(
  questionNum: number, total: number, question: string, options: string[]
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    { textParagraph: { text: `<b>Q${questionNum}:</b> ${question}` } },
    { divider: {} },
    ...options.map(opt => ({ textParagraph: { text: opt } })),
    { divider: {} },
    { textParagraph: { text: '<i>Use <b>/games answer &lt;A|B|C|D&gt;</b></i>' } },
  ];
  return { cardsV2: [{ cardId: `trivia-q-${questionNum}`, card: { header: { title: 'Trivia Blitz', subtitle: `Question ${questionNum} of ${total}`, imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/quiz/default/48px.svg', imageType: 'CIRCLE' }, sections: [{ widgets }] } }] };
}

export function buildTriviaAnswerResultCard(
  playerName: string | null, correct: boolean, correctAnswer: string, scores: Record<string, number>
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [];
  if (correct && playerName) {
    widgets.push({ decoratedText: { startIcon: { knownIcon: 'STAR' }, text: `<font color="#22c55e"><b>${playerName}</b> got it right! +15 pts</font>` } });
  } else if (playerName) {
    widgets.push({ textParagraph: { text: `<font color="#dc3545">Wrong!</font> The correct answer was <b>${correctAnswer}</b>` } });
  }
  widgets.push({ divider: {} });
  widgets.push({ textParagraph: { text: '<i>GM: use <b>/games next</b> to continue or <b>/games skip</b> to skip.</i>' } });
  return { cardsV2: [{ cardId: 'trivia-result', card: { header: { title: correct ? 'Correct!' : 'Incorrect', subtitle: 'Trivia Blitz', imageUrl: correct ? 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/check_circle/default/48px.svg' : 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/cancel/default/48px.svg', imageType: 'CIRCLE' }, sections: [{ widgets }] } }] };
}

export function buildTriviaWinnerCard(
  rankings: { name: string; score: number }[], totalQuestions: number
): GoogleChatResponse {
  const sections: GoogleChatSection[] = [];
  const rankWidgets: GoogleChatWidget[] = rankings.map((p, i) => ({
    decoratedText: { topLabel: `${i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `#${i + 1}`} — ${p.name}`, text: `<b>${p.score}</b> pts` },
  }));
  sections.push({ header: 'Final Rankings', widgets: rankWidgets });
  sections.push({ widgets: [{ textParagraph: { text: `<i>Game complete — ${totalQuestions} questions answered.</i>` } }] });
  return { cardsV2: [{ cardId: 'trivia-winner', card: { header: { title: 'Trivia Blitz — Final Results', subtitle: 'Game Over', imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/trophy/default/48px.svg', imageType: 'CIRCLE' }, sections } }] };
}

// --- RPS Showdown ---

export function buildRPSStartCard(
  rounds: number, gameId: string
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    { decoratedText: { topLabel: 'Rounds', text: `<b>${rounds}</b>` } },
    { divider: {} },
    { textParagraph: { text: '<b>How to play:</b>' } },
    { textParagraph: { text: 'Everyone throws secretly. GM reveals with /games resolve.' } },
    { decoratedText: { startIcon: { knownIcon: 'BOOKMARK' }, text: '<b>/games throw rock|paper|scissors</b>', bottomLabel: 'Submit your throw (secretly!)' } },
    { decoratedText: { startIcon: { knownIcon: 'BOOKMARK' }, text: '<b>/games resolve</b>', bottomLabel: 'GM reveals all throws and scores' } },
  ];
  return { cardsV2: [{ cardId: `rps-start-${gameId}`, card: { header: { title: 'RPS Showdown', subtitle: `${rounds} Rounds — Rock Paper Scissors`, imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/sports_esports/default/48px.svg', imageType: 'CIRCLE' }, sections: [{ widgets }] } }] };
}

export function buildRPSRoundResultCard(
  roundNum: number, throws: Record<string, string>, playerNames: Record<string, string>, roundWinners: string[], scores: Record<string, number>
): GoogleChatResponse {
  const sections: GoogleChatSection[] = [];
  const throwEmoji: Record<string, string> = { rock: '🪨', paper: '📄', scissors: '✂️' };

  const throwWidgets: GoogleChatWidget[] = Object.entries(throws).map(([id, choice]) => ({
    decoratedText: { topLabel: playerNames[id] || 'Player', text: `${throwEmoji[choice] || '?'} <b>${choice.charAt(0).toUpperCase() + choice.slice(1)}</b>` },
  }));
  sections.push({ header: `Round ${roundNum} Throws`, widgets: throwWidgets });

  if (roundWinners.length > 0) {
    const winnerNames = roundWinners.map(id => playerNames[id] || 'Player').join(', ');
    sections.push({ widgets: [{ decoratedText: { startIcon: { knownIcon: 'STAR' }, text: `<font color="#22c55e">Round winner: <b>${winnerNames}</b></font>` } }] });
  } else {
    sections.push({ widgets: [{ textParagraph: { text: '<i>No clear winner this round.</i>' } }] });
  }

  const scoreWidgets: GoogleChatWidget[] = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([id, s]) => ({ decoratedText: { topLabel: playerNames[id] || 'Player', text: `<b>${s}</b> wins` } }));
  if (scoreWidgets.length > 0) sections.push({ header: 'Running Scores', widgets: scoreWidgets });

  return { cardsV2: [{ cardId: `rps-round-${roundNum}`, card: { header: { title: `Round ${roundNum} Results`, subtitle: 'RPS Showdown', imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/sports_esports/default/48px.svg', imageType: 'CIRCLE' }, sections } }] };
}

export function buildRPSWinnerCard(
  rankings: { name: string; score: number }[], totalRounds: number
): GoogleChatResponse {
  const sections: GoogleChatSection[] = [];
  const rankWidgets: GoogleChatWidget[] = rankings.map((p, i) => ({
    decoratedText: { topLabel: `${i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `#${i + 1}`} — ${p.name}`, text: `<b>${p.score}</b> wins` },
  }));
  sections.push({ header: 'Final Rankings', widgets: rankWidgets });
  sections.push({ widgets: [{ textParagraph: { text: `<i>Game complete — ${totalRounds} rounds played.</i>` } }] });
  return { cardsV2: [{ cardId: 'rps-winner', card: { header: { title: 'RPS Showdown — Final Results', subtitle: 'Game Over', imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/trophy/default/48px.svg', imageType: 'CIRCLE' }, sections } }] };
}

// --- Hangman ---

export function buildHangmanStartCard(
  rounds: number, difficulty: string, blanks: string, hangmanArt: string, gameId: string
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    { decoratedText: { topLabel: 'Difficulty', text: `<b>${difficulty.toUpperCase()}</b>`, startIcon: { knownIcon: 'STAR' } } },
    { decoratedText: { topLabel: 'Rounds', text: `<b>${rounds}</b>` } },
    { divider: {} },
    { textParagraph: { text: hangmanArt } },
    { textParagraph: { text: `<b>${blanks}</b>` } },
    { divider: {} },
    { decoratedText: { startIcon: { knownIcon: 'BOOKMARK' }, text: '<b>/games letter &lt;X&gt;</b>', bottomLabel: 'Guess a letter' } },
    { decoratedText: { startIcon: { knownIcon: 'BOOKMARK' }, text: '<b>/games answer &lt;word&gt;</b>', bottomLabel: 'Guess the full word' } },
  ];
  return { cardsV2: [{ cardId: `hangman-start-${gameId}`, card: { header: { title: 'Hangman', subtitle: `Round 1 of ${rounds} — ${difficulty.toUpperCase()}`, imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/sports_esports/default/48px.svg', imageType: 'CIRCLE' }, sections: [{ widgets }] } }] };
}

export function buildHangmanGuessCard(
  blanks: string, hangmanArt: string, guessedLetters: string[], wrongLetters: string[], round: number, total: number
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    { textParagraph: { text: hangmanArt } },
    { textParagraph: { text: `<b>${blanks}</b>` } },
    { divider: {} },
  ];
  if (guessedLetters.length > 0) {
    widgets.push({ decoratedText: { topLabel: 'Correct Letters', text: `<font color="#22c55e">${guessedLetters.join(' ')}</font>` } });
  }
  if (wrongLetters.length > 0) {
    widgets.push({ decoratedText: { topLabel: 'Wrong Letters', text: `<font color="#dc3545">${wrongLetters.join(' ')}</font>` } });
  }
  return { cardsV2: [{ cardId: `hangman-guess-${round}`, card: { header: { title: 'Hangman', subtitle: `Round ${round} of ${total}`, imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/sports_esports/default/48px.svg', imageType: 'CIRCLE' }, sections: [{ widgets }] } }] };
}

export function buildHangmanWordResultCard(
  word: string, won: boolean, solverName: string | null, scores: Record<string, number>, hangmanArt: string
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    { textParagraph: { text: hangmanArt } },
  ];
  if (won && solverName) {
    widgets.push({ decoratedText: { startIcon: { knownIcon: 'STAR' }, text: `<font color="#22c55e"><b>${solverName}</b> saved the day!</font>` } });
  } else {
    widgets.push({ textParagraph: { text: '<font color="#dc3545"><b>The hangman got you!</b></font>' } });
  }
  widgets.push({ decoratedText: { topLabel: 'The word was', text: `<b>${word}</b>` } });
  return { cardsV2: [{ cardId: 'hangman-word-result', card: { header: { title: won ? 'Word Solved!' : 'Word Failed!', subtitle: 'Hangman', imageUrl: won ? 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/check_circle/default/48px.svg' : 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/cancel/default/48px.svg', imageType: 'CIRCLE' }, sections: [{ widgets }] } }] };
}

export function buildHangmanWinnerCard(
  rankings: { name: string; score: number }[], totalRounds: number
): GoogleChatResponse {
  const sections: GoogleChatSection[] = [];
  const rankWidgets: GoogleChatWidget[] = rankings.map((p, i) => ({
    decoratedText: { topLabel: `${i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `#${i + 1}`} — ${p.name}`, text: `<b>${p.score}</b> pts` },
  }));
  sections.push({ header: 'Final Rankings', widgets: rankWidgets });
  sections.push({ widgets: [{ textParagraph: { text: `<i>Game complete — ${totalRounds} rounds played.</i>` } }] });
  return { cardsV2: [{ cardId: 'hangman-winner', card: { header: { title: 'Hangman — Final Results', subtitle: 'Game Over', imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/trophy/default/48px.svg', imageType: 'CIRCLE' }, sections } }] };
}

/**
 * Build a status card for a specific game.
 */
export function buildGameStatusCard(
  game: {
    type: string;
    status: string;
    playerCount: number;
    config: any;
    createdAt: string;
  }
): GoogleChatResponse {
  const widgets: GoogleChatWidget[] = [
    {
      decoratedText: {
        topLabel: 'Game Type',
        text: `<b>${game.type}</b>`,
      },
    },
    {
      decoratedText: {
        topLabel: 'Status',
        text: `<b>${game.status}</b>`,
      },
    },
    {
      decoratedText: {
        topLabel: 'Players',
        text: `<b>${game.playerCount}</b>`,
      },
    },
    {
      decoratedText: {
        topLabel: 'Started',
        text: game.createdAt,
      },
    },
  ];

  // Add config details if present
  if (game.config) {
    widgets.push({ divider: {} });

    const configEntries = Object.entries(game.config);
    for (const [key, value] of configEntries) {
      widgets.push({
        decoratedText: {
          topLabel: key.charAt(0).toUpperCase() + key.slice(1),
          text: `${value}`,
        },
      });
    }
  }

  const card: GoogleChatCardV2 = {
    cardId: 'game-status-card',
    card: {
      header: {
        title: `${game.type} — Status`,
        subtitle: 'Guincoin Games',
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/info/default/48px.svg',
        imageType: 'CIRCLE',
      },
      sections: [{ widgets }],
    },
  };

  return { cardsV2: [card] };
}
