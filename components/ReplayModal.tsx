'use client'

import { useState } from 'react'
import { WebhookEvent } from '@/lib/webhookStore'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

interface ReplayModalProps {
  event: WebhookEvent
  onClose: () => void
}

interface ReplayResult {
  success: boolean
  status?: number
  statusText?: string
  responseBody?: string
  error?: string
}

export default function ReplayModal({ event, onClose }: ReplayModalProps) {
  const [targetUrl, setTargetUrl] = useState('https://localhost:3000/webhooks')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ReplayResult | null>(null)

  const handleReplay = async () => {
    if (!targetUrl) {
      alert('Please enter a target URL')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch(`/api/replay/${event.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl })
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: (error as Error).message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Replay Event</DialogTitle>
          <DialogDescription>
            Send this webhook event to a custom endpoint for testing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Target URL</label>
            <Input
              type="url"
              placeholder="https://your-app.com/webhooks"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              The webhook will be sent to this URL with the original headers and payload
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Payload Preview (Read-only)</label>
            <div className="border rounded-md overflow-hidden">
              <pre className="text-xs bg-muted/30 p-4 overflow-y-auto overflow-x-hidden max-h-[200px] whitespace-pre-wrap break-all">
                {JSON.stringify(event.body, null, 2)}
              </pre>
            </div>
          </div>

          {result && (
            <div className="border rounded-md p-4">
              <div className="flex items-center gap-2 mb-2">
                {result.success ? (
                  <>
                    <Badge variant="success">✓ Success</Badge>
                    {result.status && (
                      <span className="text-sm text-muted-foreground">
                        HTTP {result.status} {result.statusText}
                      </span>
                    )}
                  </>
                ) : (
                  <Badge variant="destructive">✗ Failed</Badge>
                )}
              </div>

              {result.error && (
                <p className="text-sm text-destructive mt-2">{result.error}</p>
              )}

              {result.responseBody && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Response Body:</p>
                  <div className="rounded-md overflow-hidden">
                    <pre className="text-xs bg-muted/30 p-3 overflow-y-auto overflow-x-hidden max-h-[150px] whitespace-pre-wrap break-all">
                      {result.responseBody}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Close
          </Button>
          <Button onClick={handleReplay} disabled={loading || !targetUrl}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Replay'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
