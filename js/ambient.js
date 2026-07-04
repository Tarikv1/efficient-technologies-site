/* Ambient layer — the fixed background video (the "world") + the pinned
   #core narrative. No WebGL. Pauses video when the tab is hidden or under
   prefers-reduced-motion (poster frame stands in). */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var video = document.getElementById('world-video');

  if (video) {
    if (reduce) { try { video.pause(); } catch (e) {} }
    else {
      video.addEventListener('canplay', function () { document.body.classList.add('video-on'); });
      var p = video.play(); if (p && p.catch) p.catch(function () {});
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) { try { video.pause(); } catch (e) {} }
        else if (!reduce) { var q = video.play(); if (q && q.catch) q.catch(function () {}); }
      });
    }
  }

  /* ---- #core pinned narrative ---- */
  var section = document.getElementById('core');
  if (!section) return;
  var lines = Array.prototype.slice.call(section.querySelectorAll('.core-line'));
  var pct = document.getElementById('core-pct');
  var bands = [[0.04, 0.20, 0.40, 0.46], [0.46, 0.60, 0.74, 0.80], [0.80, 0.90, 1.01, 1.06]];
  function setLines(p) {
    lines.forEach(function (el, i) {
      var b = bands[i]; if (!b) return;
      var o = 0, y = 24;
      if (p >= b[0] && p < b[1]) { var q = (p - b[0]) / (b[1] - b[0]); o = q; y = 24 * (1 - q); }
      else if (p >= b[1] && p < b[2]) { o = 1; y = 0; }
      else if (p >= b[2] && p < b[3]) { var q2 = (p - b[2]) / (b[3] - b[2]); o = 1 - q2; y = -16 * q2; }
      el.style.opacity = o;
      el.style.transform = 'translateY(' + y.toFixed(1) + 'px)';
    });
  }

  if (reduce) {
    lines.forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; el.style.position = 'relative'; });
    return;
  }

  function initST() {
    if (!(window.gsap && window.ScrollTrigger)) { setTimeout(initST, 120); return; }
    gsap.registerPlugin(ScrollTrigger);
    setLines(0);
    ScrollTrigger.create({
      trigger: section, start: 'top top', end: '+=1600', scrub: true, pin: true, anticipatePin: 1,
      onUpdate: function (self) {
        setLines(self.progress);
        if (pct) { var n = Math.round(self.progress * 100); pct.textContent = n >= 100 ? '100' : (n < 10 ? '0' + n : '' + n); }
      }
    });
  }
  initST();
})();
