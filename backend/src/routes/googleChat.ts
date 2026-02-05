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
    const response = await googleChatService.handleEvent(event);
    const processingTime = Date.now() - startTime;
    console.log('[GoogleChat] Got response in', processingTime, 'ms:', JSON.stringify(response).substring(0, 200));

    // Return the response to Google Chat
    res.status(200).json(response);
    console.log('[GoogleChat] Response sent successfully. Total time:', Date.now() - startTime, 'ms');
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('[GoogleChat] Error handling webhook after', processingTime, 'ms:', error);

    // Return a user-friendly error response
    res.status(200).json({
      text: 'An error occurred while processing your request. Please try again later.',
    });
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
