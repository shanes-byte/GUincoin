/**
 * TypeScript interfaces for Google Chat webhook events and responses
 */

// Google Chat Event Types
export type GoogleChatEventType =
  | 'MESSAGE'
  | 'ADDED_TO_SPACE'
  | 'REMOVED_FROM_SPACE'
  | 'CARD_CLICKED';

// User information from Google Chat
export interface GoogleChatUser {
  name: string; // Format: "users/{user_id}"
  displayName: string;
  avatarUrl?: string;
  email?: string;
  type: 'HUMAN' | 'BOT';
  domainId?: string;
}

// Space information
export interface GoogleChatSpace {
  name: string; // Format: "spaces/{space_id}"
  type: 'ROOM' | 'DM' | 'SPACE';
  displayName?: string;
  singleUserBotDm?: boolean;
  spaceThreadingState?: 'THREADED_MESSAGES' | 'GROUPED_MESSAGES' | 'UNTHREADED_MESSAGES';
}

// Thread information
export interface GoogleChatThread {
  name: string; // Format: "spaces/{space_id}/threads/{thread_id}"
  retentionSettings?: {
    state: 'PERMANENT' | 'HISTORY_OFF';
  };
}

// Message content
export interface GoogleChatMessage {
  name: string; // Format: "spaces/{space_id}/messages/{message_id}"
  sender: GoogleChatUser;
  createTime: string;
  text?: string;
  argumentText?: string; // Text with @mentions stripped
  thread?: GoogleChatThread;
  space: GoogleChatSpace;
  annotations?: GoogleChatAnnotation[];
  slashCommand?: {
    commandId: string;
  };
}

// Annotation for @mentions
export interface GoogleChatAnnotation {
  type: 'USER_MENTION' | 'SLASH_COMMAND';
  startIndex?: number;
  length?: number;
  userMention?: {
    user: GoogleChatUser;
    type: 'MENTION' | 'TYPE_UNSPECIFIED';
  };
  slashCommand?: {
    bot: GoogleChatUser;
    type: string;
    commandName: string;
    commandId: string;
    triggersDialog?: boolean;
  };
}

// Main event payload from Google Chat webhook
export interface GoogleChatEvent {
  type: GoogleChatEventType;
  eventTime: string;
  token?: string; // Verification token
  message?: GoogleChatMessage;
  user: GoogleChatUser;
  space: GoogleChatSpace;
  configCompleteRedirectUrl?: string;
  common?: {
    userLocale?: string;
    hostApp?: string;
    timeZone?: {
      id?: string;
      offset?: number;
    };
  };
}

// Parsed command structure
export type CommandName = 'award' | 'balance' | 'transfer' | 'help';

export interface ParsedCommand {
  command: CommandName;
  targetEmail?: string; // For award and transfer
  targetMention?: string; // Original @mention text
  amount?: number; // For award and transfer
  message?: string; // Optional message/description
  rawText: string; // Original message text
}

// Card response structures
export interface GoogleChatCardHeader {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  imageType?: 'CIRCLE' | 'SQUARE';
}

export interface GoogleChatTextParagraph {
  text: string;
}

export interface GoogleChatDecoratedText {
  topLabel?: string;
  text: string;
  bottomLabel?: string;
  startIcon?: {
    knownIcon?: string;
    iconUrl?: string;
  };
  onClick?: GoogleChatOnClick;
}

export interface GoogleChatButton {
  text: string;
  onClick: GoogleChatOnClick;
  color?: {
    red: number;
    green: number;
    blue: number;
    alpha?: number;
  };
}

export interface GoogleChatOnClick {
  openLink?: {
    url: string;
  };
  action?: {
    function: string;
    parameters?: { key: string; value: string }[];
  };
}

export interface GoogleChatWidget {
  textParagraph?: GoogleChatTextParagraph;
  decoratedText?: GoogleChatDecoratedText;
  buttonList?: {
    buttons: GoogleChatButton[];
  };
  divider?: Record<string, never>;
}

export interface GoogleChatSection {
  header?: string;
  widgets: GoogleChatWidget[];
  collapsible?: boolean;
  uncollapsibleWidgetsCount?: number;
}

export interface GoogleChatCard {
  header?: GoogleChatCardHeader;
  sections: GoogleChatSection[];
}

export interface GoogleChatCardV2 {
  cardId: string;
  card: GoogleChatCard;
}

// Action response for interactive elements
export interface GoogleChatActionResponse {
  type: 'NEW_MESSAGE' | 'UPDATE_MESSAGE' | 'UPDATE_USER_MESSAGE_CARDS' | 'DIALOG' | 'UPDATE_WIDGET';
  url?: string;
  dialogAction?: {
    dialog?: {
      body: GoogleChatCard;
    };
    actionStatus?: {
      statusCode: string;
      userFacingMessage?: string;
    };
  };
}

// Response to Google Chat
export interface GoogleChatResponse {
  text?: string;
  cardsV2?: GoogleChatCardV2[];
  actionResponse?: GoogleChatActionResponse;
}

// Service result types
export interface CommandResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  transactionId?: string;
}
