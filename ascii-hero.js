/* ASCII fluid hero — wave grid + density chars (inspired by terminal fluid demos) */
(function () {
  'use strict';

  var DEFAULT_CHARSET = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

  var PALETTES = [
    { name: 'AMBER', r: 232, g: 148, b: 26 },
    { name: 'ROSE', r: 210, g: 95, b: 120 },
    { name: 'GOLD', r: 255, g: 198, b: 88 }
  ];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  window.initAsciiHero = function (canvas, opts) {
    if (!canvas) return null;
    opts = opts || {};
    var charSize = opts.charSize || (window.innerWidth < 768 ? 15 : 20);
    var waveForce = opts.waveForce || 520;
    var trail = opts.trail || 55;
    var damping = opts.damping != null ? opts.damping : 0.965;
    var cutoff = opts.cutoff != null ? opts.cutoff : 0.28;
    var pointerEl = opts.pointerEl || canvas;
    var bgR = opts.bgR != null ? opts.bgR : 20;
    var bgG = opts.bgG != null ? opts.bgG : 8;
    var bgB = opts.bgB != null ? opts.bgB : 14;
    var CHARSET = opts.charset || DEFAULT_CHARSET;
    var paletteIdx = 0;
    var cols = 0, rows = 0, w = 0, h = 0;
    var cur, prev, velX, velY;
    var ctx = canvas.getContext('2d', { alpha: false });
    var raf = null, running = true;
    var pointer = { x: -9999, y: -9999, down: false };
    var introT = 0;

    function palette() { return PALETTES[paletteIdx % PALETTES.length]; }

    function alloc() {
      var n = cols * rows;
      cur = new Float32Array(n);
      prev = new Float32Array(n);
      velX = new Float32Array(n);
      velY = new Float32Array(n);
    }

    function resize() {
      var host = canvas.parentElement;
      w = host ? host.clientWidth : window.innerWidth;
      h = host ? host.clientHeight : window.innerHeight;
      if (w < 1 || h < 1) return;
      canvas.width = w;
      canvas.height = h;
      cols = Math.max(8, Math.floor(w / charSize));
      rows = Math.max(6, Math.floor(h / charSize));
      alloc();
    }

    function idx(x, y) { return y * cols + x; }

    function splash(px, py, force) {
      var cx = clamp(Math.floor(px / charSize), 1, cols - 2);
      var cy = clamp(Math.floor(py / charSize), 1, rows - 2);
      var rad = Math.max(3, Math.floor(force / 85));
      var i, j, dx, dy, d2, f, id;
      for (j = -rad; j <= rad; j++) {
        for (i = -rad; i <= rad; i++) {
          dx = i; dy = j;
          d2 = dx * dx + dy * dy;
          if (d2 > rad * rad) continue;
          id = idx(cx + i, cy + j);
          f = force * (1 - d2 / (rad * rad));
          cur[id] += f;
          velX[id] += (Math.random() - 0.5) * f * 0.04;
          velY[id] += (Math.random() - 0.5) * f * 0.04;
        }
      }
    }

    function step() {
      var x, y, i, n = cols * rows;
      for (i = 0; i < n; i++) {
        velX[i] *= 0.92;
        velY[i] *= 0.92;
      }
      for (y = 1; y < rows - 1; y++) {
        for (x = 1; x < cols - 1; x++) {
          i = idx(x, y);
          var val = (
            prev[i - 1] + prev[i + 1] + prev[i - cols] + prev[i + cols]
          ) * 0.5 - cur[i];
          val *= damping;
          cur[i] = val;
        }
      }
      var tmp = prev;
      prev = cur;
      cur = tmp;

      introT += 0.018;
      if (pointer.x > 0) {
        splash(pointer.x, pointer.y, pointer.down ? waveForce * 1.15 : waveForce * 0.55);
      } else {
        var ax = (Math.sin(introT * 1.3) * 0.35 + 0.5) * w;
        var ay = (Math.cos(introT * 0.9) * 0.25 + 0.45) * h;
        splash(ax, ay, waveForce * 0.22);
      }
    }

    function render() {
      var pal = palette();
      var fade = 1 - clamp(trail, 8, 120) / 130;
      ctx.fillStyle = 'rgb(' + bgR + ',' + bgG + ',' + bgB + ')';
      ctx.globalAlpha = fade;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;

      ctx.font = '700 ' + charSize + 'px "Courier New", Courier, monospace';
      ctx.textBaseline = 'top';
      var maxH = 0, i, n = cols * rows;
      for (i = 0; i < n; i++) {
        var a = Math.abs(prev[i]);
        if (a > maxH) maxH = a;
      }
      if (maxH < 0.001) maxH = 1;
      var cut = cutoff * maxH;
      var x, y, hVal, ci, ch, alpha;
      for (y = 0; y < rows; y++) {
        for (x = 0; x < cols; x++) {
          hVal = Math.abs(prev[idx(x, y)]);
          if (hVal < cut) continue;
          ci = clamp(Math.floor((hVal / maxH) * (CHARSET.length - 1)), 0, CHARSET.length - 1);
          ch = CHARSET.charAt(ci);
          alpha = clamp(0.25 + (hVal / maxH) * 0.75, 0.2, 1);
          ctx.fillStyle = 'rgba(' + pal.r + ',' + pal.g + ',' + pal.b + ',' + alpha + ')';
          ctx.fillText(ch, x * charSize, y * charSize);
        }
      }
    }

    function loop() {
      if (!running) return;
      step();
      render();
      raf = requestAnimationFrame(loop);
    }

    function onPointer(e) {
      var r = canvas.getBoundingClientRect();
      pointer.x = (e.clientX - r.left) * (canvas.width / r.width);
      pointer.y = (e.clientY - r.top) * (canvas.height / r.height);
    }

    function isTouchUi() {
      return window.matchMedia && (
        window.matchMedia('(pointer: coarse)').matches ||
        window.matchMedia('(max-width: 960px)').matches
      );
    }

    function bind() {
      var touchUi = isTouchUi();
      if (touchUi) {
        canvas.style.pointerEvents = 'none';
        canvas.style.touchAction = 'pan-y';
        if (pointerEl !== canvas) {
          pointerEl.style.touchAction = 'pan-y';
        }
      } else {
        canvas.style.pointerEvents = 'auto';
        canvas.style.touchAction = 'none';
        if (pointerEl === canvas) pointerEl.style.touchAction = 'none';
      }
      pointerEl.addEventListener('pointermove', onPointer, { passive: true });
      pointerEl.addEventListener('pointerdown', function (e) {
        if (e.target.closest && e.target.closest('a, button')) return;
        pointer.down = true;
        onPointer(e);
        splash(pointer.x, pointer.y, waveForce);
      }, { passive: true });
      pointerEl.addEventListener('pointerup', function () { pointer.down = false; }, { passive: true });
      pointerEl.addEventListener('pointerleave', function () {
        pointer.x = -9999;
        pointer.down = false;
      }, { passive: true });
      pointerEl.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('a, button')) return;
        paletteIdx = (paletteIdx + 1) % PALETTES.length;
        bgR = opts.bgR != null ? opts.bgR : 20;
        bgG = opts.bgG != null ? opts.bgG : 8;
        bgB = opts.bgB != null ? opts.bgB : 14;
      });
      var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
      if (ro) ro.observe(canvas.parentElement || canvas);
      else window.addEventListener('resize', resize);
      resize();
      loop();
      return {
        destroy: function () {
          running = false;
          if (raf) cancelAnimationFrame(raf);
          if (ro) ro.disconnect();
          canvas.replaceWith(canvas.cloneNode(false));
        }
      };
    }

    return bind();
  };

  window.initHeroTyper = function (el, opts) {
    if (!el) return;
    opts = opts || {};
    var lines = opts.lines || [];
    if (!lines.length && el.getAttribute('data-lines')) {
      try { lines = JSON.parse(el.getAttribute('data-lines')); } catch (e) { lines = []; }
    }
    var speed = opts.speed || 52;
    var linePause = opts.linePause || 420;
    var accentLast = opts.accentLast !== false;
    var textEl = el.querySelector('.hero-type-text');
    if (!textEl || !lines.length) return;

    var line = 0, ch = 0;
    var parts = lines.map(function () { return ''; });
    el.classList.add('is-typing');

    function paint() {
      var html = '';
      for (var i = 0; i < parts.length; i++) {
        if (!parts[i]) continue;
        if (html) html += '<br>';
        if (accentLast && i === parts.length - 1 && parts[i].length > 0) {
          html += '<span class="hero-type-accent">' + parts[i] + '</span>';
        } else {
          html += parts[i];
        }
      }
      textEl.innerHTML = html;
    }

    function typeNext() {
      if (line >= lines.length) {
        el.classList.remove('is-typing');
        el.classList.add('is-done');
        paint();
        return;
      }
      if (ch < lines[line].length) {
        parts[line] += lines[line].charAt(ch++);
        paint();
        setTimeout(typeNext, speed);
      } else {
        line++;
        ch = 0;
        setTimeout(typeNext, linePause);
      }
    }

    setTimeout(typeNext, opts.delay || 400);
  };
})();
