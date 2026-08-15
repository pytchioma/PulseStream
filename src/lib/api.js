/**
 * PulseStream — API Fetch Functions
 *
 * One file for all data sources. Each function fetches raw data,
 * applies normalization, and returns a clean array of PulseStream
 * story objects. Components never see the raw API shape.
 *
 * React Query keys:
 *   ["hackerNews"]   — HN top story ID list
 *   ["story", id]    — individual HN story item
 *   ["devto"]        — Dev.to articles (single request)
 *   ["reddit"]       — Reddit hot posts (single request)
 */

import {
  normalizeHNStory,
  normalizeDevToArticle,
  normalizeRedditPost,
} from './normalize.js';

// ── Hacker News ──────────────────────────────────────────────────────────────
// HN requires two round-trips: first fetch the ranked ID list, then fetch
// each item individually. The per-item fetches are handled with useQueries
// in the component so React Query can cache each story independently.

export async function fetchHNTopIds() {
  const res = await fetch(
    'https://hacker-news.firebaseio.com/v0/topstories.json'
  );
  if (!res.ok) throw new Error(`Hacker News: failed to fetch top stories (${res.status})`);
  return res.json(); // number[]
}

export async function fetchHNStory(id) {
  const res = await fetch(
    `https://hacker-news.firebaseio.com/v0/item/${id}.json`
  );
  if (!res.ok) throw new Error(`Hacker News: failed to fetch item ${id} (${res.status})`);
  const raw = await res.json();
  return normalizeHNStory(raw); // → normalized story | null
}

// ── Dev.to ───────────────────────────────────────────────────────────────────
// Single request that returns an array of articles. No secondary fetches
// needed — all required fields come back in the list response.

export async function fetchDevTo() {
  const res = await fetch(
    'https://dev.to/api/articles?per_page=10&top=1'
  );
  if (!res.ok) throw new Error(`Dev.to: failed to fetch articles (${res.status})`);
  const raw = await res.json(); // article[]
  return raw
    .map(normalizeDevToArticle)
    .filter(Boolean); // drop any malformed items
}

// ── Reddit ───────────────────────────────────────────────────────────────────
// Reddit's public JSON endpoint wraps posts inside data.children[].data.
// We guard against deleted posts, stickied mod posts, and missing fields
// inside normalizeRedditPost — any null returns are filtered out here.

export async function fetchReddit() {
  // Reddit blocks direct browser requests with CORS headers.
  // We route through allorigins which forwards the response with
  // permissive CORS headers so the browser accepts it.
  const target = encodeURIComponent(
    'https://www.reddit.com/r/programming/hot.json?limit=10'
  );
  const res = await fetch(`https://api.allorigins.win/raw?url=${target}`);
  if (!res.ok) throw new Error(`Reddit: failed to fetch r/programming (${res.status})`);
  const json = await res.json();

  // Reddit shape: { data: { children: [ { kind, data: post }, ... ] } }
  const posts = json?.data?.children ?? [];
  return posts
    .map((child) => normalizeRedditPost(child?.data))
    .filter(Boolean); // drops deleted/removed posts
}
