'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { WebhookEvent } from '@/lib/webhookStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calculator } from 'lucide-react'
import { format } from 'date-fns'

export default function TokenCostCalculator() {
  const router = useRouter()
  const { id } = router.query
  const [event, setEvent] = useState<WebhookEvent | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Input token count from Bedrock
  const [inputTokens, setInputTokens] = useState<number>(0)
  
  // User inputs for calculation
  const [outputTokens, setOutputTokens] = useState<string>('')
  const [inputPricePerToken, setInputPricePerToken] = useState<string>('3') // Default for Claude 3 Sonnet per 1M tokens
  const [outputPricePerToken, setOutputPricePerToken] = useState<string>('15') // Default for Claude 3 Sonnet per 1M tokens
  
  // Calculated total cost
  const [totalCost, setTotalCost] = useState<number>(0)

  useEffect(() => {
    if (!id) return

    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/${id}`)
        if (response.ok) {
          const data = await response.json()
          
          // Check if this is a tokenCost event
          if (data.provider !== 'tokenCost') {
            router.push(`/events/${id}`)
            return
          }
          
          setEvent(data)
          
          // Extract input token count from the event body
          if (data.body?.inputTokenCount) {
            setInputTokens(data.body.inputTokenCount)
          }
        } else {
          router.push('/')
        }
      } catch (error) {
        console.error('Failed to fetch event:', error)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [id, router])

  useEffect(() => {
    // Calculate total cost whenever inputs change
    const outputTokensNum = parseFloat(outputTokens) || 0
    const inputPrice = parseFloat(inputPricePerToken) || 0
    const outputPrice = parseFloat(outputPricePerToken) || 0
    
    // Formula: Total Cost = (Input Tokens × Input Price per Token) + (Output Tokens × Output Price per Token)
    // Prices are per 1,000,000 tokens, so we divide by 1000000
    const cost = (inputTokens * inputPrice / 1000000) + (outputTokensNum * outputPrice / 1000000)
    setTotalCost(cost)
  }, [inputTokens, outputTokens, inputPricePerToken, outputPricePerToken])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading token calculator...</p>
      </div>
    )
  }

  if (!event) {
    return null
  }

  return (
    <>
      <Head>
        <title>Token Cost Calculator - Event #{event.id}</title>
      </Head>

      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Events
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-lg font-semibold flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Token Cost Calculator
                </h1>
                <p className="text-xs text-muted-foreground font-mono">Event ID: {event.id}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left side - Calculator */}
            <div className="lg:col-span-2 space-y-6">
              <div className="border rounded-lg">
                <div className="border-b bg-muted/50 px-4 py-3">
                  <h2 className="font-semibold">Cost Calculator</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Calculate the total cost based on input and output tokens
                  </p>
                </div>
                <div className="p-6 space-y-6">
                  {/* Input Tokens (Calculated by Bedrock) */}
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Input Tokens {event.body?.countMethod === 'bedrock' ? '(from AWS Bedrock)' : '(Estimated: characters/4)'}
                    </label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        value={inputTokens}
                        disabled
                        className="text-lg font-semibold bg-background"
                      />
                      {event.body?.countMethod === 'bedrock' ? (
                        <Badge variant="secondary">AWS Bedrock</Badge>
                      ) : (
                        <Badge variant="outline">Fallback Estimate</Badge>
                      )}
                    </div>
                    {event.body?.countMethod === 'fallback' && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2">
                        ⚠️ Using fallback estimation (characters/4). Bedrock was unavailable.
                      </p>
                    )}
                  </div>

                  {/* Output Tokens */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Output Tokens
                    </label>
                    <Input
                      type="number"
                      value={outputTokens}
                      onChange={(e) => setOutputTokens(e.target.value)}
                      placeholder="Enter output tokens"
                      className="text-lg"
                    />
                  </div>

                  {/* Input Price per Token */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Input Price per 1M Tokens ($)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={inputPricePerToken}
                      onChange={(e) => setInputPricePerToken(e.target.value)}
                      placeholder="3"
                      className="text-lg"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Example: Claude 3 Sonnet = $3 per 1M tokens
                    </p>
                  </div>

                  {/* Output Price per Token */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Output Price per 1M Tokens ($)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={outputPricePerToken}
                      onChange={(e) => setOutputPricePerToken(e.target.value)}
                      placeholder="15"
                      className="text-lg"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Example: Claude 3 Sonnet = $15 per 1M tokens
                    </p>
                  </div>

                  {/* Total Cost Display */}
                  <div className="p-6 bg-primary/10 border-2 border-primary/20 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Total Cost</p>
                    <p className="text-4xl font-bold text-primary">
                      ${totalCost.toFixed(6)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Formula: ({inputTokens} × ${inputPricePerToken}/1M) + ({outputTokens || 0} × ${outputPricePerToken}/1M)
                    </p>
                  </div>
                </div>
              </div>

              {/* Original Input Text */}
              <div className="border rounded-lg">
                <div className="border-b bg-muted/50 px-4 py-3">
                  <h2 className="font-semibold">Original Input Text</h2>
                </div>
                <div className="p-4">
                  <pre className="text-xs bg-muted/30 p-4 rounded-md overflow-auto max-h-[400px] whitespace-pre-wrap break-words">
                    {event.body?.inputText || 'No input text available'}
                  </pre>
                </div>
              </div>
            </div>

            {/* Right side - Event Metadata */}
            <div className="space-y-6">
              <div className="border rounded-lg">
                <div className="border-b bg-muted/50 px-4 py-3">
                  <h2 className="font-semibold">Event Details</h2>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Event ID</p>
                    <p className="text-sm font-mono">{event.id}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Provider</p>
                    <Badge variant="secondary">{event.provider}</Badge>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Event Type</p>
                    <Badge variant="outline">{event.eventType || 'token.count'}</Badge>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Received At</p>
                    <p className="text-sm">{format(new Date(event.timestamp), 'PPpp')}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">AWS Profile</p>
                    <p className="text-sm font-mono">{event.body?.awsProfile || 'default'}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Token Count Method</p>
                    <div className="flex items-center gap-2">
                      {event.body?.countMethod === 'bedrock' ? (
                        <Badge variant="default">AWS Bedrock API</Badge>
                      ) : (
                        <Badge variant="outline">Fallback (chars/4)</Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Input Token Count</p>
                    <p className="text-2xl font-bold">{inputTokens}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Text Length</p>
                    <p className="text-sm">{event.body?.inputText?.length || 0} characters</p>
                  </div>
                </div>
              </div>

              {/* Quick Reference */}
              <div className="border rounded-lg">
                <div className="border-b bg-muted/50 px-4 py-3">
                  <h2 className="font-semibold">Pricing Reference</h2>
                </div>
                <div className="p-4 space-y-3">
                  <div className="text-xs space-y-2">
                    <p className="font-medium">Claude 3 Models (per 1M tokens):</p>
                    <div className="space-y-1 text-muted-foreground">
                      <p>• Haiku: $0.25 / $1.25</p>
                      <p>• Sonnet: $3 / $15</p>
                      <p>• Opus: $15 / $75</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
