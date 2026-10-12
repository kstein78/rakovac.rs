// Search page: loads the Pagefind bundle (built on the server after Hugo) and lists the results for ?q=…
// The language of the index follows <html lang>, so a Russian page searches the Russian pages only.
document.addEventListener('DOMContentLoaded', function () {
  var box = document.querySelector('[data-search]'), input = document.querySelector('[data-search-input]');
  if (!box || !input) return;
  var L = {}; try { L = JSON.parse(box.getAttribute('data-l')); } catch (e) {}
  var status = box.querySelector('.search-status'), list = box.querySelector('.search-list');
  var pf = null, seq = 0;
  function load() {
    if (!pf) pf = import(box.getAttribute('data-bundle')).then(function (m) { m.init && m.init(); return m; });
    return pf;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function run(q) {
    var my = ++seq;
    q = q.trim();
    if (history.replaceState) history.replaceState(null, '', q ? '?q=' + encodeURIComponent(q) : location.pathname);
    if (!q) { status.textContent = ''; list.innerHTML = ''; return; }
    load().then(function (m) { return m.debouncedSearch(q, {}, 250); }).then(function (r) {
      if (my !== seq || !r) return null;
      return Promise.all(r.results.slice(0, 30).map(function (x) { return x.data(); })).then(function (d) { return { total: r.results.length, items: d }; });
    }).then(function (res) {
      if (!res || my !== seq) return;
      status.textContent = res.total ? L.found + ': ' + res.total : L.none + ' «' + q + '»';
      // excerpt comes from Pagefind with <mark> around the matches; everything else is escaped
      list.innerHTML = res.items.map(function (d) {
        var img = d.meta && d.meta.image ? '<img src="' + esc(d.meta.image) + '" alt="" loading="lazy">' : '';
        return '<li class="search-item"><a href="' + esc(d.url) + '">' + img + '<span class="search-t">' + esc((d.meta && d.meta.title) || d.url) +
          '</span></a><p class="search-x">' + String(d.excerpt || '').replace(/<(?!\/?mark>)[^>]*>/g, '') + '</p></li>';
      }).join('');
    }).catch(function () { status.textContent = L.none + ' «' + q + '»'; });
  }
  var q0 = new URLSearchParams(location.search).get('q') || '';
  input.value = q0;
  if (q0) run(q0); else input.focus();
  input.addEventListener('input', function () { run(input.value); });
  input.closest('form').addEventListener('submit', function (e) { e.preventDefault(); run(input.value); });
});
