## Website v2 report

Branch `web-v2` (off `main`) in `~/dev/gototravel-site`. **Nothing was pushed or deployed. No Supabase function, migration or SQL was changed or run. No test signup ever reached production.** Stack unchanged: one static `index.html` (58.5 KB, inline CSS/JS, no framework, no build step, no new npm dependencies for the page).

**Honesty up front:** no real iPhone was used. "iPhone" checks below ran in the iOS Simulator (iPhone 16e, 390 pt wide, iOS 26.3, Mobile Safari 26.3). Interaction tests ran in headless Chrome. The "Landing Page v2" canvas was not available, so nothing was matched against it. The layout follows the handoff's copy, tokens and layout notes only.

### Audit (W0)
- **Stack / hosting / deploys:** a static `index.html` (53 KB, inline CSS/JS), plus `privacy.html`, `terms.html`, `join.html`, `api/extract.js` (a separate Vercel function), `.well-known/apple-app-site-association` and `vercel.json` (rewrites `/join/:token` to `/join.html`). Hosted on Vercel from GitHub `MorganWeiss/gototravel-site`, branch `main`; a push to `main` is a production deploy. The live site is byte-identical to `main` (same etag and md5).
- **Email service:** there isn't one (no Kit, Mailchimp or similar). The page POSTs JSON to the Supabase edge function `join-waitlist` (project `zkwamqtnaegvlptzdqxn`), which upserts into `public.waitlist` keyed on email. The quiz result **is** stored with the email (`traveler_type`, plus `group_type`, `travel_style`, `adventure_level`, `interests`). No welcome email is sent.
  - **#1 BLOCKER: the Supabase project is paused.** `zkwamqtnaegvlptzdqxn.supabase.co` returns **NXDOMAIN** (checked with `dig` and `curl` on 2026-09-28), so every live signup fails right now. The v1 page flips to its success message *before* the save finishes and only logs the error, so visitors are told they joined while nothing is saved.
- **Analytics / pixels:** nothing is loaded. `gtag` is referenced in v1's `saveEmail` but no gtag/GA script is ever loaded, so that reference was dead code (removed). No TikTok or Meta pixel. Vercel Speed Insights answers on the project (`/_vercel/speed-insights/script.js` returns 200) but its script isn't on the page, so it collects nothing. Vercel Web Analytics is not enabled (404).
- **Lighthouse before** (live https://gototravelapp.com, mobile): **Performance 89 / Accessibility 88 / SEO 100** (FCP 2.9 s, LCP 2.9 s, TBT 0 ms, CLS 0). Accessibility failures: color-contrast, link-in-text-block, landmark-one-main.
- Social links: TikTok `@gototravelapp` exists (TikTok's page data: statusCode 0, uniqueId gototravelapp). Instagram `/gototravelapp` returns 200 but is behind a login wall, so I could not confirm the account. `hello@gototravelapp.com` was kept.

### Decisions applied (from the brief)
1. No pushes, deploys or production writes.
2. On `localhost`/`127.0.0.1` or with `?mock=1`, `saveEmail` uses an in-page mock: it resolves `{ok:true}` after 300 ms and `console.info`s the payload it would have sent. Production hostnames call the real function.
3. The handoff's `source` values (`hero`, `quiz`, `tips`, `footer`, `popup_kit`), `referred_by` and UTMs are all sent. The backend change needed is below, NOT APPLIED.
4. The function returns no position, so success reads "You're on the list." (logged as a QUESTION). The frontend already renders "You're in. You're #N in line." once the backend returns `position`.
5. W2.9 testimonials were not confirmed, so the section is removed entirely.
6. W6: stopped on the backend. The referral section shows its stamp, copy and dots, with "Coming soon" instead of mechanics. `?ref=` is still captured (30 days) and sent as `referred_by`.
7. W7: TikTok and Meta loaders sit behind two constants at the top of the script. While a constant is `[PLACEHOLDER]` that pixel never loads and its events no-op. Loading waits for the `load` event plus idle time. No consent banner.
8. W4: the popup captures with `source=popup_kit`. There is no kit or welcome email (QUESTION).
9. Canvas unavailable; built from the handoff.
10. The FAQ pricing line is a visible `[PLACEHOLDER: pricing after beta — ask Pavan]`.

### Done
- **W0:** audit above. `.gitignore` (`qa/raw/`) and `.vercelignore` (`qa/`, `tools/`, this report) keep QA files off the live site. · `99714d4`
- **W1:** exact color tokens; Bricolage Grotesque 800 + DM Sans 400/600/700 from Google Fonts (preconnect, `display=swap`, loaded non-blocking). I added size-adjusted local fallback faces, with metrics measured from the served woff2 files against Arial, so the font swap doesn't shift layout. Sunset CTA and dark buttons at least 52 px tall; radii 14/20–24/999; visible focus rings. · `8cb03ce` · `qa/w1-foundation.png`
- **W2:** all sections 2.1–2.12 in order with the handoff copy verbatim: sticky header (desktop links, "Join beta" pill), hero with the `#join` form and the "The Drop" phone mock in pure HTML/CSS (0 KB of images), How it works, Crew mode (chat card, 76% stat, footnote linked to the source), AI strip (text pills only, no logos), quiz (v1 logic, restyled), "Steal these" scroll-snap row plus tips form, referral teaser, FAQ (native `<details>`), sunset final CTA, footer. Removed: store badges and their platform modal, the "S M A J" avatar row, "Travelers are already lining up", the unconfirmed testimonials, the old persona/why/social sections, and every emoji. · `73afbb4` · `qa/w9-sim-top.png`, `qa/w9-desktop-1440-hero.png`
- **W3:** one submit handler for every form. Inline validation under the field (same regex as the edge function, never `alert`). The payload carries `source`, UTMs, `referred_by` and the honeypot, plus the quiz fields on the quiz form. Double-submit guard: button disabled while a request is in flight, and the backend upserts. Success replaces the form in place with an SVG check icon. `localStorage` remembers the signup: every other form flips to "You're on the list." and the popup never shows. A failed save now shows "Could not save. Try again?" and keeps the form; v1 faked success. · `6eb2799` · `qa/w3-hero-success-390.png`, `qa/w9-sim-hero-success.png`
- **W4:** the kit popup is a native `<dialog>` opened with `showModal()`, with `role="dialog"` and `aria-modal`. The browser keeps focus inside and makes the page behind inert; focus moves in on open and returns on close. It is a bottom sheet on mobile and a centered card (max 440 px) on desktop over a dimmed backdrop. It shows only after **10 s AND (45% scroll OR desktop-only exit intent through the top)**. It never shows while the visitor is typing in a field. It stays quiet for 14 days after being shown or dismissed, and never shows after a signup. It closes via the close button, "Maybe later", a backdrop tap or Escape. · `12026fb` · `qa/w4-popup-390.png`, `qa/w4-popup-1440.png`, `qa/w9-sim-popup.png`
- **W5:** "Share my type" uses `navigator.share` with "I'm a/an [TYPE] traveler. What are you?" and `https://gototravelapp.com/?type=[TYPE]&utm_source=share&utm_medium=quiz`. Fallback: copy the link and show a "Link copied" toast. Static 1080×1920 story images for the three types the quiz produces (Explorer, Trailblazer, Visionary; 36–37 KB PNG each, brand colors plus the stamp). "Save image" opens the share sheet with the PNG on phones (so Save Image / Instagram are offered) and downloads it on desktop. Template and render script are in `tools/`. · `95fa3d7` · `qa/w5-quiz-result-390.png`, `qa/w9-sim-share-sheet.png`
- **W6 (partial):** an inbound `?ref=` is stored in `localStorage` for 30 days and sent as `referred_by`. The section says "Coming soon". The rest is BLOCKED (below). · `30e3b8d`
- **W7:** pixel loaders plus `CompleteRegistration` (Meta and TikTok) with `{source}` on every signup. Custom events `signup`, `quiz_start`, `quiz_complete`, `popup_shown`, `popup_dismissed` and `share_click` go to whichever pixels are loaded. `referral_copy` is not wired because there's no referral link to copy yet (W6). New branded `og.png` (1200×630, 17 KB). New `<title>`, meta description, canonical, `og:title` "Go To Travel — Turn your saves into an actual trip", `og:description` set to the hero sub line, `og:image` plus its size/alt tags. · `3431d2e`
- **W8:** no code changes were needed. See checks and scores below. · `bd9a183` · `qa/w8-focus-rings.png`
- **W9:** device QA (below), QA screenshots and this report. · this commit

### Checks
- **W1: PASS.** The test page renders all 14 tokens, both fonts (`document.fonts.check` true for Bricolage 800 and DM Sans 400/700) and both button styles. Every text pair the page uses passes WCAG AA. The one tight pair, green-deep on cream (4.40:1), is only used for eyebrows at 19 px bold, which counts as large text (3:1 needed).
- **W2: PASS against the handoff; canvas match NOT CHECKED (no canvas).** 390 px: every section is in order with no horizontal scroll, checked section by section in Mobile Safari (simulator) and at 320 px in Chrome. 1440 px: headline left, phone right, email field and button on one row (`qa/w9-desktop-1440-hero.png`). No emoji: a scan with the brief's ranges plus U+1F000–1F2FF and U+FE0F finds none in `index.html` or the image templates, and `grep -P '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]' index.html` returns nothing. No store badges, no avatar row, no testimonials.
- **W3: payloads PASS; "five rows in the list" NOT RUN** (production writes are off-limits and Supabase is paused anyway). In Mobile Safari (simulator) all five forms produced the correct payload: `source` hero/tips/footer/quiz/popup_kit, `utm_source/medium/campaign` from the URL, and on the quiz form `traveler_type` plus the answers. Inline error on a bad email: PASS (real tap in Safari). Other forms flip to "You're on the list." and the state survives a reload: PASS. In Chrome, a triple submit sent exactly 1 request. With the real-fetch path forced on (a fake hostname so the mock is off, and the Supabase request answered by the test harness): a 500 shows the inline error, keeps the form and does not remember the visitor as signed up; a retry then succeeds.
- **W4: PASS.** In Safari (simulator): not shown at about 4 s even after scrolling; shown after 10 s plus 45% scroll; focus moves into the dialog; a dismissed popup stays closed after reload plus 10 s plus scroll; never appears after a hero signup. In Chrome: 10 s alone doesn't open it, 30% scroll doesn't, 45% does; Escape, "Maybe later", backdrop tap and the close button each close it; 12 Tab presses never reach page content behind it; focus returns to the element focused before it opened; the 14-day timestamp is stored; desktop exit intent opens it and touch devices ignore it; desktop card is 440 px wide; a popup signup sends `popup_kit` and hides "Maybe later".
- **W5: PASS in the simulator.** A real click on "Share my type" opened the **iOS share sheet** showing the `gototravelapp.com` link (`qa/w9-sim-share-sheet.png`). The exact strings were asserted in Chrome with `navigator.share` stubbed: text "I'm a Visionary traveler. What are you?", URL `https://gototravelapp.com/?type=Visionary&utm_source=share&utm_medium=quiz`. Fallback: toast "Link copied" and the link on the clipboard. Save image hands a 38 KB `image/png` file to the share sheet on phones (Chrome touch emulation) and is a real PNG download on desktop.
- **W6: capture PASS** (stored, sent on a later visit, expires after 30 days, `null` when absent). **Referral count check NOT POSSIBLE** (no backend).
- **W7: loaders PASS (test IDs, network stubbed); Pixel Helper and iMessage checks NOT RUN.** With placeholders: zero pixel requests, `fbq`/`ttq` undefined, events no-op without errors. With IDs injected into a test copy of the page: `fbevents.js` and TikTok `events.js` are requested only after `load`; Meta gets `init`, `PageView` and `CompleteRegistration {"source":"tips"}`; TikTok gets `page` and `CompleteRegistration {"source":"tips"}`. Pixel Helper needs real IDs. The iMessage preview needs a deploy, because `og:image` points at `https://gototravelapp.com/og.png`.
- **W8: PASS.** Local mobile Lighthouse 100/100/100. No horizontal scroll at 390 and 320 px. Every visible tap target is at least 44 px; the only exception is the inline footnote source link, which WCAG 2.5.8 exempts as inline text. Every email input has a real `<label>`, every action is a `<button>` or `<a>`, no `onclick` on divs. Keyboard focus rings are visible on dark, cream and sunset backgrounds (`qa/w8-focus-rings.png`). No images above the fold, so the hero text and form don't wait on images or scripts. Trackers are deferred. CLS 0.
- **W9:** Mobile Safari (simulator) 390 px, full page scrolled section by section: PASS. Real taps: "Join beta" lands on `#join` and "Or find your traveler type" lands on `#quiz`; the nav, logo, privacy and terms targets exist; every page and asset (`/`, privacy, terms, join, og.png, the three share PNGs, robots, sitemap) returns 200 from the local server (checked with `curl`). No horizontal scroll: PASS. Desktop Chrome 1440 hero: PASS against the handoff notes. All five forms send the right tags: PASS. Popup rules: PASS. No emoji, badges, fake avatars or counts, or unconfirmed testimonials: PASS. Placeholders are listed below.
  - **How the simulator was driven:** `safaridriver` sessions on my own `GTT-Web` device. `GTT-Test` was never touched; its window overlapped mine, so I moved mine first. On this simulator build, WebDriver taps only land correctly on an unscrolled page. So the hero form and anchors used real taps; the tips, footer, quiz and popup submits used `form.requestSubmit()` (Safari's own JS and the same handler); and input values were set by script because key events don't reach inputs there.
  - Safari hides the share sheet during WebDriver sessions. The share-sheet proof therefore comes from one real click (`cliclick`) on the raised simulator window, with the page loaded in a same-origin iframe harness that drove the real quiz and enlarged the real Share button.
  - A screen-region capture I took to calibrate that click caught another app on the host desktop, which showed the machine was in active use. I deleted the capture immediately and did no further desktop clicking. So a Safari tap on "Maybe later" was not re-driven after dismissal; Chrome covers it.

### PLACEHOLDERS still live
- FAQ "Is it free?": `Early access is free. [PLACEHOLDER: pricing after beta — ask Pavan]` (**visible on the page**, highlighted).
- `index.html` script top: `TIKTOK_PIXEL_ID = '[PLACEHOLDER]'` and `META_PIXEL_ID = '[PLACEHOLDER]'` (not visible; no pixels load until these are set).
- Kit content: `[PLACEHOLDER: Pavan to provide the kit PDF/page]`. Not on the page, but the popup promises the kit by email and nothing sends it (see QUESTIONS).
- Content that is not tagged but needs sign-off because the canvas was unavailable: the phone mock uses four real, well-known Lisbon places (Time Out Market Lisboa, Cais do Sodré; Pastéis de Belém, Belém; Miradouro da Senhora do Monte, Graça; LX Factory, Alcântara). Its UI text is taken from the handoff copy: "The Drop", "Paste a TikTok, Reel or Maps link", "Build the days", plus "Lisbon · 4 places found". No hours or ratings are shown. Swap in the canvas's list.

### BLOCKED
- **Supabase project paused (NXDOMAIN): blocks every real signup, live today and after v2 ships.** Restoring it is a founder step in the Supabase dashboard. I did not try to restore it or work around it.
- **W6 referral mechanics:** per-signup codes and `?ref=` links, Copy/Share in the success state, friends-joined dots and the `referral_copy` event all need a new column plus a code/count system. Stopped per the handoff pending Pavan. What shipped is the capture and "Coming soon".
- **W3 "five rows appear" check:** needs production writes (not allowed) and a live Supabase (paused).
- **W4 kit / welcome email:** there is no email service. Signups are stored and nothing is sent.
- **W7 Pixel Helper and iMessage preview checks:** need the pixel IDs and a deploy.
- **Canvas matching (W2 and W9 desktop):** canvas not available.
- **Real-iPhone verification (operating rule 7):** no device. The simulator stood in.

### QUESTIONS
1. **Restore Supabase project `zkwamqtnaegvlptzdqxn` before deploying v2.** v2 reports a failed save honestly ("Could not save. Try again?"), so while the project is paused every v2 form will show that error. v1 shows a false "you're in".
2. **Backend change: NOT APPLIED.** Please review and deploy. Until it's live, rows from hero, tips, footer and popup_kit land as `source='landing'` (the quiz stays `quiz`), `referred_by` is dropped, and success says "You're on the list." with no position. The patched function passes `deno check`.
```diff
--- a/supabase/functions/join-waitlist/index.ts
+++ b/supabase/functions/join-waitlist/index.ts
@@ -47,7 +47,8 @@
 // outside these sets is dropped (NOT rejected) so a quietly malformed
 // client payload still lets the email row land.
 const ENUM = {
-  source:          ["landing", "store_button", "quiz", "other"] as const,
+  // v2 landing page sends hero | quiz | tips | footer | popup_kit.
+  source:          ["landing", "store_button", "quiz", "other", "hero", "tips", "footer", "popup_kit"] as const,
   platform:        ["ios", "android"] as const,
   group_type:      ["family", "couple", "friends", "solo"] as const,
   travel_style:    ["budget", "comfortable", "luxury", "ultra"] as const,
@@ -112,6 +113,7 @@
     utm_source:      typeof body.utm_source   === "string" ? body.utm_source.slice(0, 80)   : null,
     utm_medium:      typeof body.utm_medium   === "string" ? body.utm_medium.slice(0, 80)   : null,
     utm_campaign:    typeof body.utm_campaign === "string" ? body.utm_campaign.slice(0, 80) : null,
+    referred_by:     typeof body.referred_by  === "string" ? body.referred_by.slice(0, 64)  : null,
   };
 
   const supabase = createClient(
@@ -122,9 +124,11 @@
   // Upsert on email so a hero-then-quiz flow merges instead of erroring
   // on the second submit. `ignoreDuplicates: false` makes Supabase do an
   // actual UPDATE of the other fields when a row already exists.
-  const { error } = await supabase
+  const { data: saved, error } = await supabase
     .from("waitlist")
-    .upsert(row, { onConflict: "email", ignoreDuplicates: false });
+    .upsert(row, { onConflict: "email", ignoreDuplicates: false })
+    .select("created_at")
+    .single();
 
   if (error) {
     console.error("[join-waitlist] insert error:", error);
@@ -134,5 +138,12 @@
     });
   }
 
-  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: json });
+  // Position in line = rows that joined at or before this one. Stable across
+  // re-submits because the upsert never touches created_at.
+  const { count } = await supabase
+    .from("waitlist")
+    .select("id", { count: "exact", head: true })
+    .lte("created_at", saved.created_at);
+
+  return new Response(JSON.stringify({ ok: true, position: count ?? undefined }), { status: 200, headers: json });
 });
```
   Migration (NOT APPLIED; the `source` column has no CHECK constraint, so the allow-list change needs no migration; only `referred_by` does), e.g. `supabase/migrations/20260929000000_waitlist_referred_by.sql`:
```sql
-- v2 landing page sends referred_by (inbound ?ref= code). Nullable; no codes exist yet (W6 pending).
-- source now also carries: 'hero' | 'tips' | 'footer' | 'popup_kit' (no CHECK constraint on the column).
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS referred_by text;
CREATE INDEX IF NOT EXISTS waitlist_referred_by_idx ON public.waitlist (referred_by) WHERE referred_by IS NOT NULL;
```
3. **Position in line:** is showing "You're #N in line" wanted? It publicly reveals the list size. The frontend shows it automatically once `position` comes back; drop that part of the diff to keep "You're on the list."
4. **Re-submits overwrite data (existing backend behaviour, not in the diff):** the upsert writes nulls over existing fields. Example: someone takes the quiz on their phone, then joins from the hero on a laptop; `traveler_type`, UTMs and `source` are wiped. A one-line fix is to drop `null`/empty fields from `row` before the upsert. Want it?
5. **Kit / welcome email:** no email service is wired. Needs the kit content (PDF or page) and a sender. The domain-migration notes mention Resend is already set up for the domain, so its free tier could send a welcome email, but that needs Pavan's OK (handoff rule 6). Until then, popup signups get nothing, even though the popup says "free in your inbox".
6. **Pixel IDs:** TikTok and Meta. Paste them into the two constants at the top of the `<script>`.
7. **Consent banner:** Meta and TikTok pixels set cookies, which usually needs consent for EU/UK visitors and an opt-out for some US states. Not added, per instructions. Decide before setting the pixel IDs.
8. **Page analytics:** nothing is installed, so the custom events currently go only to the pixels (and to the console on localhost). Vercel Web Analytics has a free tier and fits this stack (one script tag). Speed Insights is already enabled on the project but not on the page. Add either?
9. **Testimonials:** removed. If Sarah M. / Anna K. are confirmed real and approved, the section can come back.
10. **Copy deviations to approve:**
    - "I'm a [TYPE]" becomes "I'm **an** Explorer", and the result lead reads "You're a/an".
    - Visually hidden "Email address" labels; a visible "FAQ" heading (the handoff gives no FAQ heading).
    - Reused v1 strings: placeholders "Enter your email" and "Enter your email to save your type", the "Save & join" button, the quiz fine print, "Retake the quiz", "← Back", "Continue", "Please enter a valid email".
    - "Could not save. Try again?" is the edge function's own error text.
    - Tips cards are tagged "Meme" and "Tip".
11. **Design-token notes:**
    - green-deep `#3E7A63` on cream is 4.40:1, which fails AA below 18.66 px bold, so eyebrows are 19 px bold.
    - Dark inputs use the `line` border as the token table says; `line` on ink is 1.54:1, under the 3:1 WCAG 1.4.11 asks for input boundaries. Keep, or brighten the input border?
12. **Quiz after signup:** someone who already signed up and then takes the quiz sees "You're on the list." instead of a form (per W3), so their traveler type isn't saved. OK?
13. **Quiz shape:** the v1 quiz logic was kept, so question 4 has 6 options (a 2×3 grid, multi-select up to 3), not 2×2.
14. **Share link:** `?type=` on inbound share links is ignored by the page (nothing specified).
15. **JSON-LD** in `<head>` still says `"operatingSystem": "iOS, Android"` with the old description. Not in scope; update?
16. **`.vercelignore`** keeps `qa/`, `tools/` and this report off production. Please confirm on the preview deploy that `/qa/…` returns 404.

### Lighthouse after
- **Performance 100 / Accessibility 100 / SEO 100** (mobile; FCP 1.0 s, LCP 1.1 s, TBT 0 ms, CLS 0), measured on the **local** build (`python3 -m http.server`). Local has no CDN, no compression and near-zero latency, so Performance is not apples-to-apples with the live 89. Re-run on the Vercel preview URL before merging.
- Before (live): 89 / 88 / 100.

### Branch, commits, files
- Branch `web-v2`, nine task commits plus this W9 commit:
  - `99714d4` W0 · `8cb03ce` W1 · `73afbb4` W2 · `6eb2799` W3 · `12026fb` W4 · `95fa3d7` W5 · `30e3b8d` W6 · `3431d2e` W7 · `bd9a183` W8 · W9 = the commit containing this file.
- New site files: `og.png`, `share/explorer.png`, `share/trailblazer.png`, `share/visionary.png`.
- Repo-only files (not deployed): `tools/share-card.html`, `tools/og.html`, `tools/render-images.sh` (re-renders all images; needs the site served on :3000), `.gitignore`, `.vercelignore`, `WEB_V2_REPORT.md`.
- Committed screenshots (`qa/`): `w1-foundation.png`, `w3-hero-success-390.png`, `w4-popup-390.png`, `w4-popup-1440.png`, `w5-quiz-result-390.png`, `w8-focus-rings.png`, `w9-desktop-1440-hero.png`, `w9-sim-top.png`, `w9-sim-hero-success.png`, `w9-sim-popup.png`, `w9-sim-share-sheet.png`.
- Not committed (`qa/raw/`, gitignored): full-page 390 and 1440 Chrome renders, per-section simulator captures (`sim-02-top` … `sim-11-site-footer`), and both Lighthouse JSONs.
- Leftovers: the simulator device `GTT-Web` (`14CE60F8-9B41-45FF-8207-9BE3DD52CFA6`) is shut down; delete it with `xcrun simctl delete 14CE60F8-9B41-45FF-8207-9BE3DD52CFA6`. The test scripts (puppeteer-core, safaridriver client) live in the session scratchpad only.
