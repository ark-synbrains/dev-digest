# /dev/digest newsletter agent

Server-side agent that builds a `/dev/digest` issue from **free public
sources** and emails it via [Resend](https://resend.com).

## Content sources

No Anthropic key required. Each lane pulls from:

| Source | Role |
|--------|------|
| **Hacker News** (Algolia API) | High-signal tech stories, scored by points/comments |
| **Dev.to** API | Tagged developer articles |
| **Curated RSS** | Primary blogs (OpenAI, Google Research, Hugging Face, AWS, GitHub, NVIDIA, Cloudflare, …) |

Feeds and query terms live in `src/sources.js` — edit that file to retarget lanes.

## Schedule

| Mode | How |
|------|-----|
| **Cursor Automation** | Create from [`.cursor/automations/send-dev-digest.md`](../.cursor/automations/send-dev-digest.md) — cron `0 */12 * * *` |
| **GitHub Actions** | `.github/workflows/newsletter.yml` on the same cron + manual dispatch |
| **Long-running process** | `npm run schedule` |
| **One-shot** | `npm start` |

## Get a Resend API key

1. Sign up at [resend.com](https://resend.com)
2. Create an API key: [resend.com/api-keys](https://resend.com/api-keys)
3. Production: verify **newsletters.synbrains.ai** and send from
   `digest@newsletters.synbrains.ai`
4. Sandbox: `RESEND_FROM_EMAIL=/dev/digest <onboarding@resend.dev>` (account email only)

## Configuration

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `RESEND_API_KEY` | yes (send) | — | Resend API key |
| `RESEND_FROM_EMAIL` | yes (send) | `/dev/digest <digest@newsletters.synbrains.ai>` | From header |
| `NEWSLETTER_TO_EMAILS` | yes | `archana.rk@synbrains.ai` | Recipient list |
| `NEWSLETTER_TO_EMAIL` | no | — | Single-address fallback |
| `NEWSLETTER_REPLY_TO` | no | — | Reply-To |
| `NEWSLETTER_SCOPE` | no | `all` | `all` \| `models` \| `products` \| `algorithms` |
| `NEWSLETTER_INTERVAL_HOURS` | no | `12` | Scheduler interval |

## Local usage

```bash
cd agent
cp .env.example .env
npm install

# Live generate from HN + Dev.to + RSS (no send)
npm run dry-run

# Fixture + send
node src/index.js --fixture

# Live generate + send
npm start
```
