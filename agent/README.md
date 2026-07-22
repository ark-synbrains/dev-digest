# `agent/` — Hive Digest Node sender

npm package: **`hive-digest-agent`**

This directory is the **scheduled Node CLI** that researches, validates/ranks,
and emails a Hive Digest issue via SMTP. It is **not** a Cursor Cloud Agent.

| Piece | Role |
| --- | --- |
| `src/run.mjs` | Orchestration (`npm start` / `npm run generate`) |
| `src/research.mjs` | HN + arXiv (+ OpenAlex / HN fallbacks) → `researchDigest()` |
| `src/validate.mjs` | Schema + insight ranking → `validateAndRankDigest()` |
| `src/render.mjs` | Dark email HTML/text → `buildIssue()` (`HIVE` palette) |
| `src/sanitize.mjs` | `sanitizeDigestText` / `sanitizeIssue` |
| `src/smtp.mjs` | nodemailer transport (`SMTP_*` env) |
| `state.json` | Local send history (gitignored patterns may apply in CI) |

Browser UI counterpart (Claude.ai artifact): [`../hive-digest.html`](../hive-digest.html).

Monthly automation entrypoints:

- [`.github/workflows/hive-digest.yml`](../.github/workflows/hive-digest.yml)
- [`.cursor/automations/hive-digest.md`](../.cursor/automations/hive-digest.md)

### Commands

```bash
npm install
npm test
npm run generate   # dry-run → agent/out/
npm start          # research + send (needs SMTP_* + NEWSLETTER_TO_EMAILS)
```

`NEWSLETTER_TO_EMAILS` is the recipient-list secret name (historical); the
product name is still **Hive Digest**.
