import { useState, useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import StoryCard from './components/StoryCard';
import StoryInspector from './components/StoryInspector';
import { fetchHNTopIds, fetchHNStory, fetchDevTo, fetchReddit } from './lib/api.js';
import { getBookmarks, removeBookmark } from './lib/storage.js';

const QC = { staleTime: 60_000, refetchInterval: 60_000 };

const SOURCE_FILTERS = [
  { key: 'all',        label: 'All Sources' },
  { key: 'hackernews', label: 'Hacker News' },
  { key: 'devto',      label: 'Dev.to'      },
  { key: 'reddit',     label: 'Reddit'      },
];

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

          {/* Search — now functional */}
          <div className="hidden sm:flex flex-1 max-w-xs items-center gap-2 bg-slate-800/60 border border-slate-700/60 focus-within:border-emerald-500/40 rounded-lg px-3 py-1.5 transition-colors">
            <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
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
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Right side — status + saved toggle */}
          <div className="flex items-center gap-2 shrink-0">
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

            {/* Saved / Feed toggle */}
            <button
              onClick={() => onView(view === 'saved' ? 'feed' : 'saved')}
              aria-label={view === 'saved' ? 'Back to feed' : 'View saved stories'}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider transition-colors
                ${view === 'saved'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                  : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                }`}
            >
              <svg className="w-3 h-3" fill={view === 'saved' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z" />
              </svg>
              Saved
            </button>
          </div>
        </div>

        {/* Source filter pills — hidden in saved view */}
        {view === 'feed' && (
          <div className="flex items-center gap-2 pb-3 overflow-x-auto">
            {/* Mobile search */}
            <div className="sm:hidden flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 focus-within:border-emerald-500/40 rounded-lg px-3 py-1.5 flex-1 transition-colors">
              <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
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
      </div>
    </header>
  );
}

// ── Saved View ────────────────────────────────────────────────────────────────

function SavedView({ onSelect, onBookmarkChange }) {
  // bookmarks is re-derived on every render so removals show immediately
  const bookmarks = Object.values(getBookmarks());

  if (bookmarks.length === 0) {
    return (
      <EmptyState
        message="No saved stories yet"
        sub="Bookmark stories to find them here"
      />
    );
  }

  return (
    <div className="space-y-3">
      {bookmarks.map((story, i) => (
        <div key={story.id} className="relative group/saved">
          <StoryCard
            story={story}
            index={i}
            onSelect={onSelect}
            onBookmarkChange={onBookmarkChange}
          />
        </div>
      ))}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeFilter, setActiveFilter]   = useState('all');
  const [search, setSearch]               = useState('');
  const [activeStory, setActiveStory]     = useState(null);
  const [view, setView]                   = useState('feed');   // 'feed' | 'saved'
  const [bookmarkTick, setBookmarkTick]   = useState(0);        // increment to force saved re-render

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

  // ── Filter + search ──
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

        {/* Feed label */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-0.5 h-4 rounded-full ${view === 'saved' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
              {view === 'saved' ? 'Saved Stories' : 'Live Feed'}
            </span>
          </div>
          {view === 'feed' && !isLoading && (
            <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
              {feed.length} stories{search ? ' found' : ''}
            </span>
          )}
        </div>

        {/* Content */}
        {view === 'saved' ? (
          // bookmarkTick in key forces SavedView to re-mount and re-read localStorage on changes
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
        )}

        {/* Footer */}
        <div className="mt-10 pt-4 border-t border-slate-800/50 flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-700 uppercase tracking-widest">PulseStream v0.3.0</span>
          <span className="text-[10px] font-mono text-slate-700 uppercase tracking-widest">Refreshes every 60s</span>
        </div>
      </main>

      {/* Article Inspector drawer */}
      <StoryInspector
        story={activeStory}
        onClose={() => setActiveStory(null)}
        onBookmarkChange={onBookmarkChange}
      />
    </div>
  );
}
