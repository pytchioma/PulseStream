import { useMemo } from 'react';
import { Hash, TrendingUp, Zap, BarChart2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';

// ── Constants ────────────────────────────────────────────────────────────────

const SOURCE_COLORS = {
  hackernews: '#f97316',
  devto:      '#a78bfa',
  reddit:     '#fb7185',
};

const SOURCE_LABELS = {
  hackernews: 'Hacker News',
  devto:      'Dev.to',
  reddit:     'Reddit',
};

// Keyword groups for the lightweight sentiment / topic meter.
// Each group has a label and a set of terms to match against story titles & tags.
// This is intentionally simple and clearly labeled as a keyword index.
const TOPIC_GROUPS = [
  { key: 'ai',         label: 'AI / ML',      color: '#10b981', terms: ['ai', 'ml', 'machine learning', 'llm', 'gpt', 'openai', 'gemini', 'claude', 'neural', 'deep learning', 'chatgpt'] },
  { key: 'webdev',     label: 'Web Dev',       color: '#38bdf8', terms: ['react', 'vue', 'angular', 'css', 'html', 'javascript', 'typescript', 'nextjs', 'frontend', 'backend', 'fullstack', 'web'] },
  { key: 'opensource', label: 'Open Source',   color: '#a78bfa', terms: ['open source', 'github', 'linux', 'rust', 'python', 'golang', 'open-source', 'oss', 'foss', 'gnu'] },
  { key: 'career',     label: 'Career / Biz',  color: '#fbbf24', terms: ['hiring', 'job', 'startup', 'layoff', 'funding', 'salary', 'remote', 'career', 'work', 'company'] },
  { key: 'security',   label: 'Security',      color: '#f87171', terms: ['security', 'hack', 'vulnerability', 'exploit', 'breach', 'privacy', 'encryption', 'cyber', 'malware', 'zero-day'] },
  { key: 'cloud',      label: 'Cloud / Infra', color: '#34d399', terms: ['aws', 'azure', 'gcp', 'cloud', 'kubernetes', 'docker', 'devops', 'serverless', 'infra', 'platform'] },
];

// ── Tooltip styles (shared) ───────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  backgroundColor: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 8,
  color: '#e2e8f0',
  fontSize: 11,
  fontFamily: 'monospace',
};

const CURSOR_STYLE = { fill: 'rgba(16,185,129,0.05)' };

// ── Panel wrapper ─────────────────────────────────────────────────────────────

function Panel({ icon: Icon, title, sub, children }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-md bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
          <Icon size={12} className="text-slate-400" />
        </div>
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">{title}</span>
          {sub && <span className="text-[10px] font-mono text-slate-600 ml-2">{sub}</span>}
        </div>
      </div>
      {children}
    </div>
  );
}

function EmptyPanel({ message }) {
  return (
    <p className="text-slate-600 text-xs font-mono text-center py-6">{message}</p>
  );
}

// ── 1. Source Distribution BarChart ───────────────────────────────────────────

function SourceChart({ stories }) {
  const data = useMemo(() => {
    const counts = {};
    for (const s of stories) counts[s.source] = (counts[s.source] ?? 0) + 1;
    return Object.entries(counts).map(([source, count]) => ({
      name: SOURCE_LABELS[source] ?? source,
      count,
      source,
    }));
  }, [stories]);

  if (data.length === 0) return <EmptyPanel message="No source data available" />;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barCategoryGap="30%" margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <XAxis
          dataKey="name"
          tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: '#475569', fontSize: 10, fontFamily: 'monospace' }}
          axisLine={false} tickLine={false}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={CURSOR_STYLE}
          formatter={v => [v, 'Stories']}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map(d => (
            <Cell key={d.source} fill={SOURCE_COLORS[d.source] ?? '#64748b'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── 2. Engagement RadarChart ──────────────────────────────────────────────────
// Compares avg score and avg comments per source. Uses the normalized fields
// score and commentsCount — never accesses raw API structures.

function EngagementChart({ stories }) {
  const data = useMemo(() => {
    const acc = {};
    for (const s of stories) {
      if (!acc[s.source]) acc[s.source] = { score: 0, comments: 0, n: 0 };
      acc[s.source].score    += s.score        ?? 0;
      acc[s.source].comments += s.commentsCount ?? 0;
      acc[s.source].n        += 1;
    }
    return Object.entries(acc).map(([source, v]) => ({
      source: SOURCE_LABELS[source] ?? source,
      'Avg Score':    v.n ? Math.round(v.score    / v.n) : 0,
      'Avg Comments': v.n ? Math.round(v.comments / v.n) : 0,
    }));
  }, [stories]);

  if (data.length === 0) return <EmptyPanel message="No engagement data available" />;

  // Flatten into radar-friendly shape: one row per metric, one column per source
  const sources = data.map(d => d.source);
  const radarData = ['Avg Score', 'Avg Comments'].map(metric => {
    const row = { metric };
    data.forEach(d => { row[d.source] = d[metric]; });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={radarData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
        <PolarGrid stroke="#1e293b" />
        <PolarAngleAxis
          dataKey="metric"
          tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        {sources.map(src => {
          const srcKey = Object.keys(SOURCE_LABELS).find(k => SOURCE_LABELS[k] === src) ?? src;
          return (
            <Radar
              key={src}
              name={src}
              dataKey={src}
              stroke={SOURCE_COLORS[srcKey] ?? '#64748b'}
              fill={SOURCE_COLORS[srcKey] ?? '#64748b'}
              fillOpacity={0.15}
            />
          );
        })}
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── 3. Top Tags ───────────────────────────────────────────────────────────────

function TopTags({ stories }) {
  const tags = useMemo(() => {
    const freq = {};
    for (const s of stories) {
      for (const t of s.tags ?? []) {
        if (!t) continue;
        const key = t.toLowerCase().trim();
        freq[key] = (freq[key] ?? 0) + 1;
      }
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));
  }, [stories]);

  if (tags.length === 0) {
    return <EmptyPanel message="No tags found in current stories" />;
  }

  const max = tags[0].count;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(({ tag, count }) => {
        // Scale opacity/size by relative frequency
        const weight = max > 1 ? count / max : 1;
        const sizeClass = weight > 0.7 ? 'text-[13px]' : weight > 0.4 ? 'text-[11px]' : 'text-[10px]';
        return (
          <span
            key={tag}
            title={`${count} ${count === 1 ? 'story' : 'stories'}`}
            className={`${sizeClass} font-mono uppercase tracking-wider px-2 py-0.5 rounded border
              text-cyan-400/80 border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10
              hover:border-cyan-500/40 transition-colors cursor-default`}
            style={{ opacity: 0.5 + weight * 0.5 }}
          >
            {tag}
            <span className="text-[9px] text-slate-600 ml-1">{count}</span>
          </span>
        );
      })}
    </div>
  );
}

// ── 4. Sentiment / Topic Meter ────────────────────────────────────────────────
// A transparent keyword-frequency index. Counts how many stories contain
// terms from each topic group. Not a real sentiment analysis system —
// labeled clearly as a keyword index.

function SentimentMeter({ stories }) {
  const scores = useMemo(() => {
    if (stories.length === 0) return [];

    return TOPIC_GROUPS.map(group => {
      let hits = 0;
      for (const s of stories) {
        const haystack = [s.title ?? '', ...(s.tags ?? [])].join(' ').toLowerCase();
        if (group.terms.some(term => haystack.includes(term))) hits++;
      }
      return {
        label:   group.label,
        color:   group.color,
        hits,
        pct:     Math.round((hits / stories.length) * 100),
      };
    }).sort((a, b) => b.hits - a.hits);
  }, [stories]);

  if (scores.length === 0 || scores.every(s => s.hits === 0)) {
    return <EmptyPanel message="No topic signals found" />;
  }

  return (
    <div className="space-y-2.5">
      {scores.map(s => (
        <div key={s.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">{s.label}</span>
            <span className="text-[10px] font-mono text-slate-600 tabular-nums">{s.hits} stories · {s.pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${s.pct}%`, backgroundColor: s.color }}
            />
          </div>
        </div>
      ))}
      <p className="text-[9px] font-mono text-slate-700 pt-1">
        ↑ Keyword frequency index — not AI sentiment analysis
      </p>
    </div>
  );
}

// ── Stats row ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-200 tabular-nums">{value}</p>
      {sub && <p className="text-[10px] font-mono text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function AnalyticsView({ stories }) {
  const totalScore    = useMemo(() => stories.reduce((s, x) => s + (x.score        ?? 0), 0), [stories]);
  const totalComments = useMemo(() => stories.reduce((s, x) => s + (x.commentsCount ?? 0), 0), [stories]);
  const avgScore      = stories.length ? Math.round(totalScore    / stories.length) : 0;
  const avgComments   = stories.length ? Math.round(totalComments / stories.length) : 0;
  const sources       = useMemo(() => new Set(stories.map(s => s.source)).size, [stories]);

  if (stories.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-5 py-12 text-center">
        <p className="text-slate-400 text-sm font-medium mb-1">No analytics data available</p>
        <p className="text-slate-600 text-xs font-mono">Stories are still loading or no sources matched your filter</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Stories"      value={stories.length}            sub={`${sources} source${sources !== 1 ? 's' : ''}`} />
        <StatCard label="Total Score"  value={totalScore.toLocaleString()} sub="combined points" />
        <StatCard label="Avg Score"    value={avgScore.toLocaleString()}  sub="per story" />
        <StatCard label="Avg Comments" value={avgComments.toLocaleString()} sub="per story" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel icon={BarChart2} title="Source Distribution" sub="stories by origin">
          <SourceChart stories={stories} />
        </Panel>
        <Panel icon={TrendingUp} title="Engagement" sub="avg score & comments per source">
          <EngagementChart stories={stories} />
        </Panel>
      </div>

      {/* Tags + Sentiment row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel icon={Hash} title="Top Tags" sub="by frequency">
          <TopTags stories={stories} />
        </Panel>
        <Panel icon={Zap} title="Topic Index" sub="keyword frequency estimate">
          <SentimentMeter stories={stories} />
        </Panel>
      </div>
    </div>
  );
}
