# build_trips.py: tools/trips/<slug>.json -> trips/<slug>.html (one page per "Trips you can copy" post) + trips/index.html.
# Each trip was checked by a person (dates, closures, booking windows) and carries its sources. The page shows the route
# on a map with numbered pins, every day's stops and legs, where to stay and the heads-ups, with "Copy this trip" (the
# app's shared-board text: paste it into Drop > A list) and the waitlist form. The trip JSON comes from the social team's
# trips-you-can-copy folders (trip.json), copied here as tools/trips/<slug>.json.
import html, json
from datetime import date
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
about = (ROOT / "about.html").read_text(encoding="utf-8")
HEAD_ICONS = "\n".join(l for l in about.splitlines() if l.startswith('<link rel="icon"') or l.startswith('<link rel="apple-touch-icon"'))
HEADER = next(l for l in about.splitlines() if l.startswith('<header class="page-head">'))
PIN = "\U0001F4CD"
MAPLIBRE = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl"
e = lambda s: html.escape(str(s) if s is not None else "", quote=True)

CSS = """
.trip-main{max-width:820px;display:flex;flex-direction:column;gap:18px}
.list-kicker{font:700 12px/1 'DM Sans',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#2F6B55}
.list-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.trip-facts{display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0;list-style:none}
.trip-facts li{padding:6px 12px;border-radius:999px;background:#F3EBDD;font-size:14px;font-weight:600}
.trip-map{height:min(62vh,460px);border-radius:20px;overflow:hidden;border:1px solid rgba(15,26,23,.12);background:#EAE4D8}
.trip-map .mk{width:30px;height:30px;border-radius:50%;background:#F2A93B;color:#0F1A17;border:2px solid #0F1A17;display:flex;align-items:center;justify-content:center;font:800 13px/1 'DM Sans',sans-serif;cursor:pointer}
.trip-map .mk.stay{background:#0F1A17;color:#FBF5EA;border-color:#FBF5EA;border-radius:8px}
.heads{padding:18px 20px;border-radius:18px;background:#FFF4DF;border:1px solid #F2C77B}
.heads h2{font-size:20px;margin:0 0 8px}
.heads ul{margin:0;padding-left:20px;display:grid;gap:6px}
.day{display:grid;gap:12px;margin-top:6px}
.day h2{font-size:24px;margin:8px 0 0}
.leg{margin:0;color:#55605B;font-size:14px;padding-left:58px}
.day-map-row{margin:0}
.day-map{appearance:none;border:1px solid rgba(15,26,23,.2);background:#fff;border-radius:999px;padding:6px 12px;font:600 13px/1.2 'DM Sans',sans-serif;color:#0F1A17;cursor:pointer}
.places{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.place{display:grid;grid-template-columns:44px minmax(0,1fr);gap:14px;padding:16px;border:1px solid rgba(15,26,23,.12);border-radius:18px;background:#fff;scroll-margin-top:90px}
.pn{width:44px;height:44px;border-radius:50%;background:#F2A93B;color:#0F1A17;display:flex;align-items:center;justify-content:center;font:800 18px/1 'Bricolage Grotesque',sans-serif}
.place h3{font-size:19px;line-height:1.25;margin:0 0 2px}
.place .when{color:#55605B;font-size:14px;margin:0 0 6px;font-weight:600}
.place p{margin:0 0 8px}
.place .kid{color:#2F4A3F}
.place .book{font-size:14px;color:#7A4B00}
.place a{font-weight:700;font-size:14px}
.stays{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.stays li{padding:14px 16px;border:1px solid rgba(15,26,23,.12);border-radius:16px;background:#fff}
.stays b{display:block;font-size:17px}
.stays span{color:#55605B;font-size:14px}
.sources{font-size:14px;color:#55605B}
.sources ol{padding-left:20px;display:grid;gap:4px}
.get-app{margin-top:10px;padding:20px;border-radius:20px;background:#0F1A17;color:#FBF5EA;display:grid;gap:10px}
.get-app h2{color:#FBF5EA;margin:0;font-size:24px}
.get-app p{margin:0;color:rgba(251,245,234,.85)}
.get-app .micro,.get-app a{color:rgba(251,245,234,.8)}
.joined{font-weight:700;color:#7FC7A7}
.list-grid{list-style:none;padding:0;margin:0;display:grid;gap:10px}
.list-grid a{display:block;padding:14px 16px;border:1px solid rgba(15,26,23,.12);border-radius:16px;background:#fff;text-decoration:none;color:#0F1A17}
.list-grid b{display:block;font:800 18px/1.2 'Bricolage Grotesque',sans-serif}
.list-grid span{color:#55605B;font-size:14px}
"""

FORM = """<form class="form-row signup" data-list-waitlist data-slug="{slug}" novalidate>
      <label class="sr" for="email-trip">Email address</label>
      <input class="field" id="email-trip" name="email" type="email" autocomplete="email" inputmode="email" placeholder="you@email.com" required>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button class="btn btn-sun" type="submit">Get early access</button>
      <p class="form-msg" role="status" aria-live="polite"></p>
    </form>
    <p class="micro">Free to start · iPhone · No spam, unsubscribe anytime · <a href="/privacy.html">Privacy</a></p>"""


def page(title, desc, url, body, head_extra="", robots="index,follow"):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)} — Go To Travel</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{url}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="https://gototravelapp.com/og.png">
<meta property="og:url" content="{url}">
<meta name="theme-color" content="#0F1A17">
{HEAD_ICONS}
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=DM+Sans:opsz,wght@9..40,400..700&display=swap">
<link rel="stylesheet" href="/assets/site.css">
{head_extra}<style>{CSS}</style>
</head>
<body class="light">
{HEADER}
<main class="page-main trip-main">
{body}
</main>
<script src="/assets/site.js"></script>
<script src="/assets/lists.js"></script>
</body>
</html>
"""


def nice_date(iso):
    try:
        d = date.fromisoformat(str(iso)[:10])
        return f"{d.strftime('%b')} {d.day}, {d.year}"
    except ValueError:
        return str(iso or "")


def stops_of(trip):
    """Every stop in plan order, numbered from 1 as on the post's slides (travel steps such as "Land at Vienna Airport"
    included)."""
    return [(day, s) for day in trip.get("days", []) for s in day.get("stops", [])]


def places_of(trip):
    """The stops that are places to go (not travel steps): what "Copy this trip" pastes and what search engines get."""
    return [(day, s) for day, s in stops_of(trip) if s.get("kind") != "move"]


def where_of(s, trip):
    return s.get("address") or s.get("city") or trip.get("where") or ""


def share_text(trip):
    lines = [f"{PIN} {s['name']} — {where_of(s, trip)}" for _, s in places_of(trip)]
    n = len(lines)
    return "\n".join([f"Our list for “{trip['title']}” on Go To Travel: {n} {'spot' if n == 1 else 'spots'}", *lines, "",
                      "Copy it into your own bucket list: in Go To Travel, tap Drop, then A list, and paste this.",
                      f"gototravelapp.com/trips/{trip['slug']}"])


def json_ld(trip, url):
    items = [{"@type": "ListItem", "position": i,
              "item": {"@type": "TouristAttraction", "name": s["name"],
                       **({"address": where_of(s, trip)} if where_of(s, trip) else {}),
                       **({"geo": {"@type": "GeoCoordinates", "latitude": s["lat"], "longitude": s["lng"]}} if s.get("lat") is not None and s.get("lng") is not None else {})}}
             for i, (_, s) in enumerate(places_of(trip), 1)]
    data = {"@context": "https://schema.org", "@type": "TouristTrip", "name": trip["title"], "url": url,
            "description": trip.get("hook") or trip["title"],
            "itinerary": {"@type": "ItemList", "numberOfItems": len(items), "itemListElement": items}}
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False).replace("</", "<\\/") + "</script>"


def map_data(trip):
    pins = [{"n": i, "name": s["name"], "lat": s["lat"], "lng": s["lng"], "id": f"stop-{i}", "day": day.get("day")}
            for i, (day, s) in enumerate(stops_of(trip), 1) if s.get("lat") is not None and s.get("lng") is not None]
    stays = [{"name": st["name"], "lat": st["lat"], "lng": st["lng"]}
             for st in trip.get("stays", []) if st.get("lat") is not None and st.get("lng") is not None]
    return json.dumps({"pins": pins, "stays": stays}, ensure_ascii=False).replace("</", "<\\/")


def day_title(day):
    words = "Day " + e(day.get("day"))
    if day.get("title"):
        words += ": " + e(day["title"])
    return words


def leg_line(leg):
    words = e(str(leg.get("mode", "")).capitalize()) + ": " + e(leg.get("from", "")) + " to " + e(leg.get("to", ""))
    if leg.get("duration"):
        words += ", " + e(leg["duration"])
    if leg.get("note"):
        words += ". " + e(leg["note"])
    return '<p class="leg">' + words + "</p>"


def stop_item(n, s, trip):
    where = where_of(s, trip)
    maps = "https://www.google.com/maps/search/?api=1&amp;query=" + quote(s["name"] + ", " + where)
    when = e(s.get("time", "")) + (" · " + e(where) if where else "")
    lines = []
    if s.get("why"):
        lines.append("<p>" + e(s["why"]) + "</p>")
    if s.get("kid_note"):
        lines.append('<p class="kid">With kids: ' + e(s["kid_note"]) + "</p>")
    if s.get("booking_note"):
        lines.append('<p class="book">' + e(s["booking_note"]) + "</p>")
    return (f'  <li class="place" id="stop-{n}"><div class="pn" aria-hidden="true">{n}</div><div>\n'
            f'    <h3>{e(s["name"])}</h3><p class="when">{when}</p>\n'
            f'    {"".join(lines)}\n'
            f'    <a href="{maps}" target="_blank" rel="noopener">Open in Maps</a>\n'
            "  </div></li>")


def stay_item(st):
    detail = " · ".join(e(x) for x in [st.get("city"), st.get("tier")] if x)
    if st.get("why"):
        detail += " · " + e(st["why"])
    link = ""
    if st.get("url"):
        link = ' <a href="' + e(st["url"]) + '" target="_blank" rel="noopener">Website</a>'
    return "<li><b>" + e(st["name"]) + "</b><span>" + detail + "</span>" + link + "</li>"


def source_item(src):
    label = e(src.get("title") or src.get("url"))
    checked = ", checked " + e(nice_date(src["accessed"])) if src.get("accessed") else ""
    return '<li><a href="' + e(src["url"]) + '" target="_blank" rel="noopener nofollow">' + label + "</a>" + checked + "</li>"


def trip_page(trip):
    slug = trip["slug"]
    url = f"https://gototravelapp.com/trips/{slug}"
    sources = {src.get("id"): src for src in trip.get("sources", [])}
    checked = nice_date(trip.get("checked_on"))
    facts = [f for f in [trip.get("dates"), trip.get("who"), f"Checked on {checked}" if checked else None] if f]
    heads = "".join(f"<li>{e(h.get('text') if isinstance(h, dict) else h)}</li>" for h in trip.get("heads_ups", []))

    n = 0
    days_html = []
    for day in trip.get("days", []):
        legs = "".join(leg_line(l) for l in day.get("legs", []))
        items = []
        for s in day.get("stops", []):
            n += 1
            items.append(stop_item(n, s, trip))
        title = day_title(day)
        days_html.append(f"""<section class="day" aria-labelledby="day-{e(day.get('day'))}">
<h2 id="day-{e(day.get('day'))}">{title}</h2>
<p class="day-map-row"><button class="day-map" type="button" data-day="{e(day.get('day'))}">Show day {e(day.get('day'))} on the map</button></p>
{legs}
<ol class="places" start="{n - len(items) + 1}">
{chr(10).join(items)}
</ol>
</section>""")

    stays = "".join(stay_item(st) for st in trip.get("stays", []))
    src_items = "".join(source_item(src) for src in sources.values() if src.get("url"))

    body = f"""<p class="list-kicker">A trip you can copy{' · checked on ' + e(checked) if checked else ''}</p>
<h1 style="font-size:clamp(34px,5vw,50px)">{e(trip['title'])}</h1>
<p class="lede">{e(trip.get('hook', ''))}</p>
<ul class="trip-facts">{''.join(f'<li>{e(f)}</li>' for f in facts)}</ul>
<div class="trip-map" id="trip-map" role="img" aria-label="Map of the trip with every stop numbered"></div>
<div class="list-actions"><button class="btn btn-sun" type="button" data-copy-list>Copy this trip</button><a class="btn" href="/app">Get the app</a></div>
<p class="micro">Have the app? Copy it, then in Go To Travel tap Drop, then A list, and paste. Pip plans the days around your crew.</p>
{f'<section class="heads" aria-labelledby="heads-h"><h2 id="heads-h">Heads-up: what AI planners get wrong</h2><ul>{heads}</ul></section>' if heads else ''}
{chr(10).join(days_html)}
{f'<section aria-labelledby="stay-h"><h2 id="stay-h">Where to stay</h2><ul class="stays">{stays}</ul></section>' if stays else ''}
<section class="get-app" aria-labelledby="get-h">
  <h2 id="get-h">Copy it, then make it yours</h2>
  <p>In Go To Travel, Pip fits a trip like this to your kids' ages, your hotel and your dates, and your crew votes on the picks. It's in beta on iPhone.</p>
  {FORM.format(slug='trip-' + e(slug))}
</section>
{f'<section class="sources" aria-labelledby="src-h"><h2 id="src-h" style="font-size:18px">Sources</h2><ol>{src_items}</ol><p>Map: © OpenStreetMap contributors, OpenMapTiles, OpenFreeMap.</p></section>' if src_items else ''}
<p><a href="/trips">All trips you can copy</a> · <a href="/lists">All our lists</a></p>
<textarea hidden data-list-text>{e(share_text(trip))}</textarea>
<script type="application/json" id="trip-data">{map_data(trip)}</script>"""
    head = (f'<link rel="stylesheet" href="{MAPLIBRE}.css">\n<script src="{MAPLIBRE}.js" defer></script>\n'
            f'<script src="/assets/trips.js" defer></script>\n{json_ld(trip, url)}\n')
    n_stops = len(places_of(trip))
    desc = trip.get("hook") or f"{n_stops} stops, checked on {checked}."
    return page(trip["title"], desc, url, body, head_extra=head)


src_dir = ROOT / "tools/trips"
trips = [json.loads(p.read_text(encoding="utf-8")) for p in sorted(src_dir.glob("*.json"))]
out = ROOT / "trips"
out.mkdir(exist_ok=True)
for t in trips:
    (out / f"{t['slug']}.html").write_text(trip_page(t), encoding="utf-8")

cards = "\n".join(
    f"""  <li><a href="/trips/{e(t['slug'])}"><b>{e(t['title'])}</b><span>{len(places_of(t))} stops · {e(t.get('dates', ''))}</span></a></li>"""
    for t in trips)
index_body = f"""<p class="list-kicker">Checked by a person, copied in one tap</p>
<h1 style="font-size:clamp(34px,5vw,50px)">Trips you can copy</h1>
<p class="lede">Real trips, stop by stop, with the trains, the drives, where to stay and what's closed. Copy one, and Pip makes it fit your crew.</p>
<ol class="list-grid">
{cards}
</ol>
<section class="get-app" aria-labelledby="get-h">
  <h2 id="get-h">Copy it, then make it yours</h2>
  <p>Go To Travel fits every trip to your kids, your hotel and your dates. It's in beta on iPhone.</p>
  {FORM.format(slug="trip-index")}
</section>"""
(out / "index.html").write_text(page("Trips you can copy", "Real, checked trips you can copy stop by stop: trains, drives, where to stay and what's closed.", "https://gototravelapp.com/trips", index_body), encoding="utf-8")
print(f"wrote {len(trips)} trip pages + index")

sm = ROOT / "sitemap.xml"
xml = sm.read_text(encoding="utf-8")
start, end = "  <!-- trips -->\n", "  <!-- /trips -->\n"
if start in xml:
    xml = xml[: xml.index(start)] + xml[xml.index(end) + len(end):]
urls = "".join(f"  <url><loc>https://gototravelapp.com/trips/{t['slug']}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>\n" for t in trips)
block = start + "  <url><loc>https://gototravelapp.com/trips</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n" + urls + end
sm.write_text(xml.replace("</urlset>", block + "</urlset>"), encoding="utf-8")
print("sitemap: trips added")
