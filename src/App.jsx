import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { Search, X, Bookmark, BarChart2, Clock, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Wind, Radio, Activity } from 'lucide-react';
import StoryCard from './components/StoryCard';
import StoryInspector from './components/StoryInspector';
import AnalyticsView from './components/AnalyticsView';
import SystemHealth from './components/SystemHealth';
import { fetchHNTopIds, fetchHNStory, fetchDevTo, fetchReddit } from './lib/api.js';
import { getBookmarks } from './lib/storage.js';

const QC = { staleTime: 60_000, refetchInterval: 60_000 };

const SOURCE_FILTERS = [
  { key: 'all',        label: 'All Sources' },
  { key: 'hackernews', label: 'Hacker News' },
  { key: 'devto',      label: 'Dev.to'      },
  { key: 'reddit',     label: 'Reddit'      },
];

// ── Weather helpers ───────────────────────────────────────────────────────────
// Maps Open-Meteo WMO weather interpretation codes to a label + Lucide icon.
// https://open-meteo.com/en/docs#weathervariables

function getWeatherIcon(code, size = 13) {
  if (code == null) return <Sun size={size} className="text-yellow-400" />;
  if (code === 0)                        return <Sun size={size} className="text-yellow-400" />;
  if (code <= 2)                         return <Sun size={size} className="text-yellow-300" />;
  if (code === 3)                        return <Cloud size={size} className="text-slate-400" />;
  if (code <= 49)                        return <Cloud size={size} className="text-slate-400" />;
  if (code <= 67)                        return <CloudDrizzle size={size} className="text-cyan-400" />;
  if (code <= 77)                        return <CloudSnow size={size} className="text-blue-300" />;
  if (code <= 82)                        return <CloudRain size={size} className="text-cyan-400" />;
  if (code <= 94)                        return <CloudLightning size={size} className="text-yellow-400" />;
  return <Wind size={size} className="text-slate-400" />;
}

async function fetchWeather() {
  // Try to get user location; fall back to Lagos (6.5°N, 3.4°E)
  const { lat, lon } = await new Promise(resolve => {
    if (!navigator.geolocation) return resolve({ lat: 6.5, lon: 3.4 });
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      ()  => resolve({ lat: 6.5, lon: 3.4 }),
      { timeout: 4000 }
    );
  });

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weathercode` +
    `&temperature_unit=celsius` +
    `&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather: ${res.status}`);
  const json = await res.json();
  return {
    temp: Math.round(json.current.temperature_2m),
    code: json.current.weathercode,
  };
}

// ── Clock ─────────────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = String(time.getHours()).padStart(2, '0');
  const mm = String(time.getMinutes()).padStart(2, '0');
  const ss = String(time.getSeconds()).padStart(2, '0');

  return (
    <div className="hidden md:flex items-center gap-1.5 shrink-0">
      <Clock size={11} className="text-slate-600" />
      <span className="text-[11px] font-mono text-slate-500 tabular-nums tracking-wider">
        {hh}:{mm}:{ss}
      </span>
    </div>
  );
}

// ── Weather widget ────────────────────────────────────────────────────────────

function WeatherWidget() {
  const { data, isError } = useQuery({
    queryKey: ['weather'],
    queryFn: fetchWeather,
    staleTime:       5 * 60_000,   // treat as fresh for 5 minutes
    refetchInterval: 5 * 60_000,   // background refresh every 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  if (isError || !data) return null;

  return (
    <div className="hidden md:flex items-center gap-1.5 shrink-0">
      {getWeatherIcon(data.code)}
      <span className="text-[11px] font-mono text-slate-400 tabular-nums">
        {data.temp}°C
      </span>
    </div>
  );
}

// ── Live Ticker ───────────────────────────────────────────────────────────────

function LiveTicker({ stories }) {
  // Build ticker items from tags first, then fall back to story titles.
  // Deduplicate, cap at 20 items, then double the array so the marquee
  // loops seamlessly (we animate exactly 50% → back to start).
  const items = useMemo(() => {
    const tags = [];
    const seen = new Set();

    // 1. Collect unique tags
    for (const s of stories) {
      for (const t of s.tags ?? []) {
        const key = t.toLowerCase().trim();
        if (key && !seen.has(key)) { seen.add(key); tags.push(t); }
      }
    }

    // 2. If we don't have enough tags, fill with story titles (truncated)
    if (tags.length < 6) {
      for (const s of stories) {
        if (tags.length >= 20) break;
        const title = s.title?.slice(0, 50);
        if (title && !seen.has(title)) { seen.add(title); tags.push(title); }
      }
    }

    return tags.slice(0, 20);
  }, [stories]);

  if (items.length === 0) return null;

  // Double the list so the CSS animation can loop without a gap
  const doubled = [...items, ...items];

  return (
    <div className="flex items-center gap-3 mb-4 overflow-hidden rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-2">
      {/* Static label */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Radio size={11} className="text-emerald-400" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Live</span>
      </div>
      {/* Divider */}
      <div className="w-px h-3 bg-slate-700 shrink-0" />
      {/* Scrolling track */}
      <div className="flex-1 overflow-hidden">
        <div className="ticker-track">
          {doubled.map((item, i) => (
            <span key={i} className="flex items-center gap-2 text-[11px] font-mono text-slate-400 whitespace-nowrap pr-8">
              <span className="text-emerald-500/50">▸</span>
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-5 space-y-3">
      <div className="skeleton h-3 w-20" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-3/4" />
      <div className="flex gap-3"><div className="skeleton h-3 w-12" /><div className="skeleton h-3 w-16" /></div>
    </div>
  );
}

function EmptyState({ message, sub }) {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 px-5 py-12 text-center">
      <p className="text-slate-400 text-sm font-medium mb-1">{message}</p>
      {sub && <p className="text-slate-600 text-xs font-mono">{sub}</p>}
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

function Header({ activeFilter, onFilter, statuses, search, onSearch, view, onView }) {
  const allOk = Object.values(statuses).every(s => s === 'ok');

  return (
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between py-3 gap-3">

          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
            <div>
              <span className="text-white font-bold tracking-widest text-sm uppercase">
                Pulse<span className="text-emerald-400">Stream</span>
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="live-dot w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                <span className="text-emerald-400 text-[10px] font-mono uppercase tracking-widest">Live</span>
              </div>
            </div>
          </div>

          {/* Search — feed view only */}
          {view === 'feed' && (
            <div className="hidden sm:flex flex-1 max-w-xs items-center gap-2 bg-slate-800/60 border border-slate-700/60 focus-within:border-emerald-500/40 rounded-lg px-3 py-1.5 transition-colors">
              <Search size={14} className="text-slate-500 shrink-0" />
              <input
                type="search"
                value={search}
                onChange={e => onSearch(e.target.value)}
                placeholder="Search feed..."
                aria-label="Search stories"
                className="flex-1 bg-transparent text-xs font-mono text-slate-300 placeholder-slate-500 outline-none"
              />
              {search && (
                <button onClick={() => onSearch('')} aria-label="Clear search" className="text-slate-600 hover:text-slate-400 transition-colors">
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">

            {/* API status dots */}
            <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-1">
              {Object.entries(statuses).map(([src, status]) => (
                <div key={src} title={`${src}: ${status}`}
                  className={`w-1.5 h-1.5 rounded-full ${
                    status === 'ok' ? 'bg-emerald-400' : status === 'loading' ? 'bg-slate-500' : 'bg-red-500'
                  }`}
                />
              ))}
              <span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider ml-1 hidden md:inline">
                {allOk ? 'All OK' : 'Partial'}
              </span>
            </div>

            {/* Analytics toggle */}
            <button
              onClick={() => onView(view === 'analytics' ? 'feed' : 'analytics')}
              aria-label={view === 'analytics' ? 'Back to feed' : 'View analytics'}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider transition-colors
                ${view === 'analytics'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                }`}
            >
              <BarChart2 size={12} />
              <span className="hidden sm:inline">Analytics</span>
            </button>

            {/* System health toggle */}
            <button
              onClick={() => onView(view === 'system' ? 'feed' : 'system')}
              aria-label={view === 'system' ? 'Back to feed' : 'View system health'}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider transition-colors
                ${view === 'system'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                }`}
            >
              <Activity size={12} />
              <span className="hidden sm:inline">System</span>
            </button>

            {/* Saved toggle */}
            <button
              onClick={() => onView(view === 'saved' ? 'feed' : 'saved')}
              aria-label={view === 'saved' ? 'Back to feed' : 'View saved stories'}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider transition-colors
                ${view === 'saved'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                  : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                }`}
            >
              <Bookmark size={12} fill={view === 'saved' ? 'currentColor' : 'none'} />
              <span className="hidden sm:inline">Saved</span>
            </button>

            {/* Weather + Clock — far right */}
            <div className="hidden md:flex items-center gap-3 pl-1 border-l border-slate-800">
              <WeatherWidget />
              <LiveClock />
            </div>
          </div>
        </div>

        {/* Source filter pills — feed view */}
        {view === 'feed' && (
          <div className="flex items-center gap-2 pb-3 overflow-x-auto">
            <div className="sm:hidden flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 focus-within:border-emerald-500/40 rounded-lg px-3 py-1.5 flex-1 transition-colors">
              <Search size={14} className="text-slate-500 shrink-0" />
              <input
                type="search"
                value={search}
                onChange={e => onSearch(e.target.value)}
                placeholder="Search..."
                aria-label="Search stories"
                className="flex-1 bg-transparent text-xs font-mono text-slate-300 placeholder-slate-500 outline-none"
              />
            </div>
            {SOURCE_FILTERS.map(f => (
              <button key={f.key} onClick={() => onFilter(f.key)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider transition-all duration-150 cursor-pointer
                  ${activeFilter === f.key
                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Source filter pills — analytics view */}
        {view === 'analytics' && (
          <div className="flex items-center gap-2 pb-3 overflow-x-auto">
            {SOURCE_FILTERS.map(f => (
              <button key={f.key} onClick={() => onFilter(f.key)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider transition-all duration-150 cursor-pointer
                  ${activeFilter === f.key
                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

// ── Saved View ────────────────────────────────────────────────────────────────

function SavedView({ onSelect, onBookmarkChange }) {
  const bookmarks = Object.values(getBookmarks());
  if (bookmarks.length === 0) {
    return <EmptyState message="No saved stories yet" sub="Bookmark stories to find them here" />;
  }
  return (
    <div className="space-y-3">
      {bookmarks.map((story, i) => (
        <StoryCard key={story.id} story={story} index={i} onSelect={onSelect} onBookmarkChange={onBookmarkChange} />
      ))}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch]             = useState('');
  const [activeStory, setActiveStory]   = useState(null);
  const [view, setView]                 = useState('feed');  // 'feed' | 'saved' | 'analytics' | 'system'
  const [bookmarkTick, setBookmarkTick] = useState(0);

  function onBookmarkChange() { setBookmarkTick(t => t + 1); }

  // ── Hacker News ──
  const { data: hnIds, isLoading: hnIdsLoading, error: hnError } = useQuery({
    queryKey: ['hackerNews'], queryFn: fetchHNTopIds, ...QC,
  });
  const hnQueries = useQueries({
    queries: (hnIds ?? []).slice(0, 10).map(id => ({
      queryKey: ['story', id], queryFn: () => fetchHNStory(id), ...QC,
    })),
  });
  const hnLoading = hnIdsLoading || hnQueries.some(q => q.isLoading);
  const hnStories = hnQueries.map(q => q.data).filter(Boolean);

  // ── Dev.to ──
  const { data: devtoStories = [], isLoading: devtoLoading, error: devtoError } = useQuery({
    queryKey: ['devto'], queryFn: fetchDevTo, ...QC,
  });

  // ── Reddit ──
  const { data: redditStories = [], isLoading: redditLoading, error: redditError } = useQuery({
    queryKey: ['reddit'], queryFn: fetchReddit, ...QC,
  });

  const isLoading = hnLoading || devtoLoading || redditLoading;

  const statuses = {
    hn:     hnError     ? 'error' : hnLoading     ? 'loading' : 'ok',
    devto:  devtoError  ? 'error' : devtoLoading  ? 'loading' : 'ok',
    reddit: redditError ? 'error' : redditLoading ? 'loading' : 'ok',
  };

  // ── Merge + sort ──
  const allStories = useMemo(
    () => [...hnStories, ...devtoStories, ...redditStories].sort((a, b) => b.score - a.score),
    [hnStories, devtoStories, redditStories]
  );

  // ── Filter + search (feed) ──
  const feed = useMemo(() => {
    let stories = activeFilter === 'all' ? allStories : allStories.filter(s => s.source === activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      stories = stories.filter(s =>
        s.title?.toLowerCase().includes(q)  ||
        s.author?.toLowerCase().includes(q) ||
        s.source?.toLowerCase().includes(q) ||
        s.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    return stories;
  }, [allStories, activeFilter, search]);

  // ── Analytics stories (source-filtered, not search-filtered) ──
  const analyticsStories = useMemo(
    () => activeFilter === 'all' ? allStories : allStories.filter(s => s.source === activeFilter),
    [allStories, activeFilter]
  );

  return (
    <div className="min-h-screen bg-slate-950">
      <Header
        activeFilter={activeFilter}
        onFilter={setActiveFilter}
        statuses={statuses}
        search={search}
        onSearch={setSearch}
        view={view}
        onView={setView}
      />

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* Section label */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-0.5 h-4 rounded-full ${view === 'saved' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
              {view === 'saved'     ? 'Saved Stories'      :
               view === 'analytics' ? 'Analytics & Trends' :
               view === 'system'    ? 'System Health'      :
               'Live Feed'}
            </span>
          </div>
          {view === 'feed' && !isLoading && (
            <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
              {feed.length} stories{search ? ' found' : ''}
            </span>
          )}
          {view === 'analytics' && !isLoading && (
            <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
              {analyticsStories.length} stories{activeFilter !== 'all' ? ` · ${activeFilter}` : ''}
            </span>
          )}
        </div>

        {/* Content */}
        {view === 'analytics' ? (
          <AnalyticsView stories={analyticsStories} />
        ) : view === 'system' ? (
          <SystemHealth />
        ) : view === 'saved' ? (
          <SavedView key={bookmarkTick} onSelect={setActiveStory} onBookmarkChange={onBookmarkChange} />
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : feed.length === 0 ? (
          <EmptyState
            message={search ? 'No stories found' : 'No stories available'}
            sub={search ? `No results for "${search}"` : null}
          />
        ) : (
          <>
            {/* Live ticker — above story cards, only in feed view with data */}
            <LiveTicker stories={allStories} />

            <div className="space-y-3">
              {feed.map((story, i) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  index={i}
                  onSelect={setActiveStory}
                  onBookmarkChange={onBookmarkChange}
                />
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-10 pt-4 border-t border-slate-800/50 flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-700 uppercase tracking-widest">PulseStream v0.5.1</span>
          <span className="text-[10px] font-mono text-slate-700 uppercase tracking-widest">Refreshes every 60s</span>
        </div>
      </main>

      <StoryInspector
        story={activeStory}
        onClose={() => setActiveStory(null)}
        onBookmarkChange={onBookmarkChange}
      />
    </div>
  );
}
