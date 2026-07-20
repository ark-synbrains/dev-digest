# AGENTS.md

## Cursor Cloud specific instructions

This repo has two products that share the `/dev/digest` newsletter concept but use
**different content pipelines**; there is no shared workspace tooling.

- `agent/` — Node.js (ES modules, `"type": "module"`, Node >= 20) CLI that pulls
  content from Hacker News (Algolia), Dev.to, and curated RSS, then emails via
  Resend. This is the only part with installable dependencies (`resend`).
- `tech-digest-agent.html` — a single self-contained browser file that calls
  `api.anthropic.com` directly. It only works inside a Claude.ai artifact (it has
  no client-side key); opening it in a plain browser will fail. It has no build,
  no server, and no dependencies, so there is nothing to run locally for it.

There is **no lint or test suite** configured (no ESLint/Prettier/Jest/Vitest,
no `lint`/`test` npm scripts). "Testing" the agent means running it in one of its
modes below and inspecting output.

### Running the agent (`agent/`)

Commands and env vars are documented in `agent/README.md` and `agent/package.json`.
Non-obvious notes:

- Run agent commands from the `agent/` directory (its `package.json` lives there).
- `node src/index.js --fixture --dry-run` is a fully offline smoke test (no network,
  no secrets) that exercises generate -> render markdown.
- `node src/index.js --dry-run` does live generation (needs outbound HTTPS to
  hn.algolia.com, dev.to, and RSS feeds) but does NOT send email, so it needs no
  secrets. Individual feed failures are logged as warnings and tolerated; a run
  only fails if every lane fails.
- `npm start` / `node src/index.js` does live generate **and sends** via Resend.
  It requires `RESEND_API_KEY` and recipients (`NEWSLETTER_TO_EMAILS`), which are
  provided as Cloud Agent secrets. `RESEND_FROM_EMAIL` is also a secret; when it is
  the Resend sandbox sender (`onboarding@resend.dev`), Resend only delivers to the
  Resend account's own email regardless of the recipient list.
- `npm run schedule` (`src/scheduler.js`) is a long-running interval loop — do not
  use it for one-shot verification; use `--once` or `src/index.js` instead.
