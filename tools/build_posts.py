# build_posts.py: the photo-led social posts (Nov 10, 2026 round) -> trips/<slug>.html, plus the trips/index.html hub
# ("Plans you can copy", the Instagram/TikTok bio link) and the trips block in sitemap.xml.
#
# Each page is the web version of one carousel: the cover photo as the hero, then one photo section per slide in slide
# order, with Pip's why line and the extra detail the post's own sources hold (tools/posts/web.json says which detail
# goes where, and every line there names its source ids). A map only where the post has a map card, "Save the dates",
# "Heads-ups AI planners miss", "Copy this trip" for trip and list posts, one waitlist form, the sources with their
# checked dates and a credit for every photo.
#
# Where the data comes from: the social team's folders, ~/dev/gtt-team/social/trips-you-can-copy/<folder>/ (photos,
# photos.json, sources.md, caption-ig.txt, _work/maps.json) and the data module behind each post
# (_tools/data/<module>.py, loaded by file path). When that folder is here (or GTT_SOCIAL points at the social root),
# the build refreshes tools/posts/<slug>.json (a snapshot of exactly what the page uses) and the web images in
# assets/trips/<slug>/ (sips: crop, sRGB, resize, JPEG; tools/posts/images.json records each one so unchanged images are
# skipped). Without it, the pages build from the snapshots and the images already in the repo. Re-running gives
# identical output either way.
#
# trips/<slug>.html for the older trips (NYC, Big Sur) still come from tools/build_trips.py; this script owns the hub
# and the sitemap's trips block, and lists those two pages under "More plans".
import hashlib, html, importlib.util, json, os, re, subprocess, sys, tempfile
from datetime import date
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
SOCIAL = Path(os.environ.get("GTT_SOCIAL", "~/dev/gtt-team/social")).expanduser()
TYC = SOCIAL / "trips-you-can-copy"
POSTS_DIR = ROOT / "tools/posts"
WEB = json.loads((POSTS_DIR / "web.json").read_text(encoding="utf-8"))
SLUGS = [k for k in WEB if not k.startswith("_")]
MANIFEST_PATH = POSTS_DIR / "images.json"
SRGB = "/System/Library/ColorSync/Profiles/sRGB Profile.icc"
SITE = "https://gototravelapp.com"
MAPLIBRE = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl"
PIN = "\U0001F4CD"

about = (ROOT / "about.html").read_text(encoding="utf-8")
HEAD_ICONS = "\n".join(l for l in about.splitlines() if l.startswith('<link rel="icon"') or l.startswith('<link rel="apple-touch-icon"'))
HEADER = next(l for l in about.splitlines() if l.startswith('<header class="page-head">'))
e = lambda s: html.escape(str(s) if s is not None else "", quote=True)

# Image sizes (sips quality is its own 0-100 scale: 52-58 here looks like 72 elsewhere and keeps each page under ~2.5 MB).
HERO = {"aspect": 1.6, "width": 1600, "q": 58}
HERO_M = {"aspect": 0.75, "width": 900, "q": 56}
OG = {"aspect": 1200 / 630, "width": 1200, "q": 62}
CARD = {"aspect": 1.5, "width": 900, "q": 54}
SECTION_W, SECTION_TALL_W, SECTION_Q = 1200, 960, 52
BLUR = {"width": 48, "q": 50}
SCREEN = {"width": 720, "q": 60}


# ---------------------------------------------------------------- data: snapshot from the social folders
def load_module(path):
    spec = importlib.util.spec_from_file_location("post_" + path.stem, path)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def sips_dims(path):
    out = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(path)], capture_output=True, text=True, check=True).stdout
    return [int(re.search(r"pixelWidth: (\d+)", out).group(1)), int(re.search(r"pixelHeight: (\d+)", out).group(1))]


def douglas_peucker(pts, tol):
    """Simplify a [lng, lat] polyline (iterative Douglas-Peucker, tolerance in degrees)."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = pts[a], pts[b]
        dx, dy = x2 - x1, y2 - y1
        norm = (dx * dx + dy * dy) ** 0.5 or 1e-12
        best, idx = 0.0, None
        for i in range(a + 1, b):
            x, y = pts[i]
            d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / norm
            if d > best:
                best, idx = d, i
        if idx is not None and best > tol:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(pts, keep) if k]


def snapshot(slug, cfg):
    """Read one post's folder + data module, check the page's inputs against the posted caption and sources, and return
    the data the page is built from."""
    folder = TYC / cfg["folder"]
    m = load_module(TYC / "_tools/data" / (cfg["module"] + ".py"))
    post = json.loads(json.dumps(m.POST, ensure_ascii=False))
    caption = (folder / "caption-ig.txt").read_text(encoding="utf-8")
    sources_md = (folder / "sources.md").read_text(encoding="utf-8")
    alt = (folder / "alt.txt").read_text(encoding="utf-8")
    problems = []
    for line, why in post.get("places", []):
        if line not in caption or why not in caption:
            problems.append(f"place not in caption: {line}")
    for line in post.get("wrong_caption", []) + post.get("caption_lines", []):
        if line not in caption:
            problems.append(f"caption line not in caption-ig.txt: {line[:60]}")
    if len(re.findall(r"^Slide \d+:", alt, flags=re.M)) != len(post["slides"]):
        problems.append("alt.txt slide count differs from the data module")
    checked = {}
    for sid, url, title in m.SOURCES:
        hit = re.search(r"^- \*\*" + re.escape(sid) + r"\*\*: \[.*?\]\((.*?)\) \(checked (\d{4}-\d{2}-\d{2})\)", sources_md, flags=re.M)
        if not hit or hit.group(1) != url:
            problems.append(f"source {sid} missing or different in sources.md")
        else:
            checked[sid] = hit.group(2)
    if problems:
        sys.exit(f"{slug}: the page would not match the post:\n  " + "\n  ".join(problems))

    photos = json.loads((folder / "photos/photos.json").read_text(encoding="utf-8"))
    used = [s["photo"] for s in post["slides"] if s.get("photo")]
    for k in used:
        photos[k]["dims"] = sips_dims(folder / "photos" / photos[k]["file"])
    photos = {k: photos[k] for k in used}

    the_map = None
    maps = json.loads((folder / "_work/maps.json").read_text(encoding="utf-8"))
    if maps:
        mc = maps[0]
        legs = mc.get("legs", [])
        line = None
        if len(legs) == 1 and legs[0].get("label") is None:   # one real road line (OSRM), shown on the web map
            line = [[round(x, 5), round(y, 5)] for x, y in douglas_peucker(legs[0]["coords"], 0.004)]
        the_map = {"cities": [{k: c[k] for k in ("label", "sub", "lat", "lng")} for c in mc["cities"]],
                   "legs": [lg.get("label") for lg in legs] if line is None else [],
                   "pills": [p["label"] for p in mc.get("pills", [])], "line": line}

    screens_all = json.loads((TYC / "_tools/screens.json").read_text(encoding="utf-8"))
    app = next((s for s in post["slides"] if s["type"] == "app"), None)
    screens = {}
    for k in (app or {}).get("screens", []):
        sc = screens_all[k]
        screens[k] = {"src": str(Path(sc["src"]).resolve().relative_to(SOCIAL.resolve())), **{x: sc[x] for x in ("sx", "sy", "sw", "sh")}}

    return {"slug": slug, "folder": cfg["folder"], "module": cfg["module"], "post": post,
            "sources": [[sid, url, title, checked[sid]] for sid, url, title in m.SOURCES],
            "photos": photos, "map": the_map, "screens": screens,
            "post_at": next(t for _, _, t in post["notes"]["suggest"] if t)}


# ---------------------------------------------------------------- images
def focus_of(pos):
    try:
        x, y = (float(v.strip().rstrip("%")) / 100 for v in str(pos).split())
        return [x, y]
    except ValueError:
        return [0.5, 0.5]


def crop_box(w, h, aspect, focus):
    if w / h > aspect:
        cw, ch = round(h * aspect), h
    else:
        cw, ch = w, round(w / aspect)
    return [cw, ch, round((w - cw) * focus[0]), round((h - ch) * focus[1])]


def section_aspect(w, h):
    return min(max(w / h, 0.8), 2.0)


def image_jobs(snap, cfg):
    """Every web image one page needs: (published path, source path relative to SOCIAL, operation)."""
    slug, post, photos = snap["slug"], snap["post"], snap["photos"]
    base = f"assets/trips/{slug}/"
    src = lambda k: f"trips-you-can-copy/{snap['folder']}/photos/{photos[k]['file']}"
    jobs = []
    cover = next(s for s in post["slides"] if s["type"] == "cover")["photo"]
    w, h = photos[cover]["dims"]
    hero = cfg["hero"]
    for name, spec, focus in (("hero", HERO, hero["desk"]), ("hero-m", HERO_M, hero["mob"]), ("og", OG, hero["desk"]), ("card", CARD, hero["desk"])):
        jobs.append((base + name + ".jpg", src(cover), {"crop": crop_box(w, h, spec["aspect"], focus), "width": spec["width"], "q": spec["q"]}))
    for s in post["slides"]:
        k, t = s.get("photo"), s["type"]
        if not k or t in ("cover", "mapcard"):
            continue
        w, h = photos[k]["dims"]
        if t == "app" or is_blurred_stay(s):
            jobs.append((base + k + "-blur.jpg", src(k), {"crop": crop_box(w, h, min(max(w / h, 0.5), 2.0), [0.5, 0.5]), "width": BLUR["width"], "q": BLUR["q"]}))
            continue
        a = section_aspect(w, h)
        jobs.append((base + k + ".jpg", src(k), {"crop": crop_box(w, h, a, focus_of(s.get("pos45", "50% 50%"))),
                                                  "width": SECTION_W if a >= 1 else SECTION_TALL_W, "q": SECTION_Q}))
    for key, sc in snap["screens"].items():
        jobs.append((f"assets/trips/app/{key}.jpg", sc["src"], {"crop": [sc["sw"], sc["sh"], sc["sx"], sc["sy"]], "width": SCREEN["width"], "q": SCREEN["q"]}))
    return jobs


def sha1(path):
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def make_image(out, source, op):
    out.parent.mkdir(parents=True, exist_ok=True)
    cw, ch, x, y = op["crop"]
    if x == 0 and y == 0 and [cw, ch] != sips_dims(source):   # sips centers a crop whose offset is 0 0: start 1 px in instead
        x, y = (0, 1) if ch < sips_dims(source)[1] else (1, 0)
    with tempfile.TemporaryDirectory() as tmp:
        mid = Path(tmp) / "crop.tif"
        subprocess.run(["sips", "--cropToHeightWidth", str(ch), str(cw), "--cropOffset", str(y), str(x), "-s", "format", "tiff",
                        str(source), "--out", str(mid)], capture_output=True, check=True)
        subprocess.run(["sips", "-m", SRGB, "--resampleWidth", str(op["width"]), "-s", "format", "jpeg", "-s", "formatOptions", str(op["q"]),
                        str(mid), "--out", str(out)], capture_output=True, check=True)


def refresh_images(jobs, manifest):
    made = 0
    for rel, source_rel, op in jobs:
        source = SOCIAL / source_rel
        digest = sha1(source)
        out = ROOT / rel
        entry = manifest.get(rel)
        if out.exists() and entry and entry.get("sha1") == digest and entry.get("op") == op:
            continue
        make_image(out, source, op)
        w, h = sips_dims(out)
        manifest[rel] = {"src": source_rel, "sha1": digest, "op": op, "w": w, "h": h, "bytes": out.stat().st_size}
        made += 1
    return made


# ---------------------------------------------------------------- page helpers
def nice_date(iso):
    d = date.fromisoformat(str(iso)[:10])
    return f"{d.strftime('%b')} {d.day}, {d.year}"


def is_blurred_stay(s):
    # The stay slides blur a generic town photo behind the card; shown sharp it would pass for the hotel itself.
    return s["type"] == "stay" and s.get("label") == "Where we'd stay"


def credit_name(photo):
    who = re.sub(r"\s*\(talk.*$", "", photo["artist"]).strip()
    if photo.get("attribution_html"):
        return photo["attribution_html"]
    if "No machine-readable author" in who:
        m = re.search(r"(\S+) assumed", who)
        return e(f"{m.group(1)} (author assumed by Commons)") if m else "Unknown author"
    who = re.sub(r"^Photograph by ", "", who).rstrip(".")
    who = re.sub(r"^User: \(WT-shared\) (\S+) at\s+wts wikivoyage$", r"\1 (Wikivoyage)", who)
    who = re.sub(r"\s+/\s+.*$", "", who)
    who = re.sub(r" on Flickr as .*$", "", who)
    who = re.sub(r" from [A-Z][^()]*$", "", who)
    if who == "X":
        who = "X (Wikimedia Commons user)"
    return e(who)


# Source notes are shown as sources.md has them, except words the site never uses (no "reserve"/"book"/"buy" anywhere).
SOURCE_TRIM = {"solv_getting": (", reservations required", "")}

# Authors who ask for a specific attribution on every image (checked on each file's Commons page).
ATTRIBUTION = {
    "https://commons.wikimedia.org/wiki/File:Sch%C3%B6nbrunn_Palace_in_Vienna_at_Christmas,_Vienna,_Austria._(16405939248).jpg":
        'Image by <a href="http://www.traveljunction.com" rel="nofollow noopener" target="_blank">www.traveljunction.com</a>',
}


def license_name(photo):
    return photo["license"].replace(" at", " AT")


def license_link(photo):
    return f'<a href="{e(photo["license_url"] or photo["page"])}" target="_blank" rel="noopener license">{e(license_name(photo))}</a>'


def photo_credit(photo, prefix="Photo"):
    p = dict(photo, attribution_html=ATTRIBUTION.get(photo["page"]))
    who = credit_name(p)
    if not p.get("attribution_html"):
        who = f'<a href="{e(photo["page"])}" target="_blank" rel="noopener">{who}</a>'
    return f'<p class="credit">{prefix}: {who}, {license_link(photo)}</p>'


MONTH_DAY = re.compile(r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d)")


def nobreak(t):
    """Keep "Dec 23", "9 PM" and "noon–10" on one line in narrow table cells."""
    t = MONTH_DAY.sub("\\1\u00a0\\2", t).replace(" AM", "\u00a0AM").replace(" PM", "\u00a0PM")
    return t.replace("–", "\u2060–\u2060")


def maps_url(name, where):
    return "https://www.google.com/maps/search/?api=1&amp;query=" + quote(name + ", " + where)


def split_place(line):
    """'📍 Woolly's Tube Park — Mammoth Lakes, CA, USA' -> ('Woolly's Tube Park', 'Mammoth Lakes, CA, USA')."""
    name, _, where = line.replace(PIN, "").strip().partition(" — ")
    return name.strip(), where.strip()


def domain(url):
    return re.sub(r"^https?://(www\.)?", "", url).split("/")[0]


PIN_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" fill="currentColor"/></svg>'
CHECK_SVG = '<svg width="15" height="15" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 10.5l4 4 8-9" fill="none" stroke="#A3B991" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
TP = '<span class="tp" aria-hidden="true"></span>'

# The slides' icons (gold line drawings), reused on the "Kids will love" lists.
ICONS = {
    "train": '<rect x="12" y="6" width="28" height="32" rx="7" fill="none" stroke="#C98A22" stroke-width="3"/><path d="M12 24h28M18 44l-4 5M34 44l4 5" stroke="#C98A22" stroke-width="3" stroke-linecap="round"/><circle cx="19" cy="31" r="2.6" fill="#C98A22"/><circle cx="33" cy="31" r="2.6" fill="#C98A22"/>',
    "skate": '<path d="M14 8v20c0 3 2 5 5 5h18c3 0 5-2 5-5v-1c0-3-2-5-5-6l-11-3V8z" fill="none" stroke="#C98A22" stroke-width="3" stroke-linejoin="round"/><path d="M10 42h34c0 3-2 4-5 4H14" fill="none" stroke="#C98A22" stroke-width="3" stroke-linecap="round"/><path d="M18 33v9M36 33v9" stroke="#C98A22" stroke-width="3"/>',
    "star": '<path d="M26 6l5.6 12.2 13.3 1.5-9.9 9 2.8 13.1L26 35.2l-11.8 6.6L17 28.7l-9.9-9 13.3-1.5z" fill="none" stroke="#C98A22" stroke-width="3" stroke-linejoin="round"/>',
    "tree": '<path d="M26 5l10 13h-6l9 12h-7l9 12H11l9-12h-7l9-12h-6z" fill="none" stroke="#C98A22" stroke-width="3" stroke-linejoin="round"/><path d="M26 42v6" stroke="#C98A22" stroke-width="3" stroke-linecap="round"/>',
    "castle": '<path d="M8 46V18h6v5h5v-5h6v5h4v-5h6v5h5v-5h4v28z" fill="none" stroke="#C98A22" stroke-width="3" stroke-linejoin="round"/><path d="M22 46v-9a4 4 0 0 1 8 0v9" fill="none" stroke="#C98A22" stroke-width="3"/><path d="M26 18V6l8 3-8 3" fill="none" stroke="#C98A22" stroke-width="3" stroke-linejoin="round"/>',
    "shoe": '<path d="M6 36c0-5 3-8 8-9l10-2c4-1 6-5 7-9h7c3 0 5 2 5 5v8c0 3 2 4 3 5v4c0 3-2 5-5 5H11c-3 0-5-2-5-5z" fill="none" stroke="#C98A22" stroke-width="3" stroke-linejoin="round"/><path d="M6 37h40" stroke="#C98A22" stroke-width="3"/>',
    "lights": '<path d="M4 12c14 10 30 10 44 0" fill="none" stroke="#C98A22" stroke-width="3" stroke-linecap="round"/><path d="M12 17v6M20 20v7M28 21v7M36 19v7M44 15v6" stroke="#C98A22" stroke-width="3" stroke-linecap="round"/><circle cx="12" cy="27" r="3.5" fill="#C98A22"/><circle cx="20" cy="31" r="3.5" fill="#C98A22"/><circle cx="28" cy="32" r="3.5" fill="#C98A22"/><circle cx="36" cy="30" r="3.5" fill="#C98A22"/><circle cx="44" cy="25" r="3.5" fill="#C98A22"/>',
}


def icon(name):
    return f'<svg viewBox="0 0 52 52" width="44" height="44" aria-hidden="true" focusable="false">{ICONS[name]}</svg>'


CSS = """
.post-main{padding:0 0 64px}
.wrap2{max-width:1120px;margin:0 auto;padding-inline:var(--gutter)}
.kick{font:700 12.5px/1.25 var(--body);letter-spacing:.13em;text-transform:uppercase;color:var(--green-deep)}
.kick b{color:#9A6512}
.hero{position:relative;overflow:hidden;background:#0F1A17;color:#FBF5EA;display:flex;align-items:flex-end;min-height:520px;min-height:min(78vh,720px);min-height:min(78svh,720px)}
.hero.top{align-items:flex-start}
.hero picture,.hero img{position:absolute;inset:0;width:100%;height:100%}
.hero img{object-fit:cover;object-position:var(--pd,50% 50%)}
.hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,26,23,.34) 0%,rgba(15,26,23,0) 20%,rgba(15,26,23,.08) 42%,rgba(15,26,23,.7) 70%,rgba(15,26,23,.93) 100%)}
.hero.top::after{background:linear-gradient(180deg,rgba(15,26,23,.95) 0%,rgba(15,26,23,.86) 30%,rgba(15,26,23,.55) 52%,rgba(15,26,23,.12) 70%,rgba(15,26,23,0) 80%,rgba(15,26,23,.2) 100%)}
.hero-in{position:relative;z-index:1;width:100%;max-width:1120px;margin:0 auto;padding:96px var(--gutter) 36px;display:flex;flex-direction:column;align-items:flex-start;gap:12px}
.hero-in h1{margin:2px 0}
.hero.top .hero-in{padding:34px var(--gutter) 110px}
.hero .kick{color:var(--gold);text-shadow:0 1px 10px rgba(0,0,0,.4)}
.hero h1{font-size:clamp(38px,6.2vw,74px);max-width:15ch;color:#FBF5EA;text-shadow:0 2px 28px rgba(0,0,0,.3)}
.hero-sub{font-size:clamp(17px,1.9vw,21px);font-weight:600;line-height:1.35;color:rgba(251,245,234,.95);text-shadow:0 1px 14px rgba(0,0,0,.4)}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0;list-style:none}
.chips li{display:inline-flex;align-items:center;gap:7px;min-height:32px;padding:5px 12px;border-radius:999px;font-size:14px;font-weight:700;line-height:1.2;background:#F1E9D9}
.hero-who{font-size:15px;font-weight:600;line-height:1.4;color:rgba(251,245,234,.86);text-shadow:0 1px 12px rgba(0,0,0,.45)}
.stamp{display:inline-flex;align-items:center;gap:7px;min-height:32px;padding:5px 12px 5px 10px;border-radius:999px;font-size:14px;font-weight:700;background:rgba(15,26,23,.58);border:1px solid rgba(163,185,145,.55);color:#FBF5EA;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.hero .pip{background:rgba(15,26,23,.58);border:1px solid rgba(163,185,145,.5);color:#FBF5EA;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
@media (max-width:700px){.hero img{object-position:var(--pm,50% 50%)}.hero-in{padding-bottom:24px}.hero.top .hero-in{padding-top:26px}}
.credit{margin:6px 0 0;font-size:12px;line-height:1.4;color:var(--on-light-muted)}
.light .credit a{color:inherit;text-decoration:underline;text-decoration-color:rgba(85,96,91,.45)}
.hero-credit{max-width:1120px;margin:0 auto;padding:0 var(--gutter);text-align:right}
.crumbs{font-size:14px;font-weight:700;margin:0}
.crumbs a{text-decoration:none}
.pip{display:flex;align-items:flex-start;gap:10px;margin:0;padding:9px 16px 10px 10px;border-radius:18px;background:#F1E9D9;color:#23352E;font-weight:600;font-size:16px;line-height:1.45;max-width:100%}
.tp{position:relative;flex:none;width:24px;height:24px;margin-top:0;border-radius:50%;background:radial-gradient(circle at 36% 30%,#E3EBDC 0%,#BACAAD 31%,#93A982 62%,#6E8661 88%);box-shadow:0 1px 4px rgba(0,0,0,.2)}
.tp::before,.tp::after{content:"";position:absolute;top:44%;width:13%;height:19%;border-radius:50%;background:#1D2519}
.tp::before{left:33%}.tp::after{left:55%}
.intro{max-width:780px;margin:26px 0 0;display:flex;flex-direction:column;gap:16px}
.pip-note{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--on-light-muted);margin:0}
.glance{margin:0;padding:16px 18px;border-radius:18px;background:#fff;border:1px solid rgba(15,26,23,.1);display:grid;gap:8px}
.glance h2{font-size:19px}
.glance ol,.glance ul{margin:0;padding:0;list-style:none;display:grid;gap:6px}
.glance li{display:grid;grid-template-columns:54px minmax(0,1fr);gap:8px;font-size:15.5px}
.glance li b{font-weight:800}
.glance.toc li{grid-template-columns:30px minmax(0,1fr)}
.glance a{font-weight:700}
.glance p{margin:0;color:var(--on-light-soft)}
.plist ul{gap:14px}
.plist li{display:block;font-size:15.5px}
.plist li b{display:block;font:800 18px/1.2 var(--display);letter-spacing:-.01em}
.plist .where{display:block;margin-top:2px;color:var(--on-light-muted);font-size:14px;font-weight:600}
.plist p{margin:3px 0 4px}
.plist a{display:inline-flex;align-items:center;gap:5px;font-size:14px}
.plan{display:flex;flex-direction:column;gap:clamp(48px,6vw,84px);margin:48px 0 0}
.ps{display:grid;gap:16px}
.ps,.route,.stay{scroll-margin-top:20px}
.ps-photo{margin:0;min-width:0}
.ps-photo img{display:block;width:100%;height:auto;border-radius:20px;background:#E6DDCB}
.ps-text{display:flex;flex-direction:column;align-items:flex-start;gap:12px;min-width:0}
.ps-text h2,.route h2,.stay h2{font-size:clamp(30px,3.4vw,44px)}
.ps-text p,.route p,.stay p{margin:0}
.when{font-weight:700;color:#34433D}
.detail{color:var(--on-light-soft)}
.spots{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.spots a{display:inline-flex;align-items:center;gap:6px;min-height:38px;padding:6px 13px;border-radius:999px;border:1px solid rgba(15,26,23,.16);background:#fff;font-size:14px;font-weight:700;text-decoration:none;line-height:1.25}
.src{font-size:13px;color:var(--on-light-muted)}
.more a{font-weight:700}
@media (min-width:880px){
 .ps{grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:48px;align-items:center}
 .ps.tall{grid-template-columns:minmax(0,5fr) minmax(0,6fr)}
 .ps.wide-text{grid-template-columns:minmax(0,5fr) minmax(0,7fr)}
 .ps.flip{grid-template-columns:minmax(0,5fr) minmax(0,7fr)}
 .ps.tall.flip{grid-template-columns:minmax(0,6fr) minmax(0,5fr)}
 .ps.wide-text.flip{grid-template-columns:minmax(0,7fr) minmax(0,5fr)}
 .ps.flip .ps-photo{order:2}
 .ps.tall .ps-photo img{max-height:620px;object-fit:cover}
}
.dt-wrap{width:100%;border-radius:18px;overflow:hidden;border:1px solid rgba(15,26,23,.1);background:#fff}
.dt{width:100%;border-collapse:collapse}
.dt th,.dt td{padding:11px 14px;text-align:left;vertical-align:top;border-top:1px solid rgba(15,26,23,.08)}
.dt tr:first-child th,.dt tr:first-child td{border-top:0}
.dt th{font-weight:400}
.dt th b{display:block;font:800 16.5px/1.2 var(--display);letter-spacing:-.01em}
.dt td{text-align:right}
.dt td b{display:block;font-weight:800;font-size:15px;white-space:nowrap}
.dt span{display:block;margin-top:3px;font-size:13px;font-weight:600;line-height:1.3;color:var(--on-light-muted)}
.kids{list-style:none;margin:0;padding:0;display:grid;gap:10px;width:100%}
.kids li{display:grid;grid-template-columns:44px minmax(0,1fr);gap:14px;align-items:start;padding:14px 16px;border-radius:18px;background:#fff;border:1px solid rgba(15,26,23,.1)}
.kids b{display:block;font:800 18px/1.2 var(--display);letter-spacing:-.01em}
.kids span{display:block;margin-top:3px;color:var(--on-light-soft);font-size:15px}
.kids small{display:block;margin-top:6px;font-size:14px;line-height:1.45;color:var(--on-light-muted)}
.heads{width:100%;padding:18px 20px;border-radius:20px;background:#FFF4DF;border:1px solid #F2C77B}
.heads ol{list-style:none;margin:0;padding:0;display:grid;gap:14px}
.heads li{display:grid;grid-template-columns:30px minmax(0,1fr);gap:12px;align-items:start}
.wn{width:30px;height:30px;border-radius:50%;box-shadow:inset 0 0 0 2px #C98A22;color:#7A4B00;font:800 14px/30px var(--body);text-align:center}
.heads .src{margin-top:4px}
.route{display:grid;gap:18px}
.route-text{display:flex;flex-direction:column;align-items:flex-start;gap:12px;min-width:0}
.trip-map{height:min(62vh,460px);border-radius:20px;overflow:hidden;border:1px solid rgba(15,26,23,.12);background:#EAE4D8}
.trip-map .mk{width:30px;height:30px;border-radius:50%;background:#F2A93B;color:#0F1A17;border:2px solid #0F1A17;display:flex;align-items:center;justify-content:center;font:800 13px/1 'DM Sans',sans-serif;cursor:pointer}
.legs{list-style:none;margin:4px 0 0;padding:0;width:100%}
.legs .city{display:grid;grid-template-columns:34px minmax(0,1fr);gap:12px;align-items:center}
.legs .pn{width:34px;height:34px;border-radius:50%;background:#F2A93B;color:#0F1A17;border:2px solid #0F1A17;display:flex;align-items:center;justify-content:center;font:800 15px/1 var(--display)}
.legs .city b{font:800 18px/1.2 var(--display);letter-spacing:-.01em}
.legs .city span{color:var(--on-light-muted);font-size:14px;font-weight:600}
.legs .leg{margin-left:16px;padding:7px 0 7px 28px;border-left:2px dashed rgba(15,26,23,.28);font-size:14px;font-weight:600;color:var(--on-light-muted)}
@media (min-width:880px){.route{grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:48px;align-items:start}.route .route-map{order:-1}}
.stay{position:relative;overflow:hidden;isolation:isolate;border-radius:26px;padding:clamp(18px,5vw,56px) clamp(14px,5vw,56px) 14px;background:#2B3530}
.stay-bg{position:absolute;inset:0;z-index:-1}
.stay-bg img{display:block;width:100%;height:100%;object-fit:cover;filter:blur(18px) saturate(1.1);transform:scale(1.3)}
.stay-bg::after{content:"";position:absolute;inset:0;background:rgba(15,26,23,.34)}
.stay-card{max-width:660px;margin:0 auto;background:var(--cream);border-radius:22px;padding:24px 22px;box-shadow:0 30px 80px rgba(0,0,0,.35);display:flex;flex-direction:column;align-items:flex-start;gap:12px}
.stay-card ul{margin:0;padding-left:20px;display:grid;gap:6px}
.pick{display:inline-block;padding:4px 10px;border-radius:999px;background:#0F1A17;color:#FBF5EA;font-size:12.5px;font-weight:700;letter-spacing:.04em}
.addr a{font-weight:700}
.note{font-size:13px;color:var(--on-light-muted)}
.stay .credit{text-align:center;color:rgba(251,245,234,.85);margin-top:12px}
.light .stay .credit a{color:rgba(251,245,234,.95)}
.copy-box{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px 24px;padding:22px 24px;border-radius:22px;background:#fff;border:1px solid rgba(15,26,23,.12)}
.copy-box h2{font-size:24px}
.copy-box p{margin:4px 0 0;color:var(--on-light-soft)}
.get-app{position:relative;overflow:hidden;isolation:isolate;border-radius:26px;background:#0F1A17;color:#FBF5EA;padding:clamp(22px,4vw,48px)}
.ga-bg{position:absolute;inset:0;z-index:-1}
.ga-bg img{display:block;width:100%;height:100%;object-fit:cover;filter:blur(20px) saturate(1.15);transform:scale(1.3);opacity:.6}
.ga-bg::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,26,23,.5),rgba(15,26,23,.86))}
.ga-in{display:grid;gap:26px;align-items:center}
.ga-copy{display:flex;flex-direction:column;gap:14px;min-width:0}
.get-app h2{color:#FBF5EA;font-size:clamp(28px,3.4vw,42px)}
.ga-line{margin:0;font-size:18px;line-height:1.5;color:rgba(251,245,234,.92)}
.get-app .form-row .btn{flex:1 1 auto}
.get-app .micro{margin:0;font-size:13px;color:rgba(251,245,234,.78)}
.light .get-app .micro a{color:rgba(251,245,234,.95)}
.get-app .joined{background:rgba(95,176,143,.16);border-color:rgba(127,199,167,.55);color:#CDEBDC;font-weight:700}
.ga-screens{margin:0;display:flex;flex-direction:column;align-items:center;gap:10px;min-width:0}
.ga-screens img{display:block;width:100%;max-width:380px;height:auto;border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.45)}
.get-app>.credit{color:rgba(251,245,234,.75);margin-top:18px}
.light .get-app>.credit a{color:rgba(251,245,234,.9)}
.ga-screens p{margin:0;font:700 11.5px/1.3 var(--body);letter-spacing:.12em;text-transform:uppercase;color:#A3B991;text-align:center}
@media (min-width:880px){.ga-in{grid-template-columns:minmax(0,7fr) minmax(0,5fr)}}
.small-sec{display:flex;flex-direction:column;gap:8px;font-size:14px;line-height:1.5;color:var(--on-light-muted)}
.small-sec h2{font-size:20px;color:var(--on-light)}
.small-sec h3{font:700 15px/1.3 var(--body);color:var(--on-light);margin:8px 0 0}
.small-sec ol,.small-sec ul{margin:0;padding-left:20px;display:grid;gap:6px}
.small-sec p{margin:0}
.end-links{font-weight:600}
"""

HUB_CSS = """
.hub-main{padding:0 0 64px}
.kick{font:700 12.5px/1.25 var(--body);letter-spacing:.13em;text-transform:uppercase;color:var(--green-deep)}
.hub-head{max-width:1120px;margin:0 auto;padding:40px var(--gutter) 0;display:flex;flex-direction:column;align-items:flex-start;gap:14px}
.hub-head>*{max-width:760px}
.hub-head .join-box{width:100%}
.hub-head h1{font-size:clamp(40px,5.6vw,62px)}
.join-box{margin-top:4px;padding:18px 18px 16px;border-radius:22px;background:#0F1A17;color:#FBF5EA;display:grid;gap:12px}
.join-box p{margin:0}
.join-line{font-size:16.5px;line-height:1.45;font-weight:600}
.join-box .form-row .field{flex:1 1 200px;height:52px}
.join-box .form-row .btn{flex:1 1 auto;min-height:52px}
.join-box .micro{font-size:13px;color:rgba(251,245,234,.78)}
.light .join-box .micro a{color:rgba(251,245,234,.95)}
.join-box .joined{background:rgba(95,176,143,.16);border-color:rgba(127,199,167,.55);color:#CDEBDC;font-weight:700}
.cards{list-style:none;margin:30px auto 0;padding:0 var(--gutter);max-width:1120px;display:grid;gap:22px}
.card{min-width:0}
.card a{display:flex;flex-direction:column;height:100%;border-radius:22px;overflow:hidden;background:#fff;border:1px solid rgba(15,26,23,.1);text-decoration:none;color:var(--on-light)}
.light .card a{color:var(--on-light)}
.card a:hover h2{text-decoration:underline;text-decoration-thickness:2px}
.card img{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:cover;background:#E6DDCB}
.c-in{padding:16px 18px 20px;display:flex;flex-direction:column;gap:7px}
.card h2{font-size:clamp(23px,2.4vw,28px)}
.card .who{font-size:14px;font-weight:700;color:#34433D}
.card p{margin:0;color:var(--on-light-soft);font-size:15.5px;line-height:1.5}
.card .kick{color:var(--green-deep);font-size:12.5px;line-height:1.25}
@media (min-width:720px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (min-width:1000px){
 .cards{grid-template-columns:repeat(3,minmax(0,1fr))}
 .cards .card:first-child{grid-column:1/-1}
 .cards .card:first-child a{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr)}
 .cards .card:first-child img{height:100%;aspect-ratio:auto;min-height:340px}
 .cards .card:first-child .c-in{justify-content:center;padding:28px 32px}
 .cards .card:first-child h2{font-size:38px}
}
.more{max-width:1120px;margin:44px auto 0;padding:0 var(--gutter);display:grid;gap:12px}
.more h2{font-size:24px}
.list-grid{list-style:none;padding:0;margin:0;display:grid;gap:10px}
@media (min-width:720px){.list-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.list-grid a{display:block;padding:14px 16px;border:1px solid rgba(15,26,23,.12);border-radius:16px;background:#fff;text-decoration:none}
.light .list-grid a{color:var(--on-light)}
.list-grid b{display:block;font:800 18px/1.2 var(--display);letter-spacing:-.01em}
.list-grid span{color:var(--on-light-muted);font-size:14px}
.small-sec{max-width:1120px;margin:36px auto 0;padding:0 var(--gutter);display:flex;flex-direction:column;gap:8px;font-size:13.5px;line-height:1.5;color:var(--on-light-muted)}
.small-sec h2{font-size:18px;color:var(--on-light)}
.small-sec ul{margin:0;padding-left:20px;display:grid;gap:4px}
.small-sec p{margin:0}
"""


def form(slug, button="Join the waitlist"):
    return f"""<form class="form-row signup" data-list-waitlist data-slug="{e(slug)}" novalidate>
      <label class="sr" for="email-wl">Email address</label>
      <input class="field" id="email-wl" name="email" type="email" autocomplete="email" inputmode="email" placeholder="you@email.com" required>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button class="btn btn-sun" type="submit">{e(button)}</button>
      <p class="form-msg" role="status" aria-live="polite"></p>
    </form>
    <p class="micro">iPhone app · No spam, unsubscribe anytime · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></p>"""


def page(title, desc, url, body, css, image=None, head_extra="", og_type="article"):
    img = image or SITE + "/og.png"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)} — Go To Travel</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="{url}">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="Go To Travel">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{img}">
<meta property="og:url" content="{url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0F1A17">
{HEAD_ICONS}
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=DM+Sans:opsz,wght@9..40,400..700&display=swap">
<link rel="stylesheet" href="/assets/site.css">
{head_extra}<style>{css}</style>
</head>
<body class="light">
{HEADER}
{body}
<script src="/assets/site.js"></script>
<script src="/assets/lists.js"></script>
</body>
</html>
"""


def json_ld(data):
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False).replace("</", "<\\/") + "</script>"


# ---------------------------------------------------------------- one post page
class Post:
    def __init__(self, snap, cfg, manifest):
        self.s, self.cfg, self.manifest = snap, cfg, manifest
        self.slug, self.post = snap["slug"], snap["post"]
        self.url = f"{SITE}/trips/{self.slug}"
        self.src = {sid: (url, title, checked) for sid, url, title, checked in snap["sources"]}
        self.places = self.post.get("places", [])
        self.ntips = sum(1 for sl in self.post["slides"] if sl["type"] == "tip")
        self.flip = False

    def img(self, rel):
        m = self.manifest[rel]
        return "/" + rel, m["w"], m["h"]

    def photo_rel(self, key, suffix=""):
        return f"assets/trips/{self.slug}/{key}{suffix}.jpg"

    def figure(self, key, cls="ps-photo", note=""):
        path, w, h = self.img(self.photo_rel(key))
        alt = self.post["photo_alt"].get(key, "")
        credit = photo_credit(self.s["photos"][key])
        if note:   # the slide's own photo note ("Photo: the lodge's lounge on a 1930s postcard") leads the credit line
            credit = credit.replace('<p class="credit">Photo: ', f'<p class="credit">{e(note.rstrip("."))}. Photo: ', 1)
        return (f'<figure class="{cls}"><img src="{path}" width="{w}" height="{h}" alt="{e(alt)}" loading="lazy" decoding="async">'
                f'{credit}</figure>')

    def sources_line(self, ids):
        seen = []
        for sid in ids:
            if sid in self.src and sid not in seen:
                seen.append(sid)
        if not seen:
            return ""
        uniq, out = [], []
        for sid in seen:   # one link per site
            d = domain(self.src[sid][0])
            if d not in uniq:
                uniq.append(d)
                out.append(f'<a href="{e(self.src[sid][0])}" target="_blank" rel="noopener nofollow">{e(d)}</a>')
        return f'<p class="src">{"Source" if len(out) == 1 else "Sources"}: {", ".join(out)}</p>'

    def pip(self, text):
        return f'<p class="pip">{TP}<span><span class="sr">Pip: </span>{e(text)}</span></p>'

    def spots(self, idxs):
        if not idxs:
            return ""
        items = []
        for i in idxs:
            name, where = split_place(self.places[i][0])
            items.append(f'<li><a href="{maps_url(name, where)}" target="_blank" rel="noopener">{PIN_SVG}{e(name)}<span class="sr"> in {e(where)}, open in Maps</span></a></li>')
        return f'<ul class="spots" aria-label="Open in Maps">{"".join(items)}</ul>'

    def extras(self, n):
        return self.cfg.get("slides", {}).get(str(n), {})

    def details(self, ex):
        return "".join(f'<p class="detail">{e(t)}</p>' for t, _ in ex.get("details", []))

    def detail_ids(self, ex):
        ids = [sid for _, ids in ex.get("details", []) for sid in ids]
        for it in ex.get("items", []):
            if it:
                ids += it[1]
        return ids

    # --- sections, one per slide type
    def sec_open(self, n, cls):
        return f'<section class="{cls}" id="s-{n}" aria-labelledby="s-{n}-h">'

    def photo_section(self, n, sl, kicker, heading, inner, extra_cls=""):
        k = sl["photo"]
        w, h = self.s["photos"][k]["dims"]
        tall = section_aspect(w, h) < 1
        cls = "ps" + (" tall" if tall else "") + (" flip" if self.flip else "") + extra_cls
        self.flip = not self.flip
        return (self.sec_open(n, cls) + self.figure(k, note=sl.get("photo_note", "")) +
                f'<div class="ps-text"><p class="kick">{kicker}</p><h2 id="s-{n}-h">{e(heading)}</h2>{inner}</div></section>')

    def tip(self, n, sl):
        ex = self.extras(n)
        inner = self.pip(sl["pip"]) + self.details(ex) + self.spots(ex.get("places")) + self.sources_line([sl.get("src"), sl.get("src2")] + self.detail_ids(ex))
        kicker = f'{e(self.post.get("series", ""))} · <b>{sl["n"]} of {self.ntips}</b>'
        return self.photo_section(n, sl, kicker, sl["big"], inner).replace(f'id="s-{n}"', f'id="tip-{sl["n"]}"', 1)

    def city(self, n, sl):
        ex = self.extras(n)
        inner = (f'<p class="when">{nobreak(e(sl["dates"]))}</p>' + "".join(self.pip(p) for p in sl["pips"]) + self.details(ex) +
                 self.spots(ex.get("places")) +
                 (f'<p class="more"><a href="{e(ex["more"][0])}">{e(ex["more"][1])}</a></p>' if ex.get("more") else "") +
                 self.sources_line(sl.get("source_ids", []) + self.detail_ids(ex)))
        return self.photo_section(n, sl, e(sl["label"]), sl["big"], inner)

    def dates(self, n, sl):
        ex = self.extras(n)
        keep = lambda t: nobreak(e(t))
        rows = "".join(f'<tr><th scope="row"><b>{e(r[0])}</b><span>{e(r[1])}</span></th><td><b>{keep(r[2])}</b><span>{keep(r[3])}</span></td></tr>' for r in sl["rows"])
        ids = [sid for r in sl["rows"] for sid in (r[4] if len(r) > 4 else [])]
        inner = (f'<div class="dt-wrap"><table class="dt"><caption class="sr">{e(sl["big"])}</caption><thead class="sr"><tr><th scope="col">What and where</th><th scope="col">When</th></tr></thead>'
                 f'<tbody>{rows}</tbody></table></div>' + self.details(ex) + self.spots(ex.get("places")) + self.sources_line(ids + self.detail_ids(ex)))
        return self.photo_section(n, sl, e(sl["label"]), sl["big"], inner, " wide-text")

    def kids(self, n, sl):
        ex = self.extras(n)
        more = ex.get("items", [])
        lis = []
        for i, it in enumerate(sl["items"]):
            note = more[i] if i < len(more) else None
            lis.append(f'<li>{icon(it[0])}<div><b>{e(it[1])}</b><span>{e(it[2])}</span>' + (f'<small>{e(note[0])}</small>' if note else "") + '</div></li>')
        inner = (f'<ul class="kids">{"".join(lis)}</ul>' + (self.pip(sl["pip"]) if sl.get("pip") else "") + self.details(ex) +
                 self.spots(ex.get("places")) + self.sources_line(sl.get("source_ids", []) + self.detail_ids(ex)))
        return self.photo_section(n, sl, e(sl["label"]), sl["big"], inner)

    def aiwrong(self, n, sl):
        texts = self.post.get("wrong_caption") or [i[0] for i in sl["items"]]
        lis = "".join(f'<li><span class="wn" aria-hidden="true">{i + 1}</span><div><p>{e(t)}</p>{self.sources_line([sl["items"][i][1]])}</div></li>'
                      for i, t in enumerate(texts))
        inner = f'<div class="heads"><ol>{lis}</ol></div>'
        return self.photo_section(n, sl, "Checked on " + e(nice_date(self.post["checked_on"])), "Heads-ups AI planners miss", inner, " wide-text")

    def stay(self, n, sl):
        ex = self.extras(n)
        if not is_blurred_stay(sl):   # the photo is the place itself (the Dickens Fair): a normal photo section
            inner = (f'<p class="when">{e(sl.get("kicker", ""))}</p>' + "".join(f'<p class="detail">{e(x)}</p>' for x in sl["lines"]) +
                     (f'<p class="addr"><a href="{maps_url(sl["addr"], "CA, USA")}" target="_blank" rel="noopener">{e(sl["addr"])}</a></p>' if sl.get("addr") else "") +
                     (self.pip(sl["pip"]) if sl.get("pip") else "") + self.details(ex) + self.spots(ex.get("places")) +
                     self.sources_line(sl.get("source_ids", []) + self.detail_ids(ex)))
            return self.photo_section(n, sl, e(sl["label"]), sl["big"], inner)
        k = sl["photo"]
        path, w, h = self.img(self.photo_rel(k, "-blur"))
        lines = "".join(f"<li>{e(x)}</li>" for x in sl["lines"])
        name, where = sl["big"], sl.get("addr", "")
        return (self.sec_open(n, "stay") + f'<div class="stay-bg" aria-hidden="true"><img src="{path}" width="{w}" height="{h}" alt="" loading="lazy" decoding="async"></div>'
                f'<div class="stay-card"><p class="kick">{e(sl["label"])}</p><h2 id="s-{n}-h">{e(sl["big"])}</h2><p class="pick">{e(sl.get("kicker", "Our editorial pick"))}</p>'
                f'<ul>{lines}</ul>' + (f'<p class="addr"><a href="{maps_url(name, where)}" target="_blank" rel="noopener">{e(where)}</a></p>' if where else "") +
                (f'<p class="note">{e(sl.get("note"))}</p>' if sl.get("note") else "") + (self.pip(sl["pip"]) if sl.get("pip") else "") + self.details(ex) +
                self.sources_line(sl.get("source_ids", []) + self.detail_ids(ex)) + "</div>" +
                photo_credit(self.s["photos"][k], "Background photo (blurred)") + "</section>")

    def mapcard(self, n, sl):
        ex = self.extras(n)
        mp = self.s["map"]
        cities, legs, pills = mp["cities"], mp["legs"], mp["pills"]
        between = legs if legs else pills
        lis = []
        for i, c in enumerate(cities):
            lis.append(f'<li class="city"><span class="pn" aria-hidden="true">{i + 1}</span><span><b>{e(c["label"])}</b>' + (f' <span>· {e(c["sub"])}</span>' if c.get("sub") else "") + "</span></li>")
            if i < len(cities) - 1 and i < len(between) and between[i]:
                lis.append(f'<li class="leg">{e(between[i])}</li>')
        targets = self.cfg.get("pins", [])
        pins = [{"n": i + 1, "name": c["label"], "lat": c["lat"], "lng": c["lng"], "id": (targets[i] if i < len(targets) else ""), "day": None}
                for i, c in enumerate(cities)]
        data = {"pins": pins, "stays": []}
        if self.cfg.get("map_pad"):
            data["pad"] = self.cfg["map_pad"]
        if mp.get("line"):
            data["line"] = mp["line"]
        note = "The line follows the road (OSRM on OpenStreetMap data)." if mp.get("line") else "Dashed lines join the stops in order; they are not the track."
        self.map_json = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
        return (self.sec_open(n, "route") +
                f'<div class="route-text"><p class="kick">{e(sl["label"])}</p><h2 id="s-{n}-h">{e(sl["big"])}</h2>{self.pip(sl["pip"])}'
                f'<ol class="legs" aria-label="Stops in order">{"".join(lis)}</ol>{self.details(ex)}'
                f'{self.sources_line(sl.get("source_ids", []) + self.detail_ids(ex))}</div>'
                f'<div class="route-map"><div class="trip-map" id="trip-map" role="img" aria-label="Map of the route with the stops numbered in order"></div>'
                f'<p class="credit">Map: © OpenStreetMap contributors, OpenMapTiles, OpenFreeMap. {note}</p></div></section>')

    def app_box(self, sl):
        k = sl["photo"]
        path, w, h = self.img(self.photo_rel(k, "-blur"))
        shots = []
        for key in sl.get("screens", []):
            p, sw, sh = self.img(f"assets/trips/app/{key}.jpg")
            shots.append(f'<img src="{p}" width="{sw}" height="{sh}" alt="" loading="lazy" decoding="async">')
        alt = "Real app screens from an example family trip: " + sl.get("screens_alt", "the trip header (kids 6 and 9) and a kid-friendly restaurants list")
        return (f'<section class="get-app" id="waitlist" aria-labelledby="get-h"><div class="ga-bg" aria-hidden="true"><img src="{path}" width="{w}" height="{h}" alt="" loading="lazy" decoding="async"></div>'
                f'<div class="ga-in"><div class="ga-copy"><h2 id="get-h">{e(sl["big"])}</h2>'
                f'<p class="ga-line">Pip fits this plan to your family in the app. It opens in December: join the waitlist.</p>'
                f'{form("trip-" + self.slug)}</div>'
                f'<figure class="ga-screens" role="img" aria-label="{e(alt)}"><p>Real app screens · example trip (beta)</p>{"".join(shots)}</figure></div>'
                f'{photo_credit(self.s["photos"][k], "Background photo (blurred)")}</section>')

    # --- the rest of the page
    def hero(self):
        cover = next(sl for sl in self.post["slides"] if sl["type"] == "cover")
        k = cover["photo"]
        d, m = self.cfg["hero"]["desk"], self.cfg["hero"]["mob"]
        hp, hw, hh = self.img(self.photo_rel("hero"))
        mp, mw, mh = self.img(self.photo_rel("hero-m"))
        who = f'<p class="hero-who">{e(self.cfg["who"])} · {e(self.cfg["where"])}</p>'
        stamp = f'<p class="stamp">{CHECK_SVG}Checked {e(nice_date(self.post["checked_on"]))}</p>'
        top = " top" if self.cfg["hero"].get("text") == "top" else ""
        return (f'<section class="hero{top}" aria-labelledby="hero-h" style="--pd:{round(d[0] * 100)}% {round(d[1] * 100)}%;--pm:{round(m[0] * 100)}% {round(m[1] * 100)}%">'
                f'<picture><source media="(max-width: 700px)" srcset="{mp}" width="{mw}" height="{mh}">'
                f'<img src="{hp}" width="{hw}" height="{hh}" alt="{e(self.post["photo_alt"].get(k, ""))}" fetchpriority="high" decoding="async"></picture>'
                f'<div class="hero-in"><p class="kick">{e(self.post.get("series", ""))}</p><h1 id="hero-h">{e(cover["big"])}</h1>'
                f'<p class="hero-sub">{e(cover.get("sub", ""))}</p>{who}{stamp}'
                f'{self.pip(cover["pip"]) if cover.get("pip") else ""}</div></section>'
                f'<div class="hero-credit">{photo_credit(self.s["photos"][k])}</div>')

    def intro(self):
        post, cfg = self.post, self.cfg
        parts = [f'<p class="crumbs"><a href="/trips"><span aria-hidden="true">‹ </span>All plans you can copy</a></p>', f'<p class="lede">{e(cfg["intro"])}</p>']
        if post.get("dates"):
            parts.append(f'<ul class="chips"><li>{e(post["dates"])}</li></ul>')
        if cfg.get("toc"):
            tips = [sl for sl in post["slides"] if sl["type"] == "tip"]
            lis = "".join(f'<li><b>{sl["n"]}.</b><a href="#tip-{sl["n"]}">{e(sl["big"])}</a></li>' for sl in tips)
            parts.append(f'<nav class="glance toc" aria-labelledby="toc-h"><h2 id="toc-h">The {len(tips)} tips</h2><ol>{lis}</ol></nav>')
        if cfg.get("glance"):
            days = re.findall(r"(Mon|Tue|Wed|Thu|Fri|Sat|Sun): ([^.]+)\.", " ".join(post.get("caption_lines", [])))
            lis = "".join(f"<li><b>{d}</b><span>{e(t)}</span></li>" for d, t in days)
            parts.append(f'<section class="glance" aria-labelledby="gl-h"><h2 id="gl-h">At a glance</h2><ul>{lis}</ul></section>')
        if cfg.get("getting_there"):
            text = " ".join(post.get("caption_lines", []))
            text = re.sub(r"^Getting there: ", "", text)
            parts.append(f'<section class="glance" aria-labelledby="gt-h"><h2 id="gt-h">Getting there</h2><p>{e(text)}</p>'
                         f'{self.sources_line(["solv_getting"]) if "solv_getting" in self.src else ""}</section>')
        if cfg.get("caption_note") and post.get("caption_lines"):
            parts.append(f'<p class="detail">{e(" ".join(post["caption_lines"]))}</p>')
        parts.append(f'<p class="pip-note">{TP}<span>Notes with the little globe are from Pip, our trip planner: the why behind each pick.</span></p>')
        return f'<div class="intro">{"".join(parts)}</div>'

    def places_section(self):
        if not self.cfg.get("places_heading"):
            return ""
        lis = []
        for line, why in self.places:
            name, where = split_place(line)
            lis.append(f'<li><b>{e(name)}</b><span class="where">{e(where)}</span><p>{e(why)}</p>'
                       f'<a href="{maps_url(name, where)}" target="_blank" rel="noopener">{PIN_SVG}Open in Maps<span class="sr">: {e(name)}</span></a></li>')
        return (f'<section class="glance plist" aria-labelledby="pl-h"><h2 id="pl-h">{e(self.cfg["places_heading"])}</h2>'
                f'<ul>{"".join(lis)}</ul></section>')

    def copy_box(self):
        c = self.cfg.get("copy")
        if not c:
            return "", ""
        n = len(self.places)
        box = (f'<section class="copy-box" aria-labelledby="copy-h"><div><h2 id="copy-h">{e(c["label"])}</h2>'
               f'<p>All {n} places in this {e(c["noun"])}, as a plain list for your notes or your group chat.</p></div>'
               f'<button class="btn btn-sun" type="button" data-copy-list>{e(c["label"])}</button></section>')
        lines = [line for line, _ in self.places]
        text = "\n".join([f"Our list for “{self.post['title']}” on Go To Travel: {n} {'spot' if n == 1 else 'spots'}", *lines, "",
                          "Copy it into your own bucket list: in Go To Travel, tap Drop, then A list, and paste this.",
                          f"gototravelapp.com/trips/{self.slug}"])
        return box, f"<textarea hidden data-list-text>{e(text)}</textarea>"

    def sources_section(self):
        trim = lambda sid, t: t.replace(*SOURCE_TRIM[sid]) if sid in SOURCE_TRIM else t
        lis = "".join(f'<li><a href="{e(url)}" target="_blank" rel="noopener nofollow">{e(trim(sid, title))}</a>, checked {e(nice_date(checked))}</li>'
                      for sid, url, title, checked in self.s["sources"])
        dropped = self.post.get("dropped", [])
        left = (f'<h3>What we left out, and why</h3><ul>{"".join(f"<li>{e(d)}</li>" for d in dropped)}</ul>' if dropped else "")
        return (f'<section class="small-sec" aria-labelledby="src-h"><h2 id="src-h">Sources</h2>'
                f'<p>Every date, hour and claim on this page, with where it came from.</p><ol>{lis}</ol>{left}</section>')

    def credits_section(self):
        lis = []
        for idx, sl in enumerate(self.post["slides"], 1):
            k = sl.get("photo")
            if not k or sl["type"] == "mapcard":
                continue
            p = self.s["photos"][k]
            role = {"cover": "Top photo", "app": "Waitlist background (blurred)"}.get(sl["type"])
            if not role:
                role = ("Tip " + str(sl["n"])) if sl["type"] == "tip" else ("Heads-ups" if sl["type"] == "aiwrong" else sl.get("label") or sl.get("big", ""))
                if is_blurred_stay(sl):
                    role += " (blurred background)"
            title = re.sub(r"\.(jpe?g|png|tiff?)$", "", p["title"][5:], flags=re.I)
            pp = dict(p, attribution_html=ATTRIBUTION.get(p["page"]))
            by = credit_name(pp) if pp.get("attribution_html") else "by " + credit_name(pp)
            lis.append(f'<li>{e(role)}: “<a href="{e(p["page"])}" target="_blank" rel="noopener">{e(title)}</a>” {by}, {license_link(p)}, via Wikimedia Commons</li>')
        extra = ""
        if self.s["map"]:
            extra += "<p>Map: © OpenStreetMap contributors, OpenMapTiles, OpenFreeMap; MapLibre GL JS.</p>"
        return (f'<section class="small-sec" aria-labelledby="cr-h"><h2 id="cr-h">Photo credits</h2>'
                f'<p>Real photos from Wikimedia Commons, resized and cropped for the web. Each one stays under its own license, linked below.</p>'
                f'<ul>{"".join(lis)}</ul><p>App screens: real screens from the Go To Travel app, from an example family trip (not this one).</p>{extra}</section>')

    def ld(self):
        hero = f"{SITE}/assets/trips/{self.slug}/og.jpg"
        if self.cfg["kind"] == "trip":
            items = []
            for i, (line, why) in enumerate(self.places, 1):
                name, where = split_place(line)
                items.append({"@type": "ListItem", "position": i, "item": {"@type": "TouristAttraction", "name": name, "address": where, "description": why}})
            data = {"@context": "https://schema.org", "@type": "TouristTrip", "name": self.post["title"], "url": self.url, "description": self.cfg["meta"],
                    "image": hero, "touristType": "Families with kids",
                    "itinerary": {"@type": "ItemList", "numberOfItems": len(items), "itemListElement": items}}
        else:
            data = {"@context": "https://schema.org", "@type": "Article", "headline": self.post["title"], "description": self.cfg["meta"],
                    "image": [hero], "datePublished": self.post["checked_on"], "dateModified": self.post["checked_on"], "inLanguage": "en",
                    "author": {"@type": "Organization", "name": "Go To Travel", "url": SITE},
                    "publisher": {"@type": "Organization", "name": "Go To Travel", "url": SITE, "logo": {"@type": "ImageObject", "url": SITE + "/apple-touch-icon.png"}},
                    "mainEntityOfPage": self.url}
        return json_ld(data)

    def render(self):
        self.map_json = None
        sections, app = [], None
        for n, sl in enumerate(self.post["slides"], 1):
            t = sl["type"]
            if t == "cover":
                continue
            if t == "app":
                app = sl
                continue
            sections.append(getattr(self, t)(n, sl))
        if self.cfg.get("places_heading"):
            sections.append(self.places_section())
        copy_box, copy_text = self.copy_box()
        body = (f'<main class="post-main">{self.hero()}<div class="wrap2">{self.intro()}'
                f'<div class="plan">{"".join(sections)}{copy_box}{self.app_box(app)}{self.sources_section()}{self.credits_section()}'
                f'<p class="end-links"><a href="/trips">All plans you can copy</a> · <a href="/lists">All our lists</a></p></div></div></main>'
                + copy_text + (f'\n<script type="application/json" id="trip-data">{self.map_json}</script>' if self.map_json else ""))
        head = ""
        if self.map_json:
            head = f'<link rel="stylesheet" href="{MAPLIBRE}.css">\n<script src="{MAPLIBRE}.js" defer></script>\n<script src="/assets/trips.js" defer></script>\n'
        head += self.ld() + "\n"
        return page(self.post["title"], self.cfg["meta"], self.url, body, CSS, image=f"{SITE}/assets/trips/{self.slug}/og.jpg", head_extra=head)


# ---------------------------------------------------------------- hub
def old_trips():
    out = []
    for p in sorted((ROOT / "tools/trips").glob("*.json")):
        t = json.loads(p.read_text(encoding="utf-8"))
        n = sum(1 for d in t.get("days", []) for s in d.get("stops", []) if s.get("kind") != "move")
        out.append((t["slug"], t["title"], f"{n} stops · {t.get('dates', '')}"))
    return out


def hub(snaps, manifest):
    snaps = sorted(snaps, key=lambda s: s["post_at"], reverse=True)
    cards, credits = [], []
    for i, s in enumerate(snaps):
        cfg, post = WEB[s["slug"]], s["post"]
        cover = next(sl for sl in post["slides"] if sl["type"] == "cover")
        m = manifest[f"assets/trips/{s['slug']}/card.jpg"]
        lazy = "" if i < 2 else ' loading="lazy"'
        cards.append(f'<li class="card" data-post="{e(s["post_at"])}"><a href="/trips/{e(s["slug"])}">'
                     f'<img src="/assets/trips/{e(s["slug"])}/card.jpg" width="{m["w"]}" height="{m["h"]}" alt="{e(post["photo_alt"].get(cover["photo"], ""))}"{lazy} decoding="async">'
                     f'<div class="c-in"><p class="kick">{e(post.get("series", ""))}</p><h2>{e(cover["big"])}</h2>'
                     f'<p class="who">{e(cover.get("sub", ""))}</p><p>{e(cfg["card"])}</p></div></a></li>')
        p = s["photos"][cover["photo"]]
        pp = dict(p, attribution_html=ATTRIBUTION.get(p["page"]))
        by = credit_name(pp) if pp.get("attribution_html") else "photo by " + credit_name(pp)
        credits.append(f'<li>{e(cover["big"])}: {by}, {license_link(p)}, via <a href="{e(p["page"])}" target="_blank" rel="noopener">Wikimedia Commons</a></li>')
    olds = "".join(f'<li><a href="/trips/{e(slug)}"><b>{e(title)}</b><span>{e(line)}</span></a></li>' for slug, title, line in old_trips())
    # Newest post first. On the visitor's clock, a post that isn't out yet moves below the ones that are (soonest first),
    # so the bio link always opens on the post people just saw.
    reorder = ("<script>(function(){var l=document.querySelector('[data-cards]');if(!l)return;var n=Date.now(),t=function(x){return Date.parse(x.getAttribute('data-post'))},"
               "c=[].slice.call(l.children),a=c.filter(function(x){return t(x)<=n}).sort(function(x,y){return t(y)-t(x)}),"
               "b=c.filter(function(x){return t(x)>n}).sort(function(x,y){return t(x)-t(y)});a.concat(b).forEach(function(x){l.appendChild(x)})})();</script>")
    items = [{"@type": "ListItem", "position": i + 1, "url": f"{SITE}/trips/{s['slug']}", "name": s["post"]["title"]} for i, s in enumerate(snaps)]
    items += [{"@type": "ListItem", "position": len(items) + j + 1, "url": f"{SITE}/trips/{slug}", "name": title} for j, (slug, title, _) in enumerate(old_trips())]
    ld = json_ld({"@context": "https://schema.org", "@type": "CollectionPage", "name": "Plans you can copy", "url": f"{SITE}/trips",
                  "mainEntity": {"@type": "ItemList", "numberOfItems": len(items), "itemListElement": items}})
    body = f"""<main class="hub-main">
<section class="hub-head" aria-labelledby="hub-h">
<p class="kick">From @gototravelapp</p>
<h1 id="hub-h">Plans you can copy</h1>
<p class="lede">The full plans from our posts: every date, hour and kid note, checked at the source. Save one for the holidays.</p>
<div class="join-box"><p class="join-line">Pip fits these plans to your family in the app. It opens in December: join the waitlist.</p>
{form("trip-index")}</div>
</section>
<ol class="cards" data-cards aria-label="Plans, newest first">
{chr(10).join(cards)}
</ol>
{reorder}
<section class="more" aria-labelledby="more-h"><h2 id="more-h">More plans</h2><ul class="list-grid">{olds}</ul></section>
<section class="small-sec" aria-labelledby="cr-h"><h2 id="cr-h">Photo credits</h2><ul>{"".join(credits)}</ul>
<p>Each photo is resized and cropped for the web and stays under its own license. <a href="/lists">All our lists</a></p></section>
</main>"""
    first = snaps[-1]   # the first post's cover (Nov 10) is the hub's share image
    return page("Plans you can copy", "The full plans from @gototravelapp's posts: holiday trips and tips for families, with every date, hour and kid note checked at the source.",
                f"{SITE}/trips", body, HUB_CSS, image=f"{SITE}/assets/trips/{first['slug']}/og.jpg", head_extra=ld + "\n", og_type="website")


def write_sitemap(slugs):
    sm = ROOT / "sitemap.xml"
    xml = sm.read_text(encoding="utf-8")
    start, end = "  <!-- trips -->\n", "  <!-- /trips -->\n"
    if start in xml:
        xml = xml[: xml.index(start)] + xml[xml.index(end) + len(end):]
    urls = "".join(f"  <url><loc>{SITE}/trips/{s}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>\n" for s in sorted(slugs))
    block = start + f"  <url><loc>{SITE}/trips</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n" + urls + end
    sm.write_text(xml.replace("</urlset>", block + "</urlset>"), encoding="utf-8")


def main():
    live = (TYC / "_tools/data").is_dir()
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8")) if MANIFEST_PATH.exists() else {}
    snaps, made = [], 0
    for slug in SLUGS:
        cfg = WEB[slug]
        snap_path = POSTS_DIR / f"{slug}.json"
        if live:
            snap = snapshot(slug, cfg)
            snap_path.write_text(json.dumps(snap, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
            made += refresh_images(image_jobs(snap, cfg), manifest)
        else:
            snap = json.loads(snap_path.read_text(encoding="utf-8"))
        snaps.append(snap)
    if live:
        wanted = {rel for s in snaps for rel, _, _ in image_jobs(s, WEB[s["slug"]])}
        manifest = {k: manifest[k] for k in sorted(manifest) if k in wanted}
        MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    out = ROOT / "trips"
    for s in snaps:
        (out / f"{s['slug']}.html").write_text(Post(s, WEB[s["slug"]], manifest).render(), encoding="utf-8")
    (out / "index.html").write_text(hub(snaps, manifest), encoding="utf-8")
    write_sitemap([s["slug"] for s in snaps] + [slug for slug, _, _ in old_trips()])
    print(f"{'social folders' if live else 'snapshots'}: wrote {len(snaps)} post pages + the hub; images made: {made}")


if __name__ == "__main__":
    main()
