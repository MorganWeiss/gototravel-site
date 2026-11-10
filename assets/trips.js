/* Trip pages: the route on a map (MapLibre + OpenFreeMap tiles, no key), one numbered pin per stop in plan order and a
   square pin per place to stay. A pin scrolls to its stop. Without the map library (blocked, offline) the box stays
   empty and the stop list below still carries the whole trip. Pages built by build_posts.py may add data.line (the
   road itself, drawn instead of the stop-to-stop line) and data.pad (map padding, to keep pins clear of the
   attribution bar on phones). */
(function () {
  "use strict";
  var box = document.getElementById("trip-map");
  var raw = document.getElementById("trip-data");
  if (!box || !raw || !window.maplibregl) { if (box) box.hidden = true; return; }
  var data;
  try { data = JSON.parse(raw.textContent); } catch (e) { box.hidden = true; return; }
  var pins = data.pins || [], stays = data.stays || [];
  var all = pins.concat(stays);
  if (!all.length) { box.hidden = true; return; }

  var map = new maplibregl.Map({
    container: box,
    style: "https://tiles.openfreemap.org/styles/positron",
    attributionControl: { compact: true },
    cooperativeGestures: true
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

  var bounds = new maplibregl.LngLatBounds();
  all.forEach(function (p) { bounds.extend([p.lng, p.lat]); });

  function marker(className, label, title, onClick, at) {
    var el = document.createElement("button");
    el.type = "button";
    el.className = className;
    el.textContent = label;
    el.setAttribute("aria-label", title);
    el.title = title;
    if (onClick) el.addEventListener("click", onClick);
    new maplibregl.Marker({ element: el }).setLngLat(at).addTo(map);
  }

  stays.forEach(function (s) {
    marker("mk stay", "H", "Stay: " + s.name, null, [s.lng, s.lat]);
  });
  pins.forEach(function (p) {
    marker("mk", String(p.n), p.n + ". " + p.name, function () {
      var target = document.getElementById(p.id);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [p.lng, p.lat]);
  });

  // The route: a real road line when the page gives one (data.line, [lng, lat] pairs), else stop to stop in order.
  var line = data.line && data.line.length > 1 ? data.line : pins.map(function (p) { return [p.lng, p.lat]; });
  map.on("load", function () {
    if (line.length > 1) {
      map.addSource("route", {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "LineString", coordinates: line } }
      });
      map.addLayer({ id: "route", type: "line", source: "route", paint: { "line-color": "#0F1A17", "line-width": 2, "line-dasharray": [2, 2], "line-opacity": 0.6 } });
    }
  });
  map.fitBounds(bounds, { padding: data.pad || 48, maxZoom: 13, duration: 0 });

  // "Show day N on the map": zoom to that day's stops (a multi-city trip shows each city's pins on top of each other
  // at country zoom), and bring the map into view.
  document.querySelectorAll("button.day-map").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var day = btn.getAttribute("data-day");
      var mine = pins.filter(function (p) { return String(p.day) === day; });
      if (!mine.length) return;
      var b = new maplibregl.LngLatBounds();
      mine.forEach(function (p) { b.extend([p.lng, p.lat]); });
      box.scrollIntoView({ behavior: "smooth", block: "center" });
      map.fitBounds(b, { padding: 56, maxZoom: 15, duration: 800 });
    });
  });
})();
