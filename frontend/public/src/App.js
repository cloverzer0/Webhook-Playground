const { useState, useEffect } = React;

const API_URL = 'http://localhost:3001';

function App() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filter, setFilter] = useState('all');
  const [replayUrl, setReplayUrl] = useState('');
  const [replayResult, setReplayResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams();
      if (filter === 'verified') params.append('verified', 'true');
      if (filter === 'unverified') params.append('verified', 'false');
      
      const response = await fetch(`${API_URL}/events?${params}`);
      const data = await response.json();
      setEvents(data.events);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 3000);
    return () => clearInterval(interval);
  }, [filter]);

  const clearEvents = async () => {
    if (confirm('Are you sure you want to clear all events?')) {
      try {
        await fetch(`${API_URL}/events`, { method: 'DELETE' });
        setEvents([]);
        setSelectedEvent(null);
      } catch (error) {
        console.error('Failed to clear events:', error);
      }
    }
  };

  const replayEvent = async (eventId) => {
    if (!replayUrl) {
      alert('Please enter a target URL');
      return;
    }

    setLoading(true);
    setReplayResult(null);

    try {
      const response = await fetch(`${API_URL}/replay/${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: replayUrl })
      });
      const result = await response.json();
      setReplayResult(result);
    } catch (error) {
      setReplayResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getEventTypeDisplay = (event) => {
    if (event.eventType) return event.eventType;
    if (event.body?.type) return event.body.type;
    return 'webhook';
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🪝 Webhook Playground</h1>
        <p style={styles.subtitle}>Receive, verify, and replay webhooks</p>
      </header>

      <div style={styles.content}>
        <div style={styles.sidebar}>
          <div style={styles.controls}>
            <div style={styles.webhookInfo}>
              <h3 style={styles.sectionTitle}>Webhook Endpoint</h3>
              <code style={styles.endpoint}>POST {API_URL}/webhook/:provider</code>
              <div style={styles.providerExamples}>
                <small>Examples:</small>
                <div><code style={styles.smallCode}>/webhook/stripe</code></div>
                <div><code style={styles.smallCode}>/webhook/github</code></div>
              </div>
            </div>

            <div style={styles.filterSection}>
              <h3 style={styles.sectionTitle}>Filter Events</h3>
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                style={styles.select}
              >
                <option value="all">All Events</option>
                <option value="verified">Verified Only</option>
                <option value="unverified">Unverified Only</option>
              </select>
            </div>

            <button onClick={clearEvents} style={styles.clearButton}>
              Clear All Events
            </button>

            <div style={styles.eventCount}>
              {events.length} event{events.length !== 1 ? 's' : ''} captured
            </div>
          </div>

          <div style={styles.eventList}>
            {events.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No webhook events received yet.</p>
                <p style={styles.emptyHint}>Send a webhook to get started!</p>
              </div>
            ) : (
              events.map(event => (
                <div 
                  key={event.id}
                  style={{
                    ...styles.eventItem,
                    ...(selectedEvent?.id === event.id ? styles.eventItemSelected : {})
                  }}
                  onClick={() => {
                    setSelectedEvent(event);
                    setReplayResult(null);
                  }}
                >
                  <div style={styles.eventHeader}>
                    <span style={styles.eventProvider}>{event.provider}</span>
                    {event.verified && <span style={styles.verifiedBadge}>✓ Verified</span>}
                  </div>
                  <div style={styles.eventType}>{getEventTypeDisplay(event)}</div>
                  <div style={styles.eventTime}>{formatTimestamp(event.timestamp)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={styles.detailPanel}>
          {selectedEvent ? (
            <>
              <div style={styles.detailHeader}>
                <h2 style={styles.detailTitle}>Event Details</h2>
                <div style={styles.eventMeta}>
                  <span style={styles.eventId}>ID: {selectedEvent.id}</span>
                  <span style={styles.eventProvider}>{selectedEvent.provider}</span>
                  {selectedEvent.verified && <span style={styles.verifiedBadge}>✓ Verified</span>}
                </div>
              </div>

              <div style={styles.detailContent}>
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>Event Type</h3>
                  <code style={styles.code}>{getEventTypeDisplay(selectedEvent)}</code>
                </div>

                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>Timestamp</h3>
                  <code style={styles.code}>{formatTimestamp(selectedEvent.timestamp)}</code>
                </div>

                {selectedEvent.verificationDetails && Object.keys(selectedEvent.verificationDetails).length > 0 && (
                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Verification Details</h3>
                    <pre style={styles.json}>
                      {JSON.stringify(selectedEvent.verificationDetails, null, 2)}
                    </pre>
                  </div>
                )}

                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>Headers</h3>
                  <pre style={styles.json}>
                    {JSON.stringify(selectedEvent.headers, null, 2)}
                  </pre>
                </div>

                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>Payload</h3>
                  <pre style={styles.json}>
                    {JSON.stringify(selectedEvent.body, null, 2)}
                  </pre>
                </div>

                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>Replay Event</h3>
                  <div style={styles.replaySection}>
                    <input
                      type="text"
                      placeholder="https://your-app.com/webhook"
                      value={replayUrl}
                      onChange={(e) => setReplayUrl(e.target.value)}
                      style={styles.input}
                    />
                    <button 
                      onClick={() => replayEvent(selectedEvent.id)}
                      disabled={loading || !replayUrl}
                      style={{
                        ...styles.replayButton,
                        ...(loading || !replayUrl ? styles.replayButtonDisabled : {})
                      }}
                    >
                      {loading ? 'Replaying...' : 'Replay to URL'}
                    </button>
                  </div>

                  {replayResult && (
                    <div style={{
                      ...styles.replayResult,
                      ...(replayResult.success ? styles.replaySuccess : styles.replayError)
                    }}>
                      {replayResult.success ? (
                        <>
                          <strong>✓ Replay successful!</strong>
                          <div>Status: {replayResult.status}</div>
                          {replayResult.responseBody && (
                            <pre style={styles.replayResponse}>
                              {replayResult.responseBody}
                            </pre>
                          )}
                        </>
                      ) : (
                        <>
                          <strong>✗ Replay failed</strong>
                          <div>{replayResult.error}</div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={styles.detailEmpty}>
              <h2>Select an event to view details</h2>
              <p>Click on an event from the list to see its full payload, headers, and replay options.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'rgba(255, 255, 255, 0.95)',
    padding: '1.5rem 2rem',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '2rem',
    color: '#333',
    marginBottom: '0.25rem',
  },
  subtitle: {
    color: '#666',
    fontSize: '1rem',
  },
  content: {
    flex: 1,
    display: 'flex',
    gap: '1rem',
    padding: '1rem',
    maxHeight: 'calc(100vh - 120px)',
  },
  sidebar: {
    width: '350px',
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  controls: {
    padding: '1.5rem',
    borderBottom: '1px solid #e0e0e0',
  },
  webhookInfo: {
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#333',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  endpoint: {
    display: 'block',
    padding: '0.75rem',
    background: '#f5f5f5',
    borderRadius: '6px',
    fontSize: '0.875rem',
    color: '#667eea',
    fontWeight: '500',
    wordBreak: 'break-all',
  },
  providerExamples: {
    marginTop: '0.5rem',
    fontSize: '0.75rem',
    color: '#666',
  },
  smallCode: {
    background: '#f5f5f5',
    padding: '0.125rem 0.25rem',
    borderRadius: '3px',
    fontSize: '0.75rem',
  },
  filterSection: {
    marginBottom: '1rem',
  },
  select: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  clearButton: {
    width: '100%',
    padding: '0.75rem',
    background: '#ff4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    marginBottom: '1rem',
  },
  eventCount: {
    textAlign: 'center',
    color: '#666',
    fontSize: '0.875rem',
  },
  eventList: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
  },
  emptyState: {
    textAlign: 'center',
    color: '#999',
    padding: '2rem 1rem',
  },
  emptyHint: {
    fontSize: '0.875rem',
    marginTop: '0.5rem',
  },
  eventItem: {
    padding: '1rem',
    background: '#f9f9f9',
    borderRadius: '8px',
    marginBottom: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '2px solid transparent',
  },
  eventItemSelected: {
    background: '#e8eaff',
    border: '2px solid #667eea',
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  eventProvider: {
    background: '#667eea',
    color: 'white',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  verifiedBadge: {
    background: '#4caf50',
    color: 'white',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  eventType: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#333',
    marginBottom: '0.25rem',
  },
  eventTime: {
    fontSize: '0.75rem',
    color: '#999',
  },
  detailPanel: {
    flex: 1,
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '12px',
    padding: '1.5rem',
    overflowY: 'auto',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  detailEmpty: {
    textAlign: 'center',
    color: '#999',
    padding: '4rem 2rem',
  },
  detailHeader: {
    marginBottom: '2rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #e0e0e0',
  },
  detailTitle: {
    fontSize: '1.5rem',
    color: '#333',
    marginBottom: '1rem',
  },
  eventMeta: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  eventId: {
    fontSize: '0.875rem',
    color: '#666',
    fontFamily: 'monospace',
  },
  detailContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  section: {
    background: '#f9f9f9',
    padding: '1rem',
    borderRadius: '8px',
  },
  code: {
    display: 'block',
    padding: '0.5rem',
    background: 'white',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontFamily: 'monospace',
  },
  json: {
    background: 'white',
    padding: '1rem',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontFamily: 'monospace',
    overflow: 'auto',
    maxHeight: '300px',
  },
  replaySection: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  input: {
    flex: 1,
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '0.875rem',
  },
  replayButton: {
    padding: '0.75rem 1.5rem',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  replayButtonDisabled: {
    background: '#ccc',
    cursor: 'not-allowed',
  },
  replayResult: {
    padding: '1rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
  },
  replaySuccess: {
    background: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
  },
  replayError: {
    background: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
  },
  replayResponse: {
    marginTop: '0.5rem',
    padding: '0.5rem',
    background: 'white',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    maxHeight: '150px',
    overflow: 'auto',
  },
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
