/**
 * SMTP transport for Hive Digest delivery (nodemailer).
 * Reads SMTP_* env vars; called from run.mjs after the issue is built.
 *
 * Zoho Mail on 587 needs STARTTLS (`requireTLS`) and can close sockets before
 * the greeting when rate-limited — sendSmtpEmail retries those transient errors.
 */
import nodemailer from 'nodemailer';

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing required env: ${name}`);
  return String(v).trim();
}

function optionalEnv(name, fallback = undefined) {
  const v = process.env[name];
  if (v === undefined || v === null || !String(v).trim()) return fallback;
  return String(v).trim();
}

function parseBool(v, fallback) {
  if (v === undefined || v === null || v === '') return fallback;
  const s = String(v).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'off'].includes(s)) return false;
  return fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientSmtpError(err) {
  const msg = String(err?.message || err || '');
  return /socket close|ECONNRESET|ETIMEDOUT|ECONNREFUSED|Greeting never received|Connection closed/i.test(
    msg
  );
}

/**
 * Build a nodemailer transport from SMTP_* environment variables.
 *
 * Required: SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM
 * Optional: SMTP_PORT (default 587), SMTP_SECURE (default true when port=465),
 *           SMTP_REPLY_TO
 */
export function getSmtpConfig() {
  const host = requireEnv('SMTP_HOST');
  const port = Number(optionalEnv('SMTP_PORT', '587'));
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid SMTP_PORT: ${process.env.SMTP_PORT}`);
  }
  const secure = parseBool(process.env.SMTP_SECURE, port === 465);
  const user = requireEnv('SMTP_USER');
  const pass = requireEnv('SMTP_PASS');
  const from = requireEnv('SMTP_FROM');
  const replyTo = optionalEnv('SMTP_REPLY_TO');

  return { host, port, secure, user, pass, from, replyTo };
}

export function createTransport(config = getSmtpConfig()) {
  // Zoho (and similar) on 587 speak plain SMTP then STARTTLS; without
  // requireTLS, nodemailer can race the slow greeting and see "socket close".
  const starttls = !config.secure && config.port === 587;
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: starttls,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
  });
}

/**
 * Send an HTML+text email via SMTP.
 * Retries transient Zoho/socket failures a few times with backoff.
 * @returns {{ messageId: string, accepted: string[], rejected: string[], response: string|null }}
 */
export async function sendSmtpEmail({ to, subject, text, html, headers = {} }) {
  const config = getSmtpConfig();
  const maxAttempts = 5;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const transport = createTransport(config);
    try {
      const info = await transport.sendMail({
        from: config.from,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        text,
        html,
        replyTo: config.replyTo,
        headers,
      });

      return {
        messageId: info.messageId || null,
        accepted: info.accepted || [],
        rejected: info.rejected || [],
        response: info.response || null,
      };
    } catch (err) {
      lastError = err;
      if (!isTransientSmtpError(err) || attempt === maxAttempts) {
        throw err;
      }
      const waitMs = 2000 * attempt;
      console.warn(
        `SMTP transient error attempt ${attempt}/${maxAttempts}: ${err.message}; retrying in ${waitMs}ms…`
      );
      await sleep(waitMs);
    } finally {
      transport.close();
    }
  }

  throw lastError;
}
