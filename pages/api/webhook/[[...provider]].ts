import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { getStore, verifyStripeSignature } from '../../../lib/webhookStore';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on('end', () => {
      resolve(data);
    });
    req.on('error', reject);
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { provider } = req.query;
  const providerName = Array.isArray(provider) ? provider[0] : (provider || 'generic');
  
  const rawBody = await getRawBody(req);
  const headers = req.headers as Record<string, string | string[] | undefined>;
  
  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch (error) {
    body = { raw: rawBody };
  }

  const eventData = {
    timestamp: new Date().toISOString(),
    provider: providerName,
    headers: headers,
    body: body,
    rawBody: rawBody,
    verified: false,
    verificationDetails: {},
    eventId: undefined as string | undefined,
    eventType: undefined as string | undefined,
  };

  // Stripe-specific handling
  if (providerName === 'stripe') {
    const signature = headers['stripe-signature'] as string | undefined;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (signature && secret) {
      const verification = verifyStripeSignature(rawBody, signature, secret);
      eventData.verified = verification.valid;
      eventData.verificationDetails = verification;
    }
    
    // Extract Stripe event ID and type
    if (body.id) {
      eventData.eventId = body.id;
    }
    if (body.type) {
      eventData.eventType = body.type;
    }
  }

  const store = getStore();
  const event = await store.addEvent(eventData);

  console.log(`Received ${providerName} webhook: ${event.id}`);
  
  res.status(200).json({ 
    success: true, 
    eventId: event.id,
    message: 'Webhook received successfully' 
  });
}
