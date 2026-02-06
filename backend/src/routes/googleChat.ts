import { Router, Request, Response, NextFunction } from 'express';
import googleChatService from '../services/googleChatService';
import { GoogleChatEvent } from '../types/googleChat';

const router = Router();

/**
 * POST /webhook
 * Google Chat webhook endpoint for receiving events
 *
 * This endpoint is CSRF-exempt (configured in server.ts)
 * Verification is done via the verification token in the event payload
 */
router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  try {
    const event = req.body as GoogleChatEvent;

    // Log incoming event (for debugging) - handle both old and new formats
    const chatData = (event as any).chat || event;
    console.log('[GoogleChat] Received event:', {
      type: event.type || chatData.appCommandPayload?.appCommandMetadata?.appCommandType || 'unknown',
      userEmail: chatData.user?.email || event.user?.email,
      commandId: chatData.appCommandPayload?.appCommandMetadata?.appCommandId,
    });

    // DEBUG: Test with minimal response first to isolate the issue
    // Uncomment the next 5 lines to test basic connectivity:
    // const testResponse = { text: 'Guincoin received your message! Debug mode active.' };
    // console.log('[GoogleChat] Sending test response');
    // res.status(200).json(testResponse);
    // console.log('[GoogleChat] Test response sent in', Date.now() - startTime, 'ms');
    // return;

    // Handle the event
    console.log('[GoogleChat] Calling handleEvent...');
    const message = await googleChatService.handleEvent(event);
    const processingTime = Date.now() - startTime;
    console.log('[GoogleChat] Got response in', processingTime, 'ms:', JSON.stringify(message).substring(0, 200));

    // [ORIGINAL - 2026-02-05] res.status(200).json(response);
    // New Google Chat API (SLASH_COMMAND events with appCommandPayload) requires
    // responses wrapped in hostAppDataAction; old MESSAGE events use bare Message format.
    // See: https://developers.google.com/workspace/add-ons/chat/commands
    // Detect new Google Chat format (requires hostAppDataAction wrapper)
    const isNewFormat = !!(event.type === 'SLASH_COMMAND'
      || (event as any).chat?.appCommandPayload
      || (event as any).chat?.messagePayload
      || (event as any).appCommandPayload);

    const response = isNewFormat
      ? { hostAppDataAction: { chatDataAction: { createMessageAction: { message } } } }
      : message;

    res.status(200).json(response);
    console.log('[GoogleChat] Response sent (newFormat=%s). Total time: %d ms', isNewFormat, Date.now() - startTime);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('[GoogleChat] Error handling webhook after', processingTime, 'ms:', error);

    // Return a user-friendly error response (use same format detection)
    const errEvent = req.body as any;
    const errIsNewFormat = !!(errEvent?.type === 'SLASH_COMMAND'
      || errEvent?.chat?.appCommandPayload
      || errEvent?.chat?.messagePayload
      || errEvent?.appCommandPayload);
    const errMessage = { text: 'An error occurred while processing your request. Please try again later.' };
    const errResponse = errIsNewFormat
      ? { hostAppDataAction: { chatDataAction: { createMessageAction: { message: errMessage } } } }
      : errMessage;
    res.status(200).json(errResponse);
  }
});

/**
 * GET /spaces (legacy endpoint - kept for compatibility)
 * Returns empty spaces list
 */
router.get('/spaces', (_req: Request, res: Response) => {
  res.json({ spaces: [] });
});

export default router;
