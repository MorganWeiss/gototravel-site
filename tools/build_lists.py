# build_lists.py: tools/lists/lists.json -> lists/<slug>.html (one page per post's list) + lists/index.html.
# The lists come from the social calendar: every post's places become a page our Instagram bio links to, with
# "Copy this list" (the app's own shared-board text, pasted into Drop > A list) and the waitlist form.
import html, json, re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
data = json.loads((ROOT / "tools/lists/lists.json").read_text(encoding="utf-8"))
about = (ROOT / "about.html").read_text(encoding="utf-8")
HEAD_ICONS = "\n".join(l for l in about.splitlines() if l.startswith('<link rel="icon"') or l.startswith('<link rel="apple-touch-icon"'))
HEADER = next(l for l in about.splitlines() if l.startswith('<header class="page-head">'))
PIN = "\U0001F4CD"
e = lambda s: html.escape(s or "", quote=True)

CSS = """
.lists-main{max-width:760px;display:flex;flex-direction:column;gap:18px}
.list-kicker{font:700 12px/1 'DM Sans',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#2F6B55}
.list-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.places{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:12px}
.place{display:grid;grid-template-columns:44px minmax(0,1fr);gap:14px;padding:16px;border:1px solid rgba(15,26,23,.12);border-radius:18px;background:#fff}
.pn{width:44px;height:44px;border-radius:50%;background:#F2A93B;color:#0F1A17;display:flex;align-items:center;justify-content:center;font:800 18px/1 'Bricolage Grotesque',sans-serif}
.place h2{font-size:20px;line-height:1.2;margin:0 0 2px}
.place .where{color:#55605B;font-size:14px;margin:0 0 6px}
.place p{margin:0 0 8px}
.place a{font-weight:700;font-size:14px}
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
      <label class="sr" for="email-list">Email address</label>
      <input class="field" id="email-list" name="email" type="email" autocomplete="email" inputmode="email" placeholder="you@email.com" required>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button class="btn btn-sun" type="submit">Get early access</button>
      <p class="form-msg" role="status" aria-live="polite"></p>
    </form>
    <p class="micro">Free to start · iPhone · No spam, unsubscribe anytime · <a href="/privacy.html">Privacy</a></p>"""

def page(title, desc, url, body, robots="index,follow"):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)} — Go To Travel</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="{robots}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="https://gototravelapp.com/og.png">
<meta property="og:url" content="{url}">
<meta name="theme-color" content="#0F1A17">
{HEAD_ICONS}
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=DM+Sans:opsz,wght@9..40,400..700&display=swap">
<link rel="stylesheet" href="/assets/site.css">
<style>{CSS}</style>
</head>
<body class="light">
{HEADER}
<main class="page-main lists-main">
{body}
</main>
<script src="/assets/site.js"></script>
<script src="/assets/lists.js"></script>
</body>
</html>
"""

def share_text(lst):
    lines = [f"{PIN} {p['name']} — {p['location'] or lst['city']}" for p in lst["places"]]
    n = len(lines)
    return "\n".join([f"Our {lst['city']} list on Go To Travel: {n} {'spot' if n == 1 else 'spots'}", *lines, "",
                      "Copy it into your own bucket list: in Go To Travel, tap Drop, then A list, and paste this.",
                      f"gototravelapp.com/lists/{lst['slug']}"])

out = ROOT / "lists"
out.mkdir(exist_ok=True)
for lst in data["lists"]:
    n = len(lst["places"])
    names = ", ".join(p["name"] for p in lst["places"][:3])
    items = "\n".join(
        f"""  <li class="place"><div class="pn" aria-hidden="true">{i}</div><div>
    <h2>{e(p['name'])}</h2><p class="where">{e(p['location'])}</p>{f'<p>{e(p["why"])}</p>' if p.get('why') else ''}
    <a href="https://www.google.com/maps/search/?api=1&amp;query={quote(p['name'] + ', ' + (p['location'] or lst['city']))}" target="_blank" rel="noopener">Open in Maps</a>
  </div></li>""" for i, p in enumerate(lst["places"], 1))
    body = f"""<p class="list-kicker">A Go To Travel list · {e(lst['city'])}</p>
<h1 style="font-size:clamp(34px,5vw,50px)">{e(lst['title'])}</h1>
<p class="lede">{n} {'place' if n == 1 else 'places'} from our post “{e(lst['hook'])}”</p>
<div class="list-actions"><button class="btn btn-sun" type="button" data-copy-list>Copy this list</button><a class="btn" href="https://www.instagram.com/gototravelapp" target="_blank" rel="noopener">See our posts</a></div>
<p class="micro">Have the app? Copy it, then in Go To Travel tap Drop, then A list, and paste.</p>
<ol class="places">
{items}
</ol>
<section class="get-app" aria-labelledby="get-h">
  <h2 id="get-h">Every place you save, sorted by city</h2>
  <p>Go To Travel turns the travel posts you save into a list for every city, so when you land, your list is already there. It's in beta on iPhone.</p>
  {FORM.format(slug=e(lst['slug']))}
</section>
<p><a href="/lists">All our lists</a></p>
<textarea hidden data-list-text>{e(share_text(lst))}</textarea>"""
    (out / f"{lst['slug']}.html").write_text(page(lst["title"], f"{n} places: {names}. A Go To Travel list.", f"https://gototravelapp.com/lists/{lst['slug']}", body), encoding="utf-8")

cards = "\n".join(f"""  <li><a href="/lists/{e(l['slug'])}"><b>{e(l['title'])}</b><span>{len(l['places'])} places · {e(l['city'])}</span></a></li>""" for l in reversed(data["lists"]))
index_body = f"""<p class="list-kicker">From our Instagram and TikTok</p>
<h1 style="font-size:clamp(34px,5vw,50px)">Our lists</h1>
<p class="lede">Every place from our posts, one list per trip. Open one, copy it, or save it for later.</p>
<ol class="list-grid">
{cards}
</ol>
<section class="get-app" aria-labelledby="get-h">
  <h2 id="get-h">Every place you save, sorted by city</h2>
  <p>Go To Travel turns the travel posts you save into a list for every city. It's in beta on iPhone.</p>
  {FORM.format(slug="index")}
</section>"""
(out / "index.html").write_text(page("Our lists", "Every place from Go To Travel's posts, one list per trip.", "https://gototravelapp.com/lists", index_body), encoding="utf-8")
print(f"wrote {len(data['lists'])} list pages + index")

# The sitemap lists every list page (rebuilt each run between the markers).
sm = ROOT / "sitemap.xml"
xml = sm.read_text(encoding="utf-8")
start, end = "  <!-- lists -->\n", "  <!-- /lists -->\n"
if start in xml:
    xml = xml[: xml.index(start)] + xml[xml.index(end) + len(end):]
urls = "".join(f"  <url><loc>https://gototravelapp.com/lists/{l['slug']}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>\n" for l in data["lists"])
block = start + "  <url><loc>https://gototravelapp.com/lists</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n" + urls + end
xml = xml.replace("</urlset>", block + "</urlset>")
sm.write_text(xml, encoding="utf-8")
print("sitemap: lists added")
