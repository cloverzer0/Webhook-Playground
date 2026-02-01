# Webhook Playground

A developer tool that receives, verifies, visualizes, and replays webhook events from third-party services, making it easier to debug event-driven systems.

## Features

- 🎯 **Receive Webhooks**: Accepts webhook events from any service
- ✅ **Verify Signatures**: Built-in support for Stripe webhook signature verification
- 📊 **Visualize Events**: Clean UI to view webhook payloads, headers, and metadata
- 🔁 **Replay Events**: Forward captured events to your development endpoint
- 🔍 **Filter & Search**: Filter events by provider and verification status
- 💾 **In-Memory Storage**: Keeps the last 100 webhook events

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- Python 3 (for serving the frontend)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/cloverzer0/Webhook-Playground.git
cd Webhook-Playground
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Configure Stripe webhook verification:
```bash
cp .env.example .env
# Edit .env and add your STRIPE_WEBHOOK_SECRET
```

### Running the Application

1. Start the backend server:
```bash
npm start
```
The server will start on `http://localhost:3001`

2. In a new terminal, start the frontend:
```bash
npm run frontend
```
The frontend will be available at `http://localhost:8080`

3. Open your browser and navigate to `http://localhost:8080`

## Usage

### Receiving Webhooks

Send webhooks to the following endpoints:

**Generic webhooks:**
```
POST http://localhost:3001/webhook
```

**Provider-specific webhooks:**
```
POST http://localhost:3001/webhook/stripe
POST http://localhost:3001/webhook/github
POST http://localhost:3001/webhook/{provider}
```

### Testing with curl

```bash
# Send a test webhook
curl -X POST http://localhost:3001/webhook/stripe \
  -H "Content-Type: application/json" \
  -d '{"type": "payment_intent.succeeded", "data": {"object": {"id": "pi_test123"}}}'
```

### Stripe Webhook Testing

1. Get your webhook signing secret from [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`
3. Configure your Stripe webhook URL to point to `http://localhost:3001/webhook/stripe`
4. For local development, use [Stripe CLI](https://stripe.com/docs/stripe-cli) or a tunneling service like ngrok

### Using the UI

1. **View Events**: All received webhooks appear in the left sidebar
2. **Filter Events**: Use the filter dropdown to show verified/unverified events
3. **Inspect Details**: Click on an event to view its full payload, headers, and metadata
4. **Replay Events**: Enter a target URL and click "Replay to URL" to forward the event
5. **Clear Events**: Use the "Clear All Events" button to remove all captured events

## API Endpoints

### POST `/webhook/:provider`
Receives webhook events from the specified provider.

**Response:**
```json
{
  "success": true,
  "eventId": "uuid",
  "message": "Webhook received successfully"
}
```

### GET `/events`
Retrieves all captured webhook events.

**Query Parameters:**
- `provider` - Filter by provider (e.g., `stripe`, `github`)
- `verified` - Filter by verification status (`true` or `false`)

**Response:**
```json
{
  "events": [...],
  "total": 10
}
```

### GET `/events/:id`
Retrieves a single event by ID.

### POST `/replay/:id`
Replays a webhook event to a target URL.

**Request Body:**
```json
{
  "targetUrl": "https://your-app.com/webhook"
}
```

### DELETE `/events`
Clears all captured events.

### GET `/health`
Health check endpoint.

## Architecture

- **Backend**: Node.js + Express server that receives and stores webhook events
- **Frontend**: Vanilla JavaScript application with clean, modern UI for webhook visualization
- **Storage**: In-memory storage (last 100 events)

## Supported Services

Currently supported webhook providers:
- ✅ Stripe (with signature verification)
- ✅ Generic (any webhook)

Adding support for additional providers is straightforward - just implement signature verification in `backend/server.js`.

## Development

### Project Structure
```
Webhook-Playground/
├── backend/
│   └── server.js         # Express server
├── frontend/
│   └── public/
│       ├── index.html    # HTML entry point
│       └── src/
│           └── App.js    # React application
├── .env.example          # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

### Environment Variables

- `PORT` - Backend server port (default: 3001)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret (optional)

## Security Notes

- This tool is designed for **development and debugging only**
- Webhook events are stored in memory and will be lost on server restart
- For production use, implement proper persistence and security measures
- Be cautious about exposing your webhook endpoint to the internet

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
