/**
 * Regression tests for Hive Digest naming + issue pipeline after the
 * tech-digest / newsletter → hive-digest renames.
 */
import assert from 'node:assert/strict';
import { sanitizeDigestText, sanitizeIssue } from './sanitize.mjs';
import { buildIssue } from './render.mjs';
import { validateAndRankDigest } from './validate.mjs';

// Renamed sanitizer must still flatten fancy glyphs for email clients.
assert.equal(sanitizeDigestText('Foo “bar” … A → B'), 'Foo "bar" ... A -> B');
assert.equal(sanitizeDigestText('<canvas> demo'), 'canvas demo');

const raw = {
  model: [
    {
      headline: 'OpenAI releases GPT benchmark suite for agent evals',
      summary:
        'New open benchmark measures tool-use accuracy and latency on multi-step coding agents. Engineers can reproduce results from the published leaderboard.',
      source_name: 'OpenAI',
      source_url: 'https://openai.com/index/benchmark',
    },
  ],
  algorithm: [
    {
      headline: 'FlashAttention-4 cuts memory on long-context transformers',
      summary:
        'Paper shows a tiling algorithm that reduces HBM traffic for 128k context with open-source CUDA kernels on GitHub.',
      source_name: 'arXiv',
      source_url: 'https://arxiv.org/abs/2401.12345',
    },
  ],
  product: [
    {
      headline: 'Anthropic launches Claude Code enterprise controls',
      summary:
        'Product release adds SSO, audit logs, and repo allowlists for team coding agents in Claude.ai.',
      source_name: 'Anthropic',
      source_url: 'https://www.anthropic.com/news/claude-code',
    },
  ],
};

const { byCategory, sectionOrder, report } = validateAndRankDigest(raw);
assert.ok(report.kept >= 1, 'expected at least one ranked entry');
assert.ok(sectionOrder.length >= 1, 'expected ranked section order');

const issue = sanitizeIssue(
  buildIssue({ date: '22 Jul 2026', byCategory, sectionOrder })
);

assert.equal(issue.subject, 'Hive Digest - 22 Jul 2026');
assert.match(issue.html, /Hive Digest/);
assert.match(issue.html, /hive\.synbrains\.ai/);
assert.match(issue.text, /^Hive Digest/m);

// Insight scores are ranking-only and must never appear in the emailed issue.
assert.doesNotMatch(issue.subject, /insight\s*score|insightScore/i);
assert.doesNotMatch(issue.html, /insight\s*score|insightScore/i);
assert.doesNotMatch(issue.text, /insight\s*score|insightScore/i);

// Former product names must not reappear in rendered output.
assert.doesNotMatch(issue.html + issue.text + issue.subject, /tech-digest|\/dev\/digest/i);

console.log('digest.test.mjs: ok');
