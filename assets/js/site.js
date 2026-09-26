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
});
