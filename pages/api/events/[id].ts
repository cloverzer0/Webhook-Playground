import type { NextApiRequest, NextApiResponse } from 'next';
import { getStore } from '../../../lib/webhookStore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const store = getStore();

  if (req.method === 'GET') {
    const eventId = parseInt(id as string, 10);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const event = await store.getEventById(eventId);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.status(200).json(event);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
