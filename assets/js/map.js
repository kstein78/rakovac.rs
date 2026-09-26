// Leaflet maps: .minimap (one place) and .bigmap (all places, coloured by category).
document.addEventListener('DOMContentLoaded', function () {
  if (!window.L) return;
  var tiles = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  var attr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }
  document.querySelectorAll('.minimap, .bigmap').forEach(function (el) {
    var cfg; try { cfg = JSON.parse(el.getAttribute('data-map')); } catch (e) { return; }
    var pts = cfg.points || [], cats = cfg.cats || {};
    var map = L.map(el, { scrollWheelZoom: false });
    L.tileLayer(tiles, { maxZoom: 19, attribution: attr }).addTo(map);
    var group = [];
    pts.forEach(function (p) {
      var c = (cats[p.cat] && cats[p.cat].color) || '#7a2d55';
      var m = L.circleMarker([p.lat, p.lng], { radius: 8, color: '#fff', weight: 2, fillColor: c, fillOpacity: 1 }).addTo(map);
      var html = p.url ? '<a href="' + esc(p.url) + '">' + esc(p.title) + '</a>' : esc(p.title);
      if (cats[p.cat]) html += '<br><small>' + esc(cats[p.cat].label) + '</small>';
      m.bindPopup(html);
      group.push([p.lat, p.lng]);
    });
    if (group.length === 1) map.setView(group[0], cfg.zoom || 15);
    else if (group.length) map.fitBounds(group, { padding: [30, 30] });
    else map.setView([45.195, 19.77], 13);
    if (el.classList.contains('bigmap') && Object.keys(cats).length) {
      var used = {}; pts.forEach(function (p) { used[p.cat] = true; });
      var leg = document.createElement('div'); leg.className = 'map-legend';
      Object.keys(cats).forEach(function (k) {
        if (!used[k]) return;
        var s = document.createElement('span'); s.style.setProperty('--c', cats[k].color); s.textContent = cats[k].label; leg.appendChild(s);
      });
      el.insertAdjacentElement('afterend', leg);
    }
  });
});
