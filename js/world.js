/* The World — one persistent WebGPU scene behind the entire page.
   (Three.js r180 WebGPURenderer, WGSL via TSL, WebGL2 auto-fallback.)
   The orb is the protagonist; scroll drives its story:
     hero      calm, right of the headline
     gaps      disintegrates (scatter up, shards flee)
     automate  reassembles into an ordered system
     how       compact, orbiting fast (the machine at work)
     proof     calm, dimmed for reading
     pricing   dim, slow
     book      converges center, turns lime — the live signal
   Also owns the pinned #core narrative (lines resolve over the world).
   Degrades: no GL → CSS grid fallback; reduced-motion → single still frame. */
import * as THREE from 'three';
import {
  uniform, time, positionLocal, normalLocal, normalView, positionViewDirection,
  color, vec3, float, mix, smoothstep, max, dot, sin, hash, instanceIndex, pass,
  mx_noise_float
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';

(async function () {
  var canvas = document.getElementById('world-canvas');
  if (!canvas) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var badge = document.getElementById('gpu-badge');
  var isMobile = window.innerWidth < 720;

  var renderer;
  try {
    renderer = new THREE.WebGPURenderer({ canvas: canvas, antialias: true });
    await renderer.init();
  } catch (e) {
    canvas.style.display = 'none';
    return; // hero CSS grid remains as fallback
  }
  document.body.classList.add('gl-on');
  var isGPU = !!(renderer.backend && renderer.backend.isWebGPUBackend);
  if (badge) { badge.hidden = false; badge.textContent = isGPU ? 'webgpu · on' : 'webgl2'; if (!isGPU) badge.style.color = '#8FA3C2'; }

  renderer.setClearColor(0x05070D, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 4.4;

  /* ---- story state (lerped every frame toward scroll-driven targets) ---- */
  var cur = { scatter: 0, lime: 0, dim: 0, x: 2.05, y: 0, scale: 0.95, speed: 1 };
  var tgt = { scatter: 0, lime: 0, dim: 0, x: 2.05, y: 0, scale: 0.95, speed: 1 };

  var uScatter = uniform(0);
  var uLime = uniform(0);
  var uDim = uniform(0);

  /* ---- the orb (TSL: noise displacement + fresnel + story uniforms) ---- */
  var world = new THREE.Group();
  scene.add(world);

  var n1 = mx_noise_float(normalLocal.mul(1.15).add(vec3(time.mul(0.22))));
  var n2 = mx_noise_float(normalLocal.mul(2.7).sub(vec3(time.mul(0.14)))).mul(0.5);
  var nBig = mx_noise_float(normalLocal.mul(0.6).add(vec3(time.mul(0.35))));
  var disp = n1.add(n2).mul(float(0.24).add(uScatter.mul(0.5))).add(nBig.mul(uScatter).mul(0.9));

  var fres = float(1.0).sub(max(dot(normalView, positionViewDirection), 0.0)).pow(2.3);
  var base = mix(color(0x081226), color(0x3D7BFF), smoothstep(float(-0.22), float(0.24), disp));
  var col = mix(base, color(0xB8F24A), smoothstep(float(0.12), float(0.28), disp).mul(0.55));
  col = col.add(color(0x3D7BFF).mul(fres.mul(1.5))).add(color(0xB8F24A).mul(fres.pow(3.0).mul(0.6)));
  col = mix(col, color(0xB8F24A).mul(float(0.9)).add(color(0x3D7BFF).mul(fres.mul(0.8))), uLime.mul(smoothstep(float(-0.3), float(0.3), disp)));
  col = col.mul(float(1.0).sub(uDim.mul(0.72)));

  var coreMat = new THREE.MeshBasicNodeMaterial();
  coreMat.positionNode = positionLocal.add(normalLocal.mul(disp));
  coreMat.colorNode = col;
  var orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, isMobile ? 14 : 26), coreMat);
  world.add(orb);

  /* ---- shard ring (radius breathes with scatter) ---- */
  var SHARDS = isMobile ? 14 : 26;
  var shardMat = new THREE.MeshBasicNodeMaterial();
  shardMat.colorNode = mix(color(0x16233B), mix(color(0x3D7BFF), color(0xB8F24A), uLime), fres.mul(1.6)).mul(float(1.0).sub(uDim.mul(0.6)));
  var shards = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.07, 0), shardMat, SHARDS);
  var shardSeed = [];
  for (var i = 0; i < SHARDS; i++) shardSeed.push({ a: Math.random() * Math.PI * 2, r: 2.1 + Math.random() * 0.8, y: (Math.random() - 0.5) * 1.1, s: 0.5 + Math.random() * 1.1, v: 0.1 + Math.random() * 0.22 });
  world.add(shards);

  /* ---- ambient field ---- */
  var N = isMobile ? 70 : 150;
  var pMat = new THREE.MeshBasicNodeMaterial();
  pMat.colorNode = mix(color(0x5B8CFF), color(0xB8F24A), uLime.mul(0.7)).mul(sin(hash(instanceIndex).mul(6.283).add(time.mul(1.2))).mul(0.3).add(0.7)).mul(float(1.0).sub(uDim.mul(0.5)));
  var dots = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.016, 0), pMat, N);
  var dummy = new THREE.Object3D();
  for (var j = 0; j < N; j++) {
    dummy.position.set((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8);
    dummy.scale.setScalar(0.6 + Math.random() * 1.6);
    dummy.updateMatrix();
    dots.setMatrixAt(j, dummy.matrix);
  }
  scene.add(dots);

  /* ---- bloom ---- */
  var post = null;
  try {
    post = new THREE.PostProcessing(renderer);
    var scenePass = pass(scene, camera);
    var c0 = scenePass.getTextureNode();
    post.outputNode = c0.add(bloom(c0, isMobile ? 0.55 : 0.8, 0.4, 0.72));
  } catch (e) { post = null; }

  var mx = 0, my = 0, tmx = 0, tmy = 0;
  window.addEventListener('pointermove', function (e) { tmx = (e.clientX / window.innerWidth - 0.5); tmy = (e.clientY / window.innerHeight - 0.5); }, { passive: true });

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function render() { if (post) post.render(); else renderer.render(scene, camera); }

  var t0 = 0;
  function tick(ts) {
    if (!t0) t0 = ts;
    var t = (ts - t0) / 1000;
    ['scatter', 'lime', 'dim', 'x', 'y', 'scale', 'speed'].forEach(function (k) { cur[k] += (tgt[k] - cur[k]) * 0.045; });
    uScatter.value = cur.scatter; uLime.value = cur.lime; uDim.value = cur.dim;

    var big = window.innerWidth > 900;
    world.position.x = big ? cur.x : 0;
    world.position.y = big ? cur.y : cur.y + 1.0;
    world.scale.setScalar((big ? 1 : 0.72) * cur.scale);

    mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
    world.rotation.y = t * 0.12 * cur.speed + mx * 0.5;
    world.rotation.x = my * 0.4;

    var flee = 1 + cur.scatter * 1.6;
    for (var i = 0; i < SHARDS; i++) {
      var s = shardSeed[i];
      var a = s.a + t * s.v * cur.speed;
      dummy.position.set(Math.cos(a) * s.r * flee, s.y + Math.sin(t * 0.6 + s.a) * 0.12, Math.sin(a) * s.r * flee);
      dummy.rotation.set(a, a * 1.4, 0);
      dummy.scale.setScalar(s.s);
      dummy.updateMatrix();
      shards.setMatrixAt(i, dummy.matrix);
    }
    shards.instanceMatrix.needsUpdate = true;

    camera.position.x = mx * 0.5; camera.position.y = -my * 0.3;
    camera.lookAt(world.position.x * 0.5, world.position.y * 0.4, 0);
    render();
  }

  /* ---- scroll story (per-chapter targets) ---- */
  var CHAPTERS = [
    { sel: '#hero',    v: { scatter: 0,   lime: 0,   dim: 0,    x: 2.05,  y: 0,    scale: 0.95, speed: 1 } },
    { sel: '#core',    v: { scatter: 0.25, lime: 0,  dim: 0,    x: 0,     y: 0,    scale: 1.05, speed: 1.4 } },
    { sel: '#gaps',    v: { scatter: 1,   lime: 0,   dim: 0.25, x: -2.0,  y: 0.2,  scale: 0.9,  speed: 0.7 } },
    { sel: '#automate',v: { scatter: 0,   lime: 0,   dim: 0.2,  x: 2.0,   y: 0,    scale: 0.85, speed: 1.6 } },
    { sel: '#how',     v: { scatter: 0.1, lime: 0,   dim: 0.35, x: 0,     y: -0.6, scale: 0.6,  speed: 2.2 } },
    { sel: '#proof',   v: { scatter: 0,   lime: 0.15, dim: 0.5, x: -2.2,  y: 0,    scale: 0.7,  speed: 0.8 } },
    { sel: '#pricing', v: { scatter: 0,   lime: 0,   dim: 0.6,  x: 2.4,   y: 0,    scale: 0.6,  speed: 0.5 } },
    { sel: '#book',    v: { scatter: 0.15, lime: 1,  dim: 0.1,  x: 0,     y: 0.1,  scale: 1.0,  speed: 1.1 } }
  ];
  function setTargets(v) { for (var k in v) tgt[k] = v[k]; }

  /* ---- #core pinned narrative (owned here now) ---- */
  var coreSection = document.getElementById('core');
  var lines = coreSection ? Array.prototype.slice.call(coreSection.querySelectorAll('.core-line')) : [];
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

  function initScroll() {
    if (!(window.gsap && window.ScrollTrigger)) { setTimeout(initScroll, 120); return; }
    gsap.registerPlugin(ScrollTrigger);
    CHAPTERS.forEach(function (c) {
      var el = document.querySelector(c.sel);
      if (!el) return;
      ScrollTrigger.create({
        trigger: el, start: 'top 55%', end: 'bottom 45%',
        onEnter: function () { setTargets(c.v); },
        onEnterBack: function () { setTargets(c.v); }
      });
    });
    // initialize to the chapter currently in view (handles mid-page loads/refreshes)
    var midY = window.innerHeight * 0.5, initial = CHAPTERS[0];
    CHAPTERS.forEach(function (c) {
      var el = document.querySelector(c.sel);
      if (!el) return;
      var r = el.getBoundingClientRect();
      if (r.top <= midY && r.bottom >= midY) initial = c;
      else if (r.bottom < midY) initial = c; // last chapter fully above center wins until one contains it
    });
    setTargets(initial.v);
    for (var k in tgt) cur[k] = tgt[k];

    if (coreSection) {
      setLines(0);
      ScrollTrigger.create({
        trigger: coreSection, start: 'top top', end: '+=1600', scrub: true, pin: true, anticipatePin: 1,
        onUpdate: function (self) {
          setLines(self.progress);
          if (pct) { var n = Math.round(self.progress * 100); pct.textContent = n >= 100 ? '100' : (n < 10 ? '0' + n : '' + n); }
        }
      });
    }
  }

  if (reduce) {
    lines.forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; el.style.position = 'relative'; });
    tick(700);
    return;
  }
  initScroll();
  renderer.setAnimationLoop(tick);
  document.addEventListener('visibilitychange', function () { renderer.setAnimationLoop(document.hidden ? null : tick); });
})();
