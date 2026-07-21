import assert from 'node:assert/strict';
import { __test } from './research.mjs';

const { isRateExceededBody, retryAfterMs, reconstructAbstract, parseArxiv, truncate } = __test;

assert.equal(isRateExceededBody('Rate exceeded.'), true);
assert.equal(isRateExceededBody('rate exceeded'), true);
assert.equal(isRateExceededBody('<?xml version="1.0"?>'), false);

const headers = { get: (k) => (k === 'retry-after' ? '2' : null) };
assert.equal(retryAfterMs({ status: 429, headers }, 1), 2000);

const abs = reconstructAbstract({ Hello: [0], world: [1] });
assert.equal(abs, 'Hello world');

const xml = `
<feed>
  <entry>
    <title>Test Paper</title>
    <summary>A short abstract about transformers.</summary>
    <id>http://arxiv.org/abs/1234.5678</id>
  </entry>
</feed>`;
const parsed = parseArxiv(xml);
assert.equal(parsed.length, 1);
assert.equal(parsed[0].source_name, 'arXiv');
assert.equal(parsed[0].source_url, 'https://arxiv.org/abs/1234.5678');
assert.equal(parsed[0].headline, 'Test Paper');

assert.ok(truncate('x'.repeat(400), 50).endsWith('...'));
assert.equal(truncate('short', 50), 'short');

console.log('research.test.mjs: ok');
