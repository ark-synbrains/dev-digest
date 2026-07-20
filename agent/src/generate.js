/**
 * Generate /dev/digest issues from free public sources:
 * Hacker News (Algolia), Dev.to, and curated RSS feeds.
 * No Anthropic / web-search API key required.
 */

import {
  SECTION_META,
  HN_QUERIES,
  DEVTO_TAGS,
  RSS_FEEDS,
  LANE_KEYWORDS,
} from './sources.js';

const SCOPE_TO_CATEGORIES = {
  all: ['model', 'algorithm', 'product'],
  models: ['model'],
  products: ['product'],
  algorithms: ['algorithm'],
};

const MAX_PER_LANE = 4;
const LOOKBACK_DAYS = 10;
const USER_AGENT = 'dev-digest-agent/1.0 (+https://github.com/ark-synbrains/dev-digest)';

function stripHtml(html) {
  return String(html || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text, max = 320) {
  const t = stripHtml(text);
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

function headlineFrom(title) {
  let h = stripHtml(title).replace(/\s+/g, ' ').trim();
  h = h.replace(/[.!?]+$/, '');
  const words = h.split(/\s+/);
  if (words.length > 12) h = words.slice(0, 12).join(' ');
  return h || 'untitled update';
}

function matchesLane(cat, title, summary) {
  const keywords = LANE_KEYWORDS[cat] || [];
  const hay = `${title} ${summary}`.toLowerCase();
  return keywords.some((k) => hay.includes(k.toLowerCase()));
}

async function fetchText(url, { attempt = 1 } = {}) {
  let response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json, application/rss+xml, application/xml, text/xml, */*',
      },
    });
  } catch (err) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 600));
      return fetchText(url, { attempt: attempt + 1 });
    }
    throw err;
  }

  if (!response.ok) {
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      await new Promise((r) => setTimeout(r, 800));
      return fetchText(url, { attempt: attempt + 1 });
    }
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.text();
}

async function fetchJson(url) {
  const text = await fetchText(url);
  return JSON.parse(text);
}

async function fetchHnStories(cat, sinceUnix) {
  const queries = HN_QUERIES[cat] || [];
  const hits = [];

  for (const query of queries) {
    const params = new URLSearchParams({
      query,
      tags: 'story',
      hitsPerPage: '20',
      numericFilters: `created_at_i>${sinceUnix}`,
    });
    const url = `https://hn.algolia.com/api/v1/search?${params}`;
    try {
      const data = await fetchJson(url);
      for (const hit of data.hits || []) {
        const title = hit.title || hit.story_title;
        const urlOut = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
        if (!title || !urlOut) continue;
        hits.push({
          headline: headlineFrom(title),
          summary:
            truncate(hit.story_text || hit.comment_text || '') ||
            `Trending on Hacker News (${hit.points || 0} points, ${hit.num_comments || 0} comments). ${title}`,
          source_name: hit.author ? `HN / ${hit.author}` : 'Hacker News',
          source_url: urlOut,
          _score: (hit.points || 0) + (hit.num_comments || 0) * 0.5,
          _origin: 'hn',
        });
      }
    } catch (err) {
      console.warn(`[dev-digest] HN fetch failed for ${cat}:`, err.message || err);
    }
  }

  return hits;
}

async function fetchDevto(cat) {
  const tags = DEVTO_TAGS[cat] || [];
  const hits = [];

  for (const tag of tags.slice(0, 2)) {
    const url = `https://dev.to/api/articles?tag=${encodeURIComponent(tag)}&top=10&per_page=12`;
    try {
      const articles = await fetchJson(url);
      for (const a of articles || []) {
        if (!a.title || !a.url) continue;
        const published = a.published_at ? Date.parse(a.published_at) : 0;
        const ageMs = Date.now() - published;
        if (published && ageMs > LOOKBACK_DAYS * 24 * 60 * 60 * 1000) continue;
        hits.push({
          headline: headlineFrom(a.title),
          summary: truncate(a.description || a.title),
          source_name: a.user?.name ? `Dev.to / ${a.user.name}` : 'Dev.to',
          source_url: a.url,
          _score: (a.positive_reactions_count || 0) + (a.comments_count || 0),
          _origin: 'devto',
        });
      }
    } catch (err) {
      console.warn(`[dev-digest] Dev.to fetch failed for tag=${tag}:`, err.message || err);
    }
  }

  return hits;
}

function parseRssItems(xml, sourceName) {
  const items = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];

  for (const block of blocks) {
    const title =
      (block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
    const linkTagged =
      (block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || '';
    const linkHref =
      (block.match(/<link[^>]+href=["']([^"']+)["']/i) || [])[1] || '';
    const desc =
      (block.match(/<description[^>]*>([\s\S]*?)<\/description>/i) ||
        block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) ||
        block.match(/<content[^>]*>([\s\S]*?)<\/content>/i) ||
        [])[1] || '';
    const pub =
      (block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
        block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i) ||
        block.match(/<published[^>]*>([\s\S]*?)<\/published>/i) ||
        [])[1] || '';

    const source_url = stripHtml(linkHref || linkTagged);
    const headline = headlineFrom(title);
    if (!headline || !source_url || !/^https?:\/\//i.test(source_url)) continue;

    const published = pub ? Date.parse(stripHtml(pub)) : NaN;
    items.push({
      headline,
      summary: truncate(desc) || `${headline} — via ${sourceName}`,
      source_name: sourceName,
      source_url,
      _published: Number.isFinite(published) ? published : 0,
      _origin: 'rss',
      _score: Number.isFinite(published) ? published / 1e10 : 0,
    });
  }

  return items;
}

async function fetchRss(cat) {
  const feeds = RSS_FEEDS[cat] || [];
  const hits = [];
  const cutoff = Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

  await Promise.all(
    feeds.map(async (feed) => {
      try {
        const xml = await fetchText(feed.url);
        const items = parseRssItems(xml, feed.name).filter(
          (it) => !it._published || it._published >= cutoff
        );
        hits.push(...items);
      } catch (err) {
        console.warn(`[dev-digest] RSS failed (${feed.name}):`, err.message || err);
      }
    })
  );

  return hits;
}

function dedupeKey(item) {
  try {
    const u = new URL(item.source_url);
    return `${u.hostname}${u.pathname}`.toLowerCase().replace(/\/$/, '');
  } catch {
    return (item.headline || '').toLowerCase();
  }
}

function selectLaneItems(cat, candidates) {
  const seen = new Set();
  const filtered = [];

  for (const item of candidates) {
    if (!matchesLane(cat, item.headline, item.summary) && item._origin !== 'rss') {
      // Keep RSS from curated feeds even if keyword miss; drop off-topic HN/Dev.to
      continue;
    }
    const key = dedupeKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    filtered.push(item);
  }

  // Prefer RSS (primary sources), then score
  filtered.sort((a, b) => {
    const originRank = (o) => (o === 'rss' ? 2 : o === 'hn' ? 1 : 0);
    const dr = originRank(b._origin) - originRank(a._origin);
    if (dr !== 0) return dr;
    return (b._score || 0) - (a._score || 0);
  });

  return filtered.slice(0, MAX_PER_LANE).map(({ headline, summary, source_name, source_url }) => ({
    headline,
    summary,
    source_name,
    source_url,
  }));
}

async function fetchCategory(cat) {
  const sinceUnix = Math.floor(Date.now() / 1000) - LOOKBACK_DAYS * 24 * 60 * 60;
  const [hn, devto, rss] = await Promise.all([
    fetchHnStories(cat, sinceUnix),
    fetchDevto(cat),
    fetchRss(cat),
  ]);

  const items = selectLaneItems(cat, [...rss, ...hn, ...devto]);
  if (items.length === 0) {
    throw new Error(`no recent items found for ${cat}`);
  }
  return items;
}

/**
 * Generate a full newsletter issue from public sources.
 */
export async function generateIssue({ scope = 'all', issueNumber } = {}) {
  const now = new Date();
  const isoDate = now.toISOString().slice(0, 10);
  const date = now.toDateString();
  const number =
    typeof issueNumber === 'number' && issueNumber > 0
      ? issueNumber
      : Number(isoDate.replace(/-/g, ''));

  const categories = SCOPE_TO_CATEGORIES[scope] || SCOPE_TO_CATEGORIES.all;
  const byCategory = {};
  const errors = {};

  const results = await Promise.allSettled(
    categories.map((cat, idx) =>
      new Promise((resolve) => setTimeout(resolve, idx * 200)).then(() =>
        fetchCategory(cat)
      )
    )
  );

  results.forEach((result, idx) => {
    const cat = categories[idx];
    if (result.status === 'fulfilled') {
      byCategory[cat] = result.value;
    } else {
      errors[cat] = result.reason?.message || 'unknown error';
    }
  });

  if (Object.keys(byCategory).length === 0) {
    const firstErr = Object.values(errors)[0] || 'unknown error';
    throw new Error('all lanes failed — ' + firstErr);
  }

  return { number, date, isoDate, byCategory, errors, sectionMeta: SECTION_META };
}

export { SECTION_META };
