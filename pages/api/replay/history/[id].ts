import type { NextApiRequest, NextApiResponse } from 'next';
import { getStore } from '../../../../lib/webhookStore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const eventId = parseInt(id as string, 10);
  
  if (isNaN(eventId)) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }

  const store = getStore();
  const attempts = await store.getReplayAttempts(eventId);
  
  res.status(200).json({
    attempts,
    total: attempts.length
  });
}
