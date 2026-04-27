import React, { useEffect, useState, useMemo } from 'react';
import { Activity, AlertCircle, Cpu, HardDrive, Info, X } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

interface PerformanceData {
  memory?: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
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
}

interface State {
  performanceHistory: PerformanceData[];
  errors: ErrorData[];
}

interface AppProps {
  onClose?: () => void;
}

const App: React.FC<AppProps> = ({ onClose }) => {
  const [state, setState] = useState<State>({ performanceHistory: [], errors: [] });
  const [activeTab, setActiveTab] = useState<'perf' | 'errors'>('perf');

  useEffect(() => {
    let isMounted = true;

    // Initial state fetch
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
      if (isMounted && response) {
        setState(response);
      }
    });

    // Listen for updates
    const listener = (message: any) => {
      if (!isMounted) return;
      
      if (message.type === 'STATE_UPDATED' && message.payload) {
        setState(message.payload);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    
    return () => {
      isMounted = false;
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  // Prepare chart data with stable sorting and unique keys
  const chartData = useMemo(() => {
    return state.performanceHistory
      .slice(-60) // Show last 60 points
      .sort((a, b) => a.timestamp - b.timestamp) // Ensure time order
      .map((h) => ({
        time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        timestamp: h.timestamp,
        used: Math.round((h.memory?.usedJSHeapSize || 0) / 1024 / 1024),
        fps: h.fps,
      }));
  }, [state.performanceHistory]);

  const currentPerf = chartData[chartData.length - 1] || { fps: 0, used: 0 };

  const formatMB = (megabytes: number = 0) => `${megabytes} MB`;

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden w-[400px]">
      {/* Header */}
      <header className="bg-indigo-600 text-white p-4 shadow-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={24} />
          <h1 className="text-xl font-bold tracking-tight">metamo</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs bg-indigo-500 px-2 py-1 rounded-full">
            v0.1.0
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="hover:bg-indigo-500 p-1 rounded transition-colors"
              title="閉じる"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-white border-b border-slate-200 shrink-0">
        <button
          onClick={() => setActiveTab('perf')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'perf' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          パフォーマンス
        </button>
        <button
          onClick={() => setActiveTab('errors')}
          className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'errors' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          エラー
          {state.errors.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {state.errors.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'perf' ? (
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Cpu size={14} />
                  <span className="text-xs uppercase font-semibold tracking-wider">FPS</span>
                </div>
                <div className={`text-2xl font-bold ${currentPerf.fps < 30 ? 'text-orange-500' : 'text-indigo-600'}`}>
                  {currentPerf.fps}
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <HardDrive size={14} />
                  <span className="text-xs uppercase font-semibold tracking-wider">Memory</span>
                </div>
                <div className="text-2xl font-bold text-indigo-600">
                  {formatMB(currentPerf.used)}
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Memory Usage (MB)</h3>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorUsed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="timestamp" 
                      hide={true}
                    />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} orientation="right" />
                    <Tooltip 
                      labelFormatter={(label) => new Date(label).toLocaleTimeString()}
                    />
                    <Area 
                      isAnimationActive={false} // Disable animation for smoother real-time updates
                      type="monotone" 
                      dataKey="used" 
                      stroke="#4f46e5" 
                      fillOpacity={1} 
                      fill="url(#colorUsed)" 
                      strokeWidth={2} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">FPS History</h3>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="timestamp" 
                      hide={true}
                    />
                    <YAxis domain={[0, 70]} fontSize={10} axisLine={false} tickLine={false} orientation="right" />
                    <Tooltip 
                      labelFormatter={(label) => new Date(label).toLocaleTimeString()}
                    />
                    <Line 
                      isAnimationActive={false}
                      type="monotone" 
                      dataKey="fps" 
                      stroke="#10b981" 
                      strokeWidth={2} 
                      dot={false} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {state.errors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Info size={48} className="mb-4 opacity-20" />
                <p>エラーは検出されていません</p>
              </div>
            ) : (
              state.errors.slice().reverse().map((error, i) => (
                <div key={i} className="bg-white p-3 rounded-lg border-l-4 border-red-500 shadow-sm border border-slate-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-red-500 mt-1 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 break-all">{error.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(error.timestamp).toLocaleTimeString()} · {error.type}
                      </p>
                      {error.source && (
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate italic">
                          {error.source}:{error.lineno}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-3 bg-white border-t border-slate-200 text-center shrink-0">
        <p className="text-[10px] text-slate-400">
          Target: <span className="text-slate-600 font-medium italic">metalife.co.jp</span>
        </p>
      </footer>
    </div>
  );
};

export default App;
