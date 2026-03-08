const startBtn = document.getElementById('startBtn');
const status = document.getElementById('status');
const log = document.getElementById('log');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let listening = false;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    const text = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
    addLog(text, 'user');
    handleCommand(text);
  };

  recognition.onerror = (e) => {
    status.textContent = `Error: ${e.error}`;
    if (e.error !== 'no-speech') stopListening();
  };

  recognition.onend = () => {
    if (listening) recognition.start(); // auto-restart
  };
} else {
  startBtn.disabled = true;
  status.textContent = 'Speech recognition not supported in this browser.';
}

startBtn.addEventListener('click', () => {
  if (listening) stopListening();
  else startListening();
});

function startListening() {
  recognition.start();
  listening = true;
  startBtn.textContent = '🔴 Stop Listening';
  startBtn.classList.add('active');
  status.textContent = 'Listening... speak a command';
}

function stopListening() {
  recognition.stop();
  listening = false;
  startBtn.textContent = '🎤 Start Listening';
  startBtn.classList.remove('active');
  status.textContent = 'Click to activate';
}

function addLog(text, type) {
  const div = document.createElement('div');
  div.className = `log-entry ${type}`;
  div.textContent = `${type === 'user' ? '🗣️' : '🤖'} ${text}`;
  log.prepend(div);
}

function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  speechSynthesis.speak(utterance);
  addLog(text, 'ai');
}

function handleCommand(text) {
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
    return;
  }

  // YouTube search
  const ytMatch = text.match(/search\s+(.+?)\s+(?:on|in)\s+youtube/);
  if (ytMatch) {
    chrome.tabs.create({ url: `https://www.youtube.com/results?search_query=${encodeURIComponent(ytMatch[1])}` });
    speak(`Searching YouTube for ${ytMatch[1]}`);
    return;
  }

  // Google search
  const googleMatch = text.match(/(?:google|search|search for)\s+(.+)/);
  if (googleMatch) {
    chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(googleMatch[1])}` });
    speak(`Searching for ${googleMatch[1]}`);
    return;
  }

  // Close tab
  if (text.includes('close tab') || text.includes('close this tab')) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.remove(tabs[0].id);
    });
    speak('Tab closed');
    return;
  }

  // New tab
  if (text.includes('new tab')) {
    chrome.tabs.create({});
    speak('New tab opened');
    return;
  }

  // Scroll
  if (text.includes('scroll down')) {
    sendToContent({ action: 'scroll_down' });
    speak('Scrolling down');
    return;
  }
  if (text.includes('scroll up')) {
    sendToContent({ action: 'scroll_up' });
    speak('Scrolling up');
    return;
  }

  // Go back / forward
  if (text.includes('go back')) {
    chrome.tabs.goBack();
    speak('Going back');
    return;
  }
  if (text.includes('go forward')) {
    chrome.tabs.goForward();
    speak('Going forward');
    return;
  }

  // Reload
  if (text.includes('reload') || text.includes('refresh')) {
    chrome.tabs.reload();
    speak('Page reloaded');
    return;
  }

  speak("Sorry, I didn't understand that command.");
}

function sendToContent(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, message);
  });
}