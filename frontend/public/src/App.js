const API_URL = 'http://localhost:3001';

let events = [];
let selectedEvent = null;
let filter = 'all';
let replayUrl = '';

// DOM elements
const eventList = document.getElementById('eventList');
const detailPanel = document.getElementById('detailPanel');
const filterSelect = document.getElementById('filterSelect');
const clearButton = document.getElementById('clearButton');
const eventCount = document.getElementById('eventCount');

// Fetch events from API
async function fetchEvents() {
  try {
    const params = new URLSearchParams();
    if (filter === 'verified') params.append('verified', 'true');
    if (filter === 'unverified') params.append('verified', 'false');
    
    const response = await fetch(`${API_URL}/events?${params}`);
    const data = await response.json();
    events = data.events;
    renderEvents();
    updateEventCount();
  } catch (error) {
    console.error('Failed to fetch events:', error);
  }
}

// Render event list
function renderEvents() {
  if (events.length === 0) {
    eventList.innerHTML = `
      <div class="empty-state">
        <p>No webhook events received yet.</p>
        <p class="empty-hint">Send a webhook to get started!</p>
      </div>
    `;
    return;
  }

  eventList.innerHTML = events.map(event => `
    <div class="event-item ${selectedEvent && selectedEvent.id === event.id ? 'selected' : ''}"
         onclick="selectEvent('${event.id}')">
      <div class="event-header">
        <span class="event-provider">${event.provider}</span>
        ${event.verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
      </div>
      <div class="event-type">${getEventTypeDisplay(event)}</div>
      <div class="event-time">${formatTimestamp(event.timestamp)}</div>
    </div>
  `).join('');
}

// Select an event
function selectEvent(eventId) {
  selectedEvent = events.find(e => e.id === eventId);
  renderEvents();
  renderEventDetail();
}

// Render event detail
function renderEventDetail() {
  if (!selectedEvent) {
    detailPanel.innerHTML = `
      <div class="detail-empty">
        <h2>Select an event to view details</h2>
        <p>Click on an event from the list to see its full payload, headers, and replay options.</p>
      </div>
    `;
    return;
  }

  detailPanel.innerHTML = `
    <div class="detail-header">
      <h2 class="detail-title">Event Details</h2>
      <div class="event-meta">
        <span class="event-id">ID: ${selectedEvent.id}</span>
        <span class="event-provider">${selectedEvent.provider}</span>
        ${selectedEvent.verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
      </div>
    </div>

    <div class="detail-content">
      <div class="section">
        <h3 class="section-title">Event Type</h3>
        <code class="code">${getEventTypeDisplay(selectedEvent)}</code>
      </div>

      <div class="section">
        <h3 class="section-title">Timestamp</h3>
        <code class="code">${formatTimestamp(selectedEvent.timestamp)}</code>
      </div>

      ${selectedEvent.verificationDetails && Object.keys(selectedEvent.verificationDetails).length > 0 ? `
        <div class="section">
          <h3 class="section-title">Verification Details</h3>
          <pre class="json">${JSON.stringify(selectedEvent.verificationDetails, null, 2)}</pre>
        </div>
      ` : ''}

      <div class="section">
        <h3 class="section-title">Headers</h3>
        <pre class="json">${JSON.stringify(selectedEvent.headers, null, 2)}</pre>
      </div>

      <div class="section">
        <h3 class="section-title">Payload</h3>
        <pre class="json">${JSON.stringify(selectedEvent.body, null, 2)}</pre>
      </div>

      <div class="section">
        <h3 class="section-title">Replay Event</h3>
        <div class="replay-section">
          <input type="text" id="replayInput" placeholder="https://your-app.com/webhook" value="${replayUrl}">
          <button class="replay-button" onclick="replayEvent()">Replay to URL</button>
        </div>
        <div id="replayResult"></div>
      </div>
    </div>
  `;
}

// Replay event
async function replayEvent() {
  const input = document.getElementById('replayInput');
  const url = input.value;
  
  if (!url) {
    alert('Please enter a target URL');
    return;
  }

  replayUrl = url;
  const resultDiv = document.getElementById('replayResult');
  resultDiv.innerHTML = '<p>Replaying...</p>';

  try {
    const response = await fetch(`${API_URL}/replay/${selectedEvent.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUrl: url })
    });
    const result = await response.json();

    if (result.success) {
      resultDiv.innerHTML = `
        <div class="replay-result replay-success">
          <strong>✓ Replay successful!</strong>
          <div>Status: ${result.status}</div>
          ${result.responseBody ? `
            <pre class="replay-response">${result.responseBody}</pre>
          ` : ''}
        </div>
      `;
    } else {
      resultDiv.innerHTML = `
        <div class="replay-result replay-error">
          <strong>✗ Replay failed</strong>
          <div>${result.error}</div>
        </div>
      `;
    }
  } catch (error) {
    resultDiv.innerHTML = `
      <div class="replay-result replay-error">
        <strong>✗ Replay failed</strong>
        <div>${error.message}</div>
      </div>
    `;
  }
}

// Clear all events
async function clearEvents() {
  if (!confirm('Are you sure you want to clear all events?')) {
    return;
  }

  try {
    await fetch(`${API_URL}/events`, { method: 'DELETE' });
    events = [];
    selectedEvent = null;
    renderEvents();
    renderEventDetail();
    updateEventCount();
  } catch (error) {
    console.error('Failed to clear events:', error);
  }
}

// Update event count
function updateEventCount() {
  const count = events.length;
  eventCount.textContent = `${count} event${count !== 1 ? 's' : ''} captured`;
}

// Format timestamp
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

// Get event type display
function getEventTypeDisplay(event) {
  if (event.eventType) return event.eventType;
  if (event.body && event.body.type) return event.body.type;
  if (event.body && event.body.action) return event.body.action;
  if (event.body && event.body.event) return event.body.event;
  return 'webhook';
}

// Event listeners
filterSelect.addEventListener('change', (e) => {
  filter = e.target.value;
  fetchEvents();
});

clearButton.addEventListener('click', clearEvents);

// Initialize
fetchEvents();
setInterval(fetchEvents, 3000);

