// gototravelapp.com/s/<token>: a trip its owner shared, for anyone who opens the link (a group chat, no app needed),
// and the link preview Messages and WhatsApp show for it. Read-only. Rendered per link on the server because link
// previews never run JavaScript. The trip comes from the trip-page function, which only answers for a trip whose
// owner turned its link on, and has already removed kids' names and ages, the stay, the crew and exact dates
// (gtt backend _shared/trip-page.ts). Photos are the stored URLs on the trip; nothing here calls Google.
// "Copy this trip" opens the app on the link (gototravel://s/<token>: Copy as is or Make it ours), else /app.
export const config = { runtime: 'edge' };

// The app's name in one place: it may change.
export const BRAND = 'Go To Travel';
const SITE = 'https://gototravelapp.com';
const TRIP_FN = (typeof process !== 'undefined' && process.env && process.env.TRIP_PAGE_FN) ||
  'https://zkwamqtnaegvlptzdqxn.supabase.co/functions/v1/trip-page';
const APP_SCHEME = 'gototravel://s/';
// Where "Copy this trip" goes without the app: the one app link (vercel.json; later the App Store).
const GET_APP_URL = '/app';
const FALLBACK_PHOTO = 'https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=1200&h=630&fit=crop&crop=entropy&q=80&fm=jpg';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const isShareToken = (t) => typeof t === 'string' && /^[A-Za-z0-9_-]{24}$/.test(t);
// Photos are https only (the function already refused Google API URLs and keyed links); local previews may pass
// allowHttp for the local stack's storage.
const photoUrl = (u, allowHttp) => (typeof u === 'string' && (allowHttp ? /^https?:\/\/[^\s"'<>]+$/ : /^https:\/\/[^\s"'<>]+$/).test(u) ? u : null);

async function fetchTrip(token) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 3500);
  try {
    const res = await fetch(`${TRIP_FN}?token=${encodeURIComponent(token)}`, { signal: ctl.signal });
    if (!res.ok) return null;
    const t = await res.json();
    return t && t.found ? t : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** "3 days in November · Lisbon, Portugal · 7 stops" */
export function summary(t) {
  const where = Array.isArray(t.cities) && t.cities.length > 1 ? t.cities.map((c) => String(c).split(',')[0]).join(', ') : t.place;
  const stops = t.stop_count ? `${t.stop_count} ${t.stop_count === 1 ? 'stop' : 'stops'}` : '';
  return [t.when, where, stops].filter(Boolean).join(' · ');
}

// Pip, tiny: the sage globe that says why each stop is there.
const PIP = '<svg class="pip" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10" fill="#A3B991"/><ellipse cx="12" cy="12" rx="4.2" ry="10" fill="none" stroke="#181B20" stroke-opacity=".28" stroke-width="1.2"/><path d="M2.6 9h18.8M2.6 15h18.8" stroke="#181B20" stroke-opacity=".28" stroke-width="1.2"/><circle cx="9.3" cy="11" r="1.15" fill="#181B20"/><circle cx="14.7" cy="11" r="1.15" fill="#181B20"/><path d="M10 14.2q2 1.5 4 0" fill="none" stroke="#181B20" stroke-width="1.2" stroke-linecap="round"/></svg>';

function stopHtml(s, allowHttp) {
  const photo = photoUrl(s.photo, allowHttp);
  const when = [s.time, s.slot].filter(Boolean).join(' · ');
  return `<li class="stop${photo ? '' : ' plain'}">
  ${photo ? `<div class="ph"><img src="${esc(photo)}" alt="" loading="lazy" decoding="async"></div>` : ''}
  <div class="txt">
    ${when ? `<p class="when">${esc(when)}</p>` : ''}
    <h3>${esc(s.name)}</h3>
    ${s.why ? `<p class="why">${PIP}<span>${esc(s.why)}</span></p>` : ''}
    ${s.tip ? `<p class="tip">${esc(s.tip)}</p>` : ''}
  </div>
</li>`;
}

const HEAD_FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..500&family=Inter+Tight:wght@400..700&display=swap">`;

const CSS = `
:root{--bg:#FBF7F0;--card:#FFFFFF;--ink:#181B20;--soft:#4A4F57;--muted:#6B7078;--line:#E7E0D3;--gold:#F2A93B;--gold-ink:#1A1206;--scrim:rgba(10,12,15,.72);color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#0F1114;--card:#181B20;--ink:#F4EFE6;--soft:#C9C4BA;--muted:#9A968E;--line:#262A31}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:400 16px/1.55 "Inter Tight",system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}
h1,h2,h3{font-family:Newsreader,Georgia,serif;font-weight:600;letter-spacing:-.01em;margin:0;text-wrap:balance}
a{color:inherit}
.hero{position:relative;min-height:min(66svh,620px);display:flex;flex-direction:column;justify-content:space-between;color:#fff;overflow:hidden;background:#181B20}
.hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hero::after{content:"";position:absolute;inset:auto 0 0;height:62%;background:linear-gradient(transparent,var(--scrim))}
.bar,.hero .copy{position:relative;z-index:1}
.bar{padding:max(16px,env(safe-area-inset-top)) 20px 0;display:flex;align-items:center}
.word{font:600 17px/1 Newsreader,Georgia,serif;letter-spacing:.01em;color:#fff;text-decoration:none;text-shadow:0 1px 12px rgba(0,0,0,.35)}
.hero .copy{padding:0 20px 30px;max-width:760px}
.eyebrow{margin:0 0 10px;font:600 12px/1 "Inter Tight",sans-serif;letter-spacing:.14em;text-transform:uppercase;opacity:.85}
.hero h1{font-size:clamp(38px,10vw,64px);line-height:1.02}
.meta{margin:12px 0 0;font-size:16px;opacity:.9}
main{max-width:760px;margin:0 auto;padding:8px 20px 140px}
.day{margin-top:44px}
.day h2{font-size:28px;display:flex;align-items:baseline;gap:10px}
.day h2 small{font:500 14px "Inter Tight",sans-serif;color:var(--muted);letter-spacing:0}
.stops{list-style:none;margin:18px 0 0;padding:0;display:grid;gap:22px}
.stop{background:var(--card);border:1px solid var(--line);border-radius:22px;overflow:hidden}
.stop .ph{aspect-ratio:16/10;background:var(--line)}
.stop .ph img{width:100%;height:100%;object-fit:cover;display:block}
.stop .txt{padding:16px 18px 18px}
.stop.plain .txt{padding:16px 18px}
.when{margin:0 0 6px;font-size:12.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.stop h3{font-size:22px;line-height:1.2}
.why{margin:10px 0 0;display:flex;gap:8px;align-items:flex-start;font:italic 400 17px/1.45 Newsreader,Georgia,serif;color:var(--soft)}
.pip{width:18px;height:18px;flex:0 0 18px;margin-top:3px}
.tip{margin:8px 0 0;font-size:14px;color:var(--muted)}
.empty{margin-top:40px;font:italic 400 19px/1.5 Newsreader,Georgia,serif;color:var(--soft)}
footer{margin-top:56px;padding-top:24px;border-top:1px solid var(--line);font-size:14px;color:var(--muted)}
footer p{margin:0 0 8px}
footer .quiet{color:var(--muted);text-underline-offset:3px}
.cta{position:fixed;left:0;right:0;bottom:0;z-index:5;padding:14px 20px max(14px,env(safe-area-inset-bottom));background:linear-gradient(transparent,var(--bg) 38%)}
.cta .inner{max-width:760px;margin:0 auto}
.btn{display:flex;align-items:center;justify-content:center;width:100%;min-height:58px;border-radius:18px;background:var(--gold);color:var(--gold-ink);font:700 17px/1 "Inter Tight",sans-serif;text-decoration:none;box-shadow:0 10px 30px rgba(0,0,0,.22)}
.btn:active{transform:scale(.99)}
.cta .sub{margin:8px 0 0;text-align:center;font-size:12.5px;color:var(--muted)}
:focus-visible{outline:3px solid var(--gold);outline-offset:3px}
@media (min-width:900px){.hero{min-height:620px}.hero .copy,.bar{padding-left:max(20px,calc((100vw - 760px)/2));padding-right:max(20px,calc((100vw - 760px)/2))}.stops{grid-template-columns:1fr 1fr}.stop.plain{grid-column:auto}}
`;

function openScript(token) {
  // One button: try the app; if nothing took over the screen within ~1.4s, go to the app page instead.
  return `<script>(function(){var b=document.getElementById('copy');if(!b)return;b.addEventListener('click',function(e){e.preventDefault();var gone=false;var t=setTimeout(function(){if(!gone)location.href=${JSON.stringify(GET_APP_URL)};},1400);document.addEventListener('visibilitychange',function(){if(document.hidden){gone=true;clearTimeout(t);}},{once:true});location.href=${JSON.stringify(APP_SCHEME + token)};});})();</script>`;
}

export function renderTripPage(token, t, opts = {}) {
  const allowHttp = !!opts.allowHttp;
  const pageUrl = `${SITE}/s/${encodeURIComponent(token || '')}`;
  if (!t) {
    const title = 'This trip isn’t shared right now';
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)} · ${esc(BRAND)}</title><meta name="robots" content="noindex">
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(BRAND)}"><meta property="og:title" content="A trip on ${esc(BRAND)}">
<meta property="og:description" content="Plan trips day by day, with a reason for every stop."><meta property="og:image" content="${SITE}/og.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">${HEAD_FONTS}<style>${CSS}
.gone{min-height:100svh;display:grid;place-items:center;padding:24px;text-align:center}.gone h1{font-size:34px}.gone p{color:var(--soft);font-size:17px;margin:12px auto 28px;max-width:30ch}.gone .btn{max-width:340px;margin:0 auto}</style></head>
<body><main class="gone"><div><h1>${esc(title)}</h1><p>The person who shared it may have turned the link off. Ask them for a new one.</p><a class="btn" href="${esc(GET_APP_URL)}">Plan your own trip</a></div></main></body></html>`;
  }

  const title = t.title || 'A trip';
  const meta = summary(t);
  const description = `${meta ? `${meta}. ` : ''}See the plan and copy it in ${BRAND}.`;
  const cover = photoUrl(t.cover, allowHttp) || FALLBACK_PHOTO;
  const days = Array.isArray(t.day_list) ? t.day_list : [];
  const dayHtml = days.map((d) => `<section class="day" aria-labelledby="d${esc(d.day)}">
  <h2 id="d${esc(d.day)}">Day ${esc(d.day)}${d.city && !(t.place || '').startsWith(d.city) ? ` <small>${esc(d.city)}</small>` : ''}</h2>
  <ol class="stops">${(Array.isArray(d.stops) ? d.stops : []).map((s) => stopHtml(s, allowHttp)).join('')}</ol>
</section>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)} · ${esc(BRAND)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="noindex">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(BRAND)}">
<meta property="og:url" content="${esc(pageUrl)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(cover)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(t.place ? `A view of ${t.place}` : title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(cover)}">
<meta name="theme-color" content="#0F1114" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#FBF7F0" media="(prefers-color-scheme: light)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
${HEAD_FONTS}
<style>${CSS}</style>
</head>
<body>
<header class="hero">
  <img src="${esc(cover)}" alt="${esc(t.place ? `A view of ${t.place}` : '')}" fetchpriority="high">
  <div class="bar"><a class="word" href="/">${esc(BRAND)}</a></div>
  <div class="copy">
    <p class="eyebrow">A trip shared with you</p>
    <h1>${esc(title)}</h1>
    ${meta ? `<p class="meta">${esc(meta)}</p>` : ''}
  </div>
</header>
<main id="main">
  ${dayHtml || '<p class="empty">The stops are still being planned. Copy it and Pip will fill in the days.</p>'}
  <footer>
    <p>Planned in ${esc(BRAND)}. Pip plans trips day by day and says why each stop is there.</p>
    <p><a class="quiet" href="${esc(GET_APP_URL)}">Get the iPhone app</a> · <a class="quiet" href="/privacy">Privacy</a></p>
  </footer>
</main>
<div class="cta"><div class="inner">
  <a id="copy" class="btn" href="${esc(GET_APP_URL)}">Copy this trip</a>
  <p class="sub">Opens in the app, where you can keep it as is or make it yours.</p>
</div></div>
${openScript(token)}
</body>
</html>`;
}

export default async function handler(req) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || decodeURIComponent(url.pathname.split('/s/')[1] || '');
  const trip = isShareToken(token) ? await fetchTrip(token) : null;
  return new Response(renderTripPage(isShareToken(token) ? token : '', trip), {
    status: trip ? 200 : 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex',
      'Referrer-Policy': 'no-referrer',
      // A minute at the edge: a link that goes viral is one function call a minute, and a link turned off is gone
      // within about a minute.
      'Cache-Control': trip ? 'public, max-age=0, s-maxage=60' : 'public, max-age=0, s-maxage=30',
    },
  });
}
