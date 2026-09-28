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
});
