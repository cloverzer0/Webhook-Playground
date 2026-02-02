import crypto from 'crypto';
import { prisma } from './prisma';

export interface WebhookEvent {
  id: number;
  timestamp: string;
  provider: string;
  headers: Record<string, string | string[] | undefined>;
  body: any;
  rawBody: string;
  verified: boolean;
  verificationDetails: Record<string, any>;
  eventType?: string;
  eventId?: string;
}

export interface VerificationResult {
  valid: boolean;
  timestamp?: string;
  error?: string;
}

export interface ReplayAttempt {
  id: number;
  eventId: number;
  targetUrl: string;
  statusCode?: number;
  responseBody?: string;
  replayedAt: Date;
  success: boolean;
  error?: string;
}

export class WebhookStore {
  readonly MAX_EVENTS = 100;

  async addEvent(event: Omit<WebhookEvent, 'id'>): Promise<WebhookEvent> {
    // Create the new event
    const dbEvent = await prisma.webhookEvent.create({
      data: {
        provider: event.provider,
        eventId: event.eventId || null,
        eventType: event.eventType || null,
        payload: JSON.stringify(event.body),
        headers: JSON.stringify(event.headers),
        verified: event.verified,
        verificationDetails: JSON.stringify(event.verificationDetails),
      },
    });

    // Clean up old events (keep only last MAX_EVENTS)
    await this.cleanupOldEvents();

    return this.dbEventToWebhookEvent(dbEvent);
  }

  async getEvents(filter: { provider?: string; verified?: boolean } = {}): Promise<WebhookEvent[]> {
    const where: any = {};
    
    if (filter.provider) {
      where.provider = filter.provider;
    }
    
    if (filter.verified !== undefined) {
      where.verified = filter.verified;
    }

    const events = await prisma.webhookEvent.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      take: this.MAX_EVENTS,
    });

    return events.map(this.dbEventToWebhookEvent);
  }

  async getEventById(id: number): Promise<WebhookEvent | null> {
    const event = await prisma.webhookEvent.findUnique({
      where: { id },
    });

    if (!event) return null;
    return this.dbEventToWebhookEvent(event);
  }

  async clearEvents(): Promise<number> {
    const result = await prisma.webhookEvent.deleteMany({});
    return result.count;
  }

  async getCount(): Promise<number> {
    return await prisma.webhookEvent.count();
  }

  async addReplayAttempt(attempt: Omit<ReplayAttempt, 'id' | 'replayedAt'>): Promise<ReplayAttempt> {
    const dbAttempt = await prisma.replayAttempt.create({
      data: {
        eventId: attempt.eventId,
        targetUrl: attempt.targetUrl,
        statusCode: attempt.statusCode || null,
        responseBody: attempt.responseBody || null,
        success: attempt.success,
        error: attempt.error || null,
      },
    });

    return {
      id: dbAttempt.id,
      eventId: dbAttempt.eventId,
      targetUrl: dbAttempt.targetUrl,
      statusCode: dbAttempt.statusCode || undefined,
      responseBody: dbAttempt.responseBody || undefined,
      replayedAt: dbAttempt.replayedAt,
      success: dbAttempt.success,
      error: dbAttempt.error || undefined,
    };
  }

  async getReplayAttempts(eventId: number): Promise<ReplayAttempt[]> {
    const attempts = await prisma.replayAttempt.findMany({
      where: { eventId },
      orderBy: { replayedAt: 'desc' },
    });

    return attempts.map(a => ({
      id: a.id,
      eventId: a.eventId,
      targetUrl: a.targetUrl,
      statusCode: a.statusCode || undefined,
      responseBody: a.responseBody || undefined,
      replayedAt: a.replayedAt,
      success: a.success,
      error: a.error || undefined,
    }));
  }

  private async cleanupOldEvents(): Promise<void> {
    const count = await prisma.webhookEvent.count();
    
    if (count > this.MAX_EVENTS) {
      const excess = count - this.MAX_EVENTS;
      const oldEvents = await prisma.webhookEvent.findMany({
        orderBy: { receivedAt: 'asc' },
        take: excess,
        select: { id: true },
      });

      if (oldEvents.length > 0) {
        await prisma.webhookEvent.deleteMany({
          where: {
            id: { in: oldEvents.map(e => e.id) },
          },
        });
      }
    }
  }

  private dbEventToWebhookEvent(dbEvent: any): WebhookEvent {
    return {
      id: dbEvent.id,
      timestamp: dbEvent.receivedAt.toISOString(),
      provider: dbEvent.provider,
      eventId: dbEvent.eventId || undefined,
      eventType: dbEvent.eventType || undefined,
      headers: JSON.parse(dbEvent.headers),
      body: JSON.parse(dbEvent.payload),
      rawBody: dbEvent.payload,
      verified: dbEvent.verified,
      verificationDetails: dbEvent.verificationDetails 
        ? JSON.parse(dbEvent.verificationDetails) 
        : {},
    };
  }
}

// Singleton instance
let storeInstance: WebhookStore | null = null;

export function getStore(): WebhookStore {
  if (!storeInstance) {
    storeInstance = new WebhookStore();
  }
  return storeInstance;
}

export function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): VerificationResult {
  if (!secret || !signature) {
    return { valid: false, error: 'Missing secret or signature' };
  }

  try {
    const parts = signature.split(',');
    const timestampPart = parts.find(s => s.startsWith('t='));
    const expectedSigPart = parts.find(s => s.startsWith('v1='));
    
    if (!timestampPart || !expectedSigPart) {
      return { valid: false, error: 'Invalid signature format' };
    }
    
    const timestamp = timestampPart.split('=')[1];
    const expectedSig = expectedSigPart.split('=')[1];
    
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
    return { valid: false, error: (error as Error).message };
  }
}
