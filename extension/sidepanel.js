const iframe = document.getElementById('jarvis-frame');

// Relay events from JARVIS iframe to extension runtime
window.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'jarvis-hand-tracking') {
    chrome.runtime.sendMessage({
      action: 'hand_tracking_data',
      data: event.data,
    });
  }

  if (event.data.type === 'jarvis-browser-action') {
    chrome.runtime.sendMessage({
      action: 'browser_action',
      data: event.data,
    });
  }

  // ── Browser Agent: Start automation task ──
  if (event.data.type === 'jarvis-agent-task') {
    runAgentLoop(event.data.task);
  }

  // ── Browser Agent: User confirmed/rejected a step ──
  if (event.data.type === 'jarvis-agent-confirm') {
    if (pendingResolve) {
      pendingResolve(event.data.confirmed);
      pendingResolve = null;
    }
  }

  // ── Bookmarks: Request bookmarks list ──
  if (event.data.type === 'jarvis-get-bookmarks') {
    chrome.runtime.sendMessage({ action: 'get_bookmarks' }, (response) => {
      sendToIframe({
        type: 'jarvis-bookmarks-list',
        bookmarks: response?.bookmarks || [],
      });
    });
  }

  // ── Bookmarks: Open a bookmark ──
  if (event.data.type === 'jarvis-open-bookmark') {
    chrome.runtime.sendMessage({
      action: 'open_bookmark',
      url: event.data.url,
    });
  }
});

// ═══════════════════════════════════════════════
// Browser Agent Orchestration Loop
// ═══════════════════════════════════════════════

let pendingResolve = null;
const MAX_STEPS = 15;
const SUPABASE_URL = 'https://umhqazctftqtyuocvnim.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtaHFhemN0ZnRxdHl1b2N2bmltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjc5NjMsImV4cCI6MjA4NjYwMzk2M30.ecFgYUTilN8qsfw-iT8AB2cRsarCO_WNRez_jJB8Zv8';

function sendToIframe(msg) {
  iframe.contentWindow.postMessage(msg, '*');
}

function waitForConfirmation() {
  return new Promise((resolve) => {
    pendingResolve = resolve;
  });
}

async function runAgentLoop(task) {
  const history = [];

  sendToIframe({
    type: 'jarvis-agent-status',
    status: 'started',
    message: `Starting task: ${task}`,
  });

  for (let step = 0; step < MAX_STEPS; step++) {
    // 1. Extract page context from active tab
    let pageContext;
    try {
      pageContext = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'agent_extract_context' }, (resp) => {
          if (chrome.runtime.lastError || resp?.error) {
            reject(new Error(resp?.error || chrome.runtime.lastError?.message || 'Extraction failed'));
          } else {
            resolve(resp);
          }
        });
      });
    } catch (e) {
      sendToIframe({
        type: 'jarvis-agent-status',
        status: 'error',
        message: `Cannot read page: ${e.message}. Make sure you're on a regular website (not chrome:// pages).`,
      });
      return;
    }

    // 2. Ask AI for next action
    let nextAction;
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/browser-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ task, pageContext, history }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      nextAction = await resp.json();
    } catch (e) {
      sendToIframe({
        type: 'jarvis-agent-status',
        status: 'error',
        message: `AI error: ${e.message}`,
      });
      return;
    }

    // 3. If done or failed, stop
    if (nextAction.action === 'done' || nextAction.action === 'failed') {
      sendToIframe({
        type: 'jarvis-agent-status',
        status: nextAction.action,
        message: nextAction.description,
      });
      return;
    }

    // 4. Ask user for confirmation
    sendToIframe({
      type: 'jarvis-agent-confirm-request',
      step: step + 1,
      action: nextAction,
    });

    const confirmed = await waitForConfirmation();

    if (!confirmed) {
      sendToIframe({
        type: 'jarvis-agent-status',
        status: 'cancelled',
        message: 'Task cancelled by user.',
      });
      return;
    }

    // 5. Execute the action
    if (nextAction.action === 'navigate') {
      await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'agent_navigate', url: nextAction.url },
          () => resolve()
        );
      });
      await new Promise(r => setTimeout(r, 2500));
    } else {
      try {
        const result = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(
            { action: 'agent_execute_action', data: nextAction },
            (resp) => {
              if (chrome.runtime.lastError || resp?.error) {
                reject(new Error(resp?.error || chrome.runtime.lastError?.message));
              } else {
                resolve(resp);
              }
            }
          );
        });

        if (!result.success) {
          sendToIframe({
            type: 'jarvis-agent-status',
            status: 'error',
            message: `Action failed: ${result.error}`,
          });
          return;
        }
      } catch (e) {
        sendToIframe({
          type: 'jarvis-agent-status',
          status: 'error',
          message: `Execution failed: ${e.message}`,
        });
        return;
      }

      await new Promise(r => setTimeout(r, 1500));
    }

    history.push({
      step: step + 1,
      action: nextAction,
      result: 'success',
    });

    sendToIframe({
      type: 'jarvis-agent-status',
      status: 'step_done',
      step: step + 1,
      message: `✓ ${nextAction.description}`,
    });
  }

  sendToIframe({
    type: 'jarvis-agent-status',
    status: 'done',
    message: 'Maximum steps reached.',
  });
}
