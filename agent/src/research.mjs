/**
 * Gather recent tech developments for the three Hive Digest lanes.
 * Uses public APIs (HN Algolia + arXiv, with OpenAlex paper backup) so
 * scheduled runs don't need an LLM key.
 *
 * Resilience:
 * - Retry transient HTTP 429 / 5xx (and arXiv "Rate exceeded." bodies)
 * - Pace arXiv at ≥3s between calls (API Terms of Use)
 * - Fall back to OpenAlex when arXiv fails after retries
 * - Soft-fail paper sources so HN-only digests still generate
 */

const HN_URL = 'https://hn.algolia.com/api/v1/search';
const ARXIV_URL = 'https://export.arxiv.org/api/query';
const OPENALEX_URL = 'https://api.openalex.org/works';

const USER_AGENT = 'hive-digest-agent/1.0 (+https://hive.synbrains.ai/; mailto:news@synbrains.ai)';
const ARXIV_MIN_INTERVAL_MS = 3200;
const MAX_FETCH_ATTEMPTS = 4;

let lastArxivRequestAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryAfterMs(res, attempt) {
  const header = res?.headers?.get?.('retry-after');
  if (header) {
    const asInt = Number(header);
    if (Number.isFinite(asInt) && asInt >= 0) return Math.min(asInt * 1000, 60_000);
    const asDate = Date.parse(header);
    if (Number.isFinite(asDate)) {
      return Math.min(Math.max(asDate - Date.now(), 0), 60_000);
    }
  }
  // Exponential backoff with light jitter; longer base for rate limits.
  const base = res?.status === 429 ? 4000 : 1000;
  return Math.min(base * 2 ** (attempt - 1) + Math.floor(Math.random() * 400), 30_000);
}

function isRateExceededBody(text) {
  const head = String(text || '')
    .slice(0, 64)
    .trim()
    .toLowerCase();
  return head.startsWith('rate exceeded');
}

async function paceArxiv() {
  const elapsed = Date.now() - lastArxivRequestAt;
  if (lastArxivRequestAt && elapsed < ARXIV_MIN_INTERVAL_MS) {
    await sleep(ARXIV_MIN_INTERVAL_MS - elapsed);
  }
}

/**
 * Fetch with retries for transient failures.
 * @param {string} url
 * @param {{ asJson?: boolean, beforeAttempt?: () => Promise<void>, afterAttempt?: () => void }} [opts]
 */
async function fetchWithRetry(url, { asJson = false, beforeAttempt, afterAttempt } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      if (beforeAttempt) await beforeAttempt();
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      const text = await res.text();
      afterAttempt?.();

      if (res.ok && isRateExceededBody(text)) {
        lastError = new Error(`HTTP 429 (Rate exceeded.) for ${url}`);
        if (attempt < MAX_FETCH_ATTEMPTS) {
          console.warn(
            `Rate limited by upstream (soft body) on attempt ${attempt}/${MAX_FETCH_ATTEMPTS}; backing off…`
          );
          await sleep(retryAfterMs({ status: 429, headers: res.headers }, attempt));
          continue;
        }
        throw lastError;
      }

      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status} for ${url}`);
        const retryable = res.status === 429 || res.status >= 500;
        if (retryable && attempt < MAX_FETCH_ATTEMPTS) {
          console.warn(
            `HTTP ${res.status} on attempt ${attempt}/${MAX_FETCH_ATTEMPTS} for ${url}; backing off…`
          );
          await sleep(retryAfterMs(res, attempt));
          continue;
        }
        throw lastError;
      }

      if (asJson) {
        try {
          return JSON.parse(text);
        } catch (err) {
          throw new Error(`Invalid JSON from ${url}: ${err.message}`);
        }
      }
      return text;
    } catch (err) {
      // Final HTTP / parse errors thrown above — do not treat as network retry.
      if (
        err instanceof Error &&
        (err.message.startsWith('HTTP ') || err.message.startsWith('Invalid JSON'))
      ) {
        throw err;
      }
      lastError = err instanceof Error ? err : new Error(String(err));
      afterAttempt?.();
      if (attempt < MAX_FETCH_ATTEMPTS) {
        console.warn(
          `Network error on attempt ${attempt}/${MAX_FETCH_ATTEMPTS}: ${lastError.message}; retrying…`
        );
        await sleep(retryAfterMs(null, attempt));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError || new Error(`Failed to fetch ${url}`);
}

async function fetchJson(url) {
  return fetchWithRetry(url, { asJson: true });
}

async function fetchArxivText(url) {
  return fetchWithRetry(url, {
    asJson: false,
    beforeAttempt: paceArxiv,
    afterAttempt: () => {
      lastArxivRequestAt = Date.now();
    },
  });
}

function decodeHtmlEntities(s) {
  let out = String(s || '');
  for (let i = 0; i < 3; i += 1) {
    const prev = out;
    out = out
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&apos;/gi, "'")
      .replace(/&nbsp;/gi, ' ')
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        const code = parseInt(hex, 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : '';
      })
      .replace(/&#(\d+);/g, (_, dec) => {
        const code = Number(dec);
        return Number.isFinite(code) ? String.fromCodePoint(code) : '';
      });
    if (out === prev) break;
  }
  return out;
}

function stripHtml(s) {
  return decodeHtmlEntities(s)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(s, n = 320) {
  const t = stripHtml(s);
  if (t.length <= n) return t;
  return t.slice(0, n - 1).trimEnd() + '...';
}

async function searchHn(query, hitsPerPage = 8) {
  const params = new URLSearchParams({
    query,
    tags: 'story',
    hitsPerPage: String(hitsPerPage),
    numericFilters: `created_at_i>${Math.floor(Date.now() / 1000) - 7 * 24 * 3600}`,
  });
  const data = await fetchJson(`${HN_URL}?${params}`);
  return (data.hits || [])
    .filter((h) => h.url && h.title)
    .map((h) => {
      const body = truncate(h.story_text || '', 260);
      const summary = body
        ? body
        : `Community discussion of a notable release or technical update: ${truncate(h.title, 180)}. Engineers are weighing trade-offs, adoption path, and whether it changes production stacks.`;
      return {
        headline: h.title,
        summary,
        source_name: 'Hacker News',
        source_url: h.url,
        _score: (h.points || 0) + (h.num_comments || 0) * 0.5,
      };
    });
}

function parseArxiv(xml) {
  const entries = [];
  const blocks = xml.split('<entry>').slice(1);
  for (const block of blocks) {
    const title = stripHtml((block.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || '');
    const summary = stripHtml((block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/) || [])[1] || '');
    const id = stripHtml((block.match(/<id>([\s\S]*?)<\/id>/) || [])[1] || '');
    if (!title || !id) continue;
    entries.push({
      headline: title.replace(/\s+/g, ' '),
      summary: truncate(summary, 340),
      source_name: 'arXiv',
      source_url: id.replace('http://', 'https://'),
      _score: 1,
    });
  }
  return entries;
}

async function searchArxiv(searchQuery, maxResults = 6) {
  const params = new URLSearchParams({
    search_query: searchQuery,
    start: '0',
    max_results: String(maxResults),
    sortBy: 'submittedDate',
    sortOrder: 'descending',
  });
  const xml = await fetchArxivText(`${ARXIV_URL}?${params}`);
  return parseArxiv(xml);
}

/**
 * OpenAlex backup when arXiv is unavailable / rate-limited.
 * Scoped to recent AI/ML/NLP concepts so results stay on-lane.
 */
async function searchOpenAlex(searchQuery, maxResults = 6) {
  const nowYear = new Date().getFullYear();
  const fromYear = nowYear - 1;
  // OpenAlex concept ids: Artificial intelligence | Machine learning | NLP
  const params = new URLSearchParams({
    search: searchQuery,
    filter: [
      `from_publication_date:${fromYear}-01-01`,
      'type:article',
      'concepts.id:C154945302|C119857082|C204321447',
    ].join(','),
    sort: 'publication_date:desc',
    per_page: String(maxResults),
  });
  const data = await fetchJson(`${OPENALEX_URL}?${params}`);
  return (data.results || [])
    .map((work) => {
      const year = Number(work.publication_year);
      if (Number.isFinite(year) && year > nowYear + 1) return null;
      const title = stripHtml(work.title || '');
      const landing =
        work.primary_location?.landing_page_url ||
        (work.doi ? `https://doi.org/${String(work.doi).replace(/^https?:\/\/doi\.org\//i, '')}` : '') ||
        work.id ||
        '';
      if (!title || !landing) return null;
      const summary = truncate(reconstructAbstract(work.abstract_inverted_index) || title, 340);
      return {
        headline: title.replace(/\s+/g, ' '),
        summary,
        source_name: 'OpenAlex',
        source_url: landing,
        _score: 1,
      };
    })
    .filter(Boolean);
}

function reconstructAbstract(inverted) {
  if (!inverted || typeof inverted !== 'object') return '';
  const positions = [];
  for (const [word, idxs] of Object.entries(inverted)) {
    for (const i of idxs || []) positions.push([i, word]);
  }
  positions.sort((a, b) => a[0] - b[0]);
  return positions.map(([, w]) => w).join(' ');
}

/**
 * Prefer arXiv; on exhaustion fall back to OpenAlex; on total failure return [].
 */
async function searchPapers({ arxivQuery, openAlexQuery, label }) {
  try {
    const items = await searchArxiv(arxivQuery);
    if (items.length) return items;
    console.warn(`arXiv returned 0 results for ${label}; trying OpenAlex backup…`);
  } catch (err) {
    console.warn(
      `arXiv failed for ${label} (${err?.message || err}); trying OpenAlex backup…`
    );
  }

  try {
    const backup = await searchOpenAlex(openAlexQuery);
    if (backup.length) {
      console.warn(`Using OpenAlex backup for ${label} (${backup.length} items).`);
      return backup;
    }
    console.warn(`OpenAlex backup returned 0 results for ${label}.`);
  } catch (err) {
    console.warn(`OpenAlex backup failed for ${label} (${err?.message || err}).`);
  }

  console.warn(`Continuing without paper sources for ${label} (HN-only fallback).`);
  return [];
}

function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = (item.headline || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function pickTop(items, n) {
  // Keep a wider pool; validate.mjs applies insight scoring & final ranking.
  return dedupe(items)
    .sort((a, b) => (b._score || 0) - (a._score || 0))
    .slice(0, n)
    .map(({ _score, ...rest }) => ({
      ...rest,
      _popularity: typeof _score === 'number' ? _score : 0,
    }));
}

async function settled(label, promise) {
  try {
    return await promise;
  } catch (err) {
    console.warn(`${label} research failed (${err?.message || err}); using empty set.`);
    return [];
  }
}

export async function researchDigest() {
  // HN tolerates parallelism; arXiv must be sequential + paced (TOU: 1 req / 3s).
  const [hnModels, hnProducts, hnAlgo] = await Promise.all([
    settled('HN LLM', searchHn('LLM')),
    settled('HN Show HN', searchHn('Show HN')),
    settled('HN open source', searchHn('open source')),
  ]);

  const paperModels = await searchPapers({
    label: 'models & research',
    arxivQuery: 'cat:cs.LG OR cat:cs.AI OR cat:cs.CL',
    openAlexQuery: 'large language model OR foundation model machine learning',
  });

  const paperAlgo = await searchPapers({
    label: 'algorithms & systems',
    arxivQuery: 'all:"test-time" OR all:"mixture of experts" OR all:reasoning',
    openAlexQuery: 'test-time compute OR mixture of experts OR LLM reasoning systems',
  });

  return {
    model: pickTop([...hnModels, ...paperModels], 8),
    algorithm: pickTop([...paperAlgo, ...hnAlgo], 8),
    product: pickTop(hnProducts, 8),
  };
}

// Test helpers (not used by the agent CLI).
export const __test = {
  isRateExceededBody,
  retryAfterMs,
  reconstructAbstract,
  parseArxiv,
  truncate,
};
