/* Efficient Technologies — interactions.
   Preloader, custom cursor, Lenis smooth scroll, GSAP reveals + line-masks,
   pinned process track, count-up stats, self-typing terminal, magnetic buttons.
   Every effect degrades under prefers-reduced-motion or missing libraries. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer:fine)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- line-mask reveal wrapping ---- */
  function wrapRise(el) {
    var span = document.createElement('span');
    span.className = 'rise-i';
    while (el.firstChild) span.appendChild(el.firstChild);
    el.appendChild(span);
    return span;
  }
  var heroRise = $$('.hero .rise').map(wrapRise);
  var titleRise = $$('[data-rise]').map(function (el) { return { el: el, inner: wrapRise(el) }; });

  /* ---- preloader ---- */
  function revealHero() {
    if (!window.gsap || reduce) { heroRise.forEach(function (s) { s.style.opacity = 1; s.style.transform = 'none'; }); return; }
    gsap.from(heroRise, { y: 34, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12 });
    setTimeout(function () {
      try { gsap.killTweensOf(heroRise); } catch (e) {}
      heroRise.forEach(function (s) { s.style.opacity = 1; s.style.transform = 'none'; });
    }, 2400);
  }
  (function preloader() {
    var pre = $('#preloader'), n = $('#pre-count-n');
    if (!pre) { revealHero(); return; }
    var finished = false;
    function done() {
      if (finished) return;
      finished = true;
      pre.classList.add('done');
      setTimeout(function () { pre.style.display = 'none'; }, 950);
      revealHero();
    }
    if (reduce) { if (n) n.textContent = '100'; setTimeout(done, 250); return; }
    var dur = 1100, t0 = performance.now();
    (function tick(t) {
      var p = Math.min((t - t0) / dur, 1);
      if (n) n.textContent = Math.round(p * 100);
      if (p < 1) requestAnimationFrame(tick); else setTimeout(done, 180);
    })(t0);
    setTimeout(done, 2600);
  })();

  /* ---- custom cursor ---- */
  if (fine && !reduce) {
    var dot = $('#cursor'), ring = $('#cursor-ring');
    if (dot && ring) {
      document.body.classList.add('has-cursor');
      var mx = 0, my = 0, rx = 0, ry = 0;
      window.addEventListener('pointermove', function (e) {
        mx = e.clientX; my = e.clientY;
        dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
      }, { passive: true });
      (function ringLoop() {
        rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
        ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
        requestAnimationFrame(ringLoop);
      })();
      $$('a, button, [data-cursor]').forEach(function (el) {
        el.addEventListener('pointerenter', function () { ring.classList.add('hover'); });
        el.addEventListener('pointerleave', function () { ring.classList.remove('hover'); });
      });
    }
  }

  /* ---- Lenis smooth scroll ---- */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
  }

  /* ---- anchor links ---- */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { offset: -70 });
      else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* ---- nav state ---- */
  var nav = $('#nav');
  function onScroll() { if (nav) nav.classList.toggle('scrolled', window.scrollY > 20); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---- GSAP reveals + line masks + pinned process ---- */
  var hasGsap = window.gsap && window.ScrollTrigger;
  if (hasGsap && !reduce) {
    gsap.registerPlugin(ScrollTrigger);
    if (lenis) lenis.on('scroll', ScrollTrigger.update);
    window.addEventListener('load', function () { setTimeout(function () { ScrollTrigger.refresh(); }, 300); });
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { ScrollTrigger.refresh(); }); }

    $$('[data-reveal]').forEach(function (el) {
      gsap.fromTo(el, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 86%' } });
    });
    $$('[data-reveal-group]').forEach(function (grp) {
      gsap.fromTo(grp.children,
        { y: 46, opacity: 0, rotationX: -16, z: -60, transformPerspective: 1000, transformOrigin: 'center top' },
        { y: 0, opacity: 1, rotationX: 0, z: 0, duration: 0.9, stagger: 0.09, ease: 'power3.out', scrollTrigger: { trigger: grp, start: 'top 82%' } });
    });
    titleRise.forEach(function (o) {
      gsap.fromTo(o.el, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: o.el, start: 'top 88%' } });
    });

    var track = $('#process-track');
    if (track && window.innerWidth >= 820) {
      var panels = $$('.step', track);
      if (panels.length > 1) {
        gsap.to(track, {
          xPercent: -100 * (panels.length - 1), ease: 'none',
          scrollTrigger: { trigger: '#how', start: 'top top', end: function () { return '+=' + (track.scrollWidth - window.innerWidth + window.innerWidth * 0.4); }, scrub: 1, pin: true, anticipatePin: 1, invalidateOnRefresh: true }
        });
      }
    }
  } else {
    $$('[data-reveal]').forEach(function (el) { el.style.opacity = 1; });
    $$('[data-reveal-group]').forEach(function (grp) { Array.prototype.slice.call(grp.children).forEach(function (c) { c.style.opacity = 1; }); });
    titleRise.forEach(function (o) { o.el.style.opacity = 1; });
  }

  /* ---- count-up ---- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count') || '0');
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduce) { el.textContent = target + suffix; return; }
    var dur = 1200, t0 = performance.now();
    (function tick(t) {
      var p = Math.min((t - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * e) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { countUp(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach(function (el) { io.observe(el); });
  } else {
    $$('[data-count]').forEach(countUp);
  }

  /* ---- self-typing terminal ---- */
  var term = $('#term-lines');
  if (term) {
    var LINES = [
      { t: '$ et audit --site brightsmile-dental.com', c: 'cmd', d: 420 },
      { t: 'scanning… 7 automation gaps found', c: 'dim', d: 320 },
      { t: '✓ online booking', c: 'ok', d: 150 },
      { t: '✓ follow-up sequences', c: 'ok', d: 150 },
      { t: '✓ review engine', c: 'ok', d: 260 },
      { t: '$ et deploy --approve', c: 'cmd', d: 420 },
      { t: '● live in 68h', c: 'live', d: 0 }
    ];
    function render(list) { term.innerHTML = list.map(function (l) { return '<div class="tl ' + l.c + '">' + l.t + '</div>'; }).join(''); }
    if (reduce || !('requestAnimationFrame' in window)) {
      render(LINES);
    } else {
      var li = 0;
      function typeLine() {
        if (li >= LINES.length) return;
        var l = LINES[li];
        var div = document.createElement('div');
        div.className = 'tl ' + l.c;
        term.appendChild(div);
        var ci = 0;
        (function type() {
          div.textContent = l.t.slice(0, ci);
          ci++;
          if (ci <= l.t.length) setTimeout(type, 14);
          else { li++; setTimeout(typeLine, l.d || 200); }
        })();
      }
      setTimeout(typeLine, 1500);
    }
  }

  /* ---- 3D tilt tiles (fine pointer only) ---- */
  if (!reduce && fine) {
    $$('.card, .step, .book-panel').forEach(function (tile) {
      var raf = null;
      tile.addEventListener('pointermove', function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = null;
          var r = tile.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          tile.style.transform = 'perspective(1000px) rotateX(' + (-py * 8).toFixed(2) + 'deg) rotateY(' + (px * 10).toFixed(2) + 'deg) translateZ(8px)';
        });
      });
      tile.addEventListener('pointerleave', function () {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        tile.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0)';
        tile.style.transition = 'transform .5s cubic-bezier(0.22,1,0.36,1), border-color .2s, box-shadow .2s';
        setTimeout(function () { tile.style.transition = ''; }, 520);
      });
    });
  }

  /* ---- magnetic buttons (fine pointer only) ---- */
  if (!reduce && fine) {
    $$('.magnetic').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2;
        var y = e.clientY - r.top - r.height / 2;
        btn.style.transform = 'translate(' + (x * 0.2) + 'px,' + (y * 0.3) + 'px)';
      });
      btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
    });
  }
})();
