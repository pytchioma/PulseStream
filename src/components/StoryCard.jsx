import { useState } from 'react';
import { Bookmark, ArrowUpRight, MessageSquare } from 'lucide-react';
import { toggleBookmark, isBookmarked } from '../lib/storage.js';

const SOURCE = {
  hackernews: { label: 'Hacker News', dot: 'bg-orange-400', badge: 'bg-orange-500/10 border-orange-500/25 text-orange-400/90' },
  devto:      { label: 'Dev.to',      dot: 'bg-violet-400', badge: 'bg-violet-500/10 border-violet-500/25 text-violet-400/90' },
  reddit:     { label: 'Reddit',      dot: 'bg-rose-400',   badge: 'bg-rose-500/10 border-rose-500/25 text-rose-400/90' },
};

function timeAgo(unix) {
  if (!unix) return null;
  const d = Math.floor(Date.now() / 1000) - unix;
  if (d < 60)    return `${d}s ago`;
  if (d < 3600)  return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return null; }
}

export default function StoryCard({ story, index, onSelect, onBookmarkChange }) {
  const [bookmarked, setBookmarked] = useState(() => isBookmarked(story.id));

  const src        = SOURCE[story.source] ?? { label: story.source, dot: 'bg-slate-400', badge: 'bg-slate-500/10 border-slate-500/25 text-slate-400/90' };
  const time       = timeAgo(story.createdAt);
  const domain     = story.url ? getDomain(story.url) : null;
  const showDomain = domain && !['news.ycombinator.com', 'reddit.com', 'dev.to'].some(d => domain.includes(d));

  function handleBookmark(e) {
    e.stopPropagation();
    const nowBookmarked = toggleBookmark(story);
    setBookmarked(nowBookmarked);
    onBookmarkChange?.();
  }

  return (
    <article
      onClick={() => onSelect?.(story)}
      className="group relative rounded-xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-sm
                 hover:border-emerald-500/30 hover:bg-slate-900/70 transition-all duration-200
                 hover:shadow-[0_0_20px_-4px_rgba(16,185,129,0.15)] overflow-hidden cursor-pointer"
    >
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-400/0 group-hover:bg-emerald-400/60 transition-all duration-200" />

      <div className="px-5 py-4 pl-6">

        {/* Row 1 — source + rank + bookmark */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 border rounded-md px-2 py-0.5 ${src.badge}`}>
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${src.dot}`} />
              <span className="text-[10px] font-mono uppercase tracking-widest">{src.label}</span>
            </div>
            {story.tags?.[0] && (
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-500/70 border border-cyan-500/20 rounded px-1.5 py-0.5">
                {story.tags[0]}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBookmark}
              aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark story'}
              className={`w-6 h-6 flex items-center justify-center rounded transition-colors
                ${bookmarked ? 'text-amber-400' : 'text-slate-700 hover:text-slate-400'}`}
            >
              <Bookmark size={14} fill={bookmarked ? 'currentColor' : 'none'} />
            </button>
            {index != null && (
              <span className="text-[11px] font-mono text-slate-700 group-hover:text-slate-600 transition-colors tabular-nums">
                #{String(index + 1).padStart(2, '0')}
              </span>
            )}
          </div>
        </div>

        {/* Row 2 — title (plain text, clicking opens inspector via article onClick) */}
        <p className="text-slate-100 font-semibold text-sm sm:text-base leading-snug line-clamp-2
                      group-hover:text-emerald-300 transition-colors duration-200 mb-3">
          {story.title}
        </p>

        {/* Row 3 — meta */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-mono">
          {story.author && <span className="text-slate-500">{story.author}</span>}
          {story.score != null && <span className="text-emerald-400/80">▲ {story.score.toLocaleString()}</span>}
          {story.commentsCount > 0 && (
            <span
              onClick={e => { e.stopPropagation(); window.open(story.commentsUrl, '_blank', 'noopener,noreferrer'); }}
              className="flex items-center gap-1 text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer"
            >
              <MessageSquare size={11} />
              {story.commentsCount.toLocaleString()}
            </span>
          )}
          {time && <span className="text-slate-600">{time}</span>}
          {showDomain && (
            <span
              onClick={e => { e.stopPropagation(); window.open(story.url, '_blank', 'noopener,noreferrer'); }}
              className="flex items-center gap-1 text-slate-700 hover:text-cyan-400 transition-colors cursor-pointer"
              title={story.url}
            >
              <ArrowUpRight size={11} />
              {domain}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
