/**
 * Contact form handler for rootedresonancetherapy.com
 * Cloudflare Pages Function: POST /api/contact
 *
 * Environment variables (Pages > Settings > Variables and Secrets, set for
 * both Production and Preview):
 *   RESEND_API_KEY    required, secret. Resend API key.
 *   TO_EMAIL          required. Where inquiries land
 *                     (annie@rootedresonancetherapy.com).
 *   FROM_EMAIL        required. Verified Resend sender, either a bare address
 *                     (website@notify.rootedresonancetherapy.com) or
 *                     "Name <address>".
 *   HEALTH_TOKEN      optional, secret. Enables the daily health check.
 *   HEALTH_TO         optional. Where health checks go (Chad only).
 *   TURNSTILE_SECRET  optional, secret. Turns on the Cloudflare Turnstile check.
 *
 * Optional binding:
 *   SUBMISSIONS       KV namespace. When bound, every real inquiry is saved
 *                     for 30 days before any email is sent, so a lead is never
 *                     lost even if email delivery fails.
 *
 * Health check: POST with header "x-health-token: <HEALTH_TOKEN>" and any valid
 * name, email and message. It sends one email to HEALTH_TO with a
 * "[Health check]" subject, skips the auto-reply and the saved copy, and never
 * touches the practice inbox.
 */

const PRACTICE = 'Rooted Resonance Coaching & Therapy';
const SHORT = 'Rooted Resonance';
const SITE = 'rootedresonancetherapy.com';
const PHONE = '513-497-8595';
const PHONE_TEL = '+15134978595';
// The address the site itself shows visitors. Inquiries go to TO_EMAIL.
const PRACTICE_EMAIL = 'rootedresonancetherapy@gmail.com';
const LOGO = `https://${SITE}/media/logo-full.png`;

// Values match the <option> text on /contact exactly.
const STATES = ['Ohio', 'Arizona', 'Colorado', 'Somewhere else in the US', 'Outside the US'];
const INTERESTS = [
  'I am not sure yet',
  'Somatic Therapy',
  'Relational Therapy',
  'Sound Healing',
  'Breathwork',
  'Workshops',
  'Something else',
];

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());

// Constant-time compare so the health token can't be guessed by timing.
function sameToken(a = '', b = '') {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Site palette: ink #0C1210 / #16211B / #1F2C25, cream #EEEBE0,
// moss #7C9A73 / #9CB893, clay #C0714E / #D9906E.
const SANS = "'Jost', Helvetica, Arial, sans-serif";
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const RULE = 'rgba(238,235,224,.17)';
const DIM = 'rgba(238,235,224,.72)';
const FAINT = 'rgba(238,235,224,.6)';

const label = (text) =>
  `<td style="padding:10px 0;font-family:${SANS};font-size:10px;letter-spacing:2.4px;text-transform:uppercase;color:${FAINT};width:150px;vertical-align:top;">${esc(text)}</td>`;
const row = (k, v) =>
  `<tr>${label(k)}<td style="padding:10px 0;font-family:${SANS};font-size:16px;line-height:1.4;color:#EEEBE0;">${v}</td></tr>`;

function shell(inner, footerNote) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"></head>
<body style="margin:0;padding:0;background:#0C1210;font-family:${SANS};color:#EEEBE0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#0C1210;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="width:600px;max-width:100%;background:#16211B;border:1px solid ${RULE};">
      <tr><td align="center" style="padding:32px 40px 22px;border-bottom:1px solid ${RULE};">
        <img src="${LOGO}" width="140" alt="${esc(PRACTICE)}" style="display:block;border:0;width:140px;height:auto;">
      </td></tr>
      ${inner}
    </table>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="width:600px;max-width:100%;">
      <tr><td align="center" style="font-family:${SANS};font-size:11px;color:${FAINT};padding:18px 16px 0;line-height:1.65;">${footerNote}</td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function notification(f) {
  const subject = `Re: Your message to ${SHORT}`;
  const inner = `
      <tr><td style="padding:34px 40px 6px;">
        <p style="margin:0 0 10px;font-family:${SANS};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#9CB893;">New message from the website</p>
        <h1 style="margin:0;font-family:${SERIF};font-weight:normal;font-size:30px;line-height:1.15;color:#EEEBE0;">${esc(f.name)} reached out.</h1>
      </td></tr>
      <tr><td style="padding:22px 40px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top:1px solid ${RULE};border-bottom:1px solid ${RULE};">
          ${row('Email', `<a href="mailto:${esc(f.email)}" style="color:#D9906E;text-decoration:none;">${esc(f.email)}</a>`)}
          ${row('Located in', esc(f.state))}
          ${row('Interested in', esc(f.interest))}
        </table>
      </td></tr>
      <tr><td style="padding:26px 40px 0;">
        <p style="margin:0 0 10px;font-family:${SANS};font-size:10px;letter-spacing:2.4px;text-transform:uppercase;color:${FAINT};">Their message</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#1F2C25;border-left:2px solid #7C9A73;">
          <tr><td style="padding:20px 22px;font-family:${SANS};font-size:16px;line-height:1.7;color:rgba(238,235,224,.88);white-space:pre-wrap;">${esc(f.message)}</td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:28px 40px 8px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
          <td style="background:#C0714E;border-radius:2px;">
            <a href="mailto:${esc(f.email)}?subject=${encodeURIComponent(subject)}" style="display:inline-block;padding:14px 28px;font-family:${SANS};font-size:12px;letter-spacing:2.4px;text-transform:uppercase;color:#150F0B;text-decoration:none;">Reply to ${esc(f.name)}</a>
          </td>
        </tr></table>
        <p style="margin:14px 0 0;font-family:${SANS};font-size:13px;line-height:1.6;color:${DIM};">Hitting Reply in your inbox also works. It goes straight to ${esc(f.name)}.</p>
      </td></tr>
      <tr><td style="padding:24px 40px 32px;">
        <p style="margin:0;padding-top:18px;border-top:1px solid ${RULE};font-family:${SANS};font-size:12px;line-height:1.65;color:${FAINT};">Submitted ${esc(f.when)}<br>Via the contact form at <a href="https://${SITE}" style="color:#9CB893;text-decoration:none;">${SITE}</a>. Email is not a secure or confidential channel. If this message holds clinical detail, move the conversation to a secure intake before replying in depth.</p>
      </td></tr>`;
  const text = [
    `${f.name} reached out through ${SITE}.`,
    '',
    `Email: ${f.email}`,
    `Located in: ${f.state}`,
    `Interested in: ${f.interest}`,
    '',
    f.message,
    '',
    `Submitted ${f.when}`,
  ].join('\n');
  return {
    html: shell(inner, 'Someone used the contact form on your website. Reply to this email to answer them directly.'),
    text,
  };
}

function autoReply(f) {
  const first = f.name.split(/\s+/)[0];
  const inner = `
      <tr><td style="padding:34px 40px 6px;">
        <h1 style="margin:0;font-family:${SERIF};font-weight:normal;font-size:30px;line-height:1.2;color:#EEEBE0;">Thank you, ${esc(first)}. Your message came through.</h1>
      </td></tr>
      <tr><td style="padding:20px 40px 4px;font-family:${SANS};font-size:16px;line-height:1.7;color:rgba(238,235,224,.84);">
        <p style="margin:0 0 18px;">I read every message myself, and I usually reply within two business days.</p>
        <p style="margin:0 0 18px;">If you don't hear back within two business days, please call <a href="tel:${PHONE_TEL}" style="color:#D9906E;text-decoration:none;">${PHONE}</a> or email <a href="mailto:${PRACTICE_EMAIL}" style="color:#D9906E;text-decoration:none;">${PRACTICE_EMAIL}</a>. Messages do sometimes go astray, and I would rather you nudge me than wait.</p>
        <p style="margin:0 0 6px;">Annie</p>
        <p style="margin:0;font-size:13px;color:${FAINT};">Annie Memmott, LPC &middot; Licensed in Ohio, Arizona and Colorado</p>
      </td></tr>
      <tr><td style="padding:24px 40px 34px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#1F2C25;border-left:2px solid #C0714E;">
          <tr><td style="padding:16px 20px;font-family:${SANS};font-size:14px;line-height:1.65;color:#EEEBE0;">
            If you are in crisis or thinking about harming yourself, call or text <a href="tel:988" style="color:#D9906E;text-decoration:none;font-weight:500;">988</a>, any time, day or night. This inbox is not monitored for emergencies.
          </td></tr>
        </table>
      </td></tr>`;
  const text = [
    `Thank you, ${first}. Your message came through.`,
    '',
    'I read every message myself, and I usually reply within two business days.',
    '',
    `If you don't hear back within two business days, please call ${PHONE} or email ${PRACTICE_EMAIL}.`,
    '',
    'Annie',
    'Annie Memmott, LPC, licensed in Ohio, Arizona and Colorado',
    '',
    'If you are in crisis or thinking about harming yourself, call or text 988, any time, day or night. This inbox is not monitored for emergencies.',
  ].join('\n');
  return {
    html: shell(
      inner,
      `${esc(PRACTICE)} &middot; <a href="https://${SITE}" style="color:${FAINT};">${SITE}</a><br>Email is not a secure channel. Please do not include clinical details in your reply.`,
    ),
    text,
  };
}

async function send(env, payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
}

export async function onRequestPost({ request, env, waitUntil }) {
  let data;
  try {
    const ct = request.headers.get('content-type') || '';
    data = ct.includes('application/json') ? await request.json() : Object.fromEntries(await request.formData());
  } catch {
    return json({ ok: false, error: 'Could not read that submission.' }, 400);
  }

  // Honeypot: people never see this field, so anything in it is a bot.
  if (data.company || data._gotcha) return json({ ok: true });

  // A health check with a wrong or missing token is refused outright, so a
  // misconfigured monitor can never land a test in the practice inbox.
  const healthHeader = request.headers.get('x-health-token');
  const health = healthHeader !== null && sameToken(healthHeader, env.HEALTH_TOKEN || '');
  if (healthHeader !== null && !health) return json({ ok: false, error: 'Unauthorized.' }, 401);

  const state = String(data.state || '').trim();
  const interest = String(data.interest || '').trim();
  const f = {
    name: String(data.name || '').trim().slice(0, 120),
    email: String(data.email || '').trim().slice(0, 200),
    message: String(data.message || '').trim().slice(0, 5000),
    state: STATES.includes(state) ? state : 'Not given',
    interest: INTERESTS.includes(interest) ? interest : 'I am not sure yet',
    when: new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' }) + ' ET',
  };

  if (!f.name || !validEmail(f.email) || !f.message) {
    return json({ ok: false, error: 'Please add your name, a valid email, and a message.' }, 400);
  }

  if (env.TURNSTILE_SECRET && !health) {
    const body = new FormData();
    body.append('secret', env.TURNSTILE_SECRET);
    body.append('response', data['cf-turnstile-response'] || '');
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip) body.append('remoteip', ip);
    const v = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
      .then((r) => r.json())
      .catch(() => ({ success: false }));
    if (!v.success) return json({ ok: false, error: 'The spam check did not go through. Please try again.' }, 400);
  }

  const fallback = `That did not send. Please call ${PHONE} or email ${PRACTICE_EMAIL}.`;

  if (!env.RESEND_API_KEY || !env.TO_EMAIL || !env.FROM_EMAIL) {
    return json({ ok: false, error: fallback }, 500);
  }
  if (health && !env.HEALTH_TO) {
    return json({ ok: false, error: 'HEALTH_TO is not set.' }, 500);
  }

  const from = /</.test(env.FROM_EMAIL) ? env.FROM_EMAIL : `${PRACTICE} <${env.FROM_EMAIL}>`;

  // Save first, so the inquiry survives even if every email below fails.
  if (env.SUBMISSIONS && !health) {
    const key = `inquiry:${new Date().toISOString()}:${crypto.randomUUID().slice(0, 8)}`;
    try {
      await env.SUBMISSIONS.put(key, JSON.stringify({ ...f, delivered: false }), { expirationTtl: 60 * 60 * 24 * 30 });
      f.savedKey = key;
    } catch (err) {
      console.error('KV save failed', err);
    }
  }

  const note = notification(f);
  try {
    await send(env, {
      from,
      to: [health ? env.HEALTH_TO : env.TO_EMAIL],
      reply_to: f.email,
      subject: `${health ? '[Health check] ' : ''}New inquiry from ${f.name} (${f.interest})`,
      html: note.html,
      text: note.text,
    });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: fallback }, 502);
  }

  if (f.savedKey) {
    waitUntil(env.SUBMISSIONS.put(f.savedKey, JSON.stringify({ ...f, delivered: true }), { expirationTtl: 60 * 60 * 24 * 30 }).catch(() => {}));
  }

  // The visitor's confirmation is a courtesy. If it fails, the inquiry still
  // reached Annie, so the visitor still sees success.
  if (!health) {
    const reply = autoReply(f);
    waitUntil(
      send(env, {
        from,
        to: [f.email],
        reply_to: env.TO_EMAIL,
        subject: `Thanks for reaching out to ${SHORT}`,
        html: reply.html,
        text: reply.text,
      }).catch((err) => console.error('Auto-reply failed', err)),
    );
  }

  return json({ ok: true });
}

export const onRequest = () => json({ ok: false, error: 'Method not allowed.' }, 405);
