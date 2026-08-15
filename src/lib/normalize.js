/**
 * PulseStream — Data Normalization
 *
 * Every API source returns a completely different shape.
 * These functions convert each raw response into one consistent
 * PulseStream story object so StoryCard never has to care about
 * which API the data came from.
 *
 * Normalized shape:
 * {
 *   id:            string   — unique across all sources (prefixed: "hn-123", "devto-456", "reddit-789")
 *   source:        string   — "hackernews" | "devto" | "reddit"
 *   title:         string
 *   url:           string   — canonical link to the full article/post
 *   commentsUrl:   string   — link to the discussion thread
 *   author:        string
 *   score:         number   — upvotes / reactions / points
 *   commentsCount: number
 *   createdAt:     number   — unix timestamp (seconds)
 *   tags:          string[] — topic tags where available
 * }
 */

// ── Hacker News ─────────────────────────────────────────────────────────────
// Raw HN item: { id, title, url?, by, score, descendants?, time, type, kids? }
// Note: HN items without a url are Ask HN / Show HN posts — fall back to the
// HN discussion page so the title always links somewhere useful.

export function normalizeHNStory(raw) {
  if (!raw || !raw.id) return null;

  const hnBase = 'https://news.ycombinator.com';
  const commentsUrl = `${hnBase}/item?id=${raw.id}`;

  return {
    id:            `hn-${raw.id}`,
    source:        'hackernews',
    title:         raw.title        ?? '(no title)',
    url:           raw.url          || commentsUrl,
    commentsUrl,
    author:        raw.by           ?? 'unknown',
    score:         raw.score        ?? 0,
    commentsCount: raw.descendants  ?? 0,
    createdAt:     raw.time         ?? 0,   // unix seconds
    tags:          [],
  };
}

// ── Dev.to ───────────────────────────────────────────────────────────────────
// Raw Dev.to article: { id, title, url, canonical_url, user.username,
//   positive_reactions_count, comments_count, published_at, tag_list }

export function normalizeDevToArticle(raw) {
  if (!raw || !raw.id) return null;

  // published_at is an ISO string — convert to unix seconds
  const createdAt = raw.published_at
    ? Math.floor(new Date(raw.published_at).getTime() / 1000)
    : 0;

  return {
    id:            `devto-${raw.id}`,
    source:        'devto',
    title:         raw.title                        ?? '(no title)',
    url:           (raw.canonical_url || raw.url)    ?? '',
    commentsUrl:   raw.url                          ?? '',
    author:        raw.user?.username               ?? 'unknown',
    score:         raw.positive_reactions_count     ?? 0,
    commentsCount: raw.comments_count               ?? 0,
    createdAt,
    tags:          Array.isArray(raw.tag_list) ? raw.tag_list : [],
  };
}

// ── Reddit ───────────────────────────────────────────────────────────────────
// Raw Reddit post (inside data.children[n].data):
// { id, title, url, permalink, author, score, num_comments,
//   created_utc, link_flair_text, is_self, selftext }
// Reddit "self" posts (text-only) don't have an external url — fall back to
// the Reddit permalink so the card always has somewhere to go.

export function normalizeRedditPost(raw) {
  if (!raw || !raw.id) return null;

  // Guard against deleted/removed posts
  if (!raw.title || raw.title === '[deleted]' || raw.author === '[deleted]') {
    return null;
  }

  const redditBase  = 'https://www.reddit.com';
  const commentsUrl = raw.permalink
    ? `${redditBase}${raw.permalink}`
    : `${redditBase}/r/programming`;

  // Self posts link to the reddit thread; link posts link externally
  const url = raw.is_self
    ? commentsUrl
    : (raw.url ?? commentsUrl);

  const tags = raw.link_flair_text
    ? [raw.link_flair_text]
    : [];

  return {
    id:            `reddit-${raw.id}`,
    source:        'reddit',
    title:         raw.title     ?? '(no title)',
    url,
    commentsUrl,
    author:        raw.author    ?? 'unknown',
    score:         raw.score     ?? 0,
    commentsCount: raw.num_comments ?? 0,
    createdAt:     raw.created_utc  ?? 0,   // already unix seconds
    tags,
  };
}
