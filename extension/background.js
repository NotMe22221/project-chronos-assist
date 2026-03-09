chrome.runtime.onInstalled.addListener(() => {
  console.log('JARVIS Voice Assistant extension installed');
  
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
    .catch(e => console.error('Side panel setup error:', e));
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Open side panel
  if (message.action === 'open_side_panel') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        try {
          await chrome.sidePanel.open({ tabId: tabs[0].id });
          sendResponse({ success: true });
        } catch (e) {
          console.error('Failed to open side panel:', e);
          sendResponse({ success: false, error: e.message });
        }
      }
    });
    return true;
  }

  // Relay hand tracking data from side panel to active tab's content script
  if (message.action === 'hand_tracking_data') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'hand_gesture',
          data: message.data,
        }).catch(() => {});
      }
    });
    return false;
  }

  // Run browser actions in extension context
  if (message.action === 'browser_action') {
    const { kind, url, query } = message.data || {};

    if (kind === 'open_url' && url) {
      chrome.tabs.create({ url });
      return false;
    }

    if (kind === 'youtube_search' && query) {
      const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      chrome.tabs.create({ url: ytUrl });
      return false;
    }

    if (kind === 'google_search' && query) {
      const gUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      chrome.tabs.create({ url: gUrl });
      return false;
    }

    if (kind === 'reload_page') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.reload(tabs[0].id);
        }
      });
      return false;
    }
  }

  // ═══════════════════════════════════════════════
  // Browser Agent: Extract page context from active tab
  // ═══════════════════════════════════════════════
  if (message.action === 'agent_extract_context') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]?.id) {
        sendResponse({ error: 'No active tab' });
        return;
      }
      
      try {
        let screenshot = null;
        try {
          screenshot = await new Promise((resolve) => {
            chrome.tabs.captureVisibleTab(tabs[0].windowId, { format: 'jpeg', quality: 50 }, (dataUrl) => {
              if (chrome.runtime.lastError) resolve(null);
              else resolve(dataUrl);
            });
          });
        } catch (e) {
          console.warn('Screenshot failed:', e);
        }

        chrome.tabs.sendMessage(tabs[0].id, { action: 'extract_page_context' }, (response) => {
          if (chrome.runtime.lastError) {
            sendResponse({ error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ ...response, screenshot });
          }
        });
      } catch (err) {
        sendResponse({ error: err.message });
      }
    });
    return true; // async
  }

  // Browser Agent: Execute action on active tab
  if (message.action === 'agent_execute_action') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        sendResponse({ error: 'No active tab' });
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { action: 'agent_execute', data: message.data }, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse(response);
        }
      });
    });
    return true; // async
  }

  // Browser Agent: Navigate active tab to URL
  if (message.action === 'agent_navigate') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.update(tabs[0].id, { url: message.url }, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ error: 'No active tab' });
      }
    });
    return true;
  }

  // ═══════════════════════════════════════════════
  // Bookmarks API: Get bookmarks tree
  // ═══════════════════════════════════════════════
  if (message.action === 'get_bookmarks') {
    chrome.bookmarks.getTree((tree) => {
      const bookmarks = flattenBookmarks(tree);
      sendResponse({ bookmarks });
    });
    return true;
  }

  // Open a bookmark by URL
  if (message.action === 'open_bookmark') {
    chrome.tabs.create({ url: message.url });
    sendResponse({ success: true });
    return false;
  }
});

// Helper to flatten bookmark tree
function flattenBookmarks(nodes, result = []) {
  for (const node of nodes) {
    if (node.url) {
      result.push({
        id: node.id,
        title: node.title,
        url: node.url,
      });
    }
    if (node.children) {
      flattenBookmarks(node.children, result);
    }
  }
  return result;
}
