/* Blog hero — silk WebGL bg + «фонарик» тени (как на Ads-блоге) */
(function () {
  "use strict";

  var hero = document.getElementById("blog-hero");
  if (!hero) return;

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isCoarse = window.matchMedia("(pointer: coarse)").matches;
  var canFx = !prefersReduced && !isCoarse;

  var bg = document.getElementById("fixed-bg");
  var canvas = document.getElementById("hero-canvas");
  var glow = document.getElementById("heroGlow");
  var shadowed = hero.querySelectorAll(".shadowed");

  var HERO_BASES = ["hero", "hero1", "hero2", "hero3", "hero4", "hero5"];
  var DEFAULT_HERO_INDEX = 5;
  var heroIndex = resolveHeroIndex();
  var bgSwap = null;

  var SHADOW_MAX = 32;
  var SHADOW_SPREAD = "4px";
  var SHADOW_COLOR = "rgba(26, 6, 20, 0.55)";
  var SHADOW_GOLD = "rgba(255, 200, 0, 0.32)";

  var mouseX = window.innerWidth / 2;
  var mouseY = window.innerHeight / 2;
  var glowX = mouseX;
  var glowY = mouseY;
  var rafMouse = null;

  initSplitText();
  initShadowFx();
  initWebGLBg();
  initHeroDots();

  function resolveHeroIndex() {
    try {
      var saved = localStorage.getItem("seoBlogHero");
      if (/^[0-5]$/.test(saved)) return parseInt(saved, 10);
    } catch (e) { /* ignore */ }
    return DEFAULT_HERO_INDEX;
  }

  function heroImageSources(idx) {
    var base = HERO_BASES[idx == null ? heroIndex : idx];
    return ["/blog/" + base + ".webp", "/blog/" + base + ".jpg", "/blog/" + base + ".png"];
  }

  function initHeroDots() {
    var wrap = document.getElementById("hero-dots");
    if (!wrap) return;

    updateHeroDots();

    wrap.querySelectorAll("[data-hero]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = parseInt(btn.getAttribute("data-hero"), 10);
        if (isNaN(next) || next === heroIndex) return;
        heroIndex = next;
        try { localStorage.setItem("seoBlogHero", String(next)); } catch (e) { /* ignore */ }
        updateHeroDots();
        if (bgSwap) bgSwap(heroImageSources(next));
      });
    });
  }

  function updateHeroDots() {
    var wrap = document.getElementById("hero-dots");
    if (!wrap) return;
    wrap.querySelectorAll("[data-hero]").forEach(function (btn) {
      var i = parseInt(btn.getAttribute("data-hero"), 10);
      var active = i === heroIndex;
      btn.classList.toggle("hero-dots__dot--active", active);
      btn.setAttribute("aria-current", active ? "true" : "false");
    });
  }

  function initSplitText() {
    hero.querySelectorAll("[data-split]").forEach(function (line) {
      var text = line.textContent;
      line.textContent = "";
      var i = 0;
      for (var j = 0; j < text.length; j++) {
        var ch = text.charAt(j);
        var span = document.createElement("span");
        span.className = "char";
        span.style.setProperty("--i", i++);
        span.textContent = ch === " " ? "\u00a0" : ch;
        line.appendChild(span);
      }
    });
  }

  function initShadowFx() {
    if (!shadowed.length) return;

    function applyShadowEffects() {
      var rect = hero.getBoundingClientRect();
      var centerX = rect.left + rect.width / 2;
      var centerY = rect.top + rect.height / 2;
      var aX = mouseX - centerX;
      var aY = mouseY - centerY;
      var ratioX = aX / rect.width;
      var ratioY = aY / rect.height;
      var shadowX = ratioX * SHADOW_MAX * -1;
      var shadowY = ratioY * SHADOW_MAX * -1;
      var css =
        shadowX + "px " + shadowY + "px " + SHADOW_SPREAD + " " + SHADOW_COLOR + ", " +
        (shadowX * 0.55) + "px " + (shadowY * 0.55) + "px 28px " + SHADOW_GOLD;

      shadowed.forEach(function (el) {
        el.style.textShadow = css;
      });

      if (glow && canFx) {
        glowX += (mouseX - glowX) * 0.12;
        glowY += (mouseY - glowY) * 0.12;
        glow.style.left = (glowX - rect.left) + "px";
        glow.style.top = (glowY - rect.top) + "px";
      }
    }

    function onMouseMove(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!rafMouse) {
        rafMouse = requestAnimationFrame(function () {
          applyShadowEffects();
          rafMouse = null;
        });
      }
    }

    if (canFx) {
      hero.addEventListener("mousemove", onMouseMove, { passive: true });
      hero.addEventListener("mouseleave", function () {
        mouseX = window.innerWidth / 2;
        mouseY = hero.getBoundingClientRect().top + hero.offsetHeight / 2;
        applyShadowEffects();
      });
      hero.classList.add("hero--active");
    }

    applyShadowEffects();
  }

  function initWebGLBg() {
    if (!bg || !canvas) return;

    var HERO_IMAGES = heroImageSources();

    if (prefersReduced) {
      setStaticBg(HERO_IMAGES);
      return;
    }

    var gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" });
    if (!gl) {
      setStaticBg(HERO_IMAGES);
      return;
    }

    var vsSource =
      "attribute vec2 a_pos;" +
      "varying vec2 v_uv;" +
      "void main(){v_uv=a_pos*0.5+0.5;gl_Position=vec4(a_pos,0.0,1.0);}";

    var fsSource =
      "precision mediump float;" +
      "uniform sampler2D u_tex;" +
      "uniform vec2 u_res;" +
      "uniform vec2 u_img;" +
      "uniform float u_time;" +
      "uniform vec2 u_mouse;" +
      "varying vec2 v_uv;" +
      "vec2 coverUV(vec2 uv){float sa=u_res.x/u_res.y;float ia=u_img.x/u_img.y;vec2 s=vec2(1.0);if(sa>ia)s.y=ia/sa;else s.x=sa/ia;return (uv-0.5)*s+0.5;}" +
      "void main(){vec2 uv=coverUV(v_uv);float t=u_time;" +
      "float w=sin(uv.y*9.0+t*0.75)*0.006+sin(uv.x*7.0+t*0.55)*0.005;" +
      "w+=sin((uv.x+uv.y)*11.0+t*0.35)*0.003;" +
      "vec2 m=(u_mouse-0.5)*0.02;uv+=vec2(w,m.x*sin(uv.y*12.0+t));" +
      "gl_FragColor=texture2D(u_tex,uv);}";

    var program = createProgram(gl, vsSource, fsSource);
    if (!program) {
      setStaticBg(HERO_IMAGES);
      return;
    }

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    var aPos = gl.getAttribLocation(program, "a_pos");
    var uTex = gl.getUniformLocation(program, "u_tex");
    var uRes = gl.getUniformLocation(program, "u_res");
    var uImg = gl.getUniformLocation(program, "u_img");
    var uTime = gl.getUniformLocation(program, "u_time");
    var uMouse = gl.getUniformLocation(program, "u_mouse");

    var texture = gl.createTexture();
    var imgSize = [1, 1];
    var mouse = [0.5, 0.5];
    var targetMouse = [0.5, 0.5];
    var start = performance.now();
    var loaded = false;

    bg.addEventListener("pointermove", function (e) {
      var r = bg.getBoundingClientRect();
      targetMouse[0] = (e.clientX - r.left) / r.width;
      targetMouse[1] = 1.0 - (e.clientY - r.top) / r.height;
    }, { passive: true });

    bg.addEventListener("pointerleave", function () {
      targetMouse[0] = 0.5;
      targetMouse[1] = 0.5;
    });

    bgSwap = function (list) {
      loadImage(list, 0, function (img) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        imgSize[0] = img.naturalWidth;
        imgSize[1] = img.naturalHeight;
        loaded = true;
      });
    };

    loadImage(HERO_IMAGES, 0, function (img) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      imgSize[0] = img.naturalWidth;
      imgSize[1] = img.naturalHeight;
      loaded = true;
      resize();
      requestAnimationFrame(tick);
    });

    window.addEventListener("resize", resize, { passive: true });

    function tick(now) {
      if (!loaded) return;
      mouse[0] += (targetMouse[0] - mouse[0]) * 0.06;
      mouse[1] += (targetMouse[1] - mouse[1]) * 0.06;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uTex, 0);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uImg, imgSize[0], imgSize[1]);
      gl.uniform1f(uTime, (now - start) * 0.001);
      gl.uniform2f(uMouse, mouse[0], mouse[1]);
      gl.enableVertexAttribArray(aPos);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(tick);
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var rect = bg.getBoundingClientRect();
      var w = Math.max(Math.round(rect.width * dpr), 1);
      var h = Math.max(Math.round(rect.height * dpr), 1);
      canvas.width = w;
      canvas.height = h;
    }
  }

  function loadImage(list, i, cb) {
    if (i >= list.length) {
      setStaticBg(list);
      return;
    }
    var img = new Image();
    img.decoding = "async";
    img.onload = function () { cb(img); };
    img.onerror = function () { loadImage(list, i + 1, cb); };
    img.src = list[i];
  }

  function setStaticBg(list) {
    if (!bg) return;
    bg.classList.add("hero-bg--static");
    bg.style.backgroundImage = "url('" + list[0] + "')";
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    bgSwap = function (nextList) {
      bg.style.backgroundImage = "url('" + nextList[0] + "')";
    };
  }

  function createProgram(glCtx, vs, fs) {
    var p = glCtx.createProgram();
    var vsh = compile(glCtx, glCtx.VERTEX_SHADER, vs);
    var fsh = compile(glCtx, glCtx.FRAGMENT_SHADER, fs);
    if (!vsh || !fsh) return null;
    glCtx.attachShader(p, vsh);
    glCtx.attachShader(p, fsh);
    glCtx.linkProgram(p);
    if (!glCtx.getProgramParameter(p, glCtx.LINK_STATUS)) return null;
    return p;
  }

  function compile(glCtx, type, src) {
    var s = glCtx.createShader(type);
    glCtx.shaderSource(s, src);
    glCtx.compileShader(s);
    if (!glCtx.getShaderParameter(s, glCtx.COMPILE_STATUS)) return null;
    return s;
  }
})();
