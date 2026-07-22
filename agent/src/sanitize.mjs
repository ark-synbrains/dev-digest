/**
 * Sanitize Hive Digest copy for email clients (ASCII-safe).
 *
 * Product: Hive Digest (hive.synbrains.ai). This module is used by the Node
 * sender in agent/ (`hive-digest-agent`) before SMTP delivery.
 *
 * Decodes HTML entities, then removes curly quotes, arrows, ellipses, and
 * other odd glyphs that show up poorly in mail clients.
 */

const REPLACEMENTS = [
  [/[\u2014\u2013\u2012\u2010\u2212]/g, '-'], // em/en/figure dashes, minus
  [/\u2026/g, '...'],
  [/[\u201C\u201D\u00AB\u00BB]/g, '"'],
  [/[\u2018\u2019\u2032]/g, "'"],
  [/[\u00B7\u2022\u2023\u2043]/g, '-'],
  [/[\u2192\u2197\u2196\u21D2]/g, '->'],
  [/\u00D7/g, 'x'],
  [/\u00A0/g, ' '], // nbsp
  [/[\u200B-\u200D\uFEFF]/g, ''], // zero-width
  [/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ''], // controls (keep \t \n \r)
];

/**
 * Decode HTML entities from feed text (e.g. HN story_text uses &#x27;).
 * Handles common named entities plus decimal/hex numeric entities.
 * Runs multiple passes so double-encoded forms like &amp;#x27; resolve.
 */
export function decodeHtmlEntities(input) {
  let s = String(input ?? '');

  for (let i = 0; i < 3; i += 1) {
    const prev = s;
    s = s
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&apos;/gi, "'")
      .replace(/&nbsp;/gi, ' ')
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        const code = parseInt(hex, 16);
        if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
        try {
          return String.fromCodePoint(code);
        } catch {
          return '';
        }
      })
      .replace(/&#(\d+);/g, (_, dec) => {
        const code = Number(dec);
        if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
        try {
          return String.fromCodePoint(code);
        } catch {
          return '';
        }
      });
    if (s === prev) break;
  }

  return s;
}

/**
 * Sanitize a string for Hive Digest subject/body content.
 */
export function sanitizeDigestText(input) {
  let s = decodeHtmlEntities(input);

  // If feed text still contains tags after decode, keep the tag name as words
  // so "<canvas>" becomes "canvas" instead of disappearing or leaking markup.
  s = s.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, ' $1 ');

  try {
    s = s.normalize('NFKC');
  } catch {
    // ignore
  }

  for (const [re, to] of REPLACEMENTS) {
    s = s.replace(re, to);
  }

  // Drop combining marks after decomposition (e.g. accented Latin -> base + mark)
  try {
    s = s.normalize('NFKD').replace(/\p{M}/gu, '');
  } catch {
    // ignore if Unicode property escapes unavailable
  }

  // Keep printable ASCII + common whitespace only
  s = s.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');

  // Tidy whitespace
  s = s
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return s;
}

/**
 * Sanitize digest entry fields (headline/summary/source_name).
 * URLs are left unchanged aside from trimming.
 */
export function sanitizeDigestEntries(byCategory) {
  const out = {};
  for (const [cat, items] of Object.entries(byCategory || {})) {
    out[cat] = (items || []).map((it) => ({
      ...it,
      headline: sanitizeDigestText(it.headline),
      summary: sanitizeDigestText(it.summary),
      source_name: sanitizeDigestText(it.source_name),
      source_url: String(it.source_url || '').trim(),
    }));
  }
  return out;
}

/**
 * Final pass on a built issue (subject/text/html content strings).
 */
export function sanitizeIssue(issue) {
  return {
    ...issue,
    subject: sanitizeDigestText(issue.subject),
    text: sanitizeDigestText(issue.text),
    // Do not decode HTML entities in the finished document (would break &amp; etc.)
    html: sanitizeHtmlDocument(issue.html),
    date: sanitizeDigestText(issue.date),
  };
}

function sanitizeHtmlDocument(html) {
  let s = String(html ?? '');
  for (const [re, to] of REPLACEMENTS) {
    s = s.replace(re, to);
  }
  // Keep markup/ASCII entities intact; only strip leftover non-ASCII glyphs.
  s = s.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
  return s;
}
