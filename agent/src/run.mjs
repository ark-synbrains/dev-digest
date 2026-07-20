#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { researchDigest } from './research.mjs';
import { buildIssue } from './render.mjs';
import { sendSmtpEmail } from './smtp.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const STATE_PATH = join(ROOT, 'state.json');

function loadState() {
  if (!existsSync(STATE_PATH)) {
    return { runsCompleted: 0, lastSentAt: null, history: [] };
  }
  return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
}

function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing required env: ${name}`);
  return v.trim();
}

function parseRecipients(raw) {
  return raw
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatDate(d = new Date()) {
  return d.toDateString();
}

function dateStamp(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function hourStamp(d = new Date()) {
  return d.toISOString().slice(0, 13).replace('T', '-');
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const state = loadState();
  const now = new Date();
  const date = formatDate(now);
  const stamp = dateStamp(now);

  console.log('Researching digest lanes…');
  const byCategory = await researchDigest();
  const total = Object.values(byCategory).reduce((n, arr) => n + arr.length, 0);
  if (total === 0) throw new Error('No digest entries found from research sources');

  const issue = buildIssue({ date, byCategory });

  if (dryRun) {
    const outDir = join(ROOT, 'out');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, `digest-${stamp}.html`), issue.html);
    writeFileSync(join(outDir, `digest-${stamp}.txt`), issue.text);
    console.log(JSON.stringify({ ok: true, dryRun: true, subject: issue.subject, date, entries: total }, null, 2));
    return;
  }

  const to = parseRecipients(requireEnv('NEWSLETTER_TO_EMAILS'));
  if (!to.length) throw new Error('NEWSLETTER_TO_EMAILS parsed to empty list');

  const issueKey = `dev-digest/${hourStamp()}`;

  console.log(`Sending /dev/digest for ${date} to ${to.length} recipient(s) via SMTP…`);
  const result = await sendSmtpEmail({
    to,
    subject: issue.subject,
    text: issue.text,
    html: issue.html,
    headers: {
      'X-Entity-Ref-ID': issueKey,
      'X-Dev-Digest-Date': stamp,
    },
  });

  if (result.rejected?.length) {
    throw new Error(`SMTP rejected recipients: ${result.rejected.join(', ')}`);
  }

  // Drop legacy issue-number fields if present from older state files.
  delete state.lastIssueNumber;

  state.runsCompleted = (state.runsCompleted || 0) + 1;
  state.lastSentAt = new Date().toISOString();
  state.history = [
    ...(state.history || []),
    {
      date,
      dateStamp: stamp,
      subject: issue.subject,
      messageId: result.messageId,
      sentAt: state.lastSentAt,
      recipients: to.length,
    },
  ].slice(-20);
  saveState(state);

  console.log(
    JSON.stringify(
      {
        ok: true,
        date,
        subject: issue.subject,
        messageId: result.messageId,
        accepted: result.accepted,
        recipients: to.length,
        runsCompleted: state.runsCompleted,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err?.stack || err?.message || err);
  process.exit(1);
});
