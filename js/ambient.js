/* Ambient layer — the fixed background video ("world") + the pinned #core
   narrative. No WebGL. Poster-first: on mobile / data-saver / slow links the
   heavy loop + chapter clips never load (preload="none" + no autoplay) — the
   poster frame stands in. Also pauses when the tab is hidden or under
   prefers-reduced-motion. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || navigator.webkitConnection || navigator.mozConnection || {};
  var lowPower = window.matchMedia('(max-width: 768px)').matches
    || conn.saveData === true
    || /(^|\s)(slow-2g|2g)$/.test(conn.effectiveType || '');
  var video = document.getElementById('world-video');

  if (video) {
    if (reduce || lowPower) { try { video.pause(); } catch (e) {} } // poster stays; nothing downloads
    else {
      video.addEventListener('canplay', function () { document.body.classList.add('video-on'); });
      var p = video.play(); if (p && p.catch) p.catch(function () {});
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) { try { video.pause(); } catch (e) {} }
        else { var q = video.play(); if (q && q.catch) q.catch(function () {}); }
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

  /* ---- cinematic chapter transitions (desktop, full-power only) ----
     Crossing a section boundary PLAYS a short camera move (natural speed),
     then holds its final frame as that chapter's backdrop. Upward crossings
     play the pre-reversed copy. Chapter 0 = the living hero loop. */
  var chLayer = document.getElementById('chapter-layer');
  var FWD = [null, 'ch-t1', 'ch-t2', 'ch-t3'].map(function (id) { return id ? document.getElementById(id) : null; });
  var REV = [null, 'ch-t1r', 'ch-t2r', 'ch-t3r'].map(function (id) { return id ? document.getElementById(id) : null; });
  var chState = 0, chPlaying = null;
  if (!lowPower) { [].concat(FWD, REV).forEach(function (v) { if (v) { try { v.load(); } catch (e) {} } }); }

  function showOnly(el) {
    [].concat(FWD, REV).forEach(function (v) { if (v) v.classList.remove('active'); });
    if (el) el.classList.add('active');
  }
  function playClip(el, holdEnd, after) {
    if (!el) { if (after) after(); return; }
    if (chPlaying && chPlaying !== el) { try { chPlaying.pause(); } catch (e) {} }
    chPlaying = el;
    showOnly(el);
    try { el.currentTime = 0; } catch (e) {}
    var done = function () {
      el.removeEventListener('ended', done);
      try { el.pause(); } catch (e) {}
      if (!holdEnd) document.body.classList.remove('chapter-on');
      chPlaying = null;
      if (after) after();
    };
    el.addEventListener('ended', done);
    document.body.classList.add('chapter-on');
    var p = el.play(); if (p && p.catch) p.catch(function () { done(); });
  }
  function goChapter(target) {
    if (!chLayer || target === chState) return;
    if (reduce || lowPower) { chState = target; return; }
    if (target > chState) {
      playClip(FWD[target], true);
    } else {
      // reverse: play the reversed clip of the boundary we're crossing back over
      playClip(REV[chState], target > 0, null);
    }
    chState = target;
  }

  function initST() {
    if (!(window.gsap && window.ScrollTrigger)) { setTimeout(initST, 120); return; }
    gsap.registerPlugin(ScrollTrigger);
    if (chLayer && !lowPower) {
      [{ sel: '#gaps', n: 1 }, { sel: '#how', n: 2 }, { sel: '#book', n: 3 }].forEach(function (c) {
        ScrollTrigger.create({
          trigger: c.sel, start: 'top 60%', end: 'bottom 60%',
          onEnter: function () { goChapter(c.n); },
          onLeaveBack: function () { goChapter(c.n - 1); }
        });
      });
    }
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
