import type { NextApiRequest, NextApiResponse } from 'next';
import { BedrockRuntimeClient, CountTokensCommand } from '@aws-sdk/client-bedrock-runtime';
import { fromIni } from '@aws-sdk/credential-providers';
import { getStore } from '../../../lib/webhookStore';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb', // Increase body size limit to 20MB
    },
  },
};

async function countTokensWithBedrock(text: string, awsProfile: string): Promise<{ tokenCount: number; method: 'bedrock' | 'fallback'; error?: string }> {
  try {
    // Initialize Bedrock client with AWS profile
    const client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: fromIni({ profile: awsProfile }),
    });

    // Use Claude 3 Sonnet for token counting
    const modelId = "anthropic.claude-3-5-sonnet-20240620-v1:0";
    
    const command = new CountTokensCommand({
      modelId: modelId,
      input: {
        converse: {
          messages: [
            {
              role: 'user',
              content: [{ text: text }],
            },
          ],
        },
      },
    });

    const response = await client.send(command);
    
    // Extract input token count from the response
    const inputTokens = response.inputTokens || 0;
    
    return { tokenCount: inputTokens, method: 'bedrock' };
  } catch (error) {
    console.error('Error counting tokens with Bedrock, using fallback calculation:', error);
    
    // Fallback: Use rule of thumb - Input Tokens ≈ characters/4
    const estimatedTokens = Math.ceil(text.length / 4);
    console.log(`Fallback token count: ${estimatedTokens} tokens (${text.length} characters)`);
    
    return { 
      tokenCount: estimatedTokens, 
      method: 'fallback',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { inputText, awsProfile } = req.body;

    if (!inputText || typeof inputText !== 'string') {
      return res.status(400).json({ 
        error: 'Missing or invalid inputText field. Expected a string.' 
      });
    }

    const profileToUse = awsProfile || process.env.AWS_PROFILE || 'default_okta';
    
    // Count tokens using AWS Bedrock
    const result = await countTokensWithBedrock(inputText, profileToUse);

    // Store as webhook event
    const eventData = {
      timestamp: new Date().toISOString(),
      provider: 'tokenCost',
      headers: req.headers as Record<string, string | string[] | undefined>,
      body: {
        inputText,
        inputTokenCount: result.tokenCount,
        awsProfile: profileToUse,
        countMethod: result.method,
        countError: result.error,
      },
      rawBody: JSON.stringify(req.body),
      verified: true, // Always verified for token cost events
      verificationDetails: { 
        source: result.method === 'bedrock' ? 'bedrock-token-counter' : 'fallback-calculation',
        method: result.method 
      },
      eventId: `token-${Date.now()}`,
      eventType: 'token.count',
    };

    const store = getStore();
    const event = await store.addEvent(eventData);

    console.log(`Token count event created: ${event.id}, tokens: ${result.tokenCount}, method: ${result.method}`);
    
    res.status(200).json({ 
      success: true, 
      eventId: event.id,
      inputTokenCount: result.tokenCount,
      countMethod: result.method,
      message: 'Token count event received successfully' 
    });
  } catch (error) {
    console.error('Error processing token cost webhook:', error);
    res.status(500).json({ 
      error: 'Failed to process token cost request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
