'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { WebhookEvent } from '@/lib/webhookStore'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { Play, Trash2 } from 'lucide-react'
import ReplayModal from '@/components/ReplayModal'

export default function Home() {
  const router = useRouter()
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [filter, setFilter] = useState('all')
  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const [apiUrl, setApiUrl] = useState('')
  const [replayEvent, setReplayEvent] = useState<WebhookEvent | null>(null)

  useEffect(() => {
    setApiUrl(window.location.origin)
  }, [])

  const fetchEvents = async () => {
    if (!apiUrl) return
    
    try {
      const params = new URLSearchParams()
      if (filter === 'verified') params.append('verified', 'true')
      if (filter === 'unverified') params.append('verified', 'false')
      
      const response = await fetch(`${apiUrl}/api/events?${params}`)
      const data = await response.json()
      setEvents(data.events)
    } catch (error) {
      console.error('Failed to fetch events:', error)
    }
  }

  const clearEvents = async () => {
    if (!confirm('Are you sure you want to clear all events?')) return
    
    try {
      await fetch(`${apiUrl}/api/events`, { method: 'DELETE' })
      setEvents([])
    } catch (error) {
      console.error('Failed to clear events:', error)
    }
  }

  useEffect(() => {
    fetchEvents()
    const interval = setInterval(fetchEvents, 3000)
    return () => clearInterval(interval)
  }, [filter, apiUrl])

  const getEventTypes = () => {
    const types = new Set<string>()
    events.forEach(event => {
      if (event.eventType) types.add(event.eventType)
      else if (event.body?.type) types.add(event.body.type)
      else types.add('webhook')
    })
    return Array.from(types).sort()
  }

  const getEventTypeDisplay = (event: WebhookEvent) => {
    return event.eventType || event.body?.type || event.body?.action || event.body?.event || 'webhook'
  }

  const filteredEvents = events.filter(event => {
    if (eventTypeFilter === 'all') return true
    return getEventTypeDisplay(event) === eventTypeFilter
  })

  return (
    <>
      <Head>
        <title>Webhook Playground</title>
        <meta name="description" content="Developer-first webhook testing tool" />
      </Head>

      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-6 py-4">
            <h1 className="text-2xl font-bold">Webhook Playground</h1>
          </div>
        </header>

        <div className="container mx-auto px-6 py-6">
          <div className="mb-6 space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Event Type</label>
                <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Event Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Event Types</SelectItem>
                    {getEventTypes().map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="verified">Verified Only</SelectItem>
                    <SelectItem value="unverified">Unverified Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Actions</label>
                <Button 
                  variant="destructive" 
                  onClick={clearEvents}
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All Events
                </Button>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Webhook Endpoint</p>
              <code className="text-xs bg-background px-3 py-2 rounded block">
                POST {apiUrl || 'http://localhost:3001'}/api/webhook/:provider
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Examples: <code>/api/webhook/stripe</code>, <code>/api/webhook/github</code>
              </p>
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Received At</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                      No webhook events received yet. Send a webhook to get started!
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((event) => (
                    <TableRow 
                      key={event.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/events/${event.id}`)}
                    >
                      <TableCell className="font-mono text-sm">
                        {getEventTypeDisplay(event)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{event.provider}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(event.timestamp), 'PPpp')}
                      </TableCell>
                      <TableCell>
                        {event.verified ? (
                          <Badge variant="success">✓ Verified</Badge>
                        ) : (
                          <Badge variant="destructive">✗ Unverified</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setReplayEvent(event)
                          }}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredEvents.length} of {events.length} events
          </div>
        </div>
      </div>

      {replayEvent && (
        <ReplayModal 
          event={replayEvent}
          onClose={() => setReplayEvent(null)}
        />
      )}
    </>
  )
}
