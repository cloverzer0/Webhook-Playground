'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { WebhookEvent, ReplayAttempt } from '@/lib/webhookStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Copy, Play, History } from 'lucide-react'
import { format } from 'date-fns'
import ReplayModal from '@/components/ReplayModal'

export default function EventDetail() {
  const router = useRouter()
  const { id } = router.query
  const [event, setEvent] = useState<WebhookEvent | null>(null)
  const [replayHistory, setReplayHistory] = useState<ReplayAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [showReplayModal, setShowReplayModal] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return

    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/${id}`)
        if (response.ok) {
          const data = await response.json()
          
          // Redirect to token calculator for tokenCost events
          if (data.provider === 'tokenCost') {
            router.push(`/token-calculator/${id}`)
            return
          }
          
          setEvent(data)
          
          // Fetch replay history
          const historyResponse = await fetch(`/api/replay/history/${id}`)
          if (historyResponse.ok) {
            const historyData = await historyResponse.json()
            setReplayHistory(historyData.attempts)
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

  const refreshReplayHistory = async () => {
    if (!id) return
    try {
      const historyResponse = await fetch(`/api/replay/history/${id}`)
      if (historyResponse.ok) {
        const historyData = await historyResponse.json()
        setReplayHistory(historyData.attempts)
      }
    } catch (error) {
      console.error('Failed to fetch replay history:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading event...</p>
      </div>
    )
  }

  if (!event) {
    return null
  }

  const getEventTypeDisplay = () => {
    return event.eventType || event.body?.type || event.body?.action || event.body?.event || 'webhook'
  }

  return (
    <>
      <Head>
        <title>Event: {getEventTypeDisplay()} - Webhook Playground</title>
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
                <h1 className="text-lg font-semibold">Event: {getEventTypeDisplay()}</h1>
                <p className="text-xs text-muted-foreground font-mono">ID: {event.id}</p>
              </div>
            </div>
            <Button onClick={() => setShowReplayModal(true)}>
              <Play className="mr-2 h-4 w-4" />
              Replay Event
            </Button>
          </div>
        </header>

        <div className="container mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="border rounded-lg">
                <div className="border-b bg-muted/50 px-4 py-3 flex items-center justify-between">
                  <h2 className="font-semibold">Payload</h2>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(event.body, null, 2))}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <div className="p-4">
                  <pre className="text-xs bg-muted/30 p-4 rounded-md overflow-auto max-h-[600px]">
                    {JSON.stringify(event.body, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="border rounded-lg">
                <div className="border-b bg-muted/50 px-4 py-3">
                  <h2 className="font-semibold">Headers</h2>
                </div>
                <div className="p-4">
                  <pre className="text-xs bg-muted/30 p-4 rounded-md overflow-auto max-h-[300px]">
                    {JSON.stringify(event.headers, null, 2)}
                  </pre>
                </div>
              </div>

              {replayHistory.length > 0 && (
                <div className="border rounded-lg">
                  <div className="border-b bg-muted/50 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      <h2 className="font-semibold">Replay History</h2>
                    </div>
                    <Badge variant="secondary">{replayHistory.length} attempts</Badge>
                  </div>
                  <div className="p-4 space-y-3">
                    {replayHistory.map((attempt) => (
                      <div key={attempt.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {attempt.success ? (
                              <Badge variant="success">✓ Success</Badge>
                            ) : (
                              <Badge variant="destructive">✗ Failed</Badge>
                            )}
                            {attempt.statusCode && (
                              <span className="text-xs text-muted-foreground">
                                HTTP {attempt.statusCode}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(attempt.replayedAt), 'PPpp')}
                          </span>
                        </div>
                        <p className="text-xs font-mono truncate">{attempt.targetUrl}</p>
                        {attempt.error && (
                          <p className="text-xs text-destructive">{attempt.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="border rounded-lg">
                <div className="border-b bg-muted/50 px-4 py-3">
                  <h2 className="font-semibold">Metadata</h2>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Event ID</p>
                    <p className="text-sm font-mono">{event.id}</p>
                  </div>

                  {event.eventId && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Provider Event ID</p>
                      <p className="text-sm font-mono">{event.eventId}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Provider</p>
                    <Badge variant="secondary">{event.provider}</Badge>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Received At</p>
                    <p className="text-sm">{format(new Date(event.timestamp), 'PPpp')}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Signature Verified</p>
                    {event.verified ? (
                      <Badge variant="success">✓ Verified</Badge>
                    ) : (
                      <Badge variant="destructive">✗ Unverified</Badge>
                    )}
                  </div>

                  {event.verificationDetails && Object.keys(event.verificationDetails).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Verification Details</p>
                      <pre className="text-xs bg-muted/30 p-2 rounded-md overflow-auto">
                        {JSON.stringify(event.verificationDetails, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={() => setShowReplayModal(true)}
              >
                <Play className="mr-2 h-4 w-4" />
                Replay Event
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showReplayModal && (
        <ReplayModal 
          event={event}
          onClose={() => {
            setShowReplayModal(false)
            refreshReplayHistory()
          }}
        />
      )}
    </>
  )
}
