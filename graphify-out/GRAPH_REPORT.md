# Graph Report - workspace  (2026-07-22)

## Corpus Check
- 12 files · ~10,318 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 115 nodes · 191 edges · 12 communities (9 shown, 3 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.54)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b2828f01`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Research Resilience
- Automation & Delivery
- Agent Package Config
- Render & Sanitize
- Run Orchestration
- Hive Branding & UI
- Validate & Rank
- SMTP Transport
- Research Tests
- Branch Cleanup CI
- Cursor Automation — Hive Digest (monthly)
- Cursor Automation (Preferred)

## God Nodes (most connected - your core abstractions)
1. `main()` - 13 edges
2. `fetchWithRetry()` - 12 edges
3. `buildIssue()` - 8 edges
4. `sanitizeIssue()` - 7 edges
5. `hostOf()` - 6 edges
6. `withHostPace()` - 6 edges
7. `searchOpenAlex()` - 6 edges
8. `researchDigest()` - 6 edges
9. `sanitizeDigestText()` - 6 edges
10. `validateAndRankDigest()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Automatic Merged Branch Deletion` --references--> `Delete Merged PR Branch Workflow`  [EXTRACTED]
  README.md → .github/workflows/delete-merged-branch.yml
- `main()` --calls--> `buildIssue()`  [EXTRACTED]
  agent/src/run.mjs → agent/src/render.mjs
- `main()` --calls--> `sanitizeIssue()`  [EXTRACTED]
  agent/src/run.mjs → agent/src/sanitize.mjs
- `main()` --calls--> `sendSmtpEmail()`  [EXTRACTED]
  agent/src/run.mjs → agent/src/smtp.mjs
- `main()` --calls--> `validateAndRankDigest()`  [EXTRACTED]
  agent/src/run.mjs → agent/src/validate.mjs

## Import Cycles
- None detected.

## Communities (12 total, 3 thin omitted)

### Community 0 - "Research Resilience"
Cohesion: 0.17
Nodes (27): assertCircuitClosed(), decodeHtmlEntities(), dedupe(), fetchWithRetry(), getHostState(), HOST_MIN_INTERVAL_MS, hostOf(), hostState (+19 more)

### Community 1 - "Automation & Delivery"
Cohesion: 0.40
Nodes (5): Agent CLI (agent/), Hive Digest, Validation and Insight Ranking, Hive by Synbrains, Three Content Lanes

### Community 2 - "Agent Package Config"
Cohesion: 0.13
Nodes (14): dependencies, nodemailer, description, engines, node, name, private, scripts (+6 more)

### Community 3 - "Render & Sanitize"
Cohesion: 0.27
Nodes (12): accentBar(), buildIssue(), DEFAULT_ORDER, escapeHtml(), HIVE, SECTION_META, decodeHtmlEntities(), REPLACEMENTS (+4 more)

### Community 4 - "Run Orchestration"
Cohesion: 0.23
Nodes (13): researchDigest(), dateStamp(), __dirname, formatDate(), hourStamp(), loadState(), main(), MONTHS (+5 more)

### Community 6 - "Validate & Rank"
Cohesion: 0.29
Nodes (11): BOILERPLATE, clamp(), INSIGHT_TERMS, isHttpUrl(), PRIMARY_HOST_HINTS, REQUIRED, scoreInsight(), stripRankingFields() (+3 more)

### Community 7 - "SMTP Transport"
Cohesion: 0.52
Nodes (6): createTransport(), getSmtpConfig(), optionalEnv(), parseBool(), requireEnv(), sendSmtpEmail()

### Community 8 - "Research Tests"
Cohesion: 0.40
Nodes (4): __test, abs, headers, parsed

### Community 12 - "Cursor Automation — Hive Digest (monthly)"
Cohesion: 0.20
Nodes (8): `agent/` — Hive Digest Node sender, Commands, `/automate` one-liner (local Cursor), Cursor Automation — Hive Digest (monthly), Naming, Prompt, Required environment secrets, Settings

## Knowledge Gaps
- **41 isolated node(s):** `name`, `version`, `private`, `type`, `description` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `buildIssue()` connect `Render & Sanitize` to `Run Orchestration`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `validateAndRankDigest()` connect `Validate & Rank` to `Run Orchestration`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `researchDigest()` connect `Run Orchestration` to `Research Resilience`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Agent Package Config` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._