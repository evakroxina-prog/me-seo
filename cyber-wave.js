/* Cyber Wave — neon letter particles with spring physics + matrix rain */
(function () {
  'use strict';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  window.initCyberWave = function (canvas, opts) {
    if (!canvas) return null;
    opts = opts || {};

    var chars = opts.chars || '01AISEO<>{}[]|/\\@#$%&*GPTGoogle';
    var color = opts.color || { r: 232, g: 148, b: 26 };
    var hoverColor = opts.hoverColor || { r: 255, g: 210, b: 120 };
    var bgR = opts.bgR != null ? opts.bgR : 20;
    var bgG = opts.bgG != null ? opts.bgG : 8;
    var bgB = opts.bgB != null ? opts.bgB : 14;
    var fontSize = opts.fontSize || (window.innerWidth < 768 ? 13 : 15);
    var density = opts.density != null ? opts.density : 0.82;
    var mouseRadius = opts.mouseRadius || 130;
    var mouseForce = opts.mouseForce || 9;
    var pointerEl = opts.pointerEl || canvas;

    var ctx = canvas.getContext('2d');
    var w = 0, h = 0, particles = [], rain = [];
    var mouse = { x: -9999, y: -9999, active: false };
    var running = true, raf = null;

    function Particle(bx, by) {
      this.baseX = bx;
      this.baseY = by;
      this.x = bx + (Math.random() - 0.5) * 16;
      this.y = by + (Math.random() - 0.5) * 16;
      this.vx = 0;
      this.vy = 0;
      this.char = chars.charAt(Math.floor(Math.random() * chars.length));
      this.size = fontSize * (0.82 + Math.random() * 0.36);
      this.phase = Math.random() * Math.PI * 2;
      this.bob = 0.4 + Math.random() * 0.8;
    }

    Particle.prototype.update = function () {
      var dx = mouse.x - this.x;
      var dy = mouse.y - this.y;
      var dist = Math.sqrt(dx * dx + dy * dy) || 1;

      if (mouse.active && dist < mouseRadius) {
        var push = (1 - dist / mouseRadius) * mouseForce;
        this.vx -= (dx / dist) * push;
        this.vy -= (dy / dist) * push;
      }

      this.vx += (this.baseX - this.x) * 0.045;
      this.vy += (this.baseY - this.y) * 0.045;
      this.vx += Math.sin(this.phase) * 0.035 * this.bob;
      this.vy += Math.cos(this.phase * 1.17) * 0.03 * this.bob;
      this.phase += 0.028;

      this.vx *= 0.86;
      this.vy *= 0.86;
      this.x += this.vx;
      this.y += this.vy;

      if (Math.random() < 0.003) {
        this.char = chars.charAt(Math.floor(Math.random() * chars.length));
      }
    };

    function RainCol(x) {
      this.x = x;
      this.y = Math.random() * h;
      this.speed = 1.2 + Math.random() * 2.8;
      this.chars = [];
      var len = 8 + Math.floor(Math.random() * 14);
      for (var i = 0; i < len; i++) {
        this.chars.push(chars.charAt(Math.floor(Math.random() * chars.length)));
      }
    }

    RainCol.prototype.step = function () {
      this.y += this.speed;
      if (this.y > h + this.chars.length * fontSize) {
        this.y = -this.chars.length * fontSize;
        this.speed = 1.2 + Math.random() * 2.8;
      }
      if (Math.random() < 0.04) {
        var idx = Math.floor(Math.random() * this.chars.length);
        this.chars[idx] = chars.charAt(Math.floor(Math.random() * chars.length));
      }
    };

    function build() {
      particles = [];
      rain = [];
      var gapX = fontSize * 2.35 / density;
      var gapY = fontSize * 2.1 / density;
      var x, y;
      for (y = gapY * 0.6; y < h; y += gapY) {
        for (x = gapX * 0.5; x < w; x += gapX) {
          if (Math.random() > 0.12) particles.push(new Particle(x, y));
        }
      }
      var cols = Math.max(6, Math.floor(w / 48));
      for (var i = 0; i < cols; i++) {
        rain.push(new RainCol((i + 0.5) * (w / cols)));
      }
    }

    function resize() {
      var host = canvas.parentElement;
      w = host ? host.clientWidth : window.innerWidth;
      h = host ? host.clientHeight : window.innerHeight;
      if (w < 1 || h < 1) return;
      canvas.width = w;
      canvas.height = h;
      build();
    }

    function drawRain() {
      var i, j, col, alpha;
      ctx.font = fontSize + 'px "Courier New", monospace';
      for (i = 0; i < rain.length; i++) {
        col = rain[i];
        col.step();
        for (j = 0; j < col.chars.length; j++) {
          alpha = clamp(0.04 + (j / col.chars.length) * 0.14, 0.03, 0.18);
          ctx.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + alpha + ')';
          ctx.fillText(col.chars[j], col.x, col.y - j * fontSize);
        }
      }
    }

    function drawParticles() {
      var i, p, dx, dy, dist, t, r, g, b, alpha;
      for (i = 0; i < particles.length; i++) {
        p = particles[i];
        p.update();
        dx = mouse.x - p.x;
        dy = mouse.y - p.y;
        dist = Math.sqrt(dx * dx + dy * dy);
        t = mouse.active && dist < mouseRadius * 0.75
          ? clamp(1 - dist / (mouseRadius * 0.75), 0, 1)
          : 0.25 + Math.sin(p.phase * 2) * 0.12;
        r = color.r + (hoverColor.r - color.r) * t;
        g = color.g + (hoverColor.g - color.g) * t;
        b = color.b + (hoverColor.b - color.b) * t;
        alpha = 0.22 + t * 0.62;

        ctx.font = '700 ' + p.size + 'px "Courier New", Courier, monospace';
        ctx.shadowBlur = 10 + t * 10;
        ctx.shadowColor = 'rgba(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ',0.9)';
        ctx.fillStyle = 'rgba(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ',' + alpha + ')';
        ctx.fillText(p.char, p.x, p.y);
      }
      ctx.shadowBlur = 0;
    }

    function frame() {
      if (!running) return;
      ctx.fillStyle = 'rgb(' + bgR + ',' + bgG + ',' + bgB + ')';
      ctx.fillRect(0, 0, w, h);
      drawRain();
      drawParticles();
      raf = requestAnimationFrame(frame);
    }

    function onPointer(e) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
      mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
      mouse.active = true;
    }

    function bind() {
      pointerEl.addEventListener('pointermove', onPointer, { passive: true });
      pointerEl.addEventListener('pointerenter', onPointer, { passive: true });
      pointerEl.addEventListener('pointerleave', function () {
        mouse.active = false;
        mouse.x = -9999;
        mouse.y = -9999;
      }, { passive: true });
      var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
      if (ro) ro.observe(canvas.parentElement || canvas);
      else window.addEventListener('resize', resize);
      resize();
      frame();
      return {
        destroy: function () {
          running = false;
          if (raf) cancelAnimationFrame(raf);
          if (ro) ro.disconnect();
        }
      };
    }

    return bind();
  };
})();
