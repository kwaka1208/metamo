interface State {
  performanceHistory: any[];
  errors: any[];
  logBuffer: string; // Accumulate logs as text
}

const state: State = {
  performanceHistory: [],
  errors: [],
  logBuffer: '',
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
      chrome.tabs.sendMessage(sender.tab.id, { type: 'STATE_UPDATED', payload: state }).catch(() => {});
    }
  } else if (message.type === 'ERROR_OCCURRED') {
    const error = message.payload;
    state.errors.push(error);
    if (state.errors.length > MAX_ERRORS) {
      state.errors.shift();
    }

    // Format log entry
    const timeStr = new Date(error.timestamp).toLocaleString();
    const logEntry = `[${timeStr}] TYPE: ${error.type} | MEMORY: ${error.memorySnapshot || 'N/A'} | MESSAGE: ${error.message}${error.stack ? '\nSTACK: ' + error.stack : ''}\n---\n`;
    state.logBuffer += logEntry;

    if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, { type: 'STATE_UPDATED', payload: state }).catch(() => {});
    }
  } else if (message.type === 'GET_STATE') {
    sendResponse(state);
  } else if (message.type === 'DOWNLOAD_LOG') {
    // Generate a data URL for the log buffer
    const blob = new Blob([state.logBuffer], { type: 'text/plain' });
    const reader = new FileReader();
    reader.onload = () => {
      chrome.downloads.download({
        url: reader.result as string,
        filename: 'metamo.log',
        saveAs: false
      });
    };
    reader.readAsDataURL(blob);
  }
  return true;
});

// Toggle dashboard on icon click
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_DASHBOARD' }).catch(() => {
      console.warn('metamo: Failed to send TOGGLE_DASHBOARD.');
    });
  }
});

console.log('metamo: Background script initialized.');
