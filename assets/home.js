/* Go To Travel website v3: the home page.
   Phone mocks, postcards + dream board, the traveler quiz (the app's exact ids, handoff A3), every signup
   form (one endpoint, handoff A6), spin the globe, the Founding Traveler invite, and the pop-up rules (A4). */
(function () {
  "use strict";
  const G = window.GTT;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const use = (id) => `<svg aria-hidden="true" focusable="false"><use href="#${id}" width="100%" height="100%"></use></svg>`;
  const live = G.CONFIG.launchMode === "live";

  G.track("page_view", { path: location.pathname });

  // ── launchMode (handoff A1) ─────────────────────────────────────────────
  $$("[data-cta-label]").forEach((el) => { el.textContent = live ? "Get the app" : "Get early access"; });
  $("[data-status-pill]").textContent = live ? "Now on the App Store" : "iPhone beta · invites going out in waves";
  $("[data-final-line]").textContent = live ? "Free on iPhone. Bring the crew." : "Be first in when the beta opens. Bring the crew.";
  if (live) {
    $$("[data-live]").forEach((el) => { el.hidden = false; });
    $$("form[data-source=hero]").forEach((f) => { f.hidden = true; });
    $$("[data-cta]").forEach((a) => { a.href = G.CONFIG.appStoreUrl; });
    const m = document.createElement("meta");
    m.name = "apple-itunes-app"; m.content = "app-id=6761403615, app-argument=https://gototravelapp.com/";
    document.head.appendChild(m);
  }
  document.addEventListener("click", (e) => {
    const cta = e.target.closest("[data-cta]");
    if (cta) G.track("cta_click", { location: cta.dataset.cta });
    const social = e.target.closest("[data-social]");
    if (social) G.track("social_click", { network: social.dataset.social, location: social.dataset.loc });
    const store = e.target.closest("[data-store]");
    if (store) G.track("app_store_click", { location: store.dataset.store });
  });

  // ── Phone mocks (V3Phone*) ──────────────────────────────────────────────
  const TABS = (on) => {
    const ic = {
      Trips: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
      Saves: '<path d="M6 3h12v18l-6-4-6 4z"/>',
      Crew: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5M15 15c3 0 6 1.5 6 4"/>',
      You: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    };
    const t = (n) => `<div class="${n === on ? "on" : ""}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ic[n]}</svg>${n}</div>`;
    return `<div class="p-tabs">${t("Trips")}${t("Saves")}<div class="plus"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>${t("Crew")}${t("You")}</div>`;
  };
  const row = (art, k, t, s, sColor = "#7FC7A7") => `<div class="p-row"><div class="art">${use(art)}</div><div style="min-width:0"><div class="p-k">${k}</div><div class="p-t">${t}</div><div class="p-s" style="color:${sColor}">${s}</div></div></div>`;
  const sparkle = '<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>';
  const PHONES = {
    trip: () => `<div class="phone"><div class="screen">
      <div class="art" style="height:178px;flex-shrink:0;border-radius:0">${use("scene-coast")}
        <div style="position:absolute;left:0;right:0;bottom:0;padding:14px 16px;background:linear-gradient(0deg,rgba(15,26,23,.92),rgba(15,26,23,0))">
          <div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#F7B955">Nov 6–8 · 2 travelers</div>
          <div style="font:800 26px/1.05 var(--display);letter-spacing:-.02em">Big Sur Weekend</div></div></div>
      <div style="margin:10px 12px 0;padding:9px 11px;border-radius:16px;background:rgba(95,176,143,.14);border:1px solid rgba(95,176,143,.4);display:flex;align-items:center;gap:9px">
        <div style="width:26px;height:26px;flex-shrink:0;border-radius:8px;background:#5FB08F;color:#0F1A17;display:grid;place-items:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round">${sparkle}</svg></div>
        <div style="flex-grow:1;font-size:11px;line-height:1.35"><b>Your AI planned 9 things</b><br><span style="color:#A9B6B0">Sent from Claude · tap to review</span></div>
        <div style="font-size:11px;font-weight:700;color:#7FC7A7">Looks good</div></div>
      <div style="display:flex;gap:6px;padding:10px 12px 6px"><span class="p-chip on">Fri</span><span class="p-chip">Sat</span><span class="p-chip">Sun</span><span class="p-chip" style="margin-left:auto">Map</span></div>
      <div style="padding:0 12px;display:flex;flex-direction:column;gap:7px">
        ${row("scene-trail", "Morning · 9:00", "Pfeiffer Falls Trail", "From your TikTok saves")}
        ${row("scene-food", "Lunch · 12:30", "Big Sur Bakery", "Added by Claude", "#A9B6B0")}
        ${row("scene-coast", "Sunset · 6:10", "McWay Falls Overlook", "From your TikTok saves")}
      </div>${TABS("Trips")}</div></div>`,
    saves: () => `<div class="phone"><div class="screen">
      <div style="padding:30px 16px 10px;display:flex;align-items:center;justify-content:space-between"><div style="font:800 24px var(--display);letter-spacing:-.02em">Saves</div>
        <div style="padding:5px 10px;border-radius:999px;background:rgba(242,169,59,.16);color:#F7B955;font-size:11px;font-weight:700">+ Drop</div></div>
      <div style="display:flex;gap:6px;padding:0 16px 10px"><span class="p-chip on">Inbox · 3</span><span class="p-chip">Piles</span><span class="p-chip">Needs a look · 1</span></div>
      <div style="padding:0 12px;display:flex;flex-direction:column;gap:10px">
        <div style="border-radius:22px;overflow:hidden;background:var(--surface);border:1px solid var(--line)">
          <div class="art" style="height:112px">${use("scene-trail")}
            <div style="position:absolute;left:10px;top:10px;padding:4px 9px;border-radius:999px;background:rgba(15,26,23,.6);border:1px solid rgba(255,255,255,.18);font-size:10px;font-weight:600">@trailmix_eli · TikTok</div>
            <div style="position:absolute;right:10px;top:10px;padding:4px 9px;border-radius:999px;background:#5FB08F;color:#0F1A17;font-size:10px;font-weight:800">READY</div></div>
          <div style="padding:10px 12px 12px;display:flex;flex-direction:column;gap:7px">
            <div style="font-size:13px;font-weight:700">3 hikes · Big Sur, CA</div>
            <div style="display:flex;flex-direction:column;gap:5px;font-size:12px;color:#C9D1CD">
              <div style="display:flex;justify-content:space-between"><span>Pfeiffer Falls Trail</span><span style="color:#7FC7A7;font-weight:600">Verified</span></div>
              <div style="display:flex;justify-content:space-between"><span>McWay Falls Overlook</span><span style="color:#7FC7A7;font-weight:600">Verified</span></div>
              <div style="display:flex;justify-content:space-between"><span>Partington Cove</span><span style="color:#F7B955;font-weight:600">Is this it?</span></div></div>
            <div style="display:flex;gap:6px"><div style="flex:1;height:34px;border-radius:12px;background:#F2A93B;color:#1A1206;font-size:12px;font-weight:700;display:grid;place-items:center">Add to trip</div><div style="flex:1;height:34px;border-radius:12px;border:1px solid #3A4C45;font-size:12px;font-weight:600;display:grid;place-items:center">Send to my AI</div></div>
          </div></div>
        ${row("scene-food", "@nomadnoodles · Instagram", "2 ramen spots · Tokyo", "", "#9DAAA4")}
        <div style="display:flex;gap:10px;align-items:center;padding:10px;border-radius:18px;background:var(--surface);border:1px dashed #3A4C45;font-size:12px;color:#9DAAA4">Finding spots in your Lisbon reel…</div>
      </div>${TABS("Saves")}</div></div>`,
    crew: () => `<div class="phone"><div class="screen">
      <div style="padding:30px 16px 8px"><div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7FC7A7">Crew · Tokyo, April</div><div style="font:800 22px/1.1 var(--display);letter-spacing:-.02em">Swipe to vote</div></div>
      <div style="display:flex;align-items:center;gap:8px;padding:0 16px 10px"><div style="display:flex">${["#EE6C4D:P", "#52927A:M", "#6C7BD6:S", "#C9A15A:J"].map((x, i) => `<span style="width:24px;height:24px;${i ? "margin-left:-7px;" : ""}border-radius:50%;background:${x.split(":")[0]};border:2px solid #0F1A17;font-size:10px;font-weight:800;display:grid;place-items:center">${x.split(":")[1]}</span>`).join("")}</div><div style="font-size:11px;color:#A9B6B0">4 voted · 1 voting on the web</div></div>
      <div style="position:relative;flex-grow:1;margin:0 14px 6px;min-height:300px">
        <div style="position:absolute;left:14px;right:14px;top:10px;bottom:44px;border-radius:24px;background:#1E2D28;transform:rotate(4deg)"></div>
        <div style="position:absolute;left:0;right:0;top:0;bottom:50px;border-radius:24px;overflow:hidden;background:var(--surface);border:1px solid var(--line);transform:rotate(-3deg);box-shadow:0 18px 40px rgba(0,0,0,.35)">
          <div class="art" style="height:58%">${use("scene-food")}<div style="position:absolute;left:12px;top:12px;padding:6px 12px;border-radius:10px;border:2px solid #7FC7A7;color:#7FC7A7;font-size:13px;font-weight:800;letter-spacing:.06em;transform:rotate(-12deg);background:rgba(15,26,23,.6)">IN</div></div>
          <div style="padding:12px;display:flex;flex-direction:column;gap:6px"><div style="font-size:15px;font-weight:700">Ichiran Shibuya</div><div style="font-size:11px;color:#A9B6B0">Ramen · Shibuya · open late</div>
            <div style="display:flex;align-items:center;gap:8px"><div style="flex-grow:1;height:8px;border-radius:4px;background:#2A3A34"><div style="width:80%;height:8px;border-radius:4px;background:#5FB08F"></div></div><div style="font-size:11px;font-weight:700;color:#7FC7A7">4 of 5 in</div></div></div></div>
        <div style="position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:center;gap:14px"><span style="width:44px;height:44px;border-radius:50%;background:#22322C;border:1px solid #3A4C45;color:#EE6C4D;display:grid;place-items:center;font-weight:800">✕</span><span style="width:44px;height:44px;border-radius:50%;background:#22322C;border:1px solid #3A4C45;color:#C9D1CD;font-size:12px;font-weight:800;display:grid;place-items:center">Meh</span><span style="width:44px;height:44px;border-radius:50%;background:#5FB08F;color:#0F1A17;display:grid;place-items:center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg></span></div>
      </div>
      <div style="margin:6px 14px 0;padding:9px 12px;border-radius:14px;background:var(--surface);border:1px solid var(--line);display:flex;align-items:center;justify-content:space-between"><div style="font-size:11px;line-height:1.35"><b>Budget overlap</b><br><span style="color:#A9B6B0">$90–140 / night · private</span></div><div style="padding:6px 10px;border-radius:10px;background:#F2A93B;color:#1A1206;font-size:11px;font-weight:700">Lock it in</div></div>
      ${TABS("Crew")}</div></div>`,
    family: () => `<div class="phone"><div class="screen">
      <div style="padding:30px 14px 8px;display:flex;flex-direction:column;gap:6px"><div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#F7B955">Sat · San Diego long weekend</div><div style="font:800 21px/1.1 var(--display);letter-spacing:-.02em">Built around your crew</div>
        <div style="display:flex;gap:6px">${[["art-lego", "Leo, 7 · building"], ["art-animals", "Mia, 4 · vegan"]].map(([a, t]) => `<div style="display:flex;align-items:center;gap:6px;padding:4px 9px 4px 4px;border-radius:999px;background:var(--surface);border:1px solid var(--line);font-size:10.5px;font-weight:600"><span class="art" style="width:20px;height:20px;border-radius:50%">${use(a)}</span>${t}</div>`).join("")}</div></div>
      <div style="margin:2px 12px 8px;padding:8px 10px;border-radius:14px;background:rgba(159,182,255,.14);border:1px solid rgba(159,182,255,.4);font-size:10.5px;line-height:1.35"><b>Rain from 2 PM.</b> Beach moved to Sunday; aquarium now. <b style="color:#9FB6FF">Undo</b></div>
      <div style="padding:0 12px;display:flex;flex-direction:column;gap:6px">
        ${row("art-lego", "9:30 AM", "LEGOLAND California", "Because Leo loves building", "#F7B955")}
        ${row("scene-food", "12:30 PM", "[Kid-friendly vegan café]", "Vegan for Mia · high chairs · 6 min away")}
        <div style="display:flex;gap:10px;align-items:center;padding:8px;border-radius:16px;border:1.5px dashed #3A4C45"><div style="width:42px;height:42px;border-radius:10px;background:#1E2D28"></div><div><div class="p-k">1:00–3:00 PM</div><div class="p-t">Nap window kept free</div><div class="p-s" style="color:#9DAAA4">Mia's usual nap</div></div></div>
        ${row("art-water", "3:30 PM · indoors", "Birch Aquarium", "Mia loves animals · rain-proof", "#F7B955")}
      </div>
      <div style="margin:8px 12px 0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px">
        <div style="padding:8px 10px;border-radius:14px;background:var(--surface);border:1px solid var(--line)"><div class="p-k">Budget</div><div class="p-t">$640 of $900</div><div style="height:5px;border-radius:3px;background:#2A3A34;margin-top:5px"><div style="width:71%;height:5px;border-radius:3px;background:#5FB08F"></div></div></div>
        <div style="padding:8px 10px;border-radius:14px;background:var(--surface);border:1px solid var(--line)"><div class="p-k">Packing</div><div class="p-t">14 of 18 packed</div><div class="p-s" style="color:#F7B955;margin-top:3px">+ rain jackets (new)</div></div></div>
      ${TABS("Trips")}</div></div>`,
    watch: () => `<div class="phone"><div class="screen">
      <div class="art" style="position:absolute;inset:0">${use("scene-trail")}</div><div style="position:absolute;inset:0;background:rgba(10,16,14,.35)"></div>
      <div style="position:absolute;left:0;right:0;top:40px;text-align:center"><div style="font-size:13px;font-weight:600;color:rgba(255,255,255,.9)">Saturday, November 7</div><div style="font:700 64px/1 var(--display);color:#fff;letter-spacing:-.03em">7:42</div></div>
      <div style="position:absolute;left:10px;right:10px;top:160px;padding:12px;border-radius:20px;background:rgba(245,240,230,.72);border:1px solid rgba(255,255,255,.5);color:#13201C;display:flex;gap:10px">
        <div style="width:28px;height:28px;flex-shrink:0;border-radius:8px;background:#52927A"></div>
        <div style="display:flex;flex-direction:column;gap:2px"><div style="display:flex;justify-content:space-between;font-size:10px;color:#3F4B46"><b style="letter-spacing:.04em">GO TO TRAVEL</b><span>now</span></div><div style="font-size:12.5px;font-weight:700">Rain at 2 PM — we have a fix</div><div style="font-size:11.5px;line-height:1.35">Swap Pfeiffer Falls hike to this morning (clear until 1 PM) and move the bakery to lunch?</div></div></div>
      <div style="position:absolute;left:10px;right:10px;bottom:10px;padding:14px;border-radius:26px;background:rgba(15,26,23,.84);border:1px solid rgba(255,255,255,.12);display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;align-items:center;gap:8px"><span style="padding:4px 9px;border-radius:999px;background:rgba(242,169,59,.18);color:#F7B955;font-size:10px;font-weight:800;letter-spacing:.05em">TRIP WATCH</span><span style="font-size:11px;color:#A9B6B0">Today · Big Sur</span></div>
        <div style="display:flex;flex-direction:column;gap:6px;font-size:12px">
          <div style="display:flex;gap:8px"><span style="width:44px;color:#9DAAA4">9:00</span><b>Pfeiffer Falls Trail</b><span style="margin-left:auto;color:#7FC7A7;font-size:10px;font-weight:700">MOVED UP</span></div>
          <div style="display:flex;gap:8px"><span style="width:44px;color:#9DAAA4">12:30</span><b>Big Sur Bakery</b></div>
          <div style="display:flex;gap:8px;color:#9DAAA4"><span style="width:44px">2:00</span><s>Hike</s><span style="margin-left:auto;font-size:10px">rain 80%</span></div>
          <div style="display:flex;gap:8px"><span style="width:44px;color:#9DAAA4">2:30</span><b>Henry Miller Library</b><span style="margin-left:auto;color:#7FC7A7;font-size:10px;font-weight:700">INDOORS</span></div></div>
        <div style="display:flex;gap:8px"><div style="flex:1;height:40px;border-radius:14px;background:#F2A93B;color:#1A1206;font-size:13px;font-weight:700;display:grid;place-items:center">Apply fix</div><div style="flex:1;height:40px;border-radius:14px;border:1px solid #3A4C45;font-size:13px;font-weight:600;display:grid;place-items:center">Other ideas</div></div></div>
      </div></div>`,
  };
  $$("[data-phone]").forEach((el) => { el.outerHTML = PHONES[el.dataset.phone](); });

  // ── Postcards + dream board ─────────────────────────────────────────────
  const POSTCARDS = {
    classics: [
      { kind: "eiffel", name: "Eiffel Tower", place: "Paris, France", note: "sparkles every hour", tilt: -1.2 },
      { kind: "greatwall", name: "Great Wall", place: "Mutianyu, China", note: "go at sunrise", tilt: 0.8 },
      { kind: "tajmahal", name: "Taj Mahal", place: "Agra, India", note: "pink at dawn", tilt: -0.6 },
      { kind: "santorini", name: "Oia", place: "Santorini, Greece", note: "blue domes, no filter", tilt: 1.2 },
    ],
    hidden: [
      { kind: "uyuni", name: "Salar de Uyuni", place: "Bolivia", note: "the world's biggest mirror", tilt: 1 },
      { kind: "cappadocia", name: "Cappadocia", place: "Türkiye", note: "balloons at 6 AM", tilt: -1 },
      { kind: "aurora", name: "Lofoten", place: "Norway", note: "northern lights from a cabin", tilt: 0.6 },
      { kind: "alps", name: "Riffelsee", place: "Zermatt, Switzerland", note: "the Matterhorn, twice", tilt: -0.8 },
    ],
  };
  const heartSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7-4.4-9.3-8.6C1 9 3 5.5 6.6 5.5c2 0 3.4 1.1 4.4 2.5 1-1.4 2.4-2.5 4.4-2.5C19 5.5 21 9 19.3 12.4 17 16.6 12 21 12 21z"/></svg>';
  const dreams = () => G.store.get("gtt_dreams") || [];
  $$("[data-postcards]").forEach((wrap) => {
    wrap.innerHTML = POSTCARDS[wrap.dataset.postcards].map((c) => `
      <article class="postcard" style="--tilt:${c.tilt}deg">
        <div class="art">${use("scene-" + c.kind)}<button type="button" class="heart" data-dream="${c.kind}" data-name="${esc(c.name)}" aria-pressed="false" aria-label="Save ${esc(c.name)} to dream board">${heartSvg}</button></div>
        <div class="pc-body"><div><h4 class="pc-name">${esc(c.name)}</h4><div class="pc-place">${esc(c.place)}</div></div><div class="pc-note">${esc(c.note)}</div></div>
      </article>`).join("");
  });
  function renderDreams() {
    const d = dreams();
    $$("[data-dream]").forEach((b) => {
      const on = d.includes(b.dataset.dream);
      b.setAttribute("aria-pressed", on);
      b.setAttribute("aria-label", `${on ? "Remove" : "Save"} ${b.dataset.name} ${on ? "from" : "to"} dream board`);
    });
    const n = d.length;
    $("[data-dream-line]").textContent = n === 0 ? "Tap a heart to start your dream board"
      : `${n} ${n === 1 ? "dream" : "dreams"} saved${G.me() ? "" : " · sign up to keep them"}`;
    $("[data-dream-signup]").hidden = !n || !!G.me();
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-dream]");
    if (!b) return;
    const d = dreams(), k = b.dataset.dream;
    const next = d.includes(k) ? d.filter((x) => x !== k) : d.concat(k);
    G.store.set("gtt_dreams", next);
    if (!d.includes(k)) G.track("dream_add", { id: k });
    renderDreams();
    // Already signed up: save the dream board to the signup now (merge on email server-side isn't possible
    // without the email, so it rides along with the next signup; see report).
  });
  renderDreams();

  // ── The traveler quiz (handoff A3): the app's ids and copy ───────────────
  const GROUPS = [
    { id: "solo", label: "Solo", desc: "Just me" }, { id: "couple", label: "Couple", desc: "Me + partner" },
    { id: "friends", label: "Friends", desc: "Group trip" }, { id: "family", label: "Family", desc: "Kids included" },
  ];
  // One free kit per group, so a solo traveler never gets the kids' weekend email (Pavan, Oct 15).
  const KITS = {
    family: { badge: "FREE FOR PARENTS", title: "The Weekend Rescue Kit", short: "the Weekend Rescue Kit", friday: "One kid-proof weekend idea every Friday",
      items: ["Rainy-day backups that kids actually like", "The 10-minute packing list for every age", "A Friday email with weekend ideas near you"] },
    solo: { badge: "FREE FOR SOLO TRAVELERS", title: "The Solo Trip Playbook", short: "the Solo Trip Playbook", friday: "One solo trip idea every Friday",
      items: ["Solo-friendly places to stay, eat and meet people", "The one-bag packing list", "A Friday email with one trip made for one"] },
    couple: { badge: "FREE FOR COUPLES", title: "The Getaway for Two Kit", short: "the Getaway for Two Kit", friday: "One getaway for two every Friday",
      items: ["Weekend getaways a short drive or flight away", "Date-night spots locals love, not tourist traps", "A Friday email with one trip for two"] },
    friends: { badge: "FREE FOR CREWS", title: "The Group Trip Kit", short: "the Group Trip Kit", friday: "One crew trip idea every Friday",
      items: ["How to get the group chat to actually commit", "The split-it-fair cost sheet", "A Friday email with one trip for the crew"] },
  };
  // Everything that changes once we know who they travel with.
  function personalize() {
    const kit = KITS[q.group];
    const lbl = document.querySelector('label[for="email-tips"]');
    if (lbl) lbl.textContent = kit ? kit.friday : "One trip idea every Friday";
  }
  const STYLES = [
    { id: "budget", label: "Budget", icon: "$", desc: "Best value, hostels, street food" },
    { id: "comfortable", label: "Comfortable", icon: "$$", desc: "Mid-range hotels, good restaurants" },
    { id: "luxury", label: "Luxury", icon: "$$$", desc: "4-5 star hotels, fine dining" },
    { id: "ultra", label: "Ultra-luxury", icon: "$$$$", desc: "Private jets, exclusive experiences" },
  ];
  const PACES = [
    { id: "relaxed", label: "Relaxed", desc: "Slow pace, lots of downtime" }, { id: "balanced", label: "Balanced", desc: "Mix of activities and rest" },
    { id: "active", label: "Active", desc: "Packed itinerary, always moving" }, { id: "thrill", label: "Thrill-seeker", desc: "Extreme sports, off the beaten path" },
  ];
  const INTERESTS = [
    ["food", "Foodie"], ["nature", "Nature"], ["beach", "Beach"], ["culture", "Culture"], ["adventure", "Adventure"], ["nightlife", "Nightlife"],
    ["wellness", "Wellness"], ["shopping", "Shopping"], ["history", "History"], ["photography", "Photography"], ["sports", "Sports"],
  ];
  const KID_INTERESTS = [["family_fun", "Family fun"], ["parks", "Parks"], ["playgrounds", "Playgrounds"], ["kid_dining", "Kid-friendly dining"], ["zoos_aquariums", "Zoos & aquariums"]];
  const ART = { food: "scene-food", nature: "scene-alps", beach: "scene-santorini", culture: "scene-tajmahal", adventure: "scene-cappadocia", nightlife: "scene-city", wellness: "art-relaxed", shopping: "scene-eiffel", history: "scene-greatwall", photography: "scene-aurora", sports: "art-active", family_fun: "art-family", parks: "scene-trail", playgrounds: "art-balanced", kid_dining: "scene-food", zoos_aquariums: "art-animals" };
  const KID_AGES = [["0-2", "0–2"], ["3-5", "3–5"], ["6-9", "6–9"], ["10-13", "10–13"], ["teen", "Teen"]];
  const KID_LOVES = [["lego", "LEGO & building"], ["dinos", "Dinosaurs"], ["animals", "Animals"], ["water", "Water & beaches"], ["science", "Science & space"], ["art", "Art & making"]];
  const KID_FOOD = [["none", "No restrictions"], ["vegetarian", "Vegetarian"], ["vegan", "Vegan"], ["nut_free", "Nut-free"], ["gluten_free", "Gluten-free"], ["picky", "Picky eater"]];
  const TIERS = {
    budget: { name: "Explorer", eyebrow: "You're an", tagline: "You travel for the find.", blurb: "You chase the hidden gems and the best value — the trips you'll actually brag about. We'll surface the finds others miss." },
    comfortable: { name: "Trailblazer", eyebrow: "You're a", tagline: "Comfort meets adventure.", blurb: "You want comfort and adventure in the same trip. We'll mix trusted favorites with a few things worth the detour." },
    luxury: { name: "Visionary", eyebrow: "You're a", tagline: "Premium, no compromises.", blurb: "You travel for the very best — fine dining, private tours, the kind of stay you remember. We'll plan around the experiences that matter." },
    ultra: { name: "Visionary", eyebrow: "You're a", tagline: "Nothing but the best.", blurb: "Only the exceptional makes the cut. We'll line up the rare, the exclusive, and the unforgettable — and leave the ordinary behind." },
  };
  const SCENE_BY = { nature: "alps", adventure: "cappadocia", sports: "alps", photography: "aurora", parks: "trail", beach: "santorini", wellness: "uyuni", food: "food", kid_dining: "food", culture: "tajmahal", history: "greatwall", nightlife: "eiffel", shopping: "eiffel", family_fun: "coast", playgrounds: "trail", zoos_aquariums: "coast" };
  const GROUP_LINE = { solo: "Traveling solo", couple: "Traveling as a couple", friends: "Traveling with friends", family: "Traveling with family" };

  const blank = () => ({ step: 0, group: null, style: null, pace: null, picks: [], kidAge: null, kidLoves: [], kidFood: [], started: false });
  let q = { ...blank(), ...(G.store.get("gtt_quiz") || {}) };
  const save = () => G.store.set("gtt_quiz", q);
  const isFam = () => q.group === "family";
  const total = () => (isFam() ? 5 : 4);
  const RESULT = 5;
  const tier = () => TIERS[q.style] || TIERS.comfortable;
  const stage = $("[data-q-stage]");

  const choice = (id, art, label, desc, on, extra = "") =>
    `<button type="button" class="choice" data-pick="${id}" aria-pressed="${on}"><div class="art">${use(art)}</div><b><span>${esc(label)}</span>${extra}</b>${desc ? `<small>${esc(desc)}</small>` : ""}</button>`;

  function renderQuiz(focus) {
    const st = q.step;
    const done = st === RESULT;
    const n = Math.min(st + 1, total());
    $("[data-q-progress]").textContent = done ? "Done!" : `Question ${n} of ${total()}`;
    const pct = Math.round(((done ? total() : st) / total()) * 100);
    const bar = $("[data-q-bar]"); bar.setAttribute("aria-valuenow", pct); bar.firstElementChild.style.width = pct + "%";
    $("[data-q-back]").hidden = !(st > 0);
    $("[data-q-restart]").hidden = !(st > 0 || q.group);
    let html = "";
    if (st === 0) html = `<fieldset style="border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:12px"><legend class="qtitle">Who's coming?</legend><div class="choices">${GROUPS.map((g) => choice(g.id, "art-" + g.id, g.label, g.desc, q.group === g.id)).join("")}</div></fieldset>`;
    if (st === 1) html = `<fieldset style="border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:12px"><legend class="qtitle">How do you like to travel?</legend><div class="choices">${STYLES.map((o) => choice(o.id, "art-" + o.id, o.label, o.desc, q.style === o.id, `<em>${o.icon}</em>`)).join("")}</div></fieldset>`;
    if (st === 2) html = `<fieldset style="border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:12px"><legend class="qtitle">What pace feels right?</legend><div class="choices">${PACES.map((o) => choice(o.id, "art-" + o.id, o.label, o.desc, q.pace === o.id)).join("")}</div></fieldset>`;
    if (st === 3) {
      const pool = isFam() ? INTERESTS.concat(KID_INTERESTS) : INTERESTS;
      html = `<fieldset style="border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:12px"><legend class="qtitle">What do you love? <small>Pick up to 3</small></legend>
        <div class="tiles">${pool.map(([id, label]) => choice(id, ART[id] || "scene-trail", label, "", q.picks.includes(id))).join("")}</div>
        <button type="button" class="btn btn-sun" data-q-next style="align-self:flex-start" ${q.picks.length ? "" : "disabled"}>See my traveler type</button></fieldset>`;
    }
    if (st === 4) {
      html = `<div style="display:flex;flex-direction:column;gap:14px"><div class="qtitle">Tell us about your little travelers <small>so every plan works for them</small></div>
        <div class="pills" role="group" aria-label="Age"><span class="lab">Age</span>${KID_AGES.map(([id, l]) => `<button type="button" class="qpill" data-kid-age="${id}" aria-pressed="${q.kidAge === id}">${l}</button>`).join("")}</div>
        <div class="pills"><span class="lab">They're into</span></div>
        <div class="tiles">${KID_LOVES.map(([id, l]) => `<button type="button" class="choice" data-kid-love="${id}" aria-pressed="${q.kidLoves.includes(id)}"><div class="art">${use("art-" + id)}</div><b><span>${l}</span></b></button>`).join("")}</div>
        <div class="pills" role="group" aria-label="Eats"><span class="lab">Eats</span>${KID_FOOD.map(([id, l]) => `<button type="button" class="qpill" data-kid-food="${id}" aria-pressed="${q.kidFood.includes(id)}">${l}</button>`).join("")}</div>
        <p style="font-size:14px;color:#9DAAA4">Optional. Food needs are only used to suggest places to eat, never for ads, and you can delete them anytime. You can add more kids, names and nap times in the app. Kids' details stay private to your family.</p>
        <button type="button" class="btn btn-sun" data-q-kids-done style="align-self:flex-start">See my traveler type</button></div>`;
    }
    if (done) {
      const t = tier();
      const scene = SCENE_BY[q.picks[0]] || (q.style === "budget" ? "cappadocia" : q.style === "comfortable" || !q.style ? "alps" : "santorini");
      const pool = INTERESTS.concat(KID_INTERESTS);
      const picked = pool.filter(([id]) => q.picks.includes(id)).map(([, l]) => l);
      const pace = PACES.find((p) => p.id === q.pace);
      const kidBits = KID_LOVES.filter(([id]) => q.kidLoves.includes(id)).map(([, l]) => l)
        .concat(KID_FOOD.filter(([id]) => id !== "none" && q.kidFood.includes(id)).map(([, l]) => l.toLowerCase()));
      const joined = !!G.me();
      html = `<div class="result" tabindex="-1" data-result>
          <div class="art">${use("scene-" + scene)}</div><div class="result-shade"></div>
          <div class="result-body">
            <div class="stamp-big" aria-hidden="true">STAMPED<br>2026</div>
            <div style="font-size:18px;color:#FFE9CF;margin-top:6px">${t.eyebrow}</div>
            <div class="tier-name">${t.name}</div>
            <div style="font-size:20px;font-weight:700">${esc(t.tagline)}</div>
            <p style="max-width:520px;font-size:16px;line-height:1.5;color:#E5ECE8">${esc(t.blurb)}</p>
            <div class="chips"><span>${GROUP_LINE[q.group] || "Traveling solo"}</span><span>${pace ? pace.label + " pace" : "Balanced pace"}</span><span>${picked.length ? esc(picked.join(" · ")) : "Open to anything"}</span>${isFam() && kidBits.length ? `<span class="kid-chip">Kids: ${esc(kidBits.join(" · "))}</span>` : ""}</div>
          </div></div>
        <form class="form-row signup" data-source="quiz" data-waitlist novalidate>
          <label class="lbl" for="email-type" style="width:100%;font-size:15px">${KITS[q.group] ? `Save your type and get ${KITS[q.group].short} free. ` : "Save your type. "}The app will greet you as a ${t.name}.</label>
          <input class="field" id="email-type" name="email" type="email" autocomplete="email" placeholder="you@email.com" required style="height:52px">
          <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
          <button class="btn btn-sun" type="submit" style="min-height:52px">${joined ? "Save to my signup" : "Save my type"}</button>
          <p class="consent" style="width:100%">By saving you agree to our <a href="/terms.html">Terms</a> and <a href="/privacy.html">Privacy Policy</a>. Unsubscribe anytime.</p>
          <p class="form-msg" role="status" aria-live="polite"></p>
        </form>
        <div style="display:flex;flex-wrap:wrap;gap:10px"><button type="button" class="btn btn-ghost" data-share-type style="min-height:44px;font-size:15px">Share my type to Stories</button><button type="button" class="btn btn-text" data-q-retake>Start over</button></div>
        <div class="follow"><span>Get one trip idea a week made for a <b>${t.name}</b>. Follow us:</span>
          <a href="https://www.tiktok.com/@gototravelapp" data-social="tiktok" data-loc="quiz_result"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.8 5.8 0 1 0 5 5.7V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.3-1.6z"/></svg>TikTok</a>
          <a href="https://www.instagram.com/gototravelapp" data-social="instagram" data-loc="quiz_result"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>Instagram</a></div>`;
    }
    stage.innerHTML = html;
    personalize();
    bindForms(stage);
    if (focus) {
      const target = done ? $("[data-result]", stage) : $("[aria-pressed=true], .choice, .qpill", stage);
      target && target.focus({ preventScroll: true });
    }
  }

  function startQuiz(entry) {
    if (!q.started) { q.started = true; save(); G.track("quiz_start", { entry }); }
  }
  function go(step) {
    q.step = step; save();
    if (step < RESULT) G.track("quiz_step", { n: step + 1 });
    renderQuiz(true);
  }
  function finish() {
    q.step = RESULT; save();
    G.stamp("quiz");
    G.track("quiz_complete", { tier: tier().name, group: q.group });
    renderQuiz(true);
  }
  stage.addEventListener("click", (e) => {
    const p = e.target.closest("[data-pick]");
    if (p) {
      const id = p.dataset.pick;
      startQuiz("section");
      if (q.step === 0) { q.group = id; return go(1); }
      if (q.step === 1) { q.style = id; return go(2); }
      if (q.step === 2) { q.pace = id; return go(3); }
      if (q.step === 3) {
        if (q.picks.includes(id)) q.picks = q.picks.filter((x) => x !== id);
        else if (q.picks.length < 3) q.picks = q.picks.concat(id);
        else { G.toast("Pick up to 3. Tap one to swap it out."); return; }
        save(); return renderQuiz(false);
      }
    }
    if (e.target.closest("[data-q-next]")) return isFam() ? go(4) : finish();
    const age = e.target.closest("[data-kid-age]");
    if (age) { q.kidAge = q.kidAge === age.dataset.kidAge ? null : age.dataset.kidAge; save(); return renderQuiz(false); }
    const love = e.target.closest("[data-kid-love]");
    if (love) { const k = love.dataset.kidLove; q.kidLoves = q.kidLoves.includes(k) ? q.kidLoves.filter((x) => x !== k) : q.kidLoves.concat(k); save(); return renderQuiz(false); }
    const food = e.target.closest("[data-kid-food]");
    if (food) {
      const k = food.dataset.kidFood;
      if (k === "none") q.kidFood = q.kidFood.includes("none") ? [] : ["none"];
      else q.kidFood = (q.kidFood.includes(k) ? q.kidFood.filter((x) => x !== k) : q.kidFood.concat(k)).filter((x) => x !== "none");
      save(); return renderQuiz(false);
    }
    if (e.target.closest("[data-q-kids-done]")) return finish();
    if (e.target.closest("[data-q-retake]")) { q = { ...blank(), started: true }; save(); G.track("quiz_restart", {}); return renderQuiz(true); }
    if (e.target.closest("[data-share-type]")) return shareType();
  });
  $("[data-q-restart]").addEventListener("click", () => { q = { ...blank(), started: true }; save(); G.track("quiz_restart", {}); renderQuiz(true); });
  // From the result, Back returns to the last question they answered (the kids step only for families).
  $("[data-q-back]").addEventListener("click", () => go(q.step === RESULT ? (isFam() ? 4 : 3) : Math.max(0, q.step - 1)));

  // Hero chips and the pop-up's tiles jump in with the group picked and question 2 showing.
  function jumpToQuiz(group, entry) {
    q = { ...blank(), group, step: 1, started: true };
    save();
    G.track("quiz_start", { entry });
    renderQuiz(false);
    document.getElementById("quiz").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    setTimeout(() => $(".choice", stage)?.focus({ preventScroll: true }), 450);
  }
  $$("[data-quiz-group]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); jumpToQuiz(a.dataset.quizGroup, "hero_chip"); }));

  // Share my type: the tier's 1080x1920 card through the Web Share API, else download it.
  async function shareType() {
    const name = tier().name, slug = name.toLowerCase();
    const url = `https://gototravelapp.com/?type=${encodeURIComponent(slug)}&utm_source=share&utm_medium=quiz`;
    G.track("share_type", { tier: name, group: q.group });
    try {
      // One card per tier x group (handoff A10); the older per-tier card if a group is missing.
      const group = q.group || "solo";
      let res = await fetch(`/share/${slug}-${group}.png`);
      if (!res.ok) res = await fetch(`/share/${slug}.png`);
      const blob = await res.blob();
      const file = new File([blob], `go-to-travel-${slug}-${group}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: `I'm a ${name}. What kind of traveler are you?`, url });
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      G.toast("Saved your card. Post it to your Story.");
    } catch (err) {
      if (err && err.name === "AbortError") return;
      if (await G.copyText(url)) G.toast("Link copied");
    }
  }

  // ── Signup forms (one endpoint for all six sources, handoff A6) ─────────
  function quizFields() {
    const f = {};
    if (q.group) f.group_type = q.group;
    if (q.style) { f.travel_style = q.style; f.traveler_type = tier().name; }
    if (q.pace) f.adventure_level = q.pace;
    if (q.picks.length) f.interests = q.picks;
    if (isFam()) {
      if (q.kidAge) f.kid_age_band = q.kidAge;
      if (q.kidLoves.length) f.kid_loves = q.kidLoves;
      if (q.kidFood.length) f.kid_food = q.kidFood;
    }
    return f;
  }
  function successHtml(me, source, confirm) {
    const pos = me.position ? `You're #${Number(me.position).toLocaleString()} in line.` : "You're on the list.";
    const kit = KITS[q.group];
    // The quiz and the kit pop-up send the traveler's kit (join-waitlist → kit-emails.ts).
    const Kit = kit ? kit.short[0].toUpperCase() + kit.short.slice(1) : null;
    const gotKit = !!kit && (source === "quiz" || source === "popup_kit");
    const head = confirm ? "Almost there. Check your inbox." : source === "quiz" ? `Saved. ${Kit ? `${Kit} is on its way to your inbox, and the` : "The"} app will greet you as a ${tier().name}.` : source === "popup_kit" ? `You're in. ${Kit || "Your kit"} is on its way to your inbox.` : `You're in. ${pos}`;
    // EU/EEA, UK and Switzerland: double opt-in, nothing counts (and no kit goes out) until the link is tapped.
    const sub = confirm ? (gotKit ? `Tap the link we just sent to confirm your spot, and ${kit.short} follows right after.` : "Tap the link we just sent to confirm your spot.") : source === "quiz" || source === "popup_kit" ? pos : "Invite friends and you both move up.";
    return `<div class="joined" tabindex="-1"><b>${esc(head)}</b><span>${esc(sub)}</span>${me.code ? `
      <div class="ref-row"><label class="sr" for="ref-${source}">Your invite link</label><input id="ref-${source}" readonly value="${esc(G.refLink(me.code))}">
      <button type="button" class="btn btn-sun" data-ref-copy>Copy</button><button type="button" class="btn btn-ghost" data-ref-share>Share</button></div>` : ""}</div>`;
  }
  function bindForms(root = document) {
    $$("form[data-waitlist]", root).forEach((form) => {
      if (form.dataset.bound) return;
      form.dataset.bound = "1";
      form.addEventListener("submit", onSubmit);
    });
  }
  async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const msg = $(".form-msg", form);
    const btn = $("button[type=submit]", form);
    const input = form.elements.email;
    const email = input.value.trim().toLowerCase();
    msg.textContent = ""; msg.classList.remove("err");
    if (!G.EMAIL_RE.test(email)) {
      msg.textContent = "Check your email address."; msg.classList.add("err");
      input.setAttribute("aria-invalid", "true"); input.focus(); return;
    }
    input.removeAttribute("aria-invalid");
    const source = form.dataset.source;
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = "Saving…";
    try {
      const data = await G.saveEmail({ email, source, website: form.elements.website?.value || "", platform: /iPhone|iPad/.test(navigator.userAgent) ? "ios" : undefined, ...quizFields() });
      const me = G.markSignedUp(data, source);
      G.track("signup", { source, tier: q.style ? tier().name : undefined });
      if (source === "popup_kit") G.track("kit_signup", {});
      const holder = document.createElement("div");
      holder.innerHTML = successHtml(me, source, !!data.confirm);
      const joined = holder.firstElementChild;
      form.replaceWith(joined);
      renderDreams(); renderInvite();
      if (source === "popup_kit" && closePopup) setTimeout(() => closePopup && closePopup("signup"), 2200);
      else joined.focus({ preventScroll: true });
    } catch (err) {
      console.error("[signup]", err);
      btn.disabled = false; btn.textContent = label;
      msg.textContent = "That didn't save. Check your connection and try again."; msg.classList.add("err");
    }
  }
  document.addEventListener("click", async (e) => {
    const copy = e.target.closest("[data-ref-copy]");
    const share = e.target.closest("[data-ref-share]");
    if (!copy && !share) return;
    const input = e.target.closest(".joined").querySelector("input");
    if (share && navigator.share) {
      try { await navigator.share({ text: "Your TikTok saves deserve an actual trip. Skip the line with my link:", url: input.value }); G.stamp("invite"); G.track("invite_copy", { via: "share" }); } catch { /* cancelled */ }
      return;
    }
    if (await G.copyText(input.value)) { G.toast("Invite link copied"); G.stamp("invite"); G.track("invite_copy", { via: "copy" }); }
  });
  bindForms();

  // ── Spin the globe ──────────────────────────────────────────────────────
  const DESTS = ["Lisbon", "Big Sur", "Tokyo", "Oaxaca", "Banff", "Amalfi Coast", "Seoul", "Maui", "Cappadocia", "Lofoten", "Kyoto", "Cape Town"];
  $("[data-spin]").addEventListener("click", () => {
    const el = $("[data-dest]");
    let i = 0, cur = el.textContent;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pick = () => { let d; do { d = DESTS[Math.floor(Math.random() * DESTS.length)]; } while (d === cur); cur = d; return d; };
    G.track("spin_globe", {});
    if (reduce) { el.textContent = pick(); return; }
    const t = setInterval(() => { el.textContent = pick(); if (++i > 9) clearInterval(t); }, 70);
  });

  // ── Founding Traveler invite (stamp 3) ──────────────────────────────────
  function renderInvite() {
    const me = G.me();
    $("[data-invite]").textContent = me && me.code ? (G.stamps().invite ? "Copy my invite link again" : "Copy my invite link") : "Join to get my invite link";
  }
  $("[data-invite]").addEventListener("click", async () => {
    const me = G.me();
    if (!me || !me.code) {
      $("[data-invite-note]").hidden = false;
      const f = $("#email-hero");
      if (f) { f.scrollIntoView({ block: "center" }); setTimeout(() => f.focus({ preventScroll: true }), 300); }
      return;
    }
    if (await G.copyText(G.refLink(me.code))) { G.toast("Invite link copied"); G.stamp("invite"); G.track("invite_copy", { via: "card" }); renderInvite(); }
  });
  renderInvite();

  // Already signed up: forms show the success state instead (no second signup asked of them).
  const meNow = G.me();
  if (meNow) $$("form[data-waitlist]").forEach((f) => { if (f.dataset.source !== "quiz") f.outerHTML = successHtml(meNow, f.dataset.source); });

  renderQuiz(false);

  // ── Pop-ups (handoff A4) ────────────────────────────────────────────────
  // At most one per session; never to someone signed up; never in the first 10 s; dismissed = 14 days.
  let closePopup = null;
  const loadedAt = Date.now();
  const DISMISS_DAYS = 14;
  // The free kit matches who they travel with (from the quiz). No group yet: ask the quiz first.
  const tick = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F6B55" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0"><path d="M5 12l5 5L20 7"/></svg>';
  function canShow(id) {
    if (G.me() || G.session.get("gtt_popup_shown") || closePopup) return false;
    if (Date.now() - loadedAt < 10000) return false;
    const until = G.store.get(`gtt_pop_${id}_until`);
    if (until && Date.now() < until) return false;
    const cookie = document.getElementById("cookie");
    if (cookie && !cookie.hidden) return false; // never stack on the cookie choices
    return true;
  }
  function show(id) {
    if (id === "kit" && !KITS[q.group] && !q.started) id = "quiz";
    if (id === "kit" && !KITS[q.group]) return; // mid-quiz: leave them to it
    if (!canShow(id)) return;
    const scrim = document.getElementById(id === "quiz" ? "pop-quiz" : "pop-kit");
    if (id === "kit") {
      const kit = KITS[q.group];
      $("[data-kit-badge]", scrim).textContent = kit.badge;
      $("[data-kit-title]", scrim).textContent = kit.title;
      $("[data-kit-art] use", scrim).setAttribute("href", "#art-" + q.group);
      $("[data-kit-list]", scrim).innerHTML = kit.items.map((t) => `<li>${tick}${esc(t)}</li>`).join("");
    }
    G.session.set("gtt_popup_shown", id);
    G.track("popup_shown", { id: id === "quiz" ? "popup_quiz" : "popup_kit" });
    closePopup = G.openDialog(scrim, {
      onClose: (how) => {
        closePopup = null;
        if (how !== "signup" && how !== "start") {
          G.store.set(`gtt_pop_${id}_until`, Date.now() + DISMISS_DAYS * 864e5);
          G.track("popup_dismissed", { id: id === "quiz" ? "popup_quiz" : "popup_kit" });
        }
      },
    });
    bindForms(scrim);
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]") && closePopup) closePopup("button");
    const t = e.target.closest("[data-pop-group]");
    if (t && closePopup) { closePopup("start"); jumpToQuiz(t.dataset.popGroup, "popup"); }
    if (e.target.closest("[data-pop-start]") && closePopup) {
      closePopup("start");
      q.started = false; startQuiz("popup");
      document.getElementById("quiz").scrollIntoView({ behavior: "smooth" });
    }
  });
  // Quiz nudge: exit intent on desktop; on phones 25 s idle with no quiz, or a fast upward scroll after 40%.
  const desktop = matchMedia("(min-width: 821px) and (hover: hover)").matches;
  if (desktop) {
    document.addEventListener("mouseout", (e) => { if (!e.relatedTarget && e.clientY <= 0 && !q.started) show("quiz"); });
  } else {
    setTimeout(() => { if (!q.started) show("quiz"); }, 25000);
  }
  let lastY = scrollY, lastT = performance.now(), maxDepth = 0;
  addEventListener("scroll", () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    const depth = h > 0 ? scrollY / h : 0;
    maxDepth = Math.max(maxDepth, depth);
    const now = performance.now(), dy = scrollY - lastY, dt = now - lastT;
    if (!desktop && maxDepth > 0.4 && dt > 0 && dy / dt < -2.5 && !q.started) show("quiz"); // fast flick up
    if (depth >= 0.45 && Date.now() - loadedAt >= 10000) show("kit");
    lastY = scrollY; lastT = now;
  }, { passive: true });
})();
