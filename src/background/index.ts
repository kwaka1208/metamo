interface State {
  performanceHistory: any[];
  errors: any[];
}

const state: State = {
  performanceHistory: [],
  errors: [],
};

const MAX_HISTORY = 60; // Keep last 60 seconds
const MAX_ERRORS = 50;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PERFORMANCE_UPDATE') {
    state.performanceHistory.push(message.payload);
    if (state.performanceHistory.length > MAX_HISTORY) {
      state.performanceHistory.shift();
    }
    
    // Notify the specific tab that sent the update
    if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, { type: 'STATE_UPDATED', payload: state }).catch(() => {
        // Ignore errors if the tab is closed or listener not ready
      });
    }
  } else if (message.type === 'ERROR_OCCURRED') {
    state.errors.push(message.payload);
    if (state.errors.length > MAX_ERRORS) {
      state.errors.shift();
    }

    if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, { type: 'STATE_UPDATED', payload: state }).catch(() => {
        // Ignore errors
      });
    }
  } else if (message.type === 'GET_STATE') {
    sendResponse(state);
  }
  return true;
});

// Toggle dashboard on icon click
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_DASHBOARD' }).catch(() => {
      console.warn('MetaMonitor: Failed to send TOGGLE_DASHBOARD. Content script might not be loaded yet.');
    });
  }
});

console.log('MetaMonitor: Background script initialized.');
