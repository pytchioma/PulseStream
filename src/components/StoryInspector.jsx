import { useEffect, useState } from 'react';
import { X, ExternalLink, Copy, Check, Bookmark, MessageSquare } from 'lucide-react';
import { toggleBookmark, isBookmarked } from '../lib/storage.js';

const SOURCE = {
  hackernews: { label: 'Hacker News', dot: 'bg-orange-400', badge: 'bg-orange-500/10 border-orange-500/25 text-orange-400/90' },
  devto:      { label: 'Dev.to',      dot: 'bg-violet-400', badge: 'bg-violet-500/10 border-violet-500/25 text-violet-400/90' },
  reddit:     { label: 'Reddit',      dot: 'bg-rose-400',   badge: 'bg-rose-500/10 border-rose-500/25 text-rose-400/90' },
};

function formatDate(unix) {
  if (!unix) return null;
  return new Date(unix * 1000).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function MetaRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-800/50 last:border-0">
      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600 w-24 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-slate-300 break-words min-w-0">{value}</span>
    </div>
  );
}

export default function StoryInspector({ story, onClose, onBookmarkChange }) {
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (story) setBookmarked(isBookmarked(story.id));
  }, [story]);

  useEffect(() => {
    if (!story) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [story, onClose]);

  useEffect(() => {
    document.body.style.overflow = story ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [story]);

  if (!story) return null;

  const src = SOURCE[story.source] ?? { label: story.source, dot: 'bg-slate-400', badge: 'bg-slate-500/10 border-slate-500/25 text-slate-400/90' };

  function handleBookmark() {
    const nowBookmarked = toggleBookmark(story);
    setBookmarked(nowBookmarked);
    onBookmarkChange?.();
  }

  async function handleShare() {
    const text = `${story.title}\n\nBy ${story.author ?? 'Unknown'} · ${src.label}\n\nRead more: ${story.url}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Article Inspector"
        className="fixed top-0 right-0 z-50 h-full w-full sm:w-[480px] lg:w-[520px]
                   bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden
                   drawer-slide-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 border rounded-md px-2 py-0.5 ${src.badge}`}>
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${src.dot}`} />
              <span className="text-[10px] font-mono uppercase tracking-widest">{src.label}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Inspector</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close inspector"
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600
                       flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Title */}
          <h2 className="text-slate-100 font-semibold text-base leading-snug">
            {story.title}
          </h2>

          {/* Tags */}
          {story.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {story.tags.map(tag => (
                <span key={tag} className="text-[10px] font-mono uppercase tracking-wider text-cyan-500/70 border border-cyan-500/20 rounded px-1.5 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Meta table */}
          <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 px-4 divide-y divide-slate-800/50">
            <MetaRow label="Author"    value={story.author} />
            <MetaRow label="Score"     value={story.score != null ? `▲ ${story.score.toLocaleString()}` : null} />
            <MetaRow label="Comments"  value={story.commentsCount > 0 ? story.commentsCount.toLocaleString() : null} />
            <MetaRow label="Published" value={formatDate(story.createdAt)} />
            <MetaRow label="Source"    value={src.label} />
            {story.url && (
              <div className="flex items-start gap-3 py-2.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600 w-24 shrink-0 pt-0.5">URL</span>
                <a href={story.url} target="_blank" rel="noopener noreferrer"
                   className="text-sm text-cyan-400/80 hover:text-cyan-300 transition-colors break-all min-w-0 line-clamp-2">
                  {story.url}
                </a>
              </div>
            )}
          </div>

          {/* Discussion link */}
          {story.commentsUrl && story.commentsUrl !== story.url && (
            <a href={story.commentsUrl} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 text-[11px] font-mono text-slate-500 hover:text-cyan-400 transition-colors">
              <MessageSquare size={12} />
              View discussion thread
            </a>
          )}
        </div>

        {/* Action bar */}
        <div className="shrink-0 border-t border-slate-800 px-5 py-4 flex items-center gap-3">

          {/* Open original — only external navigation point */}
          <a
            href={story.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                       bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20
                       text-emerald-400 text-xs font-mono uppercase tracking-wider transition-colors"
          >
            <ExternalLink size={13} />
            Open Original
          </a>

          {/* Share / copy */}
          <button
            onClick={handleShare}
            aria-label="Copy story to clipboard"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                       bg-slate-800 border border-slate-700 hover:border-slate-600
                       text-slate-300 hover:text-white text-xs font-mono uppercase tracking-wider transition-colors"
          >
            {copied ? (
              <><Check size={13} className="text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
            ) : (
              <><Copy size={13} />Share</>
            )}
          </button>

          {/* Bookmark */}
          <button
            onClick={handleBookmark}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark story'}
            className={`flex items-center justify-center w-10 h-10 rounded-lg border transition-colors
              ${bookmarked
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`}
          >
            <Bookmark size={15} fill={bookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
      </aside>
    </>
  );
}
