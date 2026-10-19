// gototravelapp.com/join/<token>: the page a crew invite link opens when the app isn't installed, and
// the link preview Messages, WhatsApp and others show for it ("Join Pavan’s San Francisco trip", the
// dates, a photo of the place). Rendered per invite on the server because link previews never run
// JavaScript. Trip details come from the invite-preview function (only what the link already shows).
// With the app installed, iOS opens the app straight from the link (apple-app-site-association).
export const config = { runtime: 'edge' };

const PREVIEW_FN = 'https://zkwamqtnaegvlptzdqxn.supabase.co/functions/v1/invite-preview';
// Where "Get the app" goes. Swap in the TestFlight public link once the external tester group has one.
const GET_APP_URL = '/#join';
const FALLBACK_PHOTO = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&h=630&fit=crop&crop=entropy&q=80&fm=jpg';
const LOGO = '<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" aria-hidden="true" focusable="false"><defs><linearGradient id="logo-t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A9C82"/><stop offset="1" stop-color="#3E7A63"/></linearGradient><clipPath id="logo-c"><rect width="1024" height="1024" rx="230"/></clipPath></defs><g clip-path="url(#logo-c)"><rect width="1024" height="1024" fill="url(#logo-t)"/><g fill="none" stroke="#FFFFFF" stroke-linecap="round"><circle cx="512" cy="512" r="300" stroke-width="34"/><ellipse cx="512" cy="512" rx="128" ry="300" stroke-width="22" opacity="0.45"/><path d="M232 412H792M232 612H792" stroke-width="22" opacity="0.45"/></g><path d="M318 700C390 540 520 450 668 420" fill="none" stroke="#FFFFFF" stroke-width="40" stroke-linecap="round" stroke-dasharray="1 70"/><circle cx="318" cy="700" r="30" fill="none" stroke="#FFFFFF" stroke-width="16"/><g transform="translate(712,452)"><path d="M0 0C0 0-64-66-64-110A64 64 0 0 1 64-110C64-66 0 0 0 0Z" fill="#F2A93B"/><circle cx="0" cy="-110" r="24" fill="#5A9C82"/></g></g></svg>';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const isToken = (t) => typeof t === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(t);
const httpsUrl = (u) => (typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/.test(u) ? u : null);

async function fetchPreview(token) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 3500);
  try {
    const res = await fetch(`${PREVIEW_FN}?token=${encodeURIComponent(token)}`, { signal: ctl.signal });
    if (!res.ok) return null;
    const p = await res.json();
    return p && p.found ? p : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function renderJoinPage(token, p) {
  const title = p?.title || 'You’re invited to plan a trip';
  const description = p?.description || 'Plan it together in Go To Travel. Joining is free.';
  const photo = httpsUrl(p?.photo_url) || (p ? FALLBACK_PHOTO : 'https://gototravelapp.com/og.png');
  const pagePhoto = httpsUrl(p?.photo_url) || FALLBACK_PHOTO;
  const pageUrl = token ? `https://gototravelapp.com/join/${encodeURIComponent(token)}` : 'https://gototravelapp.com/join';
  const openUrl = `com.gotravelplanner.app://join/${encodeURIComponent(token || '')}`;
  const from = p?.inviter ? `${p.inviter} invited you to plan` : 'You’re invited to plan a trip';
  const initial = (p?.inviter || 'G').trim().charAt(0).toUpperCase();
  const tripName = p?.trip_name || 'Plan it together';
  const meta = p ? [p.dates, p.location].filter(Boolean).join(' · ') : 'Saved places become a day-by-day plan your whole crew can shape.';
  const others = Math.max(0, (p?.crew_count || 0) - 1);
  const crew = p?.inviter ? (others > 0 ? `${p.inviter} and ${others} ${others === 1 ? 'other' : 'others'} are in` : `${p.inviter} is in`) : '';
  const pass = p?.pass === 'planner' ? 'Planner' : p?.pass === 'voter' ? 'Voter' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)} · Go To Travel</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="noindex">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Go To Travel">
<meta property="og:url" content="${esc(pageUrl)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(photo)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(p?.location || 'Go To Travel')}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(photo)}">
<meta name="theme-color" content="#0F1A17">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=DM+Sans:opsz,wght@9..40,400..700&family=Caveat:wght@700&display=swap">
<link rel="stylesheet" href="/assets/site.css">
<style>
.join{min-height:calc(100svh - var(--header-h));display:grid;place-items:center;padding:8px var(--gutter) 56px}
.invite{width:100%;max-width:440px;background:var(--surface);border:1px solid var(--line);border-radius:28px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.35)}
.invite .photo{position:relative;aspect-ratio:1200/630;background:#1F4D3E}
.invite .photo img{width:100%;height:100%;object-fit:cover;display:block}
.invite .photo::after{content:"";position:absolute;inset:auto 0 0;height:45%;background:linear-gradient(transparent,rgba(23,36,31,.6))}
.invite .body{padding:22px 22px 24px;display:flex;flex-direction:column;gap:12px}
.from{display:flex;align-items:center;gap:10px;color:var(--on-dark-soft);font-size:15px}
.face{width:28px;height:28px;border-radius:50%;background:var(--coral-2);color:#fff;display:grid;place-items:center;font:700 13px var(--body);flex-shrink:0}
.invite h1{font-size:clamp(32px,9vw,42px)}
.meta{color:var(--on-dark-soft);font-size:16px}
.crew{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px}
.crew:empty{display:none}
.stamp{font:700 24px/1.25 var(--hand);color:var(--mint);border:2.5px solid var(--mint);border-radius:10px;padding:0 12px;transform:rotate(-5deg);text-transform:uppercase;letter-spacing:.06em}
.invite .btn{width:100%;min-height:56px;font-size:17px}
.fine{font-size:13px;line-height:1.5;color:var(--on-dark-muted);text-align:center}
</style>
</head>
<body>
<a class="sr" href="#main">Skip to content</a>
<header class="page-head">
  <nav class="nav" aria-label="Main">
    <a class="logo" href="/" aria-label="Go To Travel home"><span class="logo-tile">${LOGO}</span><span class="logo-word">Go To Travel</span></a>
  </nav>
</header>
<main id="main" class="join">
  <article class="invite">
    <div class="photo"><img src="${esc(pagePhoto)}" alt="${esc(p?.location ? `A view of ${p.location}` : '')}" width="1200" height="630" fetchpriority="high"></div>
    <div class="body">
      <p class="from"><span class="face" aria-hidden="true">${esc(initial)}</span><span>${esc(from)}</span></p>
      <h1>${esc(tripName)}</h1>
      <p class="meta">${esc(meta)}</p>
      <div class="crew">${crew ? `<span>${esc(crew)}</span>` : ''}${pass ? `<span class="stamp">${esc(pass)}</span>` : ''}</div>
      <a class="btn btn-sun" href="${esc(openUrl)}">Open in Go To Travel</a>
      <a class="btn btn-ghost" href="${esc(GET_APP_URL)}">Get the iPhone app</a>
      <p class="fine">Joining is always free. No limit on the crew.<br>New here? Get the app, then tap your invite link again.</p>
    </div>
  </article>
</main>
</body>
</html>`;
}

export default async function handler(req) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || decodeURIComponent(url.pathname.split('/join/')[1] || '');
  const preview = isToken(token) ? await fetchPreview(token) : null;
  return new Response(renderJoinPage(isToken(token) ? token : '', preview), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex',
      // Link previews and repeat taps come from the edge cache; a fresh invite shows up within minutes.
      'Cache-Control': preview ? 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400' : 'public, max-age=0, s-maxage=60',
    },
  });
}
