import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../popup/App';
// @ts-ignore
import tailwindStyles from './style.css?inline';

interface MemoryInfo {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

interface PerformanceData {
  memory?: MemoryInfo;
  fps: number;
  timestamp: number;
}

interface ErrorData {
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  type: 'error' | 'unhandledrejection' | 'console';
  timestamp: number;
  memorySnapshot?: string; // Add memory snapshot info
}

export {};

// Safety check for extension context
function isContextValid() {
  return !!chrome.runtime?.id;
}

// --- Monitoring Logic ---
let frameCount = 0;
let lastTime = performance.now();
let fps = 0;

function updateFPS() {
  const now = performance.now();
  frameCount++;
  if (now >= lastTime + 1000) {
    fps = Math.round((frameCount * 1000) / (now - lastTime));
    frameCount = 0;
    lastTime = now;
  }
  requestAnimationFrame(updateFPS);
}

function getPerformanceData(): PerformanceData {
  const perf = performance as any;
  return {
    memory: perf.memory ? {
      jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
      totalJSHeapSize: perf.memory.totalJSHeapSize,
      usedJSHeapSize: perf.memory.usedJSHeapSize,
    } : undefined,
    fps: fps,
    timestamp: Date.now(),
  };
}

function sendError(error: ErrorData) {
  if (!isContextValid()) return;
  
  // Attach current memory info
  const perf = getPerformanceData();
  if (perf.memory) {
    const used = Math.round(perf.memory.usedJSHeapSize / 1024 / 1024);
    const total = Math.round(perf.memory.totalJSHeapSize / 1024 / 1024);
    error.memorySnapshot = `${used}MB / ${total}MB`;
  }

  chrome.runtime.sendMessage({ type: 'ERROR_OCCURRED', payload: error }).catch(() => {});
}

window.addEventListener('error', (event) => {
  sendError({
    message: event.message,
    source: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack,
    type: 'error',
    timestamp: Date.now(),
  });
});

window.addEventListener('unhandledrejection', (event) => {
  sendError({
    message: event.reason?.message || String(event.reason),
    stack: event.reason?.stack,
    type: 'unhandledrejection',
    timestamp: Date.now(),
  });
});

const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  sendError({
    message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
    type: 'console',
    timestamp: Date.now(),
  });
  originalConsoleError.apply(console, args);
};

updateFPS();

setInterval(() => {
  if (!isContextValid()) return;
  const data = getPerformanceData();
  chrome.runtime.sendMessage({ type: 'PERFORMANCE_UPDATE', payload: data }).catch(() => {});
}, 1000);

// --- UI Injection Logic ---
let root: ReactDOM.Root | null = null;
let container: HTMLDivElement | null = null;
let isVisible = false;
const PANEL_WIDTH = '400px';

function toggleDashboard() {
  isVisible = !isVisible;
  if (isVisible) {
    showDashboard();
  } else {
    hideDashboard();
  }
}

function showDashboard() {
  if (!container) {
    container = document.createElement('div');
    container.id = 'meta-monitor-root';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.right = '0';
    container.style.height = '100vh';
    container.style.width = PANEL_WIDTH;
    container.style.zIndex = '2147483647';
    container.style.backgroundColor = 'white';
    container.style.display = 'none';
    
    const shadow = container.attachShadow({ mode: 'open' });
    const shadowRoot = document.createElement('div');
    shadowRoot.id = 'shadow-root-inner';
    shadowRoot.style.height = '100%';
    shadow.appendChild(shadowRoot);

    const styleTag = document.createElement('style');
    styleTag.textContent = tailwindStyles;
    shadow.appendChild(styleTag);

    document.documentElement.appendChild(container);
    root = ReactDOM.createRoot(shadowRoot);
  }
  
  const html = document.documentElement;
  html.style.transition = 'width 0.3s ease-in-out';
  html.style.width = `calc(100% - ${PANEL_WIDTH})`;
  html.style.position = 'relative';
  
  container.style.display = 'block';
  
  root?.render(
    <div className="h-full border-l border-slate-200 overflow-hidden bg-slate-50">
      <App onClose={() => { isVisible = false; hideDashboard(); }} />
    </div>
  );
}

function hideDashboard() {
  const html = document.documentElement;
  html.style.width = '100%';
  if (container) {
    container.style.display = 'none';
  }
  root?.render(null);
}

if (isContextValid()) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TOGGLE_DASHBOARD') {
      toggleDashboard();
    }
  });
}

console.log('MetaMonitor: Content script injected and monitoring...');
