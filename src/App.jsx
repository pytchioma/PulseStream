import { useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import StoryCard from './components/StoryCard';
import { fetchHNTopIds, fetchHNStory, fetchDevTo, fetchReddit } from './lib/api.js';

const QC = { staleTime: 60_000, refetchInterval: 60_000 };

const FILTERS = [
  { key: 'all',        label: 'All Sources' },
  { key: 'hackernews', label: 'Hacker News' },
  { key: 'devto',      label: 'Dev.to'      },
  { key: 'reddit',     label: 'Reddit'      },
];

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

function Header({ active, onFilter, statuses }) {
  const allOk = Object.values(statuses).every(s => s === 'ok');
  return (
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between py-3 gap-4">

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

          {/* Search placeholder */}
          <div className="hidden sm:flex flex-1 max-w-xs items-center gap-2 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-1.5">
            <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <span className="text-slate-500 text-xs font-mono">Search feed...</span>
          </div>

          {/* Status */}
          <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-1 shrink-0">
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
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 pb-3 overflow-x-auto">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => onFilter(f.key)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider transition-all duration-150 cursor-pointer
                ${active === f.key
                  ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const [activeFilter, setActiveFilter] = useState('all');

  // Hacker News — two-step fetch
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

  // Dev.to — single fetch
  const { data: devtoStories = [], isLoading: devtoLoading, error: devtoError } = useQuery({
    queryKey: ['devto'], queryFn: fetchDevTo, ...QC,
  });

  // Reddit — single fetch
  const { data: redditStories = [], isLoading: redditLoading, error: redditError } = useQuery({
    queryKey: ['reddit'], queryFn: fetchReddit, ...QC,
  });

  const isLoading = hnLoading || devtoLoading || redditLoading;

  const statuses = {
    hn:     hnError     ? 'error' : hnLoading     ? 'loading' : 'ok',
    devto:  devtoError  ? 'error' : devtoLoading  ? 'loading' : 'ok',
    reddit: redditError ? 'error' : redditLoading ? 'loading' : 'ok',
  };

  // Merge all stories, sort by score descending
  const allStories = [...hnStories, ...devtoStories, ...redditStories]
    .sort((a, b) => b.score - a.score);

  // Apply source filter
  const feed = activeFilter === 'all'
    ? allStories
    : allStories.filter(s => s.source === activeFilter);

  return (
    <div className="min-h-screen bg-slate-950">
      <Header active={activeFilter} onFilter={setActiveFilter} statuses={statuses} />

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* Feed label */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-0.5 h-4 bg-emerald-400 rounded-full" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">Live Feed</span>
          </div>
          {!isLoading && (
            <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
              {feed.length} stories
            </span>
          )}
        </div>

        {/* Stories */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : feed.length === 0 ? (
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 px-5 py-8 text-center">
            <p className="text-slate-500 text-sm font-mono">No stories available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feed.map((story, i) => <StoryCard key={story.id} story={story} index={i} />)}
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 pt-4 border-t border-slate-800/50 flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-700 uppercase tracking-widest">PulseStream v0.2.0</span>
          <span className="text-[10px] font-mono text-slate-700 uppercase tracking-widest">Refreshes every 60s</span>
        </div>
      </main>
    </div>
  );
}
