# /dev/digest — technical newsletter agent

A self-contained, single-file HTML tool that generates a changelog-style tech
newsletter for hands-on engineers and researchers: new/updated AI models, new
algorithms and systems techniques, and company product releases — each pulled
live from the web and written up with a source link.

No build step, no server, no dependencies to install. Open the file and go.

---

## Features

- **Live generation** — pulls current developments via web search across three
  lanes: *models & research*, *algorithms & systems*, and *product & company
  releases*. Runs the three lanes in parallel and renders each as it completes,
  instead of blocking on the slowest one.
- **Scoped runs** — narrow a run to just one lane instead of the full mix.
- **Retry & timeout handling** — transient network errors and 429/5xx
  responses are retried once automatically; a lane that still fails shows the
  real error message inline instead of a generic failure.
- **Light / dark theme toggle** — a small switch in the masthead flips between
  a warm "paper terminal" light theme and a "phosphor terminal" dark theme
  (green accents in both, since green phosphor was the classic easy-on-the-eyes
  CRT choice — worth noting that's more terminal folklore than settled
  research, but it fits the concept either way).
- **Download the issue** — export the current issue as Markdown (`.md`, plain
  text, good for pasting into Notion/GitHub/Slack) or as a styled, standalone
  HTML file that mirrors the site's design and captures whichever theme was
  active at download time.
- **Responsive layout** — usable from small phone screens up through wide
  desktop viewports; controls stack into a touch-friendly single column below
  480px.

## How to use it

1. Open `tech-digest-agent.html` inside a Claude.ai artifact (see
   **Important: where this runs**, below).
2. Optionally narrow the scope with the dropdown (all categories / models /
   products / algorithms).
3. Click **generate latest issue**. Each lane shows a live "searching…"
   status with an elapsed timer; sections fill in as they complete.
4. Once at least one lane succeeds, the download icon (↓) becomes active and
   a format dropdown appears next to it. Pick `.md` or `.html` and click the
   icon to save the issue.
5. Use the toggle switch in the top-right of the masthead to flip between
   light and dark themes at any time.

## Important: where this runs

This tool calls `https://api.anthropic.com/v1/messages` directly from the
browser, with Claude's web search tool enabled. That request only succeeds
inside a Claude.ai artifact (or another Claude surface that provides the same
proxy), which securely injects the necessary credentials without exposing an
API key in the page itself.

**Opening this file directly in a plain browser (double-clicking it on your
desktop) will not work** — there's no API key configured client-side, so the
fetch call will fail. Keep it running inside the artifact environment it was
built for.

## Customizing

Everything lives in one file, so customization means editing CSS variables or
a few small JS functions directly.

**Colors** — both themes are defined as CSS custom properties near the top of
the `<style>` block:
```css
:root{ /* light theme */
  --bg: #F2EEE4;
  --amber: #3F6B4A;   /* primary accent */
  --add: #2F5C43;     /* entry-tag color */
  --del: #9C3B2C;     /* error/warning color */
  /* …etc */
}
html[data-theme="dark"]{ /* dark theme overrides */
  --bg: #0F1516;
  --amber: #5FBE87;
  /* …etc */
}
```
Change the hex values to retheme either mode; every component reads from
these variables, including the downloadable HTML export.

**Category focus / prompts** — the `categoryPrompt(cat, today)` function in
the `<script>` block controls what each lane searches for and how many items
it asks for (default: 3–4 per lane). Edit the `focus` object there to change
what counts as a "model," "algorithm," or "product" entry.

**Timeout** — the overall per-run timeout is set via `overallTimeoutMs` inside
`generateIssue()` (default 75000 ms / 75s).

**Model** — API calls use `claude-sonnet-4-6`. Change the `model` field inside
`fetchCategory()` to point at a different model string if needed.

## Automated email agent (every 12 hours)

The `agent/` package builds a fresh issue from **Hacker News, Dev.to, and
curated RSS feeds**, then emails it via **Resend** to every address in
`NEWSLETTER_TO_EMAILS`. (The HTML UI still uses Claude web search; the
scheduled agent uses these public sources instead.)

- **Cursor Automation:** [`.cursor/automations/send-dev-digest.md`](.cursor/automations/send-dev-digest.md)
- **GitHub Actions:** `.github/workflows/newsletter.yml` (`0 */12 * * *`)
- **Secrets:** `RESEND_API_KEY`, `NEWSLETTER_TO_EMAILS` (optional `RESEND_FROM_EMAIL`)
- **Config:** [`agent/README.md`](agent/README.md), sources in `agent/src/sources.js`

```bash
cd agent && npm install
cp .env.example .env   # set Resend + NEWSLETTER_TO_EMAILS
npm run dry-run        # live generate from public sources
npm start              # generate + send
```

## Known limitations

- **Session-only (HTML UI)** — nothing persists in the browser tool. Reloading
  the page resets the theme to light and clears the current issue.
- **Source coverage varies** — HN/Dev.to/RSS quality depends on what's
  published recently; always check linked sources before citing.
- **Domain verification** — production sends need `newsletters.synbrains.ai`
  verified in Resend (sandbox `onboarding@resend.dev` only reaches your
  Resend account email).

## File structure

```
tech-digest-agent.html                 interactive single-file generator UI
agent/                                 newsletter agent (HN/Dev.to/RSS + Resend)
  src/sources.js                       feed URLs and search queries per lane
.cursor/automations/send-dev-digest.md Cursor Automation prompt (every 12h)
.github/workflows/newsletter.yml       GitHub Actions cron every 12 hours
README.md                              this file
```
