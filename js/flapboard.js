/*!
 * FlapBoard — a canvas split-flap ("Solari") board.
 *
 * Every tile shows a face. Flipping to a new face drops the top flap over the
 * bottom half in perspective (drawn as horizontal strips so the near edge
 * widens as it falls toward the viewer), with gravity easing, a small bounce
 * on the stop, and light/shadow on the flap and on the half beneath it.
 *
 * Faces are interned objects created through FlapBoard.face:
 *   face.img(key)              a slice of a registered image source
 *   face.char(ch, bg, fg)      a glyph on a coloured card
 *   face.fill(bg)              a plain coloured card
 *   face.tex(id, draw)         a procedurally drawn card (draw(ctx, w, h))
 *   face.clear()               a transparent card (used for reveals)
 */
(function (root) {
  'use strict';

  var PI = Math.PI;
  var HALF = PI / 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function now() { return performance.now(); }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* Angle profile for one flip (0 → π): released slowly, accelerates like a
     falling card, then bounces a few degrees off the stop. */
  function flipAngle(t) {
    if (t <= 0) return 0;
    if (t >= 1) return PI;
    var F = 0.74;
    if (t < F) { var u = t / F; return PI * (0.16 * u + 0.84 * u * u); }
    var v = (t - F) / (1 - F);
    return PI - 0.13 * PI * Math.sin(PI * v) * (1 - v);
  }

  /* ---------- interned faces ---------- */
  var faces = new Map();
  function intern(key, make) {
    var f = faces.get(key);
    if (!f) { f = make(); f.key = key; faces.set(key, f); }
    return f;
  }
  var face = {
    img: function (src) { return intern('img|' + src, function () { return { k: 'img', src: src }; }); },
    char: function (ch, bg, fg) {
      return intern('chr|' + ch + '|' + bg + '|' + fg, function () { return { k: 'char', ch: ch, bg: bg, fg: fg }; });
    },
    fill: function (bg) { return intern('fil|' + bg, function () { return { k: 'fill', bg: bg }; }); },
    tex: function (id, draw) { return intern('tex|' + id, function () { return { k: 'tex', id: id, draw: draw }; }); },
    clear: function () { return intern('clear', function () { return { k: 'clear' }; }); }
  };

  /* ---------- board ---------- */
  function FlapBoard(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.o = Object.assign({
      cols: 8,             // fixed column count
      rows: 0,             // fixed row count (0 → derived from `aspect`)
      aspect: 1.3,         // tile height / width when rows are derived
      gap: 2,              // css px between tiles
      split: 1,            // css px gap at the hinge
      radius: 2,           // css px corner radius
      duration: 560,       // ms for one flip
      perspective: 3.4,    // viewer distance in tile heights
      shade: 0.5,          // max darkness of a flap turning away from the light
      font: '"Barlow Condensed", "Arial Narrow", sans-serif',
      weight: 700,
      glyph: 0.66,         // glyph cap height relative to tile height
      gloss: true,         // subtle light/dark gradient on every card
      dprMax: 2,
      face: function () { return face.clear(); },   // initial face per tile
      alt: null            // (tile) → face revealed by a poke
    }, opts || {});
    this.tiles = [];
    this.grid = [];
    this.sources = {};
    this.cache = new Map();
    this.raf = 0;
    this.lastHover = null;
    this.idleTimer = 0;
    this.visible = true;
    this.listeners = {};
    this._frame = this._frame.bind(this);
  }

  FlapBoard.face = face;
  FlapBoard.flipAngle = flipAngle;

  FlapBoard.prototype.on = function (ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); return this; };
  FlapBoard.prototype.emit = function (ev, a) { (this.listeners[ev] || []).forEach(function (fn) { fn(a); }); };

  /* Size the board to its canvas' CSS box (or w × h) and lay the tiles out. */
  FlapBoard.prototype.resize = function (w, h) {
    var o = this.o;
    var cw = w || this.canvas.clientWidth, ch = h || this.canvas.clientHeight;
    if (!cw || !ch) return;
    var dpr = Math.min(root.devicePixelRatio || 1, o.dprMax);
    this.dpr = dpr; this.cssW = cw; this.cssH = ch;
    var DW = Math.round(cw * dpr), DH = Math.round(ch * dpr);
    this.canvas.width = DW; this.canvas.height = DH;
    this.dw = DW; this.dh = DH;
    var G = Math.max(0, Math.round(o.gap * dpr));
    var S = Math.max(0, Math.round(o.split * dpr));
    var cols = o.cols;
    var tw = (DW - G * (cols - 1)) / cols;
    var rows = o.rows || Math.max(1, Math.round((DH + G) / (tw * o.aspect + G)));
    var th = (DH - G * (rows - 1)) / rows;
    var rebuild = cols !== this.cols || rows !== this.rows;
    this.cols = cols; this.rows = rows; this.G = G; this.S = S;
    this.tw = tw; this.th = th;
    var R = Math.round(o.radius * dpr);
    this.R = R;
    if (rebuild) { this.tiles = []; this.grid = []; }
    for (var r = 0; r < rows; r++) {
      if (rebuild) this.grid[r] = [];
      for (var c = 0; c < cols; c++) {
        var x0 = Math.round(c * (tw + G)), x1 = Math.round(c * (tw + G) + tw);
        var y0 = Math.round(r * (th + G)), y1 = Math.round(r * (th + G) + th);
        var t = rebuild ? null : this.grid[r][c];
        if (!t) {
          t = { r: r, c: c, i: r * cols + c, cur: null, home: null, anim: null, queue: [], returnAt: 0, data: null };
          this.tiles.push(t); this.grid[r][c] = t;
        }
        t.x = x0; t.y = y0; t.w = x1 - x0; t.h = y1 - y0;
        t.ht = Math.round((t.h - S) / 2);         // top half height
        t.hb = t.h - S - t.ht;                    // bottom half height
        if (rebuild) {
          var f = o.face(t) || face.clear();
          t.cur = f; t.home = f;
        }
      }
    }
    this.cache.clear();
    this._buildMask();
    this._mapSources();
    this.draw();
    this.emit('layout', this);
  };

  FlapBoard.prototype._buildMask = function () {
    var m = this.mask || (this.mask = document.createElement('canvas'));
    m.width = this.dw; m.height = this.dh;
    var x = m.getContext('2d');
    x.clearRect(0, 0, m.width, m.height);
    x.fillStyle = '#000';
    var R = this.R;
    for (var i = 0; i < this.tiles.length; i++) {
      var t = this.tiles[i];
      x.beginPath();
      roundRect(x, t.x, t.y, t.w, t.ht, R, R, 0, 0);
      roundRect(x, t.x, t.y + t.ht + this.S, t.w, t.hb, 0, 0, R, R);
      x.fill();
    }
  };

  function roundRect(x, X, Y, W, H, tl, tr, br, bl) {
    if (!tl && !tr && !br && !bl) { x.rect(X, Y, W, H); return; }
    x.moveTo(X + tl, Y);
    x.lineTo(X + W - tr, Y); if (tr) x.arcTo(X + W, Y, X + W, Y + tr, tr); else x.lineTo(X + W, Y);
    x.lineTo(X + W, Y + H - br); if (br) x.arcTo(X + W, Y + H, X + W - br, Y + H, br); else x.lineTo(X + W, Y + H);
    x.lineTo(X + bl, Y + H); if (bl) x.arcTo(X, Y + H, X, Y + H - bl, bl); else x.lineTo(X, Y + H);
    x.lineTo(X, Y + tl); if (tl) x.arcTo(X, Y, X + tl, Y, tl); else x.lineTo(X, Y);
    x.closePath();
  }

  /* Register an image (or canvas) the board can slice: fit = cover by default.
     fx/fy pick the focal point, zoom > 1 crops in, dx/dy nudge in css px. */
  FlapBoard.prototype.setSource = function (key, img, fit) {
    this.sources[key] = { img: img, fit: Object.assign({ fx: 0.5, fy: 0.5, zoom: 1, dx: 0, dy: 0 }, fit || {}) };
    this._mapSources();
    this.draw();
  };

  FlapBoard.prototype._mapSources = function () {
    if (!this.dw) return;
    for (var k in this.sources) {
      var s = this.sources[k];
      var iw = s.img.naturalWidth || s.img.width, ih = s.img.naturalHeight || s.img.height;
      if (!iw || !ih) { s.map = null; continue; }
      var sc = Math.max(this.dw / iw, this.dh / ih) * s.fit.zoom;
      s.map = {
        sc: sc,
        ox: (this.dw - iw * sc) * s.fit.fx + s.fit.dx * this.dpr,
        oy: (this.dh - ih * sc) * s.fit.fy + s.fit.dy * this.dpr
      };
    }
  };

  /* Mapping of a source in CSS px (so DOM layers can register on top). */
  FlapBoard.prototype.mapping = function (key) {
    var s = this.sources[key];
    if (!s || !s.map) return null;
    return { scale: s.map.sc / this.dpr, x: s.map.ox / this.dpr, y: s.map.oy / this.dpr };
  };

  /* Cached card for glyph / texture faces at a tile size. */
  FlapBoard.prototype._card = function (f, w, h) {
    var key = f.key + '@' + w + 'x' + h;
    var cv = this.cache.get(key);
    if (cv) return cv;
    cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var x = cv.getContext('2d');
    if (f.k === 'char') {
      x.fillStyle = f.bg; x.fillRect(0, 0, w, h);
      if (f.bg !== 'transparent') FlapBoard.texture(x, w, h, 0.55);
      if (f.ch && f.ch !== ' ') {
        var cap = h * this.o.glyph;
        var size = cap / 0.7;                       // Barlow's cap height ≈ 0.7em
        x.font = this.o.weight + ' ' + size.toFixed(1) + 'px ' + this.o.font;
        x.fillStyle = f.fg;
        x.textAlign = 'center';
        x.textBaseline = 'alphabetic';
        var m = x.measureText('H');
        var asc = m.actualBoundingBoxAscent || cap;
        // centre the cap height on the hinge
        x.fillText(f.ch, w / 2, h / 2 + asc / 2);
      }
    } else if (f.k === 'tex') {
      f.draw(x, w, h);
    }
    this.cache.set(key, cv);
    return cv;
  };

  /* Draw rows [v0, v1] (fractions of face height) of face f for tile t into a
     destination rect. */
  FlapBoard.prototype._strip = function (x, f, t, v0, v1, dx, dy, dw, dh) {
    if (dh <= 0 || dw <= 0) return;
    switch (f.k) {
      case 'clear': return;
      case 'fill':
        x.fillStyle = f.bg; x.fillRect(dx, dy, dw, dh); return;
      case 'img': {
        var s = this.sources[f.src];
        if (!s || !s.map) return;
        var m = s.map;
        var sx = (t.x - m.ox) / m.sc, sy = (t.y - m.oy) / m.sc;
        var sw = t.w / m.sc, sh = t.h / m.sc;
        x.drawImage(s.img, sx, sy + sh * v0, sw, sh * (v1 - v0), dx, dy, dw, dh);
        return;
      }
      default: {
        var cv = this._card(f, t.w, t.h);
        x.drawImage(cv, 0, t.h * v0, t.w, t.h * (v1 - v0), dx, dy, dw, dh);
      }
    }
  };

  /* ---------- scheduling ---------- */

  /* Queue a flip to `f` after `delay` ms (ignored if it would be a no-op). */
  FlapBoard.prototype._redraw = function () {
    var self = this;
    if (this._rq) return;
    this._rq = requestAnimationFrame(function () { self._rq = 0; self.draw(); });
  };

  FlapBoard.prototype.flip = function (t, f, delay, speed) {
    if (FlapBoard.reduced) { t.queue.length = 0; t.anim = null; if (t.cur !== f) { t.cur = f; this._redraw(); } return; }
    var last = t.queue.length ? t.queue[t.queue.length - 1].face : (t.anim ? t.anim.to : t.cur);
    if (last === f) return;
    t.queue.push({ face: f, at: now() + (delay || 0), speed: speed || 1 });
    this._wake();
  };

  /* Make `f` the tile's resting face, replacing whatever is pending. With
     `cycle`, a glyph flap steps through the Solari drum in order (space, A–Z,
     0–9 …) on its way, at most cycle × 4 steps, so near letters land first. */
  FlapBoard.prototype.target = function (t, f, delay, cycle) {
    t.home = f;
    t.returnAt = 0;
    t.queue.length = 0;
    if (FlapBoard.reduced) {             // no motion: faces change in place
      t.anim = null;
      if (t.cur !== f) { t.cur = f; this._redraw(); }
      return;
    }
    var showing = t.anim ? t.anim.to : t.cur;
    if (showing === f) return;
    var at = now() + (delay || 0);
    if (cycle && f.k === 'char') {
      var D = FlapBoard.DRUM, to = D.indexOf(f.ch);
      if (to >= 0) {
        var from = showing.k === 'char' ? D.indexOf(showing.ch) : 0;
        if (from < 0) from = 0;
        var dist = (to - from + D.length) % D.length;
        var steps = Math.min(dist, Math.min(6, cycle * 3));
        for (var i = steps - 1; i >= 1; i--) {
          var g = D[(to - i + D.length) % D.length];
          t.queue.push({ face: face.char(g, f.bg, f.fg), at: at, ms: FlapBoard.STEP_MS });
        }
      }
    }
    t.queue.push({ face: f, at: at, speed: cycle ? 0.55 : 1 });
    this._wake();
  };

  /* Temporarily reveal the tile's alt face, returning home after `hold` ms. */
  FlapBoard.prototype.poke = function (t, delay, hold) {
    if (!t || !this.o.alt || t.locked || FlapBoard.reduced) return;
    var alt = this.o.alt(t);
    if (!alt || alt === t.home) return;
    var showing = t.queue.length ? t.queue[t.queue.length - 1].face : (t.anim ? t.anim.to : t.cur);
    if (showing !== alt) this.flip(t, alt, delay || 0);
    t.returnAt = now() + (delay || 0) + this.o.duration + (hold == null ? 1400 : hold);
    this._wake();
  };

  /* Domino wave: every tile for which fn returns a face flips to it, delayed by
     its distance from `origin` ([row, col], may be fractional or off-board). */
  FlapBoard.prototype.wave = function (fn, opt) {
    opt = opt || {};
    var org = opt.origin || [0, 0];
    var speed = opt.speed == null ? 32 : opt.speed;
    var jitter = opt.jitter || 0;
    var ar = this.th / this.tw;           // measure distance in screen space
    for (var i = 0; i < this.tiles.length; i++) {
      var t = this.tiles[i];
      var f = fn(t);
      if (!f) continue;
      var dr = (t.r - org[0]) * ar, dc = t.c - org[1];
      var d = opt.metric === 'diag' ? Math.abs(dr) + Math.abs(dc) : Math.sqrt(dr * dr + dc * dc);
      this.target(t, f, (opt.delay || 0) + d * speed + Math.random() * jitter, opt.cycle || 0);
    }
  };

  FlapBoard.prototype.tileAt = function (px, py) {
    var X = px * this.dpr, Y = py * this.dpr;
    var c = Math.floor(X / (this.tw + this.G)), r = Math.floor(Y / (this.th + this.G));
    if (r < 0 || c < 0 || r >= this.rows || c >= this.cols) return null;
    return this.grid[r][c];
  };

  FlapBoard.prototype.at = function (r, c) {
    return r >= 0 && c >= 0 && r < this.rows && c < this.cols ? this.grid[r][c] : null;
  };

  /* Pointer trail: the tile under the cursor flips and knocks the next couple
     of tiles in the direction of travel, like dominoes. */
  FlapBoard.prototype.hover = function (px, py, opt) {
    var t = this.tileAt(px, py);
    if (!t || t === this.lastHover) return;
    opt = opt || {};
    var hold = opt.hold == null ? 1300 : opt.hold;
    var chain = opt.chain == null ? 2 : opt.chain;
    var step = opt.step || 70;
    var prev = this.lastHover;
    this.lastHover = t;
    this.poke(t, 0, hold);
    if (prev) {
      var dr = Math.sign(t.r - prev.r), dc = Math.sign(t.c - prev.c);
      for (var k = 1; k <= chain; k++) {
        var n = this.at(t.r + dr * k, t.c + dc * k);
        if (n) this.poke(n, k * step, hold - k * 120);
      }
    }
  };

  FlapBoard.prototype.leave = function () { this.lastHover = null; };

  /* Dominoes running on their own. `pick` may return a list of tiles to
     reveal in order (a whole word, say); otherwise a short chain runs from a
     random tile, stopping at tiles `skip` protects. */
  FlapBoard.prototype.idle = function (opt) {
    var self = this;
    opt = Object.assign({ every: [700, 1700], chain: [2, 5], hold: [700, 1600], step: 90 }, opt || {});
    this.stopIdle();
    function tick() {
      if (self.visible && self.tiles.length && !self.paused) {
        var hold = rnd(opt.hold[0], opt.hold[1]);
        var seq = opt.pick ? opt.pick() : null;
        if (seq && seq.length) {
          for (var j = 0; j < seq.length; j++) self.poke(seq[j], j * opt.step, hold + 500);
        } else {
          var t = self.tiles[(Math.random() * self.tiles.length) | 0];
          if (!(opt.skip && opt.skip(t))) {
            var dirs = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, 1]];
            var d = dirs[(Math.random() * dirs.length) | 0];
            var n = Math.round(rnd(opt.chain[0], opt.chain[1]));
            for (var k = 0; k < n; k++) {
              var nt = self.at(t.r + d[0] * k, t.c + d[1] * k);
              if (!nt || (opt.skip && opt.skip(nt))) break;
              self.poke(nt, k * opt.step, hold);
            }
          }
        }
      }
      self.idleTimer = setTimeout(tick, rnd(opt.every[0], opt.every[1]));
    }
    this.idleTimer = setTimeout(tick, rnd(200, 900));
  };

  FlapBoard.prototype.stopIdle = function () { clearTimeout(this.idleTimer); this.idleTimer = 0; };

  /* Everything shows its home face, immediately (reduced motion, resize). */
  FlapBoard.prototype.settle = function () {
    for (var i = 0; i < this.tiles.length; i++) {
      var t = this.tiles[i];
      t.queue.length = 0; t.anim = null; t.returnAt = 0; t.cur = t.home;
    }
    this.draw();
  };

  FlapBoard.prototype.setAll = function (fn) {
    for (var i = 0; i < this.tiles.length; i++) {
      var t = this.tiles[i], f = fn(t);
      if (f) { t.cur = t.home = f; t.queue.length = 0; t.anim = null; t.returnAt = 0; }
    }
    this.draw();
  };

  FlapBoard.prototype.busy = function () {
    for (var i = 0; i < this.tiles.length; i++) {
      var t = this.tiles[i];
      if (t.anim || t.queue.length || t.returnAt) return true;
    }
    return false;
  };

  /* ---------- frame loop ---------- */
  FlapBoard.prototype._wake = function () {
    if (!this.raf) this.raf = requestAnimationFrame(this._frame);
  };

  FlapBoard.prototype._frame = function () {
    this.raf = 0;
    var T = now(), dur = this.o.duration, pending = false, started = 0, dirty = [];
    for (var i = 0; i < this.tiles.length; i++) {
      var t = this.tiles[i], touched = false;
      if (t.anim && T >= t.anim.t0 + t.anim.dur) { t.cur = t.anim.to; t.anim = null; touched = true; }
      if (!t.anim && t.queue.length && t.queue[0].at <= T) {
        var q = t.queue.shift();
        if (q.face !== t.cur) { t.anim = { to: q.face, t0: T, dur: q.ms || dur * q.speed }; touched = true; started++; }
      }
      if (!t.anim && !t.queue.length && t.returnAt && T >= t.returnAt) {
        t.returnAt = 0;
        if (t.cur !== t.home) { t.anim = { to: t.home, t0: T, dur: dur }; touched = true; started++; }
      }
      if (t.anim || touched) dirty.push(t);
      if (t.anim || t.queue.length || t.returnAt) pending = true;
    }
    if (dirty.length) {
      if (dirty.length > this.tiles.length * 0.3) this.draw(T);
      else this.draw(T, dirty);
    }
    if (started) { this.emit('flip', started); if (FlapBoard.onflip) FlapBoard.onflip(started, this); }
    if (pending) this._wake();
    else this.emit('rest', this);
  };

  /* ---------- drawing ---------- */
  FlapBoard.prototype.draw = function (T, only) {
    if (!this.dw) return;
    T = T || now();
    var x = this.ctx, i, t, a, th, list = this.tiles;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'source-over';
    x.globalAlpha = 1;
    if (only) {
      // redraw just the moving tiles plus their row neighbours (a falling
      // flap is wider than its slot), clipped to those rects
      var mx = Math.ceil(this.tw * 0.14) + 2, seen = {}, rects = [];
      list = [];
      for (i = 0; i < only.length; i++) {
        t = only[i];
        rects.push([t.x - mx, t.y - 1, t.w + 2 * mx, t.h + 2]);
        for (var dc = -1; dc <= 1; dc++) {
          var n = this.at(t.r, t.c + dc);
          if (n && !seen[n.i]) { seen[n.i] = 1; list.push(n); }
        }
      }
      x.save();
      x.beginPath();
      for (i = 0; i < rects.length; i++) x.rect(rects[i][0], rects[i][1], rects[i][2], rects[i][3]);
      x.clip();
      for (i = 0; i < rects.length; i++) x.clearRect(rects[i][0], rects[i][1], rects[i][2], rects[i][3]);
    } else {
      x.clearRect(0, 0, this.dw, this.dh);
    }
    var flipping = [];

    // 1. static halves (+ the shadow the moving flap throws on them)
    for (i = 0; i < list.length; i++) {
      t = list[i];
      a = t.anim;
      var top = a ? a.to : t.cur;
      this._strip(x, top, t, 0, t.ht / t.h, t.x, t.y, t.w, t.ht);
      this._strip(x, t.cur, t, (t.ht + this.S) / t.h, 1, t.x, t.y + t.ht + this.S, t.w, t.hb);
      if (a) {
        th = flipAngle((T - a.t0) / a.dur);
        t._th = th;
        flipping.push(t);
        if (th < HALF) {
          // newly revealed top half sits in the flap's shadow
          x.fillStyle = 'rgba(0,0,0,' + (0.42 * (1 - th / HALF)).toFixed(3) + ')';
          if (top.k !== 'clear') x.fillRect(t.x, t.y, t.w, t.ht);
        } else if (t.cur.k !== 'clear') {
          // the flap closes over the bottom half
          var k = (th - HALF) / HALF;
          x.fillStyle = 'rgba(0,0,0,' + (0.3 * Math.sin(k * HALF)).toFixed(3) + ')';
          x.fillRect(t.x, t.y + t.ht + this.S, t.w, t.hb);
        }
      }
    }
    if (this.o.gloss) this._gloss(x, list);

    // 2. round the corners and cut the hinge gaps
    x.globalCompositeOperation = 'destination-in';
    x.drawImage(this.mask, 0, 0);
    x.globalCompositeOperation = 'source-over';

    // 3. falling flaps, drawn in perspective
    flipping.sort(function (p, q) { return Math.abs(HALF - q._th) - Math.abs(HALF - p._th); });
    for (i = 0; i < flipping.length; i++) this._leaf(x, flipping[i], flipping[i]._th);
    if (only) x.restore();
  };

  /* A soft light-from-above gradient on every card: brighter top half,
     darker toward the bottom edge. Drawn once per frame as two big passes. */
  FlapBoard.prototype._gloss = function (x, list) {
    var g = this._glossGrad;
    var H = Math.max(4, Math.round(this.th));
    if (!g || g.h !== H) {
      var c = document.createElement('canvas');
      c.width = 4; c.height = H;
      var cx = c.getContext('2d');
      var gr = cx.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, 'rgba(255,255,255,0.10)');
      gr.addColorStop(0.47, 'rgba(255,255,255,0.0)');
      gr.addColorStop(0.53, 'rgba(0,0,0,0.05)');
      gr.addColorStop(1, 'rgba(0,0,0,0.15)');
      cx.fillStyle = gr; cx.fillRect(0, 0, 4, H);
      g = this._glossGrad = { c: c, h: H };
    }
    var S = this.S;
    list = list || this.tiles;
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      var top = t.anim ? t.anim.to : t.cur;
      var k = H / t.h;
      if (top.k !== 'clear') x.drawImage(g.c, 0, 0, 4, t.ht * k, t.x, t.y, t.w, t.ht);
      if (t.cur.k !== 'clear') x.drawImage(g.c, 0, (t.ht + S) * k, 4, t.hb * k, t.x, t.y + t.ht + S, t.w, t.hb);
    }
  };

  FlapBoard.prototype._leaf = function (x, t, th) {
    var P = this.o.perspective * t.h;
    var hinge = t.y + t.ht + this.S / 2;
    var cx = t.x + t.w / 2;
    var front = th < HALF;
    var f = front ? t.cur : t.anim.to;
    if (f.k === 'clear') return;
    var L = front ? t.ht : t.hb;                     // flap length
    var N = clamp(Math.round(L / (5 * this.dpr)), 5, 16);
    var ang = front ? th : PI - th;                  // angle out of the board plane
    var cs = Math.cos(ang), sn = Math.sin(ang);
    var dir = front ? -1 : 1;                        // up for the front, down for the back
    var ys = [], ws = [];
    for (var i = 0; i <= N; i++) {
      var d = L * i / N;
      var s = P / (P - d * sn);
      ys.push(hinge + dir * d * cs * s);
      ws.push(t.w * s);
    }
    // outline of the flap: square at the hinge, rounded at the free edge
    var yE = ys[N], wE = ws[N] / 2, yH = ys[0], wH = ws[0] / 2;
    var r = Math.min(this.R * (P / (P - L * sn)), wE, Math.abs(yE - yH) / 2);
    x.save();
    x.beginPath();
    x.moveTo(cx - wH, yH);
    x.lineTo(cx + wH, yH);
    if (r > 0.5) {
      x.lineTo(cx + wE, yE - dir * r);
      x.quadraticCurveTo(cx + wE, yE, cx + wE - r, yE);
      x.lineTo(cx - wE + r, yE);
      x.quadraticCurveTo(cx - wE, yE, cx - wE, yE - dir * r);
    } else {
      x.lineTo(cx + wE, yE);
      x.lineTo(cx - wE, yE);
    }
    x.closePath();
    x.clip();
    for (i = 0; i < N; i++) {
      var y0 = ys[i], y1 = ys[i + 1];
      var top = Math.min(y0, y1), bot = Math.max(y0, y1);
      var w = (ws[i] + ws[i + 1]) / 2;
      var d0 = L * i / N, d1 = L * (i + 1) / N;
      var v0, v1;                                    // face rows covered by this strip
      if (front) { v0 = (t.ht - d1) / t.h; v1 = (t.ht - d0) / t.h; }
      else { v0 = (t.ht + this.S + d0) / t.h; v1 = (t.ht + this.S + d1) / t.h; }
      this._strip(x, f, t, v0, v1, cx - w / 2, top - 0.35, w, bot - top + 0.7);
    }
    // light: the front darkens as it turns down, the back brightens as it lands
    var shade = front ? this.o.shade * Math.pow(sn, 1.4) : this.o.shade * 0.7 * Math.pow(sn, 1.2);
    if (shade > 0.01) {
      x.fillStyle = 'rgba(0,0,0,' + shade.toFixed(3) + ')';
      x.fill();
    }
    // a thin highlight on the free edge sells the thickness of the card
    if (sn > 0.2) {
      x.fillStyle = 'rgba(255,255,255,' + (0.2 * sn).toFixed(3) + ')';
      x.fillRect(cx - wE, front ? yE : yE - Math.max(1, this.dpr), wE * 2, Math.max(1, this.dpr));
    }
    x.restore();
  };

  FlapBoard.prototype.destroy = function () {
    this.stopIdle();
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.tiles = []; this.grid = [];
  };

  FlapBoard.GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
  FlapBoard.reduced = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  FlapBoard.STEP_MS = 46;               // one card of the drum rolling past
  FlapBoard.DRUM = (' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-/:@&\u2019').split('');

  /* Shared print grain for cards: one small noise tile, made once. */
  FlapBoard.grain = (function () {
    var c = document.createElement('canvas');
    c.width = c.height = 96;
    var x = c.getContext('2d'), d = x.createImageData(96, 96);
    for (var i = 0; i < d.data.length; i += 4) {
      var v = Math.random();
      var light = v > 0.5;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = light ? 255 : 0;
      d.data[i + 3] = Math.round(Math.pow(Math.abs(v - 0.5) * 2, 2.2) * 70);
    }
    x.putImageData(d, 0, 0);
    return c;
  })();
  FlapBoard.texture = function (x, w, h, alpha) {
    var p = x.createPattern(FlapBoard.grain, 'repeat');
    x.save(); x.globalAlpha = alpha == null ? 0.5 : alpha; x.fillStyle = p; x.fillRect(0, 0, w, h); x.restore();
  };

  root.FlapBoard = FlapBoard;
})(window);
