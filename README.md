# Rooted Resonance : rebuild

Static prototype for rootedresonancecoaching.com (Annie Memmott, LPC).

## Pages
| File | Purpose |
|---|---|
| `index.html` | Home. Framework selector, offerings split by track, scope of practice |
| `reconnect.html` | Stage III offering page (Sound Healing) |
| `blog.html` | Journal index |
| `blog-adaptation.html` | Sample post |
| `404.html` | Custom not-found page |

## Content / CMS
- `content/posts/*.md` holds post source, edited via TinaCMS
- `tina/config.js` holds the collection schema
- Admin lives at `/admin` once Tina is connected to the repo

## Contact form (Resend)
The form on `/contact` posts to `/api/contact`, a Cloudflare Pages Function in
`functions/api/contact.js`. It sends through Resend instead of EmailJS, so a Gmail
sign-in or password change can't break it. Two emails go out per inquiry: a
notification to the practice inbox (hitting Reply answers the visitor) and a short
confirmation to the visitor with the two business day timeline, the phone number,
the email address the site shows, and the 988 line.

Cloudflare Pages > Settings > Variables and Secrets (set for Production and Preview):

| Name | What |
|---|---|
| `RESEND_API_KEY` | Secret. Resend API key for this domain |
| `TO_EMAIL` | `annie@rootedresonancetherapy.com` |
| `FROM_EMAIL` | Verified Resend sender, e.g. `website@notify.rootedresonancetherapy.com` |
| `HEALTH_TOKEN` | Secret. Random string used by the daily health check |
| `HEALTH_TO` | Where health checks go (not the practice inbox) |
| `TURNSTILE_SECRET` | Optional. Turns on the Cloudflare Turnstile spam check |

Optional: bind a KV namespace as `SUBMISSIONS` and every inquiry is saved for 30
days before any email goes out, so nothing is lost if delivery fails.

Health check: POST to `/api/contact` with header `x-health-token: <HEALTH_TOKEN>` and
a valid name, email and message. It emails only `HEALTH_TO`, with a `[Health check]`
subject, skips the visitor confirmation and the saved copy, and never touches the
practice inbox. A wrong token gets a 401 and sends nothing.

Key rotation: create a new key in Resend, paste it into `RESEND_API_KEY`, redeploy,
then delete the old key in Resend.

If anything fails on the server, the visitor is shown the phone number and email
address directly. `emailjs-template.html` is no longer used by the form and is kept
only for reference.

## Media
`media/ambient.mp4` (631 KB, compressed from 4.5 MB), poster frame, and logo
derivatives knocked out for dark backgrounds.

## Scope of practice (do not edit without Annie's sign-off)
- **Therapy** (somatic, relational): licensed clinical work, CO / AZ / OH only
- **Coaching & wellness** (sound healing, breathwork, workshops): nationwide, not psychotherapy
