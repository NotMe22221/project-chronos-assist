const startBtn = document.getElementById('startBtn');
const status = document.getElementById('status');
const log = document.getElementById('log');
const textInput = document.getElementById('textInput');
const sendBtn = document.getElementById('sendBtn');
const panelBtn = document.getElementById('panelBtn');

// ── Open Side Panel ──
panelBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'open_side_panel' }, (response) => {
    if (response?.success) window.close(); // close popup after opening panel
  });
});

// ── Config ──
const SUPABASE_URL = 'https://umhqazctftqtyuocvnim.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtaHFhemN0ZnRxdHl1b2N2bmltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjc5NjMsImV4cCI6MjA4NjYwMzk2M30.ecFgYUTilN8qsfw-iT8AB2cRsarCO_WNRez_jJB8Zv8';

// ── Speech Recognition ──
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let listening = false;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    const text = event.results[event.results.length - 1][0].transcript.trim();
    addLog(text, 'user');
    processInput(text);
  };

  recognition.onerror = (e) => {
    console.error('Speech error:', e.error);
    status.textContent = `Error: ${e.error}`;
    if (e.error !== 'no-speech') stopListening();
  };

  recognition.onend = () => {
    if (listening) {
      try { recognition.start(); } catch (e) { /* already started */ }
    }
  };
} else {
  startBtn.disabled = true;
  status.textContent = 'Speech recognition not supported.';
}

// ── Button Handlers ──
startBtn.addEventListener('click', () => {
  if (listening) stopListening();
  else startListening();
});

sendBtn.addEventListener('click', () => {
  const text = textInput.value.trim();
  if (!text) return;
  textInput.value = '';
  addLog(text, 'user');
  processInput(text);
});

textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendBtn.click();
});

async function startListening() {
  try {
    // Explicitly request mic permission first
    await navigator.mediaDevices.getUserMedia({ audio: true });
    recognition.start();
    listening = true;
    startBtn.textContent = '🔴 Stop Listening';
    startBtn.classList.add('active');
    status.textContent = 'Listening... speak a command';
  } catch (e) {
    console.error('Mic permission error:', e);
    status.textContent = e.name === 'NotAllowedError'
      ? '⚠️ Microphone blocked — allow mic access in Chrome settings'
      : 'Error starting microphone';
  }
}

function stopListening() {
  recognition.stop();
  listening = false;
  startBtn.textContent = '🎤 Start Listening';
  startBtn.classList.remove('active');
  status.textContent = 'Click to activate';
}

// ── Logging & TTS ──
function addLog(text, type) {
  const div = document.createElement('div');
  div.className = `log-entry ${type}`;
  div.textContent = `${type === 'user' ? '🗣️' : '🤖'} ${text}`;
  log.prepend(div);
}

function speak(text) {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  speechSynthesis.speak(utterance);
  addLog(text, 'ai');
}

// ── Process Input ──
async function processInput(text) {
  const lower = text.toLowerCase();

  // Try browser commands first
  if (handleBrowserCommand(lower)) return;

  // Otherwise, send to JARVIS AI
  status.textContent = 'Thinking...';
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/jarvis-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ message: text }),
    });

    const data = await response.json();
    if (data.error) {
      speak(`Sorry, ${data.error}`);
    } else {
      speak(data.reply || "I couldn't generate a response.");
    }
  } catch (err) {
    console.error('AI request failed:', err);
    speak("Sorry, I couldn't reach my AI backend.");
  }
  status.textContent = listening ? 'Listening...' : 'Click to activate';
}

// ── Browser Commands ──
function handleBrowserCommand(text) {
  // Open website
  const openMatch = text.match(/open\s+(.+)/);
  if (openMatch) {
    const site = openMatch[1].trim().replace(/[?.!]+$/, '');
    const siteMap = {
      youtube: 'https://www.youtube.com', google: 'https://www.google.com',
      gmail: 'https://mail.google.com', twitter: 'https://www.twitter.com',
      x: 'https://www.x.com', facebook: 'https://www.facebook.com',
      instagram: 'https://www.instagram.com', reddit: 'https://www.reddit.com',
      github: 'https://www.github.com', linkedin: 'https://www.linkedin.com',
      amazon: 'https://www.amazon.com', netflix: 'https://www.netflix.com',
      spotify: 'https://www.spotify.com',
    };
    const url = siteMap[site] || (site.includes('.') ? `https://${site}` : `https://www.${site}.com`);
    chrome.tabs.create({ url });
    speak(`Opening ${site}`);
    return true;
  }

  // YouTube search
  const ytMatch = text.match(/search\s+(.+?)\s+(?:on|in)\s+youtube/);
  if (ytMatch) {
    chrome.tabs.create({ url: `https://www.youtube.com/results?search_query=${encodeURIComponent(ytMatch[1])}` });
    speak(`Searching YouTube for ${ytMatch[1]}`);
    return true;
  }

  // Google search
  const googleMatch = text.match(/^(?:google|search|search for)\s+(.+)/);
  if (googleMatch) {
    chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(googleMatch[1])}` });
    speak(`Searching for ${googleMatch[1]}`);
    return true;
  }

  // Close tab
  if (text.includes('close tab') || text.includes('close this tab')) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.remove(tabs[0].id);
    });
    speak('Tab closed');
    return true;
  }

  // New tab
  if (text.includes('new tab')) {
    chrome.tabs.create({});
    speak('New tab opened');
    return true;
  }

  // Scroll
  if (text.includes('scroll down')) { sendToContent({ action: 'scroll_down' }); speak('Scrolling down'); return true; }
  if (text.includes('scroll up')) { sendToContent({ action: 'scroll_up' }); speak('Scrolling up'); return true; }
  if (text.includes('scroll to top') || text.includes('go to top')) { sendToContent({ action: 'scroll_top' }); speak('Scrolling to top'); return true; }
  if (text.includes('scroll to bottom') || text.includes('go to bottom')) { sendToContent({ action: 'scroll_bottom' }); speak('Scrolling to bottom'); return true; }

  // Navigation
  if (text.includes('go back')) { chrome.tabs.goBack(); speak('Going back'); return true; }
  if (text.includes('go forward')) { chrome.tabs.goForward(); speak('Going forward'); return true; }

  // Reload
  if (text.includes('reload') || text.includes('refresh')) { chrome.tabs.reload(); speak('Page reloaded'); return true; }

  // Bookmark
  if (text.includes('bookmark')) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.bookmarks?.create({ title: tabs[0].title, url: tabs[0].url });
    });
    speak('Page bookmarked');
    return true;
  }

  // Mute/unmute
  if (text.includes('mute')) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.update(tabs[0].id, { muted: true });
    });
    speak('Tab muted');
    return true;
  }
  if (text.includes('unmute')) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.update(tabs[0].id, { muted: false });
    });
    speak('Tab unmuted');
    return true;
  }

  return false;
}

function sendToContent(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, message);
  });
}
