import type { NextApiRequest, NextApiResponse } from 'next';
import { getStore } from '../../../lib/webhookStore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { targetUrl } = req.body;
  
  const eventId = parseInt(id as string, 10);
  if (isNaN(eventId)) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }

  const store = getStore();
  const event = await store.getEventById(eventId);
  
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  if (!targetUrl) {
    return res.status(400).json({ error: 'Target URL is required' });
  }

  let replaySuccess = false;
  let responseStatus: number | undefined;
  let responseStatusText: string | undefined;
  let responseBody: string | undefined;
  let errorMessage: string | undefined;

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(
          Object.entries(event.headers).filter(([key]) => 
            key.toLowerCase().startsWith('x-') || 
            key.toLowerCase() === 'user-agent'
          )
        )
      },
      body: event.rawBody
    });

    responseStatus = response.status;
    responseStatusText = response.statusText;
    responseBody = await response.text();
    replaySuccess = response.ok;

    // Log the replay attempt
    await store.addReplayAttempt({
      eventId: event.id,
      targetUrl,
      statusCode: responseStatus,
      responseBody,
      success: replaySuccess,
      error: !replaySuccess ? `HTTP ${responseStatus}: ${responseStatusText}` : undefined,
    });

    res.status(200).json({
      success: replaySuccess,
      status: responseStatus,
      statusText: responseStatusText,
      responseBody
    });
  } catch (error) {
    errorMessage = (error as Error).message;

    // Log the failed replay attempt
    await store.addReplayAttempt({
      eventId: event.id,
      targetUrl,
      success: false,
      error: errorMessage,
    });

    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
