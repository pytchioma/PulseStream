// ── Keys ──────────────────────────────────────────────────────────────────────
// All localStorage keys owned by PulseStream.
// SystemHealth.jsx references this list for "Clear Local Storage".

export const PS_STORAGE_KEYS = [
  'pulseStreamBookmarks',
  'pulseStreamTheme',
  'pulseStreamFontScale',
];

const KEYS = {
  bookmarks:  'pulseStreamBookmarks',
  theme:      'pulseStreamTheme',
  fontScale:  'pulseStreamFontScale',
};

// ── Internal helpers ──────────────────────────────────────────────────────────

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota full */ }
}

// ── Bookmarks ─────────────────────────────────────────────────────────────────

export function getBookmarks()        { return load(KEYS.bookmarks, {}); }
export function isBookmarked(id)      { return Boolean(getBookmarks()[id]); }

export function addBookmark(story) {
  const data = getBookmarks();
  data[story.id] = story;
  save(KEYS.bookmarks, data);
}

export function removeBookmark(id) {
  const data = getBookmarks();
  delete data[id];
  save(KEYS.bookmarks, data);
}

export function toggleBookmark(story) {
  if (isBookmarked(story.id)) { removeBookmark(story.id); return false; }
  addBookmark(story); return true;
}

// ── Theme ─────────────────────────────────────────────────────────────────────
// Valid values: 'emerald' | 'cyan' | 'amber'

export function getTheme()       { return load(KEYS.theme, 'emerald'); }
export function saveTheme(theme) { save(KEYS.theme, theme); }

// ── Font scale ────────────────────────────────────────────────────────────────
// Valid values: 'sm' | 'md' | 'lg'

export function getFontScale()        { return load(KEYS.fontScale, 'md'); }
export function saveFontScale(scale)  { save(KEYS.fontScale, scale); }
