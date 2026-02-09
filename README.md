# Webhook Playground

A developer-first webhook testing tool built with **Next.js 14**, **TypeScript**, and **SQLite**. Features a clean, table-based UI powered by **shadcn/ui** for receiving, verifying, visualizing, and replaying webhook events with persistent storage.

## Features

- 📥 **Receive webhooks** from any provider (Stripe, GitHub, etc.)
- ✅ **Verify signatures** (Stripe webhook verification supported)
- 👁️ **Table-based UI** for fast scanning and inspection
- 🔄 **Replay events** to custom endpoints with full history
- 💾 **SQLite database** for persistent event storage (last 100 events)
- 📊 **Replay logging** tracks all replay attempts with responses
- 🎨 **shadcn/ui** components with Tailwind CSS
- ⚡ **TypeScript** for type safety
- 🗄️ **Prisma ORM** for database management

## Tech Stack

- **Next.js 14** - Full-stack React framework with TypeScript
- **Prisma** - Type-safe ORM with SQLite
- **SQLite** - Lightweight, file-based database
- **shadcn/ui** - Beautiful, accessible UI components
- **Tailwind CSS** - Utility-first CSS framework
- **TypeScript** - Type-safe code
- **Radix UI** - Headless UI primitives
- **date-fns** - Date formatting

## Database Schema

### webhook_events
Stores webhook event data with automatic cleanup (keeps last 100):
- `id` - Internal DB ID (auto-increment)
- `provider` - Service name (e.g., "stripe")
- `event_id` - Provider's event ID
- `event_type` - Event type (e.g., "payment_intent.succeeded")
- `payload` - Full JSON payload
- `headers` - Request headers
- `received_at` - Timestamp
- `verified` - Signature verification status

### replay_attempts
Logs all replay attempts for debugging:
- `event_id` - Foreign key to webhook_events
- `target_url` - Destination URL
- `status_code` - HTTP response code
- `response_body` - Response for debugging
- `replayed_at` - Timestamp
- `success` - Success/failure flag
- `error` - Error message if failed

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

```bash
# Install dependencies
npm install

# Initialize database (creates SQLite database)
npx prisma migrate dev

# Set up environment variables
cp .env.example .env
# Add your STRIPE_WEBHOOK_SECRET if using Stripe webhooks
```

### Database Management

```bash
# View database in Prisma Studio
npx prisma studio

# Reset database (clears all data)
npx prisma migrate reset

# Create new migration after schema changes
npx prisma migrate dev --name your_migration_name
```

### Development

```bash
# Run development server on port 3001
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

### Production

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Usage

### Receiving Webhooks

The application exposes webhook endpoints at:

```
POST http://localhost:3001/api/webhook/:provider
```

Examples:
- Stripe: `POST http://localhost:3001/api/webhook/stripe`
- GitHub: `POST http://localhost:3001/api/webhook/github`
- Token Cost: `POST http://localhost:3001/api/webhook/tokenCost`
- Generic: `POST http://localhost:3001/api/webhook`

### Using Token Cost Calculator

The Token Cost endpoint uses AWS Bedrock to count input tokens and provides a calculator to estimate LLM API costs:

```bash
# Send text for token counting (using test script)
./test-token-cost.sh "Your text to analyze" your-aws-profile

# Or use curl directly
curl -X POST http://localhost:3001/api/webhook/tokenCost \
  -H "Content-Type: application/json" \
  -d '{
    "inputText": "Your text to analyze for token counting",
    "awsProfile": "default"
  }'
```

**Prerequisites:**
- AWS credentials configured at `~/.aws/credentials`
- AWS profile with Bedrock permissions
- Set `AWS_REGION` and `AWS_PROFILE` in `.env` file

When you click on a token cost event in the UI, you'll see:
- Input token count (calculated by AWS Bedrock)
- Cost calculator with fields for:
  - Output tokens (user input)
  - Input price per 1K tokens
  - Output price per 1K tokens
- Real-time total cost calculation
- Pricing reference for Claude 3 models

### Using with Stripe CLI

```bash
# Forward Stripe webhooks to your local endpoint
stripe listen --forward-to http://localhost:3001/api/webhook/stripe

# Trigger test events
stripe trigger payment_intent.succeeded
```

### Testing Replay Feature

A test server is included at `http://localhost:3000` for testing webhook replays:

```bash
# In a separate terminal
npm run test-server
```

Then replay any webhook event to `http://127.0.0.1:3000/webhooks`

### API Endpoints

- `POST /api/webhook/:provider` - Receive webhook events
- `POST /api/webhook/tokenCost` - Token counting with AWS Bedrock (requires `inputText` and optional `awsProfile`)
- `GET /api/events` - Get all events (supports filtering)
- `GET /api/events/:id` - Get specific event
- `POST /api/replay/:id` - Replay event to custom URL
- `GET /api/replay/history/:id` - Get replay history for an event
- `DELETE /api/events` - Clear all events
- `GET /api/health` - Health check

## UI Features

### Events List (Main Dashboard)
- **Table view** with sortable columns
- **Filter by** event type and verification status
- **Quick actions** for replaying events or viewing token cost calculator
- **Real-time updates** every 3 seconds
- **Dense, scannable** layout for developers

### Event Detail View
- **Two-column layout** - Payload on left, metadata on right
- **Syntax-highlighted JSON** with copy-to-clipboard
- **Full header inspection**
- **Verification status** and details
- **Replay history** showing all past replay attempts
- **One-click replay** access

### Token Cost Calculator
- **Interactive cost estimation** for LLM API calls
- **Input token count** automatically calculated by AWS Bedrock
- **Real-time cost calculation** as you enter values
- **Formula display** showing the breakdown
- **Pricing reference** for Claude 3 models (Haiku, Sonnet, Opus)
- **Original input text preview**

### Replay Modal
- **Custom target URL** input
- **Payload preview** (read-only, no horizontal scrolling)
- **Live response** display with status code
- **Error handling** with detailed messages
- **Success/failure indicators**

## Project Structure

```
webhook-playground/
├── pages/
│   ├── index.tsx              # Events list (table view)
│   ├── events/[id].tsx        # Event detail view
│   ├── token-calculator/[id].tsx  # Token cost calculator
│   ├── _app.tsx               # Next.js app wrapper
│   └── api/
│       ├── webhook/
│       │   ├── [[...provider]].ts  # Webhook receiver
│       │   └── tokenCost.ts        # Token cost webhook with Bedrock
│       ├── events.ts          # Events management
│       ├── events/[id].ts     # Single event
│       ├── replay/
│       │   ├── [id].ts        # Event replay
│       │   └── history/[id].ts # Replay history
│       └── health.ts          # Health check
├── components/
│   ├── ui/                    # shadcn/ui components
│   └── ReplayModal.tsx        # Replay dialog
├── lib/
│   ├── prisma.ts              # Prisma client
│   ├── webhookStore.ts        # Event storage & verification
│   └── utils.ts               # Utilities
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Migration history
├── test-server/
│   └── server.js              # Test server for replays
└── styles/
    └── globals.css            # Global styles + Tailwind
```

## Design Principles

- **Developer-first** - Dense but readable interface
- **No fancy animations** - Fast and functional
- **Everything inspectable** - Full visibility into payloads
- **Fast to scan, fast to drill down** - Table → Detail flow
- **Desktop-first** - Optimized for development workflows

## Environment Variables

Create a `.env` file:

```env
DATABASE_URL="file:./dev.db"
AWS_REGION=us-east-1
AWS_PROFILE=default
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here
```

**Required for Token Cost Calculator:**
- `AWS_REGION` - AWS region for Bedrock (default: us-east-1)
- `AWS_PROFILE` - AWS credentials profile to use (default: default)
- AWS credentials must be configured at `~/.aws/credentials` with Bedrock permissions

## Contributing

Feel free to open issues or submit pull requests!

## License

MIT