import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Activity, Server, RefreshCw, Database,
  Trash2, HardDrive, CheckCircle, AlertCircle,
  LoaderCircle,
} from 'lucide-react';

// ── LocalStorage keys owned by PulseStream ────────────────────────────────────
// Only these keys are removed on "Clear Local Storage".
// We never call localStorage.clear() which would wipe unrelated browser data.
const PS_STORAGE_KEYS = ['pulseStreamBookmarks'];

// ── Health check definitions ──────────────────────────────────────────────────
// Each entry describes one API to probe.
// `probe` is a lightweight fetch — smallest valid request for that API.
// Reddit goes through the same allorigins proxy used by the feed so the
// result honestly reflects what the browser can actually reach.

const APIS = [
  {
    key: 'hackernews',
    label: 'Hacker News',
    probe: () => fetch('https://hacker-news.firebaseio.com/v0/topstories.json'),
  },
  {
    key: 'devto',
    label: 'Dev.to',
    probe: () => fetch('https://dev.to/api/articles?per_page=1'),
  },
  {
    key: 'reddit',
    label: 'Reddit',
    // Uses the same CORS proxy as the feed — accurately reflects browser access
    probe: () => fetch(
      `https://api.allorigins.win/raw?url=${encodeURIComponent('https://www.reddit.com/r/programming/hot.json?limit=1')}`
    ),
  },
  {
    key: 'openmeteo',
    label: 'Open-Meteo',
    probe: () => fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=6.5&longitude=3.4&current=temperature_2m'
    ),
  },
];

// ── Single health check ───────────────────────────────────────────────────────

async function runHealthCheck(api) {
  const start = performance.now();
  try {
    const res = await api.probe();
    const latency = Math.round(performance.now() - start);
    if (!res.ok) return { status: 'error', latency: null, httpStatus: res.status };
    return { status: 'online', latency };
  } catch {
    return { status: 'error', latency: null };
  }
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  if (status === 'checking') return (
    <span className="flex items-center gap-1.5 text-slate-500">
      <LoaderCircle size={12} className="animate-spin" />
      <span className="text-[10px] font-mono uppercase tracking-widest">Checking</span>
    </span>
  );
  if (status === 'online') return (
    <span className="flex items-center gap-1.5 text-emerald-400">
      <CheckCircle size={12} />
      <span className="text-[10px] font-mono uppercase tracking-widest">Online</span>
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 text-red-400">
      <AlertCircle size={12} />
      <span className="text-[10px] font-mono uppercase tracking-widest">Error</span>
    </span>
  );
}

// ── API health row ─────────────────────────────────────────────────────────────

function ApiRow({ label, result }) {
  const isChecking = !result;
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-800/50 last:border-0">
      <div className="flex items-center gap-3">
        <Server size={13} className="text-slate-600 shrink-0" />
        <span className="text-sm font-mono text-slate-300">{label}</span>
      </div>
      <div className="flex items-center gap-4">
        {/* Latency */}
        <span className="text-[11px] font-mono text-slate-600 tabular-nums w-16 text-right">
          {isChecking
            ? '—'
            : result.status === 'online'
              ? `${result.latency} ms`
              : result.httpStatus ? `HTTP ${result.httpStatus}` : '—'
          }
        </span>
        {/* Status */}
        <div className="w-24 flex justify-end">
          <StatusBadge status={isChecking ? 'checking' : result.status} />
        </div>
      </div>
    </div>
  );
}

// ── Cache row ─────────────────────────────────────────────────────────────────

function CacheRow({ label, icon: Icon, status, action, actionLabel, actionVariant = 'default' }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-800/50 last:border-0">
      <div className="flex items-center gap-3">
        <Icon size={13} className="text-slate-600 shrink-0" />
        <div>
          <span className="text-sm font-mono text-slate-300">{label}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600">{status}</span>
          </div>
        </div>
      </div>
      <button
        onClick={action}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-mono uppercase tracking-wider transition-colors
          ${actionVariant === 'danger'
            ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
          }`}
      >
        {actionVariant === 'danger' ? <Trash2 size={11} /> : <RefreshCw size={11} />}
        {actionLabel}
      </button>
    </div>
  );
}

// ── Confirmation dialog ───────────────────────────────────────────────────────

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onCancel} />
      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
            <AlertCircle size={14} className="text-red-400" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-red-500 mb-1">Confirm Action</p>
            <p className="text-sm text-slate-300 leading-snug">{message}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono uppercase tracking-wider transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-mono uppercase tracking-wider transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast notification ────────────────────────────────────────────────────────

function Toast({ message }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                    flex items-center gap-2 px-4 py-2.5 rounded-lg
                    border border-emerald-500/40 bg-slate-900 shadow-xl">
      <CheckCircle size={13} className="text-emerald-400" />
      <span className="text-xs font-mono text-slate-300">{message}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SystemHealth() {
  const queryClient = useQueryClient();

  // results: { [apiKey]: { status: 'online'|'error', latency: number|null } | null }
  // null means "not yet checked / currently checking"
  const [results, setResults]     = useState({});
  const [running, setRunning]     = useState(false);
  const [confirm, setConfirm]     = useState(null);  // null | { message, onConfirm }
  const [toast, setToast]         = useState(null);  // null | string

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }

  // Run all health checks in parallel
  const runAllChecks = useCallback(async () => {
    setRunning(true);
    // Mark all as "checking" by clearing results
    setResults({});

    const entries = await Promise.all(
      APIS.map(async api => {
        const result = await runHealthCheck(api);
        // Update each result as it arrives so the UI shows progress
        setResults(prev => ({ ...prev, [api.key]: result }));
        return [api.key, result];
      })
    );

    setResults(Object.fromEntries(entries));
    setRunning(false);
  }, []);

  // ── Cache actions ──────────────────────────────────────────────────────────

  function handleClearQueryCache() {
    queryClient.clear();
    showToast('Query cache cleared');
  }

  function handleClearLocalStorage() {
    setConfirm({
      message: 'This will remove your PulseStream bookmarks and saved data. This cannot be undone.',
      onConfirm: () => {
        PS_STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
        setConfirm(null);
        showToast('Local storage cleared');
      },
    });
  }

  // ── Local storage size estimate ────────────────────────────────────────────
  const lsStatus = (() => {
    try {
      const val = localStorage.getItem('pulseStreamBookmarks');
      const count = val ? Object.keys(JSON.parse(val)).length : 0;
      return count > 0 ? `${count} bookmark${count !== 1 ? 's' : ''}` : 'Empty';
    } catch { return 'Active'; }
  })();

  // ── Query cache entry count ────────────────────────────────────────────────
  const queryCacheStatus = (() => {
    const count = queryClient.getQueryCache().getAll().length;
    return `${count} entr${count !== 1 ? 'ies' : 'y'}`;
  })();

  return (
    <>
      <div className="space-y-4">

        {/* API Health Monitor */}
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Activity size={12} className="text-emerald-400" />
              </div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
                API Health Monitor
              </span>
            </div>
            <button
              onClick={runAllChecks}
              disabled={running}
              aria-label="Refresh health checks"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800
                         text-slate-400 hover:border-emerald-500/40 hover:text-emerald-400
                         text-[11px] font-mono uppercase tracking-wider transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={11} className={running ? 'animate-spin' : ''} />
              {running ? 'Checking...' : 'Refresh'}
            </button>
          </div>

          {/* Column headers */}
          <div className="flex items-center justify-between pb-2 mb-1 border-b border-slate-800/80">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-700">Service</span>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-700 w-16 text-right">Latency</span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-700 w-24 text-right">Status</span>
            </div>
          </div>

          {/* If no checks have run yet, show idle state */}
          {Object.keys(results).length === 0 && !running ? (
            <div className="py-6 text-center">
              <p className="text-slate-600 text-xs font-mono">
                Click Refresh to run health checks
              </p>
            </div>
          ) : (
            <div>
              {APIS.map(api => (
                <ApiRow
                  key={api.key}
                  label={api.label}
                  result={results[api.key] ?? null}
                />
              ))}
            </div>
          )}
        </div>

        {/* Cache Management */}
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Database size={12} className="text-emerald-400" />
            </div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
              Cache Management
            </span>
          </div>

          <CacheRow
            label="Query Cache"
            icon={HardDrive}
            status={queryCacheStatus}
            action={handleClearQueryCache}
            actionLabel="Clear Cache"
          />
          <CacheRow
            label="Local Storage"
            icon={HardDrive}
            status={lsStatus}
            action={handleClearLocalStorage}
            actionLabel="Clear Data"
            actionVariant="danger"
          />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-1">
          <div className="flex items-center gap-1.5">
            <CheckCircle size={11} className="text-emerald-400" />
            <span className="text-[10px] font-mono text-slate-700">Online — response received</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertCircle size={11} className="text-red-400" />
            <span className="text-[10px] font-mono text-slate-700">Error — request failed</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-slate-700">Latency = client-side request duration</span>
          </div>
        </div>
      </div>

      {/* Confirmation dialog */}
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} />}
    </>
  );
}
