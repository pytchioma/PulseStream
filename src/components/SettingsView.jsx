import { Palette, Type, Check } from 'lucide-react';

// ── Theme options ─────────────────────────────────────────────────────────────

const THEMES = [
  {
    key:   'emerald',
    label: 'Emerald Neon',
    desc:  'Default green terminal accent',
    swatch: '#10b981',
    ring:   'ring-emerald-500/60',
  },
  {
    key:   'cyan',
    label: 'Cyber Cyan',
    desc:  'Cool blue terminal accent',
    swatch: '#06b6d4',
    ring:   'ring-cyan-500/60',
  },
  {
    key:   'amber',
    label: 'Amber Glow',
    desc:  'Warm amber terminal accent',
    swatch: '#f59e0b',
    ring:   'ring-amber-500/60',
  },
];

// ── Font scale options ────────────────────────────────────────────────────────

const FONT_SCALES = [
  { key: 'sm', label: 'Small',   desc: '87.5%' },
  { key: 'md', label: 'Default', desc: '100%'  },
  { key: 'lg', label: 'Large',   desc: '112.5%' },
];

// ── Panel wrapper ─────────────────────────────────────────────────────────────

function Panel({ icon: Icon, title, children }) {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-sm p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-6 h-6 rounded-md accent-bg border accent-border flex items-center justify-center shrink-0">
          <Icon size={12} className="accent-text" />
        </div>
        <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">{title}</span>
      </div>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SettingsView({ theme, onTheme, fontScale, onFontScale }) {
  return (
    <div className="space-y-4">

      {/* Accent theme */}
      <Panel icon={Palette} title="Accent Theme">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {THEMES.map(t => {
            const active = theme === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onTheme(t.key)}
                aria-pressed={active}
                aria-label={`Select ${t.label} theme`}
                className={`relative flex items-center gap-3 p-3 rounded-lg border text-left transition-all duration-150
                  ${active
                    ? 'border-[var(--accent-border)] bg-[var(--accent-faint)]'
                    : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70'
                  }`}
              >
                {/* Colour swatch */}
                <div
                  className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center border border-white/10"
                  style={{ backgroundColor: t.swatch + '22', borderColor: t.swatch + '44' }}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.swatch }} />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 leading-tight">{t.label}</p>
                  <p className="text-[10px] font-mono text-slate-500 mt-0.5">{t.desc}</p>
                </div>

                {/* Active check */}
                {active && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full accent-bg flex items-center justify-center">
                    <Check size={9} className="accent-text" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Panel>

      {/* Font scale */}
      <Panel icon={Type} title="Font Scale">
        <div className="grid grid-cols-3 gap-3">
          {FONT_SCALES.map(f => {
            const active = fontScale === f.key;
            return (
              <button
                key={f.key}
                onClick={() => onFontScale(f.key)}
                aria-pressed={active}
                aria-label={`Set font size to ${f.label}`}
                className={`relative flex flex-col items-center justify-center gap-1 py-4 rounded-lg border transition-all duration-150
                  ${active
                    ? 'border-[var(--accent-border)] bg-[var(--accent-faint)]'
                    : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70'
                  }`}
              >
                {/* Preview text at that scale */}
                <span
                  className="font-semibold text-slate-200 leading-none select-none"
                  style={{
                    fontSize: f.key === 'sm' ? '0.8rem' : f.key === 'md' ? '1rem' : '1.2rem',
                  }}
                >
                  Aa
                </span>
                <span className="text-[11px] font-mono text-slate-400">{f.label}</span>
                <span className="text-[9px] font-mono text-slate-600">{f.desc}</span>

                {active && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full accent-bg flex items-center justify-center">
                    <Check size={9} className="accent-text" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-[10px] font-mono text-slate-700 mt-3">
          Font scale adjusts all text proportionally. Selections are saved automatically.
        </p>
      </Panel>

    </div>
  );
}
