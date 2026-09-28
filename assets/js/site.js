// Menu toggle + click-to-load YouTube (privacy: nothing loads from YouTube until the visitor presses play).
document.addEventListener('DOMContentLoaded', function () {
  var t = document.querySelector('.menu-toggle'), nav = document.getElementById('site-nav');
  if (t && nav) t.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    t.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.querySelectorAll('.video[data-yt] .video-consent').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var fig = btn.closest('.video'), id = fig.getAttribute('data-yt');
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0';
      f.title = btn.querySelector('.video-title') ? btn.querySelector('.video-title').textContent : 'Video';
      f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      f.allowFullscreen = true;
      fig.replaceChildren(f);
    });
  });
  // Old maps: load the full scan on request, centre it on the marked point, drag to pan with a mouse.
  document.querySelectorAll('.oldmap-load').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var fig = btn.closest('.oldmap'), view = fig.querySelector('.oldmap-view');
      var img = new Image();
      img.alt = btn.getAttribute('data-alt') || '';
      btn.disabled = true; view.classList.add('loading');
      img.onload = function () {
        view.replaceChildren(img); view.classList.remove('loading'); view.classList.add('loaded');
        view.scrollLeft = (+fig.getAttribute('data-x') || 0) - view.clientWidth / 2;
        view.scrollTop = (+fig.getAttribute('data-y') || 0) - view.clientHeight / 2;
        var drag = null;
        view.addEventListener('pointerdown', function (e) {
          if (e.pointerType !== 'mouse') return;
          drag = { x: e.clientX, y: e.clientY, l: view.scrollLeft, t: view.scrollTop };
          view.classList.add('dragging'); e.preventDefault();
        });
        window.addEventListener('pointermove', function (e) {
          if (!drag) return;
          view.scrollLeft = drag.l - (e.clientX - drag.x); view.scrollTop = drag.t - (e.clientY - drag.y);
        });
        window.addEventListener('pointerup', function () { drag = null; view.classList.remove('dragging'); });
      };
      img.onerror = function () { btn.disabled = false; view.classList.remove('loading'); };
      img.src = btn.getAttribute('data-src');
    });
  });
  // Gradina plan: period buttons show that period solid, older ones faint, labels only for the active one.
  document.querySelectorAll('[data-gd-plan]').forEach(function (fig) {
    var btns = fig.querySelectorAll('.gd-phases button'), layers = fig.querySelectorAll('.gd-layer'), cards = fig.querySelectorAll('.gd-card');
    function show(i) {
      layers.forEach(function (g) {
        var f = +g.getAttribute('data-from'), t = +g.getAttribute('data-to');
        g.style.opacity = (i >= f && i <= t) ? 1 : (g.classList.contains('gd-lbl') || t > i ? 0 : .18);
      });
      btns.forEach(function (b, j) { b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
      cards.forEach(function (c, j) { c.hidden = j !== i; });
    }
    btns.forEach(function (b, j) { b.addEventListener('click', function () { show(j); }); });
  });
  // Photo gallery: filters, viewer with arrows / swipe / keys, 5-second slideshow, full screen.
  document.querySelectorAll('[data-gallery]').forEach(function (root) {
    var viewer = document.querySelector('[data-gal-viewer]');
    if (!viewer) return;
    var items = [].slice.call(root.querySelectorAll('.gal-item'));
    var img = viewer.querySelector('.gal-img'), cap = viewer.querySelector('.gal-alt'),
        credit = viewer.querySelector('.gal-credit'), num = viewer.querySelector('.gal-num'),
        playBtn = viewer.querySelector('[data-act="play"]'), fsBtn = viewer.querySelector('[data-act="fs"]');
    var list = [], cur = 0, timer = null, idle = null, opener = null, want = { theme: '', season: '' };
    var canFs = !!(document.fullscreenEnabled && viewer.requestFullscreen);
    if (!canFs) fsBtn.hidden = true;
    function visible() { return items.filter(function (i) { return !i.hidden; }); }
    function show(k) {
      list = visible(); if (!list.length) return;
      cur = (k + list.length) % list.length;
      var a = list[cur].querySelector('a'), im = a.querySelector('img'), src = a.getAttribute('href');
      img.classList.add('is-fading');
      var pre = new Image();
      pre.onload = pre.onerror = function () {
        setTimeout(function () { img.src = src; img.alt = im.alt; img.classList.remove('is-fading'); }, img.getAttribute('src') ? 180 : 0);
      };
      pre.src = src;
      cap.textContent = im.alt; credit.textContent = a.getAttribute('data-credit') || '';
      num.textContent = (cur + 1) + ' / ' + list.length;
      var nx = list[(cur + 1) % list.length]; if (nx) { var n = new Image(); n.src = nx.querySelector('a').getAttribute('href'); }
    }
    function setPlay(on) {
      clearInterval(timer); timer = null;
      if (on) timer = setInterval(function () { show(cur + 1); }, 5000);
      viewer.classList.toggle('is-playing', on);
      playBtn.setAttribute('aria-label', playBtn.getAttribute(on ? 'data-l-pause' : 'data-l-play'));
      wake();
    }
    function wake() {
      viewer.classList.remove('gal-idle'); clearTimeout(idle);
      if (timer) idle = setTimeout(function () { viewer.classList.add('gal-idle'); }, 2500);
    }
    function open(k, play) {
      opener = document.activeElement;
      viewer.hidden = false; document.documentElement.classList.add('gal-open');
      show(k); setPlay(!!play);
      viewer.querySelector('[data-act="close"]').focus({ preventScroll: true });
    }
    function close() {
      setPlay(false);
      if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
      viewer.hidden = true; document.documentElement.classList.remove('gal-open');
      if (opener && opener.focus) opener.focus({ preventScroll: true });
    }
    function toggleFs() {
      if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
      else if (canFs) viewer.requestFullscreen().catch(function () {});
    }
    root.addEventListener('click', function (e) {
      var a = e.target.closest('.gal-item a'); if (!a) return;
      e.preventDefault(); open(visible().indexOf(a.parentNode));
    });
    var start = root.querySelector('[data-gal-start]');
    start.hidden = false;
    start.addEventListener('click', function () { open(0, true); if (canFs) viewer.requestFullscreen().catch(function () {}); });
    var filters = root.querySelector('[data-gal-filters]');
    filters.hidden = false;
    filters.addEventListener('click', function (e) {
      var b = e.target.closest('[data-val]'); if (!b) return;
      var g = b.parentNode;
      g.querySelectorAll('[data-val]').forEach(function (x) { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      want[g.getAttribute('data-group')] = b.getAttribute('data-val');
      items.forEach(function (i) {
        i.hidden = !((!want.theme || i.getAttribute('data-theme') === want.theme) && (!want.season || i.getAttribute('data-season') === want.season));
      });
    });
    viewer.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) { wake(); return; }
      var act = b.getAttribute('data-act');
      if (act === 'prev') { show(cur - 1); setPlay(!!timer); }
      else if (act === 'next') { show(cur + 1); setPlay(!!timer); }
      else if (act === 'play') setPlay(!timer);
      else if (act === 'fs') toggleFs();
      else if (act === 'close') close();
    });
    viewer.addEventListener('mousemove', wake);
    document.addEventListener('keydown', function (e) {
      if (viewer.hidden) return;
      if (e.key === 'ArrowRight') { show(cur + 1); setPlay(!!timer); }
      else if (e.key === 'ArrowLeft') { show(cur - 1); setPlay(!!timer); }
      else if (e.key === ' ' || e.key === 'k') { e.preventDefault(); setPlay(!timer); }
      else if (e.key === 'f') toggleFs();
      else if (e.key === 'Escape') { if (!document.fullscreenElement) close(); }
      else return;
    });
    var x0 = null;
    viewer.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') x0 = e.clientX; });
    viewer.addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) { show(cur + (dx < 0 ? 1 : -1)); setPlay(!!timer); }
    });
  });
});
