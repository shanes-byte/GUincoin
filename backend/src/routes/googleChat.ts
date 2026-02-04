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
  try {
    const event = req.body as GoogleChatEvent;

    // Log incoming event (for debugging)
    console.log('[GoogleChat] Received event:', {
      type: event.type,
      userEmail: event.user?.email,
      messageText: event.message?.text?.substring(0, 50),
    });

    // Handle the event
    const response = await googleChatService.handleEvent(event);

    // Return the response to Google Chat
    res.json(response);
  } catch (error) {
    console.error('[GoogleChat] Error handling webhook:', error);

    // Return a user-friendly error response
    res.json({
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
