import type { NextApiRequest, NextApiResponse } from 'next';
import { getStore } from '../../lib/webhookStore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const store = getStore();

  if (req.method === 'GET') {
    const { provider } = req.query;
    
    const filter: { provider?: string } = {};
    if (provider && typeof provider === 'string') {
      filter.provider = provider;
    }
    
    const filtered = await store.getEvents(filter);
    
    res.status(200).json({
      events: filtered,
      total: filtered.length
    });
  } else if (req.method === 'DELETE') {
    const count = await store.clearEvents();
    res.status(200).json({ 
      success: true, 
      message: `Cleared ${count} events` 
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
