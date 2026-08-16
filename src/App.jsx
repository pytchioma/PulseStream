import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import {
  Search, X, Bookmark, BarChart2, Clock,
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Wind,
  Radio, Activity, Settings, ArrowLeft,
} from 'lucide-react';
import StoryCard from './components/StoryCard';
import StoryInspector from './components/StoryInspector';
import AnalyticsView from './components/AnalyticsView';
import SystemHealth from './components/SystemHealth';
import SettingsView from './components/SettingsView';
import { fetchHNTopIds, fetchHNStory, fetchDevTo, fetchReddit } from './lib/api.js';
import { getBookmarks, getTheme, saveTheme, getFontScale, saveFontScale } from './lib/storage.js';

const QC = { staleTime: 60_000, refetchInterval: 60_000 };

const SOURCE_FILTERS = [
  { key: 'all',        label: 'All Sources' },
  { key: 'hackernews', label: 'Hacker News' },
  { key: 'devto',      label: 'Dev.to'      },
  { key: 'reddit',     label: 'Reddit'      },
];

// ── Theme + font-scale hooks ──────────────────────────────────────────────────

function useTheme() {
  const [theme, setTheme] = useState(() => getTheme());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);
  }, [theme]);

  return [theme, setTheme];
}

function useFontScale() {
  const [scale, setScale] = useState(() => getFontScale());

  useEffect(() => {
    document.documentElement.setAttribute('data-scale', scale);
    saveFontScale(scale);
  }, [scale]);

  return [scale, setScale];
}

// ── Weather helpers ───────────────────────────────────────────────────────────

function getWeatherIcon(code, size = 13) {
  if (code == null || code === 0) return <Sun size={size} className="text-yellow-400" />;
  if (code <= 2)  return <Sun size={size} className="text-yellow-300" />;
  if (code <= 49) return <Cloud size={size} className="text-slate-400" />;
  if (code <= 67) return <CloudDrizzle size={size} className="text-cyan-400" />;
  if (code <= 77) return <CloudSnow size={size} className="text-blue-300" />;
  if (code <= 82) return <CloudRain size={size} className="text-cyan-400" />;
  if (code <= 94) return <CloudLightning size={size} className="text-yellow-400" />;
  return <Wind size={size} className="text-slate-400" />;
}

async function fetchWeather() {
  const { lat, lon } = await new Promise(resolve => {
    if (!navigator.geolocation) return resolve({ lat: 6.5, lon: 3.4 });
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      ()  => resolve({ lat: 6.5, lon: 3.4 }),
      { timeout: 1500 }
    );
  });
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weathercode&temperature_unit=celsius&timezone=auto`
  );
  if (!res.ok) throw new Error(`Weather: ${res.status}`);
  const json = await res.json();
  return { temp: Math.round(json.current.temperature_2m), code: json.current.weathercode };
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
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  if (isError || !data) return null;
  return (
    <div className="hidden md:flex items-center gap-1.5 shrink-0">
      {getWeatherIcon(data.code)}
      <span className="text-[11px] font-mono text-slate-400 tabular-nums">{data.temp}°C</span>
    </div>
  );
}

// ── Live Ticker ───────────────────────────────────────────────────────────────

function LiveTicker({ stories }) {
  const items = useMemo(() => {
    const tags = [], seen = new Set();
    for (const s of stories) {
      for (const t of s.tags ?? []) {
        const key = t.toLowerCase().trim();
        if (key && !seen.has(key)) { seen.add(key); tags.push(t); }
      }
    }
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
  const doubled = [...items, ...items];

  return (
    <div className="flex items-center gap-3 mb-4 overflow-hidden rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-2">
      <div className="flex items-center gap-1.5 shrink-0">
        <Radio size={11} className="accent-text" />
        <span className="text-[10px] font-mono uppercase tracking-widest accent-text">Live</span>
      </div>
      <div className="w-px h-3 bg-slate-700 shrink-0" />
      <div className="flex-1 overflow-hidden">
        <div className="ticker-track">
          {doubled.map((item, i) => (
            <span key={i} className="flex items-center gap-2 text-[11px] font-mono text-slate-400 whitespace-nowrap pr-8">
              <span style={{ color: 'var(--accent-ticker)' }}>▸</span>
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton / Empty ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-5 space-y-3">
      <div className="skeleton h-3 w-20" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-3/4" />
      <div className="flex gap-3">
        <div className="skeleton h-3 w-12" />
        <div className="skeleton h-3 w-16" />
      </div>
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

// ── Nav button helper ─────────────────────────────────────────────────────────

function NavBtn({ active, onClick, icon: Icon, label, activeClass }) {
  const defaultActive = 'accent-bg border-[var(--accent-border)] accent-text';
  const inactive = 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-300';
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider transition-colors
        ${active ? (activeClass || defaultActive) : inactive}`}
    >
      <Icon size={12} />
      <span className="hidden sm:inline">{label.replace('View ', '').replace('Back to ', '')}</span>
    </button>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

function Header({ activeFilter, onFilter, statuses, search, onSearch, view, onView }) {
  const allOk = Object.values(statuses).every(s => s === 'ok');

  return (
    <header className="border-b border-white/[0.06]" style={{ backgroundColor: '#161718' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between py-3 gap-3">

          {/* Logo — clicking always returns to feed */}
          <button
            onClick={() => onView('feed')}
            aria-label="Go to feed"
            className="flex items-center gap-3 shrink-0 group"
          >
            <div className="w-7 h-7 rounded-md accent-bg border accent-border flex items-center justify-center transition-colors">
              <div className="w-2.5 h-2.5 rounded-full accent-dot" />
            </div>
            <div className="text-left">
              <span className="text-white font-bold tracking-widest text-sm uppercase">
                Pulse<span className="accent-text">Stream</span>
              </span>
            </div>
          </button>

          {/* Search — feed view only */}
          {view === 'feed' && (
            <div className="hidden sm:flex flex-1 max-w-xs items-center gap-2 bg-slate-800/60 border border-slate-700/60 focus-within:border-[var(--accent-border)] rounded-lg px-3 py-1.5 transition-colors">
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
                <button onClick={() => onSearch('')} aria-label="Clear search"
                  className="text-slate-600 hover:text-slate-400 transition-colors">
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

            {/* API status dots */}
            <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/50 rounded-full px-2.5 py-1">
              {Object.entries(statuses).map(([src, status]) => (
                <div key={src} title={`${src}: ${status}`}
                  className={`w-1.5 h-1.5 rounded-full ${
                    status === 'ok' ? 'accent-dot' : status === 'loading' ? 'bg-slate-500' : 'bg-red-500'
                  }`}
                />
              ))}
              <span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider ml-1 hidden lg:inline">
                {allOk ? 'All OK' : 'Partial'}
              </span>
            </div>

            <NavBtn active={view === 'analytics'} onClick={() => onView(view === 'analytics' ? 'feed' : 'analytics')}
              icon={BarChart2} label="Analytics" />
            <NavBtn active={view === 'system'} onClick={() => onView(view === 'system' ? 'feed' : 'system')}
              icon={Activity} label="System" />
            <NavBtn active={view === 'saved'} onClick={() => onView(view === 'saved' ? 'feed' : 'saved')}
              icon={Bookmark} label="Saved"
              activeClass="bg-amber-500/15 border-amber-500/40 text-amber-400" />
            <NavBtn active={view === 'settings'} onClick={() => onView(view === 'settings' ? 'feed' : 'settings')}
              icon={Settings} label="Settings" />

            {/* Weather + Clock */}
            <div className="hidden md:flex items-center gap-3 pl-2 border-l border-slate-800">
              <WeatherWidget />
              <LiveClock />
            </div>
          </div>
        </div>

        {/* Source filter pills */}
        {(view === 'feed' || view === 'analytics') && (
          <div className="flex items-center gap-2 pb-3 overflow-x-auto">
            {/* Mobile search — feed only */}
            {view === 'feed' && (
              <div className="sm:hidden flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 focus-within:border-[var(--accent-border)] rounded-lg px-3 py-1.5 flex-1 transition-colors">
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
            )}
            {SOURCE_FILTERS.map(f => {
              const active = activeFilter === f.key;
              return (
                <button key={f.key} onClick={() => onFilter(f.key)}
                  aria-pressed={active}
                  className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider transition-all duration-150 cursor-pointer
                    ${active
                      ? 'accent-bg border border-[var(--accent-border)] accent-text'
                      : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                    }`}
                >
                  {f.label}
                </button>
              );
            })}
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

// ── Section label + back-to-feed breadcrumb ───────────────────────────────────

const VIEW_LABELS = {
  feed:      'Live Feed',
  saved:     'Saved Stories',
  analytics: 'Analytics & Trends',
  system:    'System Health',
  settings:  'Settings',
};

function SectionHeader({ view, onView, feedCount, analyticsCount, isLoading, search }) {
  const isSecondary = view !== 'feed';

  return (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
      <div className="flex items-center gap-3">
        {/* Back to feed — visible on all secondary views */}
        {isSecondary && (
          <button
            onClick={() => onView('feed')}
            aria-label="Back to feed"
            className="flex items-center gap-1.5 text-slate-500 hover:accent-text transition-colors group"
          >
            <ArrowLeft size={13} className="group-hover:accent-text transition-colors" />
            <span className="text-[10px] font-mono uppercase tracking-widest hidden sm:inline">Feed</span>
          </button>
        )}
        {isSecondary && <div className="w-px h-3 bg-slate-800" />}

        <div className="w-0.5 h-4 rounded-full accent-bar" />
        <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
          {VIEW_LABELS[view] ?? view}
        </span>
      </div>

      {/* Story count */}
      {view === 'feed' && !isLoading && (
        <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
          {feedCount} stories{search ? ' found' : ''}
        </span>
      )}
      {view === 'analytics' && !isLoading && (
        <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
          {analyticsCount} stories
        </span>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [theme, setTheme]           = useTheme();
  const [fontScale, setFontScale]   = useFontScale();
  const [activeFilter, setFilter]   = useState('all');
  const [search, setSearch]         = useState('');
  const [activeStory, setStory]     = useState(null);
  const [view, setView]             = useState('feed');
  const [bookmarkTick, setBookTick] = useState(0);

  function onBookmarkChange() { setBookTick(t => t + 1); }

  // ── Hacker News ──
  const { data: hnIds, isLoading: hnIdsLoading, error: hnError } = useQuery({
    queryKey: ['hackerNews'], queryFn: fetchHNTopIds, ...QC,
  });
  const hnQueries = useQueries({
    queries: (hnIds ?? []).slice(0, 8).map(id => ({
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
  // Only block the feed render if ALL sources are still loading.
  // If at least one source has data, show it immediately.
  const allLoading = hnLoading && devtoLoading && redditLoading;

  const statuses = {
    hn:     hnError     ? 'error' : hnLoading     ? 'loading' : 'ok',
    devto:  devtoError  ? 'error' : devtoLoading  ? 'loading' : 'ok',
    reddit: redditError ? 'error' : redditLoading ? 'loading' : 'ok',
  };

  // ── Merged + sorted ──
  const allStories = useMemo(
    () => [...hnStories, ...devtoStories, ...redditStories].sort((a, b) => b.score - a.score),
    [hnStories, devtoStories, redditStories]
  );

  // ── Feed (source filter + search) ──
  const feed = useMemo(() => {
    let list = activeFilter === 'all' ? allStories : allStories.filter(s => s.source === activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.title?.toLowerCase().includes(q)  ||
        s.author?.toLowerCase().includes(q) ||
        s.source?.toLowerCase().includes(q) ||
        s.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allStories, activeFilter, search]);

  // ── Analytics (source filter only, not search) ──
  const analyticsStories = useMemo(
    () => activeFilter === 'all' ? allStories : allStories.filter(s => s.source === activeFilter),
    [allStories, activeFilter]
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#111213' }}>
      <Header
        activeFilter={activeFilter}
        onFilter={setFilter}
        statuses={statuses}
        search={search}
        onSearch={setSearch}
        view={view}
        onView={setView}
      />

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8">

        <SectionHeader
          view={view}
          onView={setView}
          feedCount={feed.length}
          analyticsCount={analyticsStories.length}
          isLoading={isLoading}
          search={search}
        />

        {/* Content */}
        {view === 'analytics' ? (
          <AnalyticsView stories={analyticsStories} />
        ) : view === 'system' ? (
          <SystemHealth />
        ) : view === 'settings' ? (
          <SettingsView
            theme={theme}
            onTheme={setTheme}
            fontScale={fontScale}
            onFontScale={setFontScale}
          />
        ) : view === 'saved' ? (
          <SavedView key={bookmarkTick} onSelect={setStory} onBookmarkChange={onBookmarkChange} />
        ) : allLoading ? (
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
            <LiveTicker stories={allStories} />
            <div className="space-y-3">
              {feed.map((story, i) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  index={i}
                  onSelect={setStory}
                  onBookmarkChange={onBookmarkChange}
                />
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-10 pt-4 border-t border-slate-800/50 flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-700 uppercase tracking-widest">PulseStream v0.6.0</span>
          <span className="text-[10px] font-mono text-slate-700 uppercase tracking-widest">Refreshes every 60s</span>
        </div>
      </main>

      <StoryInspector
        story={activeStory}
        onClose={() => setStory(null)}
        onBookmarkChange={onBookmarkChange}
      />
    </div>
  );
}
