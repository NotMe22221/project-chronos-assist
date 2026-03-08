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
          data: message.data
        }).catch(() => {
          // Content script not injected on this tab — ignore
        });
      }
    });
    return false;
  }
});
