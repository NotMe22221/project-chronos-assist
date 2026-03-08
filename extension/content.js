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
  }
  sendResponse({ done: true });
});

// ═══════════════════════════════════════════════
// Hand Tracking Cursor Overlay on Active Tab
// ═══════════════════════════════════════════════

let cursorEl = null;
let cursorVisible = false;
let smoothX = 0;
let smoothY = 0;
let animFrame = null;

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
  // nx, ny are normalized 0–1 coordinates from the hand tracker
  const targetX = nx * window.innerWidth;
  const targetY = ny * window.innerHeight;

  // Velocity-adaptive smoothing
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

  // Visual click feedback
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

  // Simulate click
  el.click();
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: smoothX, clientY: smoothY }));
}

function scrollPage(velocity) {
  window.scrollBy({ top: velocity });
}

function handleHandGesture(data) {
  if (!data) return;

  switch (data.gesture) {
    case 'pointing':
      moveCursor(data.normalizedX, data.normalizedY);
      break;
    case 'click':
      clickAtCursor();
      break;
    case 'scroll':
      scrollPage(data.velocity);
      break;
    case 'hide':
      hideCursor();
      break;
  }
}

// Inject ripple animation CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes jarvis-ripple {
    0% { transform: scale(0.5); opacity: 1; }
    100% { transform: scale(2); opacity: 0; }
  }
`;
document.documentElement.appendChild(style);
