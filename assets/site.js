/* Go To Travel website v3: behavior shared by every page.
   Storage, consent + tracking, the one signup endpoint, passport stamps, dialogs, toasts, and the
   illustration sprite. Page scripts (home.js, contact.js, …) build on window.GTT. */
(function () {
  "use strict";

  // ── Config (one place to flip at launch) ──────────────────────────────────
  const CONFIG = {
    // "waitlist" until the App Store listing (app id 6761403615) is public, then "live" (handoff A1).
    launchMode: "waitlist",
    appStoreUrl: "https://apps.apple.com/app/id6761403615",
    // [DECISION: Pavan] pixel IDs. While a value is a placeholder, that pixel never loads.
    tiktokPixelId: "[PLACEHOLDER]",
    metaPixelId: "[PLACEHOLDER]",
    functionsUrl: "https://zkwamqtnaegvlptzdqxn.supabase.co/functions/v1",
    consentTextVersion: "2026-10-15",
    tiktok: "https://www.tiktok.com/@gototravelapp",
    instagram: "https://www.instagram.com/gototravelapp",
  };

  const params = new URLSearchParams(location.search);
  const DAY = 864e5;

  // localStorage can throw (private mode, blocked storage): every access is guarded.
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* no storage */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* no storage */ } },
  };
  const session = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* no storage */ } },
  };

  // Never send test signups to production: localhost, 127.0.0.1, *.vercel.app previews and ?mock=1 use
  // an in-page mock. ?mock=0 forces real calls on a preview (for the final end-to-end check).
  const MOCK = params.get("mock") === "0" ? false
    : /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || /\.vercel\.app$/.test(location.hostname) || params.has("mock");

  // ── Attribution: first-touch UTMs and an inbound ?ref= (kept 30 days) ─────
  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
  if (UTM_KEYS.some((k) => params.get(k))) {
    const utm = {};
    UTM_KEYS.forEach((k) => { if (params.get(k)) utm[k] = params.get(k).slice(0, 80); });
    if (!store.get("gtt_utm")) store.set("gtt_utm", { ...utm, t: Date.now() });
  }
  const utm = () => { const u = store.get("gtt_utm"); return u && Date.now() - u.t < 30 * DAY ? u : {}; };
  const CODE_RE = /^[A-Z2-7]{8}$/; // the backend's referral code format
  const inboundRef = (params.get("ref") || "").toUpperCase();
  if (CODE_RE.test(inboundRef)) store.set("gtt_ref", { code: inboundRef, t: Date.now() });
  const referredBy = () => { const r = store.get("gtt_ref"); return r && Date.now() - r.t < 30 * DAY ? r.code : null; };

  // ── Consent (handoff A8) ──────────────────────────────────────────────────
  // Essential is always on. Nothing else loads before a choice. Global Privacy Control and
  // "Do not sell or share" always win over the Ads switch.
  const GPC = navigator.globalPrivacyControl === true;
  function consent() {
    const c = store.get("gtt_consent");
    const base = c || { analytics: false, ads: false, doNotSell: false, chosen: false };
    return { ...base, ads: base.ads && !GPC && !base.doNotSell, doNotSell: base.doNotSell || GPC, gpc: GPC };
  }
  function setConsent(next) {
    const now = { ...consent(), ...next, chosen: true, at: new Date().toISOString(), v: CONFIG.consentTextVersion };
    store.set("gtt_consent", { analytics: !!now.analytics, ads: !!now.ads, doNotSell: !!now.doNotSell, chosen: true, at: now.at, v: now.v });
    applyConsent();
    track("privacy_toggle", { key: "consent", value: `${now.analytics ? "a" : "-"}${now.ads ? "d" : "-"}` });
  }

  const isSet = (id) => id && !/PLACEHOLDER/.test(id);
  let pixels = { tiktok: false, meta: false };
  function loadPixels() {
    // Official base snippets, only for configured IDs, only with Ads consent, after the page is interactive.
    if (isSet(CONFIG.metaPixelId) && !pixels.meta) {
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("init", CONFIG.metaPixelId); window.fbq("track", "PageView");
      pixels.meta = true;
    }
    if (isSet(CONFIG.tiktokPixelId) && !pixels.tiktok) {
      !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=d.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=d.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};ttq.load(CONFIG.tiktokPixelId);ttq.page();}(window,document,"ttq");
      pixels.tiktok = true;
    }
  }
  function applyConsent() {
    const c = consent();
    if (c.ads) {
      if (document.readyState === "complete") setTimeout(loadPixels, 0);
      else addEventListener("load", () => setTimeout(loadPixels, 0), { once: true });
    }
    // A pixel can't be unloaded mid-page; turning Ads off takes effect on the next page view.
  }

  // One track() for every event; respects consent. No analytics tool is installed yet
  // ([DECISION: Pavan]); events go to the pixels when they're loaded, and to the console in mock mode.
  const PIXEL_EVENTS = { signup: ["CompleteRegistration", "CompleteRegistration"], quiz_complete: ["QuizComplete", "QuizComplete"] };
  function track(name, props = {}) {
    if (MOCK) console.info("[track]", name, props);
    const map = PIXEL_EVENTS[name];
    if (!map || !consent().ads) return;
    try { if (pixels.meta && window.fbq) window.fbq(map[0] === "CompleteRegistration" ? "track" : "trackCustom", map[0], props); } catch { /* pixel */ }
    try { if (pixels.tiktok && window.ttq) window.ttq.track(map[1], props); } catch { /* pixel */ }
  }

  // ── The one signup endpoint (handoff A6): join-waitlist, merged on email ──
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  async function saveEmail(fields) {
    const payload = {
      ...fields,
      referred_by: referredBy(),
      ...utm(),
      consent_text_version: CONFIG.consentTextVersion,
      dreams: (store.get("gtt_dreams") || []).slice(0, 12),
    };
    delete payload.t;
    if (MOCK) {
      console.info("[waitlist mock] not sent to production. Payload:", JSON.stringify(payload));
      await new Promise((r) => setTimeout(r, 450));
      if (params.get("mock") === "fail") throw new Error("mock failure");
      return { ok: true, position: 128, referral_code: "K7Q2M4XA", referral_count: +params.get("mockrefs") || 0 };
    }
    const res = await fetch(`${CONFIG.functionsUrl}/join-waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }
  function me() { return store.get("gtt_signed_up"); }
  function markSignedUp(data, source) {
    const prev = me() || {};
    const next = {
      source: prev.source || source,
      t: prev.t || Date.now(),
      code: data.referral_code || prev.code || null,
      position: data.position ?? prev.position ?? null,
      count: data.referral_count ?? prev.count ?? 0,
    };
    store.set("gtt_signed_up", next);
    stamp("join");
    return next;
  }
  const refLink = (code) => `https://gototravelapp.com/?ref=${code}`;

  // ── Passport stamps: Quiz / Join / Invite ─────────────────────────────────
  function stamps() { return store.get("gtt_stamps") || { quiz: false, join: !!me(), invite: false }; }
  function stamp(key) {
    const s = stamps();
    if (s[key]) return;
    s[key] = true;
    store.set("gtt_stamps", s);
    renderStamps(key);
  }
  function renderStamps(justEarned) {
    const s = stamps();
    if (me()) s.join = true;
    document.querySelectorAll("[data-stamp]").forEach((el) => {
      const on = !!s[el.dataset.stamp];
      el.classList.toggle("on", on);
      el.setAttribute("aria-label", `${el.textContent} stamp: ${on ? "collected" : "not yet"}`);
    });
    const n = ["quiz", "join", "invite"].filter((k) => s[k]).length;
    document.querySelectorAll("[data-passport-line]").forEach((el) => {
      el.textContent = n === 3 ? "You're a Founding Traveler!" : `${n} of 3 stamps · collect all 3 to become a Founding Traveler`;
    });
    if (justEarned && n === 3) toast("All 3 stamps. You're a Founding Traveler!");
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  let toastTimer;
  function toast(msg) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch { /* no */ }
    ta.remove();
    return ok;
  }

  // ── Dialogs: focus trap, Escape, backdrop, focus returns ──────────────────
  let openCount = 0;
  function openDialog(scrim, { onClose, initialFocus } = {}) {
    const back = document.activeElement;
    const sheet = scrim.querySelector("[role=dialog]") || scrim;
    scrim.hidden = false;
    requestAnimationFrame(() => scrim.classList.add("show"));
    openCount++;
    document.body.classList.add("dialog-open");
    setBarAway(true);
    const focusables = () => [...sheet.querySelectorAll("button,[href],input,textarea,select,[tabindex]:not([tabindex='-1'])")].filter((el) => !el.disabled && el.offsetParent !== null);
    const first = initialFocus ? sheet.querySelector(initialFocus) : focusables()[0];
    setTimeout(() => (first || sheet).focus({ preventScroll: true }), 30);
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close("escape"); }
      if (e.key === "Tab") {
        const f = focusables(); if (!f.length) return;
        const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    }
    function onBackdrop(e) { if (e.target === scrim) close("backdrop"); }
    scrim.addEventListener("keydown", onKey);
    scrim.addEventListener("click", onBackdrop);
    let closed = false;
    function close(how) {
      if (closed) return; closed = true;
      scrim.classList.remove("show");
      scrim.removeEventListener("keydown", onKey);
      scrim.removeEventListener("click", onBackdrop);
      setTimeout(() => { scrim.hidden = true; }, 200);
      openCount = Math.max(0, openCount - 1);
      if (!openCount) { document.body.classList.remove("dialog-open"); setBarAway(false); }
      if (back && back.focus) back.focus({ preventScroll: true });
      onClose && onClose(how);
    }
    return close;
  }

  // ── Mobile sticky bar hides while a dialog or the keyboard is open ────────
  function setBarAway(away) {
    document.querySelectorAll(".mobile-bar").forEach((b) => b.classList.toggle("away", away));
  }
  document.addEventListener("focusin", (e) => { if (e.target.matches("input,textarea,select")) setBarAway(true); });
  document.addEventListener("focusout", (e) => {
    if (e.target.matches("input,textarea,select")) setTimeout(() => { if (!openCount && !document.activeElement?.matches("input,textarea,select")) setBarAway(false); }, 50);
  });

  // ── Illustration sprite (one cached request), and the markup that uses it ─
  function art(kind, label) {
    const a = label ? `role="img" aria-label="${label}"` : `aria-hidden="true"`;
    return `<svg ${a} focusable="false"><use href="#${kind}" width="100%" height="100%"></use></svg>`;
  }
  function loadArt() {
    if (document.getElementById("gtt-art")) return;
    fetch("/assets/art.svg").then((r) => (r.ok ? r.text() : "")).then((svg) => {
      if (!svg) return;
      const holder = document.createElement("div");
      holder.id = "gtt-art"; holder.hidden = true; holder.innerHTML = svg;
      document.body.prepend(holder);
    }).catch(() => { /* frames keep their solid fill */ });
  }

  // ── Cookie choices banner (handoff A8). First visit, all regions ──────────
  function cookieBanner({ force = false } = {}) {
    const c = consent();
    if (!force && c.chosen) return;
    let el = document.getElementById("cookie");
    if (el) { el.hidden = false; el.querySelector("button")?.focus(); return; }
    el = document.createElement("section");
    el.id = "cookie"; el.className = "cookie"; el.setAttribute("aria-label", "Cookie choices");
    el.innerHTML = `
      <h2>Cookies, your call</h2>
      <p>We use essential cookies to run the site. With your OK we also use analytics, and ads cookies from TikTok and Meta to show you Go To Travel on social. <a href="/privacy.html#cookies">Learn more about cookies</a></p>
      <div class="cookie-opts">
        <div class="opt-row"><span><b>Essential</b> · always on</span><button type="button" class="switch" role="switch" aria-checked="true" aria-label="Essential cookies, always on" disabled></button></div>
        <div class="opt-row"><span><b>Analytics</b></span><button type="button" class="switch" role="switch" data-k="analytics" aria-checked="${c.analytics}" aria-label="Analytics cookies"></button></div>
        <div class="opt-row"><span><b>Ads</b> · TikTok, Meta${GPC ? " · off: your browser sends Global Privacy Control" : ""}</span><button type="button" class="switch" role="switch" data-k="ads" aria-checked="${c.ads}" aria-label="Ads cookies" ${GPC ? "disabled" : ""}></button></div>
      </div>
      <div class="cookie-btns">
        <button type="button" class="btn btn-ghost" data-act="reject">Reject all</button>
        <button type="button" class="btn btn-ink" data-act="accept">Accept all</button>
      </div>
      <button type="button" class="save" data-act="save">Save my choices</button>`;
    document.body.appendChild(el);
    el.addEventListener("click", (e) => {
      const sw = e.target.closest(".switch[data-k]");
      if (sw) { sw.setAttribute("aria-checked", sw.getAttribute("aria-checked") !== "true"); return; }
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (!act) return;
      if (act === "reject") setConsent({ analytics: false, ads: false });
      if (act === "accept") setConsent({ analytics: true, ads: !GPC });
      if (act === "save") {
        const get = (k) => el.querySelector(`[data-k=${k}]`).getAttribute("aria-checked") === "true";
        setConsent({ analytics: get("analytics"), ads: get("ads") && !GPC });
      }
      el.hidden = true;
      toast("Saved your cookie choices");
    });
  }

  // Footer "Cookie settings" and any [data-open-cookies] reopen the banner.
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-open-cookies]")) { e.preventDefault(); cookieBanner({ force: true }); }
  });

  // Signed-up visitors see the success state wherever a form says data-hide-when-joined.
  function init() {
    loadArt();
    renderStamps();
    applyConsent();
    if (!document.body.hasAttribute("data-no-cookie-banner")) setTimeout(() => cookieBanner(), 600);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.GTT = {
    CONFIG, params, store, session, MOCK, EMAIL_RE, utm, referredBy,
    consent, setConsent, track, saveEmail, me, markSignedUp, refLink,
    stamps, stamp, renderStamps, toast, copyText, openDialog, art, cookieBanner, GPC,
  };
})();
