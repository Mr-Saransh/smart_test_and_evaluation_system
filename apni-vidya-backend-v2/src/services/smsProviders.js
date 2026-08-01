// Pluggable SMS / WhatsApp providers. Each provider exposes:
//   async send({ to, body, channel }) -> { providerMessageId }
// and throws on failure. Selection is driven by env so production can switch
// providers without code changes; the console provider is the safe default so
// the product works out of the box and in local dev.

// Normalise an Indian mobile number to digits with country code (E.164 without '+').
// 10 digits -> prepend 91. Leaves already-prefixed numbers alone.
function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits; // best-effort; provider will reject if truly invalid
}

// --- Console provider: logs instead of sending. Default / dev fallback. ---
const consoleProvider = {
  name: 'console',
  async send({ to, body, channel }) {
    console.log(`[notify:console] ${channel} -> ${to} :: ${body}`);
    return { providerMessageId: `console-${Date.now()}` };
  },
};

// --- MSG91 (SMS) — https://docs.msg91.com ---
// Uses the legacy sendhttp endpoint for simplicity; swap to the flow API if you
// use DLT templates. Requires MSG91_AUTH_KEY and MSG91_SENDER_ID.
const msg91Provider = {
  name: 'msg91',
  async send({ to, body }) {
    const authkey = process.env.MSG91_AUTH_KEY;
    const sender = process.env.MSG91_SENDER_ID || 'APNIVD';
    const route = process.env.MSG91_ROUTE || '4'; // 4 = transactional
    if (!authkey) throw new Error('MSG91_AUTH_KEY is not configured');

    const params = new URLSearchParams({
      authkey,
      mobiles: normalizePhone(to),
      message: body,
      sender,
      route,
      country: '91',
    });
    const resp = await fetch(`https://api.msg91.com/api/sendhttp.php?${params.toString()}`);
    const text = await resp.text();
    if (!resp.ok) throw new Error(`MSG91 HTTP ${resp.status}: ${text}`);
    // sendhttp returns the request id as plain text on success.
    return { providerMessageId: text.trim() };
  },
};

// --- Gupshup (WhatsApp) — https://docs.gupshup.io ---
// Requires GUPSHUP_API_KEY and GUPSHUP_SOURCE (your WhatsApp business number).
const gupshupProvider = {
  name: 'gupshup',
  async send({ to, body }) {
    const apiKey = process.env.GUPSHUP_API_KEY;
    const source = process.env.GUPSHUP_SOURCE;
    const appName = process.env.GUPSHUP_APP_NAME || 'ApniVidya';
    if (!apiKey || !source) throw new Error('GUPSHUP_API_KEY and GUPSHUP_SOURCE must be configured');

    const params = new URLSearchParams({
      channel: 'whatsapp',
      source,
      destination: normalizePhone(to),
      'src.name': appName,
      message: JSON.stringify({ type: 'text', text: body }),
    });
    const resp = await fetch('https://api.gupshup.io/wa/api/v1/msg', {
      method: 'POST',
      headers: { apikey: apiKey, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(`Gupshup HTTP ${resp.status}: ${JSON.stringify(data)}`);
    return { providerMessageId: data.messageId || 'gupshup-ok' };
  },
};

// Resolve the configured provider for a channel, falling back to console.
function resolveProvider(channel) {
  if (channel === 'whatsapp') {
    if ((process.env.WHATSAPP_PROVIDER || '').toLowerCase() === 'gupshup') return gupshupProvider;
    return consoleProvider;
  }
  // sms
  if ((process.env.SMS_PROVIDER || '').toLowerCase() === 'msg91') return msg91Provider;
  return consoleProvider;
}

module.exports = { resolveProvider, normalizePhone, consoleProvider };
