const KEY = 'pulseStreamBookmarks';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* quota full */ }
}

export function getBookmarks() {
  return load(); // { [story.id]: story }
}

export function isBookmarked(id) {
  return Boolean(load()[id]);
}

export function addBookmark(story) {
  const data = load();
  data[story.id] = story;
  save(data);
}

export function removeBookmark(id) {
  const data = load();
  delete data[id];
  save(data);
}

export function toggleBookmark(story) {
  if (isBookmarked(story.id)) {
    removeBookmark(story.id);
    return false;
  } else {
    addBookmark(story);
    return true;
  }
}
