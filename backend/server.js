const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// In-memory storage for webhook events
const webhookEvents = [];
const MAX_EVENTS = 100;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.raw({ type: 'application/json' }));

// Helper function to verify Stripe webhook signature
function verifyStripeSignature(payload, signature, secret) {
  if (!secret || !signature) {
    return { valid: false, error: 'Missing secret or signature' };
  }

  try {
    const timestamp = signature.split(',').find(s => s.startsWith('t=')).split('=')[1];
    const expectedSig = signature.split(',').find(s => s.startsWith('v1=')).split('=')[1];
    
    const signedPayload = `${timestamp}.${payload}`;
    const computedSig = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');

    const valid = crypto.timingSafeEqual(
      Buffer.from(expectedSig),
      Buffer.from(computedSig)
    );

    return { valid, timestamp };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Webhook receiver endpoint
app.post('/webhook/:provider?', (req, res) => {
  const provider = req.params.provider || 'generic';
  const rawBody = JSON.stringify(req.body);
  const headers = req.headers;
  
  const event = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    provider,
    headers: headers,
    body: req.body,
    rawBody,
    verified: false,
    verificationDetails: {}
  };

  // Stripe-specific handling
  if (provider === 'stripe') {
    const signature = headers['stripe-signature'];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (signature && secret) {
      const verification = verifyStripeSignature(rawBody, signature, secret);
      event.verified = verification.valid;
      event.verificationDetails = verification;
    }
    
    // Extract Stripe event type
    if (req.body.type) {
      event.eventType = req.body.type;
    }
  }

  // Store event (keep only last MAX_EVENTS)
  webhookEvents.unshift(event);
  if (webhookEvents.length > MAX_EVENTS) {
    webhookEvents.pop();
  }

  console.log(`Received ${provider} webhook: ${event.id}`);
  
  res.status(200).json({ 
    success: true, 
    eventId: event.id,
    message: 'Webhook received successfully' 
  });
});

// Get all webhook events
app.get('/events', (req, res) => {
  const { provider, verified } = req.query;
  
  let filtered = [...webhookEvents];
  
  if (provider) {
    filtered = filtered.filter(e => e.provider === provider);
  }
  
  if (verified !== undefined) {
    const verifiedBool = verified === 'true';
    filtered = filtered.filter(e => e.verified === verifiedBool);
  }
  
  res.json({
    events: filtered,
    total: filtered.length
  });
});

// Get single event by ID
app.get('/events/:id', (req, res) => {
  const event = webhookEvents.find(e => e.id === req.params.id);
  
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  res.json(event);
});

// Replay webhook to custom endpoint
app.post('/replay/:id', async (req, res) => {
  const { targetUrl } = req.body;
  const event = webhookEvents.find(e => e.id === req.params.id);
  
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  if (!targetUrl) {
    return res.status(400).json({ error: 'Target URL is required' });
  }

  try {
    const fetch = (await import('node-fetch')).default;
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

    res.json({
      success: true,
      status: response.status,
      statusText: response.statusText,
      responseBody: await response.text()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear all events
app.delete('/events', (req, res) => {
  const count = webhookEvents.length;
  webhookEvents.length = 0;
  res.json({ 
    success: true, 
    message: `Cleared ${count} events` 
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    eventCount: webhookEvents.length,
    maxEvents: MAX_EVENTS
  });
});

app.listen(PORT, () => {
  console.log(`Webhook Playground server running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook/:provider`);
  console.log(`Events API: http://localhost:${PORT}/events`);
});
