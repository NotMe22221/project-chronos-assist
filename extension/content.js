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
  }
  sendResponse({ done: true });
});