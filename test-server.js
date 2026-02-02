const express = require('express');
const app = express();
const PORT = 3000;

// Parse JSON bodies
app.use(express.json());

// Parse raw bodies for webhooks
app.use(express.raw({ type: 'application/json' }));

// Webhook receiver endpoint
app.post('/webhooks', (req, res) => {
  console.log('\n🎯 Webhook Received!');
  console.log('━'.repeat(50));
  console.log('Time:', new Date().toISOString());
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', typeof req.body === 'string' ? req.body : JSON.stringify(req.body, null, 2));
  console.log('━'.repeat(50) + '\n');

  // Send success response
  res.status(200).json({
    success: true,
    message: 'Webhook received successfully',
    receivedAt: new Date().toISOString()
  });
});

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'Test webhook server is ready',
    endpoint: `http://localhost:${PORT}/webhooks`
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Test webhook server running on http://localhost:${PORT}`);
  console.log(`📍 Send replays to: http://localhost:${PORT}/webhooks`);
  console.log(`   Alternative: http://127.0.0.1:${PORT}/webhooks\n`);
});
