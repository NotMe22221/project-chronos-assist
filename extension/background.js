chrome.runtime.onInstalled.addListener(() => {
  console.log('JARVIS Voice Assistant extension installed');
  
  // Enable side panel to open on action click
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
    .catch(e => console.error('Side panel setup error:', e));
});

// Listen for messages from popup to open side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
    return true; // Keep message channel open for async response
  }
});
