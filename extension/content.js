// ── Scroll Actions (from popup voice commands) ──
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'scroll_down':
      window.scrollBy({ top: 500, behavior: 'smooth' });
      break;
    case 'scroll_up':
      window.scrollBy({ top: -500, behavior: 'smooth' });
      break;
    case 'scroll_top':
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    case 'scroll_bottom':
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      break;
    case 'click':
      const el = document.querySelector(message.selector);
      if (el) el.click();
      break;

    // ── Hand Tracking Gesture Relay ──
    case 'hand_gesture':
      handleHandGesture(message.data);
      break;

    // ── Browser Agent: Extract page context ──
    case 'extract_page_context':
      sendResponse(extractPageContext());
      return; // sync response

    // ── Browser Agent: Execute an action ──
    case 'agent_execute':
      executeAgentAction(message.data).then(result => {
        sendResponse(result);
      });
      return true; // async response
  }
  sendResponse({ done: true });
});

// ═══════════════════════════════════════════════
// Browser Agent: DOM Extraction
// ═══════════════════════════════════════════════

function extractPageContext() {
  const elements = [];
  const seen = new Set();

  // Collect all interactive/clickable elements
  const selectors = 'a, button, input, select, textarea, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [onclick], summary';
  const nodes = document.querySelectorAll(selectors);

  nodes.forEach((el, i) => {
    if (elements.length >= 80) return; // limit to avoid huge payloads

    const rect = el.getBoundingClientRect();
    // Only visible elements in viewport
    if (rect.width === 0 || rect.height === 0) return;
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;

    const text = (el.textContent || '').trim().substring(0, 100);
    const ariaLabel = el.getAttribute('aria-label') || '';
    const title = el.getAttribute('title') || '';
    const displayText = text || ariaLabel || title || el.getAttribute('placeholder') || '';

    if (!displayText) return;

    // Build a unique selector
    const selector = buildSelector(el);
    if (seen.has(selector)) return;
    seen.add(selector);

    elements.push({
      index: elements.length,
      tag: el.tagName.toLowerCase(),
      text: displayText.substring(0, 80),
      type: el.getAttribute('type') || '',
      href: el.getAttribute('href') || '',
      selector,
    });
  });

  return {
    url: window.location.href,
    title: document.title,
    elements,
  };
}

function buildSelector(el) {
  // Try ID first
  if (el.id) return `#${CSS.escape(el.id)}`;

  // Try data-testid or unique attributes
  const testId = el.getAttribute('data-testid');
  if (testId) return `[data-testid="${CSS.escape(testId)}"]`;

  // Try aria-label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return `${el.tagName.toLowerCase()}[aria-label="${CSS.escape(ariaLabel)}"]`;

  // Build path with nth-child
  const parts = [];
  let current = el;
  while (current && current !== document.body && parts.length < 4) {
    let part = current.tagName.toLowerCase();
    if (current.id) {
      parts.unshift(`#${CSS.escape(current.id)}`);
      break;
    }
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
      if (siblings.length > 1) {
        const idx = siblings.indexOf(current) + 1;
        part += `:nth-of-type(${idx})`;
      }
    }
    parts.unshift(part);
    current = parent;
  }
  return parts.join(' > ');
}

// ═══════════════════════════════════════════════
// Browser Agent: Execute Actions
// ═══════════════════════════════════════════════

async function executeAgentAction(data) {
  if (!data) return { success: false, error: 'No action data' };

  try {
    switch (data.action) {
      case 'click': {
        const el = document.querySelector(data.selector);
        if (!el) return { success: false, error: `Element not found: ${data.selector}` };

        // Scroll into view
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(300);

        // Highlight before clicking
        highlightElement(el);
        await sleep(500);

        el.click();
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return { success: true };
      }

      case 'type': {
        const el = document.querySelector(data.selector);
        if (!el) return { success: false, error: `Element not found: ${data.selector}` };

        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(300);
        highlightElement(el);

        el.focus();
        el.value = data.text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));

        // If it's a search/form, press Enter
        if (el.tagName === 'INPUT' && (el.type === 'search' || el.type === 'text')) {
          el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
          el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
        }
        return { success: true };
      }

      case 'scroll_down':
        window.scrollBy({ top: 600, behavior: 'smooth' });
        return { success: true };

      case 'navigate':
        window.location.href = data.url;
        return { success: true };

      case 'done':
      case 'failed':
        return { success: true };

      default:
        return { success: false, error: `Unknown action: ${data.action}` };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function highlightElement(el) {
  const overlay = document.createElement('div');
  const rect = el.getBoundingClientRect();
  Object.assign(overlay.style, {
    position: 'fixed',
    left: `${rect.left - 3}px`,
    top: `${rect.top - 3}px`,
    width: `${rect.width + 6}px`,
    height: `${rect.height + 6}px`,
    border: '3px solid rgba(59, 130, 246, 0.9)',
    borderRadius: '6px',
    background: 'rgba(59, 130, 246, 0.1)',
    zIndex: '2147483646',
    pointerEvents: 'none',
    animation: 'jarvis-highlight 1s ease-out forwards',
  });
  document.documentElement.appendChild(overlay);
  setTimeout(() => overlay.remove(), 1200);
}

// ═══════════════════════════════════════════════
// Hand Tracking Cursor Overlay on Active Tab
// ═══════════════════════════════════════════════

let cursorEl = null;
let cursorVisible = false;
let smoothX = 0;
let smoothY = 0;

function ensureCursor() {
  if (cursorEl) return;
  cursorEl = document.createElement('div');
  cursorEl.id = 'jarvis-hand-cursor';
  cursorEl.innerHTML = `
    <div style="
      width: 24px; height: 24px; border-radius: 50%;
      background: rgba(59, 130, 246, 0.8);
      border: 2px solid white;
      box-shadow: 0 0 12px rgba(59, 130, 246, 0.5), 0 0 24px rgba(59, 130, 246, 0.2);
      position: relative;
    ">
      <div style="
        width: 8px; height: 8px; border-radius: 50%;
        background: white;
        position: absolute; top: 6px; left: 6px;
      "></div>
    </div>
  `;
  Object.assign(cursorEl.style, {
    position: 'fixed',
    zIndex: '2147483647',
    pointerEvents: 'none',
    willChange: 'transform',
    transition: 'opacity 0.2s ease',
    opacity: '0',
    top: '0',
    left: '0',
  });
  document.documentElement.appendChild(cursorEl);
}

function showCursor() {
  ensureCursor();
  if (!cursorVisible) {
    cursorEl.style.opacity = '1';
    cursorVisible = true;
  }
}

function hideCursor() {
  if (cursorEl && cursorVisible) {
    cursorEl.style.opacity = '0';
    cursorVisible = false;
  }
}

function moveCursor(nx, ny) {
  const targetX = nx * window.innerWidth;
  const targetY = ny * window.innerHeight;
  const velocity = Math.hypot(targetX - smoothX, targetY - smoothY);
  const alpha = Math.min(0.6, Math.max(0.15, velocity / 200));
  smoothX += (targetX - smoothX) * alpha;
  smoothY += (targetY - smoothY) * alpha;
  showCursor();
  if (cursorEl) {
    cursorEl.style.transform = `translate3d(${smoothX - 12}px, ${smoothY - 12}px, 0)`;
  }
}

function clickAtCursor() {
  if (!cursorVisible) return;
  const el = document.elementFromPoint(smoothX, smoothY);
  if (!el) return;
  const ripple = document.createElement('div');
  Object.assign(ripple.style, {
    position: 'fixed',
    left: `${smoothX - 20}px`,
    top: `${smoothY - 20}px`,
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '2px solid rgba(59, 130, 246, 0.8)',
    background: 'rgba(59, 130, 246, 0.2)',
    zIndex: '2147483646',
    pointerEvents: 'none',
    animation: 'jarvis-ripple 0.4s ease-out forwards',
  });
  document.documentElement.appendChild(ripple);
  setTimeout(() => ripple.remove(), 500);
  el.click();
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: smoothX, clientY: smoothY }));
}

function scrollPage(velocity) {
  window.scrollBy({ top: velocity });
}

function handleHandGesture(data) {
  if (!data) return;
  switch (data.gesture) {
    case 'pointing': moveCursor(data.normalizedX, data.normalizedY); break;
    case 'click': clickAtCursor(); break;
    case 'scroll': scrollPage(data.velocity); break;
    case 'hide': hideCursor(); break;
  }
}

// Inject animations CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes jarvis-ripple {
    0% { transform: scale(0.5); opacity: 1; }
    100% { transform: scale(2); opacity: 0; }
  }
  @keyframes jarvis-highlight {
    0% { opacity: 1; }
    70% { opacity: 1; }
    100% { opacity: 0; }
  }
`;
document.documentElement.appendChild(style);
