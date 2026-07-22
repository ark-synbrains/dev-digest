# Graph Report - .  (2026-07-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 120 nodes · 237 edges · 8 communities
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `51cb8b2c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- research.mjs
- graphrag.test.mjs
- render.mjs
- graphrag.mjs
- run.mjs
- smtp.mjs
- compute_boosts
- research.test.mjs

## God Nodes (most connected - your core abstractions)
1. `main()` - 15 edges
2. `fetchWithRetry()` - 12 edges
3. `enrichDigestWithGraphRag()` - 11 edges
4. `buildIssue()` - 9 edges
5. `sanitizeIssue()` - 8 edges
6. `validateAndRankDigest()` - 8 edges
7. `buildExtraction()` - 7 edges
8. `sanitizeDigestText()` - 7 edges
9. `sendSmtpEmail()` - 7 edges
10. `hostOf()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `enrichDigestWithGraphRag()`  [EXTRACTED]
  agent/src/run.mjs → agent/src/graphrag.mjs
- `main()` --calls--> `buildIssue()`  [EXTRACTED]
  agent/src/run.mjs → agent/src/render.mjs
- `main()` --calls--> `researchDigest()`  [EXTRACTED]
  agent/src/run.mjs → agent/src/research.mjs
- `main()` --calls--> `sanitizeIssue()`  [EXTRACTED]
  agent/src/run.mjs → agent/src/sanitize.mjs
- `main()` --calls--> `sendSmtpEmail()`  [EXTRACTED]
  agent/src/run.mjs → agent/src/smtp.mjs

## Import Cycles
- None detected.

## Communities (8 total, 0 thin omitted)

### Community 0 - "research.mjs"
Cohesion: 0.17
Nodes (28): assertCircuitClosed(), decodeHtmlEntities(), dedupe(), fetchWithRetry(), getHostState(), HOST_MIN_INTERVAL_MS, hostOf(), hostState (+20 more)

### Community 1 - "graphrag.test.mjs"
Cohesion: 0.14
Nodes (19): baseScore, boostedScore, { byCategory: ranked, report }, { extraction, idMap }, fallback, sample, serialized, tmp (+11 more)

### Community 2 - "render.mjs"
Cohesion: 0.22
Nodes (15): { byCategory, sectionOrder, report }, issue, raw, accentBar(), buildIssue(), DEFAULT_ORDER, escapeHtml(), HIVE (+7 more)

### Community 3 - "graphrag.mjs"
Cohesion: 0.23
Nodes (16): AGENT_ROOT, buildExtraction(), computeNodeFallbackBoosts(), conceptId(), __dirname, enabled(), enrichDigestWithGraphRag(), entryId() (+8 more)

### Community 4 - "run.mjs"
Cohesion: 0.19
Nodes (15): archiveIssue(), dateStamp(), DIGESTS_DIR, __dirname, formatDate(), hourStamp(), loadState(), main() (+7 more)

### Community 5 - "smtp.mjs"
Cohesion: 0.42
Nodes (8): createTransport(), getSmtpConfig(), isTransientSmtpError(), optionalEnv(), parseBool(), requireEnv(), sendSmtpEmail(), sleep()

### Community 6 - "compute_boosts"
Cohesion: 0.60
Nodes (4): clamp(), compute_boosts(), main(), Score each entry node for GraphRAG ranking boosts (0–12).

### Community 7 - "research.test.mjs"
Cohesion: 0.40
Nodes (4): __test, abs, headers, parsed

## Knowledge Gaps
- **33 isolated node(s):** `raw`, `{ byCategory, sectionOrder, report }`, `issue`, `__dirname`, `AGENT_ROOT` (+28 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `enrichDigestWithGraphRag()` connect `graphrag.mjs` to `graphrag.test.mjs`, `run.mjs`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `validateAndRankDigest()` connect `graphrag.test.mjs` to `render.mjs`, `run.mjs`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `sendSmtpEmail()` connect `smtp.mjs` to `run.mjs`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `raw`, `{ byCategory, sectionOrder, report }`, `issue` to the rest of the system?**
  _33 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `graphrag.test.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._