/**
 * Runtime configuration for the newsletter agent.
 * All values come from environment variables so the recipient and
 * sending identity can be changed without code edits.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function optional(name, fallback = '') {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

function optionalBool(name, fallback = false) {
  const value = optional(name);
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

/**
 * Parse a recipient list from env.
 * Accepts comma, semicolon, whitespace, or newline separators.
 * Prefers NEWSLETTER_TO_EMAILS; falls back to NEWSLETTER_TO_EMAIL.
 */
export function parseRecipientList(raw, { required = false } = {}) {
  const text = (raw || '').trim();
  if (!text) {
    if (required) {
      throw new Error(
        'Missing recipients — set NEWSLETTER_TO_EMAILS (comma-separated) or NEWSLETTER_TO_EMAIL'
      );
    }
    return [];
  }

  const seen = new Set();
  const recipients = [];
  for (const part of text.split(/[,;\s]+/)) {
    const email = part.trim().toLowerCase();
    if (!email) continue;
    if (!EMAIL_RE.test(email)) {
      throw new Error(`Invalid recipient email: ${part.trim()}`);
    }
    if (!seen.has(email)) {
      seen.add(email);
      recipients.push(email);
    }
  }

  if (required && recipients.length === 0) {
    throw new Error(
      'No valid recipients found in NEWSLETTER_TO_EMAILS / NEWSLETTER_TO_EMAIL'
    );
  }

  return recipients;
}

export function loadConfig({
  requireAnthropic = false,
  requireSmtp = false,
} = {}) {
  const recipientsRaw =
    optional('NEWSLETTER_TO_EMAILS') ||
    optional('NEWSLETTER_TO_EMAIL', 'archana.rk@synbrains.ai');
  const recipients = parseRecipientList(recipientsRaw, {
    required: requireSmtp,
  });

  const from = optional(
    'SMTP_FROM_EMAIL',
    optional('NEWSLETTER_FROM_EMAIL', '/dev/digest <digest@newsletters.synbrains.ai>')
  );
  const replyTo = optional('NEWSLETTER_REPLY_TO', '');
  const anthropicApiKey = optional('ANTHROPIC_API_KEY');
  const model = optional('ANTHROPIC_MODEL', 'claude-sonnet-4-6');
  const scope = optional('NEWSLETTER_SCOPE', 'all'); // all | models | products | algorithms
  const intervalHours = Number(optional('NEWSLETTER_INTERVAL_HOURS', '12'));

  const smtp = {
    host: optional('SMTP_HOST'),
    port: Number(optional('SMTP_PORT', '587')),
    secure: optionalBool('SMTP_SECURE', false), // true for 465
    user: optional('SMTP_USER'),
    pass: optional('SMTP_PASS'),
  };

  if (requireAnthropic && !anthropicApiKey) {
    throw new Error('Missing required environment variable: ANTHROPIC_API_KEY');
  }

  if (requireSmtp) {
    if (!smtp.host) {
      throw new Error('Missing required environment variable: SMTP_HOST');
    }
    if (!Number.isFinite(smtp.port) || smtp.port <= 0) {
      throw new Error('SMTP_PORT must be a positive number');
    }
    // Auth is optional for open relays / local postfix, but usual for real providers
    if (smtp.user && !smtp.pass) {
      throw new Error('SMTP_PASS is required when SMTP_USER is set');
    }
    if (!from) {
      throw new Error('Missing required environment variable: SMTP_FROM_EMAIL');
    }
  }

  if (!Number.isFinite(intervalHours) || intervalHours <= 0) {
    throw new Error('NEWSLETTER_INTERVAL_HOURS must be a positive number');
  }

  return {
    /** @deprecated use `recipients` — kept for single-address callers */
    to: recipients[0],
    recipients,
    from,
    replyTo: replyTo || undefined,
    anthropicApiKey,
    model,
    scope,
    intervalHours,
    smtp,
  };
}
