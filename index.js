/*!
 * Bermond — portfolio
 * Scroll-driven split-flap collage. Needs js/flapboard.js and js/flaptext.js;
 * Lenis (smooth scroll) is optional.
 */
(function () {
    'use strict';

    var doc = document, root = doc.documentElement, win = window;
    // the layout width without the scrollbar, for CSS that lines up with the grid
    function setCW() { root.style.setProperty('--cw', root.clientWidth + 'px'); }
    setCW();
    if (win.ResizeObserver) new ResizeObserver(setCW).observe(root);
    var reduce = win.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fine = win.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var F = FlapBoard.face;

    function $(s, c) { return (c || doc).querySelector(s); }
    function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function sstep(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
    function pad(n, l) { n = String(n); while (n.length < l) n = '0' + n; return n; }

    /* Artwork geometry (2× upscaled sources). figure/sun/leaves are crop boxes
       [x, y, w, h] of the cut-outs inside their parent artwork. */
    var ART = {
        art1: { w: 1472, h: 1472, figure: [300, 109, 979, 1101] },
        art2: { w: 1472, h: 1472, figure: [375, 250, 631, 839] },
        art3: { w: 1472, h: 1472, figure: [177, 238, 735, 1116] },
        art4: { w: 1920, h: 2400, figure: [231, 703, 1436, 1681], sun: [144, 254, 1631, 1631], leaves: [849, 72, 1071, 1031] }
    };

    /* ---------- palette ---------- */
    var C = {};
    function readPalette() {
        var cs = getComputedStyle(root);
        ['paper', 'paper-2', 'ink', 'card', 'card-ink', 'red', 'green', 'gold', 'olive', 'oxblood', 'ochre', 'forest', 'orange', 'teal', 'teal-ink']
            .forEach(function (k) { C[k] = cs.getPropertyValue('--' + k).trim(); });
    }
    readPalette();

    /* ---------- assets ---------- */
    var imgCache = {};
    function loadImg(src) {
        if (imgCache[src]) return imgCache[src];
        imgCache[src] = new Promise(function (res) {
            var im = new Image();
            im.decoding = 'async';
            im.onload = function () { res(im); };
            im.onerror = function () { res(null); };
            im.src = src;
        });
        return imgCache[src];
    }
    function art(key) { return loadImg('assets/img/' + key + '.webp'); }
    function figureOf(key) {
        var el = $('img.stage__figure[src*="' + key + '-figure"]');
        if (!el) return loadImg('assets/img/' + key + '-figure.webp');
        return new Promise(function (res) {
            if (el.complete && el.naturalWidth) return res(el);
            el.addEventListener('load', function () { res(el); }, { once: true });
            el.addEventListener('error', function () { res(null); }, { once: true });
        });
    }

    /* Where a cut-out was lifted, the board keeps a halftone imprint of it:
       dots sized by the figure's own tones, printed light on ink. Built once
       per figure from the cut-out itself. */
    function halftone(fig) {
        if (fig._halftone) return fig._halftone;
        var W = fig.naturalWidth, H = fig.naturalHeight, g = 9;
        var c = doc.createElement('canvas');
        c.width = W; c.height = H;
        var x = c.getContext('2d');
        // the silhouette, grown a hair so no fringe of the original survives
        [[-2, 0], [2, 0], [0, -2], [0, 2], [0, 0]].forEach(function (d) { x.drawImage(fig, d[0], d[1]); });
        x.globalCompositeOperation = 'source-in';
        x.fillStyle = '#1A1916';
        x.fillRect(0, 0, W, H);
        try {
            var s = 4, sw = Math.ceil(W / s), sh = Math.ceil(H / s);
            var t = doc.createElement('canvas'); t.width = sw; t.height = sh;
            var tx = t.getContext('2d');
            tx.drawImage(fig, 0, 0, sw, sh);
            var px = tx.getImageData(0, 0, sw, sh).data;
            var lum = new Float32Array(sw * sh), vals = [];
            for (var i = 0; i < sw * sh; i++) {
                var l = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
                lum[i] = l;
                if (px[i * 4 + 3] > 128 && i % 3 === 0) vals.push(l);
            }
            vals.sort(function (a, b) { return a - b; });
            var lo = vals[Math.floor(vals.length * .04)] || 0, hi = vals[Math.floor(vals.length * .97)] || 1;
            x.globalCompositeOperation = 'source-atop';
            x.fillStyle = 'rgba(214,206,190,.82)';
            var R2 = Math.SQRT2, span = (W + H) / R2;
            x.beginPath();
            for (var u = 0; u <= span + g; u += g) {
                for (var v = -H / R2 - g; v <= W / R2 + g; v += g) {
                    var X = (u + v) / R2, Y = (u - v) / R2;
                    if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
                    var li = lum[Math.min(sh - 1, Math.floor(Y / s)) * sw + Math.min(sw - 1, Math.floor(X / s))];
                    var L = Math.pow(clamp((li - lo) / Math.max(hi - lo, 0.001), 0, 1), 0.85);
                    var r = (g / 2) * Math.sqrt(L) * 1.12;
                    if (r < 0.4) continue;
                    x.moveTo(X + r, Y);
                    x.arc(X, Y, r, 0, Math.PI * 2);
                }
            }
            x.fill();
        } catch (e) { /* pixels unavailable (file://): keep the plain silhouette */ }
        return (fig._halftone = c);
    }

    /* The artwork with the halftone imprint where its cut-out was lifted —
       the board shows this, the cut-out floats above it. Works for any
       source resolution: the box is scaled from ART's 2× space. */
    function plate(img, fig, box, key) {
        var c = doc.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        var x = c.getContext('2d');
        x.drawImage(img, 0, 0);
        if (fig) {
            var k = c.width / ART[key].w;
            x.drawImage(halftone(fig), box[0] * k, box[1] * k, box[2] * k, box[3] * k);
        }
        // in dark mode the paper of the artworks would glow: tone it down evenly
        if (currentTheme() === 'dark') {
            x.globalCompositeOperation = 'multiply';
            x.fillStyle = 'rgb(205,199,188)';
            x.fillRect(0, 0, c.width, c.height);
            x.globalCompositeOperation = 'source-over';
        }
        return c;
    }

    /* ---------- woven filler (kente) ----------
       Kente is woven in narrow strips that are sewn edge to edge, so each board
       column is one strip with a single motif repeating down it, offset from
       its neighbours: three motifs, plus plain black and olive strips. */
    var STRIPS = ['warp', 'black', 'weft', 'olive', 'lozenge', 'black', 'weft', 'warp'];
    function weave(kind, alt, dim) {
        var id = 'kente-' + kind + (alt ? 1 : 0) + (dim ? 'd' : '') + C.card + C.gold;
        return F.tex(id, function (x, w, h) {
            var g = C.gold, gr = C.green, r = C.red, k = C.card, o = C.olive;
            var m = Math.max(1, Math.round(w / 48));            // 1px of misregistration
            x.fillStyle = k; x.fillRect(0, 0, w, h);
            if (kind === 'warp') {                              // gold field, thin warp threads
                x.fillStyle = alt ? gr : g; x.fillRect(0, 0, w, h);
                var th = [[.16, .05, k], [.3, .09, alt ? g : gr], [.47, .06, r], [.61, .09, alt ? g : gr], [.79, .05, k]];
                th.forEach(function (t, i) { x.fillStyle = t[2]; x.fillRect(w * t[0] + (i % 2 ? m : 0), 0, Math.max(1, w * t[1]), h); });
            } else if (kind === 'weft') {                       // stacked weft blocks
                var bands = alt ? [g, k, gr, k, g] : [gr, g, k, r, g];
                for (var i = 0; i < bands.length; i++) { x.fillStyle = bands[i]; x.fillRect(0, i * h / bands.length + (i % 2 ? m : 0), w, h / bands.length + 1); }
            } else if (kind === 'lozenge') {                     // red/green field, gold lozenge
                x.fillStyle = alt ? gr : r; x.fillRect(0, 0, w, h);
                x.fillStyle = g;
                x.beginPath(); x.moveTo(w / 2 + m, h * .16); x.lineTo(w * .84, h / 2); x.lineTo(w / 2, h * .84); x.lineTo(w * .16 + m, h / 2); x.closePath(); x.fill();
                x.fillStyle = k;
                x.beginPath(); x.moveTo(w / 2, h * .36); x.lineTo(w * .64, h / 2); x.lineTo(w / 2, h * .64); x.lineTo(w * .36, h / 2); x.closePath(); x.fill();
            } else if (kind === 'olive') {
                x.fillStyle = o; x.fillRect(0, 0, w, h);
            }
            FlapBoard.texture(x, w, h, 0.6);
            if (dim) { x.fillStyle = 'rgba(0,0,0,.16)'; x.fillRect(0, 0, w, h); }
        });
    }
    function hash(t, salt) {
        var h = (t.r * 374761393 + t.c * 668265263 + (salt || 0) * 1442695041) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return (h ^ (h >>> 16)) >>> 0;
    }
    /* `sparse`: around a message only part of the weave stays, dimmed, so
       the words read first */
    function filler(t, salt, sparse) {
        var kind = STRIPS[(t.c + (salt || 0)) % STRIPS.length];
        if (kind === 'black') return card(' ');
        // the motif repeats every other row, offset by column
        var on = (t.r + t.c + (salt || 0)) % 2 === 0;
        if (!on && kind !== 'olive') return card(' ');
        if (sparse && hash(t, salt) % 100 >= 62) return card(' ');
        return weave(kind, ((t.r >> 1) + t.c) % 2 === 1, sparse);
    }
    function card(ch) { return F.char(ch, C.card, C['card-ink']); }
    function isLetter(f) { return !!f && f.k === 'char' && f.ch !== ' '; }

    /* A tile of a message board: the letter, a one-tile margin of plain
       cards around the words, then the thinned weave. */
    function msgFace(map, t, salt) {
        var ch = map[t.r + ':' + t.c];
        if (ch) return card(ch);
        for (var dr = -1; dr <= 1; dr++) {
            for (var dc = -1; dc <= 1; dc++) {
                if (map[(t.r + dr) + ':' + (t.c + dc)]) return card(' ');
            }
        }
        return filler(t, salt, true);
    }

    /* The words of a laid-out message, each as a list of [row, col]. */
    function wordsOf(map) {
        var cells = Object.keys(map).map(function (k) { var q = k.split(':'); return [+q[0], +q[1]]; })
            .sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
        var words = [], cur = null;
        cells.forEach(function (q) {
            if (map[q[0] + ':' + q[1]] === ' ') { cur = null; return; }
            if (cur && cur.r === q[0] && cur.c === q[1] - 1) { cur.cells.push(q); cur.c = q[1]; }
            else { cur = { r: q[0], c: q[1], cells: [q] }; words.push(cur); }
        });
        return words.map(function (w) { return w.cells; });
    }

    /* How much of each tile a cut-out hides at rest (0..1), from its alpha. */
    function coverageOf(board, fig) {
        var key = board.cssW + 'x' + board.cssH + fig.style.cssText.slice(0, 80);
        if (fig._cov && fig._cov.key === key) return fig._cov.map;
        var map = null;
        try {
            var k = 0.25, W = Math.max(1, Math.round(board.cssW * k)), H = Math.max(1, Math.round(board.cssH * k));
            var c = doc.createElement('canvas'); c.width = W; c.height = H;
            var x = c.getContext('2d');
            x.drawImage(fig, parseFloat(fig.style.left) * k, parseFloat(fig.style.top) * k, parseFloat(fig.style.width) * k, parseFloat(fig.style.height) * k);
            var d = x.getImageData(0, 0, W, H).data, q = k / board.dpr;
            map = board.tiles.map(function (t) {
                var x0 = Math.floor(t.x * q), y0 = Math.floor(t.y * q), x1 = Math.ceil((t.x + t.w) * q), y1 = Math.ceil((t.y + t.h) * q);
                var n = 0, hit = 0;
                for (var yy = y0; yy < y1 && yy < H; yy++) for (var xx = x0; xx < x1 && xx < W; xx++) { n++; if (d[(yy * W + xx) * 4 + 3] > 128) hit++; }
                return n ? hit / n : 0;
            });
        } catch (e) { map = null; }
        fig._cov = { key: key, map: map };
        return map;
    }

    /* The tiles of the hidden word a tile belongs to, in reading order. */
    function wordAt(board, words, t) {
        for (var i = 0; i < words.length; i++) {
            var w = words[i];
            for (var j = 0; j < w.length; j++) {
                if (w[j][0] === t.r && w[j][1] === t.c) return w.map(function (q) { return board.at(q[0], q[1]); }).filter(Boolean);
            }
        }
        return null;
    }

    /* Idle reveal of one whole hidden word, left to right: words of three
       letters or more, from `allow` when given, and none the cut-out hides. */
    function wordPick(board, words, opt) {
        opt = opt || {};
        var cov = opt.fig ? coverageOf(board, opt.fig) : null;
        words = words.filter(function (w) {
            if (w.length < 3) return false;
            if (opt.allow && opt.map) {
                var text = w.map(function (q) { return opt.map[q[0] + ':' + q[1]]; }).join('');
                if (opt.allow.indexOf(text) < 0) return false;
            }
            if (opt.fig) {
                if (!cov) return false;
                for (var i = 0; i < w.length; i++) {
                    var t = board.at(w[i][0], w[i][1]);
                    if (!t || cov[t.i] > 0.1) return false;
                }
            }
            return true;
        });
        if (!words.length) return null;
        var w = words[(Math.random() * words.length) | 0];
        return w.map(function (q) { return board.at(q[0], q[1]); }).filter(Boolean);
    }

    /* Lay a message out on a board region: greedy word wrap, centred block.
       Words may carry soft hyphens (­) marking where they can break. */
    function layout(text, region) {
        var width = region.c1 - region.c0, height = region.r1 - region.r0;
        var SHY = '­';
        var lines = [], line = '';
        function push(w) {
            if (!line) line = w;
            else if ((line + ' ' + w).length <= width) line += ' ' + w;
            else { lines.push(line); line = w; }
        }
        text.split(' ').forEach(function (word) {
            var plain = word.split(SHY).join('');
            if (plain.length <= width) { push(plain); return; }
            var parts = word.split(SHY), cur = '';
            parts.forEach(function (part, i) {
                var last = i === parts.length - 1;
                if ((cur + part).length + (last ? 0 : 1) <= width) cur += part;
                else { if (cur) push(cur + '-'), lines.push(line), line = ''; cur = part; }
            });
            while (cur.length > width) { push(cur.slice(0, width - 1) + '-'); lines.push(line); line = ''; cur = cur.slice(width - 1); }
            push(cur);
        });
        if (line) lines.push(line);
        lines = lines.slice(0, height);
        var map = {};
        var top = region.r0 + Math.floor((height - lines.length) / 2);
        var longest = lines.reduce(function (m, l) { return Math.max(m, l.length); }, 0);
        var left = region.align === 'left' ? region.c0 : region.c0 + Math.floor((width - longest) / 2);
        lines.forEach(function (l, i) {
            for (var k = 0; k < l.length; k++) map[(top + i) + ':' + (left + k)] = l[k];
        });
        return map;
    }

    /* Temporary ripple of pokes around a tile (taps on touch screens). */
    function ripple(board, t, radius, speed, hold) {
        board.tiles.forEach(function (n) {
            var d = Math.hypot(n.r - t.r, n.c - t.c);
            if (d <= radius) board.poke(n, d * speed, hold - d * 60);
        });
    }

    /* Wire pointer interaction + idle behaviour + visibility for a board. */
    var boards = [];
    function interactive(board, canvas, opt) {
        opt = opt || {};
        canvas.addEventListener('pointermove', function (e) {
            if (e.pointerType === 'touch') return;
            var r = canvas.getBoundingClientRect();
            board.hover(e.clientX - r.left, e.clientY - r.top, opt.hover);
        });
        canvas.addEventListener('pointerleave', function () { board.leave(); });
        canvas.addEventListener('pointerdown', function (e) {
            var r = canvas.getBoundingClientRect();
            var t = board.tileAt(e.clientX - r.left, e.clientY - r.top);
            if (t) ripple(board, t, opt.ripple || 2.2, 70, 1500);
        });
        // random chains never touch letters, shown or hidden, so they can't
        // spell half a word; whole words are revealed through `pick`
        var skip = function (t) { return isLetter(t.home) || isLetter(board.o.alt && board.o.alt(t)); };
        if (!reduce && opt.idle !== false) board.idle(Object.assign({ skip: skip }, opt.idle));
        board.visible = false;
        new IntersectionObserver(function (es) {
            var v = es[0].isIntersecting;
            if (v && !board.visible) board.quiet(1500);
            board.visible = v;
        }, { rootMargin: '100px' }).observe(canvas);
        boards.push(board);
        return board;
    }

    /* A soft silhouette shadow for a cut-out, rendered tiny once and scaled up
       by CSS: moving it or fading it never re-runs a blur. */
    function silhouette(src, color, down) {
        var w = Math.max(8, Math.round(src.naturalWidth / down)), h = Math.max(8, Math.round(src.naturalHeight / down));
        var pad = 6;
        var tiny = doc.createElement('canvas');
        tiny.width = w + pad * 2; tiny.height = h + pad * 2;
        var tx = tiny.getContext('2d');
        if ('filter' in tx) tx.filter = 'blur(2.5px)';
        tx.drawImage(src, pad, pad, w, h);
        tx.filter = 'none';
        tx.globalCompositeOperation = 'source-in';
        tx.fillStyle = color;
        tx.fillRect(0, 0, tiny.width, tiny.height);
        var c = doc.createElement('canvas');
        c.width = tiny.width * 4; c.height = tiny.height * 4;
        var cx = c.getContext('2d');
        cx.imageSmoothingEnabled = true;
        cx.imageSmoothingQuality = 'high';
        cx.drawImage(tiny, 0, 0, c.width, c.height);
        c._pad = pad / w;
        c.setAttribute('aria-hidden', 'true');
        return c;
    }

    function shadowFor(fig, src) {
        if (!src || !src.naturalWidth) return null;
        var c = silhouette(src, 'rgb(24,16,8)', 16);
        c.className = 'stage__shadow';
        c.style.width = c.style.height = '0px';      // sized by register(); never at its bitmap size
        fig.parentNode.insertBefore(c, fig);
        fig._shadow = c;
        return c;
    }

    /* Place a cut-out (and its shadow) over its board so it registers with
       the artwork. */
    function register(fig, board, key, box) {
        var m = board.mapping(key);
        if (!m) return;
        var src = board.sources[key].img, k = (src.naturalWidth || src.width) / ART[key].w;
        var sc = m.scale * k;
        var x = m.x + box[0] * sc, y = m.y + box[1] * sc, w = box[2] * sc, h = box[3] * sc;
        fig.style.left = x + 'px'; fig.style.top = y + 'px';
        fig.style.width = w + 'px'; fig.style.height = h + 'px';
        var sh = fig._shadow;
        if (sh) {
            var p = sh._pad * w;
            sh.style.left = (x - p) + 'px'; sh.style.top = (y - p) + 'px';
            sh.style.width = (w + 2 * p) + 'px'; sh.style.height = (h + 2 * p) + 'px';
        }
    }

    /* Move a cut-out and let its shadow trail it; `lift` 0..1 deepens it. */
    function pose(fig, stage, x, y, scale, sx, sy, lift, alpha) {
        var t = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) scale(' + scale.toFixed(4) + ')';
        fig.style.transform = t;
        var sh = fig._shadow;
        if (!sh) return;
        sh.style.transform = 'translate3d(' + (x + sx).toFixed(2) + 'px,' + (y + sy).toFixed(2) + 'px,0) scale(' + (scale * (1 + lift * 0.03)).toFixed(4) + ')';
        sh.style.opacity = stage.classList.contains('is-ready') ? ((0.16 + lift * 0.34) * (alpha == null ? 1 : alpha)).toFixed(3) : '0';
    }

    /* Tiles that are mostly free of the figure's bounding box. */
    function freeRegion(board, key, box, minCols) {
        var m = board.mapping(key);
        var cw = board.cssW / board.cols;
        var src = board.sources[key].img, k = (src.naturalWidth || src.width) / ART[key].w;
        var x0 = m ? m.x + box[0] * m.scale * k : 0, x1 = m ? m.x + (box[0] + box[2]) * m.scale * k : 0;
        var leftCols = Math.floor(x0 / cw), rightStart = Math.ceil(x1 / cw);
        var right = board.cols - rightStart;
        if (right >= minCols && right >= leftCols) return { c0: rightStart, c1: board.cols, r0: 0, r1: board.rows, side: 'right' };
        if (leftCols >= minCols) return { c0: 0, c1: leftCols, r0: 0, r1: board.rows, side: 'left' };
        return null;
    }

    /* ======================================================================
       Smooth scroll + frame loop
       ====================================================================== */
    var lenis = null;
    if (!reduce && typeof win.Lenis === 'function') {
        lenis = new win.Lenis({ lerp: 0.095, smoothWheel: true, wheelMultiplier: 0.95 });
    }
    var scrollY = win.scrollY, vh = win.innerHeight, vw = win.innerWidth;
    var ticks = [];
    function loop(t) {
        if (lenis) lenis.raf(t);
        scrollY = win.scrollY;
        for (var i = 0; i < ticks.length; i++) ticks[i](t);
        requestAnimationFrame(loop);
    }

    function scrollTo(target) {
        if (lenis) lenis.scrollTo(target, { duration: 1.5, easing: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; } });
        else (typeof target === 'number' ? win.scrollTo(0, target) : target.scrollIntoView());
    }
    $$('a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function (e) {
            var id = a.getAttribute('href');
            var el = id === '#top' ? doc.body : $(id);
            if (!el) return;
            e.preventDefault();
            scrollTo(id === '#top' ? 0 : el);
            if (id !== '#top') history.replaceState(null, '', id);
        });
    });

    /* Offsets of tall scroll scenes, cached and refreshed on resize. */
    function sceneRange(el) {
        var r = el.getBoundingClientRect();
        var sticky = el.firstElementChild;
        return { top: r.top + win.scrollY, height: el.offsetHeight, view: sticky ? sticky.offsetHeight : win.innerHeight };
    }

    /* ======================================================================
       Hero
       ====================================================================== */
    var hero = (function () {
        var section = $('.hero');
        var stage = $('.hero__stage');
        var canvas = $('canvas', stage), fig = $('.stage__figure', stage);
        var accents = $$('.acc', section);
        var box = ART.art1.figure;
        var msg = {}, words = [], state = 'img', ready = false, stageTop = 0;
        var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
        // same breakpoint as the stacked hero in main.css
        var stacked = win.matchMedia('(max-width: 767px), (max-width: 1100px) and (orientation: portrait)');

        var board = new FlapBoard(canvas, {
            cols: 8, aspect: 1.28, gap: 3, radius: 2, split: 1, duration: 620,
            group: function (t) { return state === 'img' ? wordAt(board, words, t) : null; },
            face: function (t) { return reduce ? F.img('art1') : filler(t, 7); },
            // what a flipped tile shows: the message under the image, the image under the message
            alt: function (t) { return state === 'msg' ? F.img('art1') : messageFace(t); }
        });
        function messageFace(t) { return msgFace(msg, t, 1); }
        board.on('layout', function () {
            register(fig, board, 'art1', box);
            var r0 = Math.max(0, board.rows - 4);
            msg = layout('HELLO I\u2019M BERMOND', { c0: 0, c1: board.cols, r0: r0, r1: board.rows });
            words = wordsOf(msg);
            measure();
        });
        function measure() { stageTop = stage.getBoundingClientRect().top + win.scrollY; }

        function init(img, figImg) {
            shadowFor(fig, figImg);
            board.setSource('art1', plate(img, figImg, box, 'art1'), { fx: 0.5, fy: 0.42 });
            board.resize();
            if (reduce) stage.classList.add('is-ready');
            ready = true;
        }

        /* opening: the board assembles the artwork tile by tile, then the
           cut-out settles into its silhouette */
        var idleOpt = { pick: function () { return state === 'img' && Math.random() < 0.45 ? wordPick(board, words, { map: msg, allow: ['BERMOND'], fig: fig }) : null; } };
        function intro(delay) {
            if (reduce) { interactive(board, canvas, { hover: { hold: 1500, chain: 2 }, idle: idleOpt }); return; }
            board.wave(function () { return F.img('art1'); }, { origin: [0, board.cols], speed: 62, jitter: 90, cycle: 2, delay: delay || 0 });
            setTimeout(function () { stage.classList.add('is-ready'); }, (delay || 0) + 760);
            setTimeout(function () { interactive(board, canvas, { hover: { hold: 1500, chain: 2 }, idle: idleOpt }); board.quiet(2000); }, (delay || 0) + 1300);
        }

        section.addEventListener('pointermove', function (e) {
            mouse.tx = (e.clientX / vw - 0.5) * 2;
            mouse.ty = (e.clientY / vh - 0.5) * 2;
        });
        section.addEventListener('pointerleave', function () { mouse.tx = mouse.ty = 0; });

        function tick() {
            if (!ready) return;
            var h = section.offsetHeight;
            var p = clamp(scrollY / h, 0, 1.2);
            if (p > 1.05) return;
            mouse.x = lerp(mouse.x, mouse.tx, 0.07);
            mouse.y = lerp(mouse.y, mouse.ty, 0.07);
            var mx = reduce ? 0 : mouse.x, my = reduce ? 0 : mouse.y;
            // where the board flips to its message: side by side, a quarter of
            // the way down the hero; stacked, once the board's top has passed
            // a fifth of the screen (so the whole board is in view)
            var T = stacked.matches ? stageTop - vh * 0.2 : h * 0.24;
            var want = scrollY > T ? 'msg' : scrollY < T - 50 ? 'img' : state;
            if (want !== state) {
                state = want;
                section.classList.toggle('is-msg', state === 'msg');
                var o = [(fig.offsetTop + fig.offsetHeight * 0.3) / (board.cssH / board.rows), (fig.offsetLeft + fig.offsetWidth * 0.55) / (board.cssW / board.cols)];
                if (state === 'msg') board.wave(messageFace, { origin: o, speed: 70, jitter: 60, cycle: 2 });
                else board.wave(function () { return F.img('art1'); }, { origin: [board.rows, 0], speed: 55, jitter: 40 });
            }
            var lift = reduce ? 0 : sstep(0, 0.5, p);
            // the cut-out lifts off its imprint a little, then — once the
            // message is on its way — out-scrolls the board (closer things move
            // faster) and uncovers the rows where the words land
            var after = reduce ? 0 : clamp((scrollY - T + vh * 0.05) / (vh * 0.36), 0, 1.6);
            var rise = sstep(0, 1, Math.min(after, 1)) * board.cssH * 0.58 + Math.max(0, after - 1) * board.cssH * 0.3;
            pose(fig, stage, mx * 9 - lift * 16, my * 6 - lift * 22 - rise, 1 + lift * 0.06, -mx * 7 + 6 + lift * 10, 10 + my * 4 + lift * 28, lift);
            // side by side, the board lags the scroll a little; stacked, content sits under it
            var drift = stacked.matches ? 0 : p * 60;
            canvas.style.transform = 'translate3d(' + (-mx * 3).toFixed(2) + 'px,' + (-my * 2 + drift).toFixed(2) + 'px,0)';
            for (var i = 0; i < accents.length; i++) {
                var d = accents[i]._d || (accents[i]._d = parseFloat(accents[i].getAttribute('data-depth')) || 0.5);
                accents[i].style.transform = 'translate3d(' + (mx * d * 14).toFixed(2) + 'px,' + (my * d * 9 - p * d * 120).toFixed(2) + 'px,0)';
            }
        }
        ticks.push(tick);

        return { board: board, init: init, intro: intro, section: section, measure: measure };
    })();

    /* ======================================================================
       Manifesto wall — the image flips into words and back as you scroll
       ====================================================================== */
    var wall = (function () {
        var section = $('.wall');
        var stage = $('.wall__stage');
        var canvas = $('canvas', stage), fig = $('.stage__figure', stage);
        var stepEl = $('[data-wall-step]');
        var box = ART.art3.figure;
        var range = { top: 0, height: 1 };
        var stageIdx = -1, ready = false, region = null, fitsBeside = true;
        var maps = [{}, {}], words = [];
        var MSG = ['EVERY IMAGE HAS A STORY BENEATH', 'DESIGN THAT FLIPS THE SCRIPT'];
        var stepText = null;

        var board = new FlapBoard(canvas, {
            cols: 22, aspect: 1.3, gap: 3, radius: 2, split: 1, duration: 600,
            group: function (t) { return stageIdx <= 0 || stageIdx === 3 ? wordAt(board, words, t) : null; },
            face: function () { return F.img('art3'); },
            alt: function (t) { return t.home && t.home.k === 'img' ? (faceFor(1, t)) : F.img('art3'); }
        });

        function faceFor(i, t) {
            if (i === 0 || i === 3) return F.img('art3');
            return msgFace(maps[i - 1], t, i + 2);
        }

        board.on('layout', function () {
            register(fig, board, 'art3', box);
            region = freeRegion(board, 'art3', box, 7);
            fitsBeside = !!region;
            var reg = region || { c0: 0, c1: board.cols, r0: 0, r1: board.rows };
            maps = MSG.map(function (m) { return layout(m, reg); });
            words = wordsOf(maps[0]);
            if (stageIdx > 0) { var s = stageIdx; stageIdx = -1; apply(s, true); }
        });

        function cols() {
            var w = stage.clientWidth;
            return clamp(Math.round(w / (w < 700 ? 44 : 62)), 8, 24);
        }

        function init(img, figImg) {
            board.o.cols = cols();
            shadowFor(fig, figImg);
            board.setSource('art3', plate(img, figImg, box, 'art3'), { fx: 0.12, fy: 0.16 });
            board.resize();
            stage.classList.add('is-ready');
            interactive(board, canvas, {
                hover: { hold: 1200, chain: 2 },
                idle: {
                    every: [900, 2000], chain: [2, 4], hold: [700, 1300],
                    // while the image shows, now and then a whole word of the story surfaces
                    pick: function () { return (stageIdx <= 0 || stageIdx === 3) && Math.random() < 0.5 ? wordPick(board, words, { map: maps[0], allow: ['IMAGE', 'STORY'], fig: fig }) : null; }
                }
            });
            stepText = stepEl ? new FlapText(stepEl, { duration: 420 }) : null;
            ready = true;
            measure();
            // the wall spans the viewport: on big/retina screens fetch the 4× art
            if (stage.clientWidth * Math.min(win.devicePixelRatio || 1, 2) > 1700) {
                setTimeout(function () {
                    loadImg('assets/img/art3-4x.avif').then(function (im) { return im || loadImg('assets/img/art3-4x.webp'); }).then(function (big) {
                        if (!big) return;
                        loaded.art3[3] = big;
                        board.setSource('art3', plate(big, figImg, box, 'art3'), { fx: 0.12, fy: 0.16 });
                        board.emit('layout', board);
                    });
                }, 1800);
            }
        }

        function apply(s, instant) {
            if (s === stageIdx) return;
            var prev = stageIdx;
            stageIdx = s;
            board.quiet(2200);
            var rows = board.rows, colsN = board.cols;
            var head = [(fig.offsetTop + fig.offsetHeight * .25) / (board.cssH / rows), (fig.offsetLeft + fig.offsetWidth * .5) / (board.cssW / colsN)];
            var origin = s === 1 ? head : s === 2 ? [0, colsN] : s === 3 ? [rows, 0] : [rows, colsN];
            if (prev > s && s === 0) origin = [0, 0];
            board.wave(function (t) { return faceFor(s, t); }, { origin: origin, speed: instant ? 0 : 42, jitter: instant ? 0 : 50, cycle: instant ? 0 : 2 });
            if (stepText) stepText.set(pad(s === 0 || s === 3 ? 1 : s + 1, 2), { cycle: 1 });
        }

        function measure() { range = sceneRange(section); }

        function tick() {
            if (!ready) return;
            var p = clamp((scrollY - range.top) / Math.max(1, range.height - range.view), 0, 1);
            var s = p < 0.13 ? 0 : p < 0.43 ? 1 : p < 0.72 ? 2 : 3;
            apply(s);
            var lift = reduce ? 0 : sstep(0.06, 0.22, p) * (1 - sstep(0.74, 0.9, p));
            var away = fitsBeside ? 0 : sstep(0.1, 0.2, p) * (1 - sstep(0.74, 0.86, p));
            pose(fig, stage, -lift * 14, -lift * 26 + away * 60, 1 + lift * 0.06, 8 + lift * 14, 8 + lift * 30, lift, 1 - away);
            fig.style.opacity = (1 - away).toFixed(3);
        }
        ticks.push(tick);

        return { board: board, init: init, measure: measure, resize: function () { board.o.cols = cols(); } };
    })();

    /* ======================================================================
       Selected work — a split-flap preview that follows the cursor
       ====================================================================== */
    var work = (function () {
        var list = $('.work__list');
        var items = $$('.work__item');
        var preview = $('.preview');
        var label = $('.preview__label');
        var canvas = $('canvas', preview);
        var current = null, pos = { x: 0, y: 0, tx: 0, ty: 0 }, on = false;
        var board = new FlapBoard(canvas, {
            cols: 4, rows: 5, gap: 3, radius: 2, split: 1, duration: 520,
            face: function () { return F.clear(); }
        });
        var thumbs = [];

        function init() {
            new IntersectionObserver(function (es, ob) {
                if (!es[0].isIntersecting) return;
                ob.disconnect();
                // each project gets its own crop, so the previews don't just repeat
                // the boards above: the kente wrap, the gold foil, the collage
                // blocks, the sun and leaves
                var CROP = {
                    art1: { zoom: 1.85, fx: 0.42, fy: 0.08 },
                    art2: { zoom: 1.7, fx: 0.86, fy: 0.3 },
                    art3: { zoom: 1.5, fx: 0.25, fy: 0.3 },
                    art4: { zoom: 1.45, fx: 0.72, fy: 0.12 }
                };
                ['art1', 'art2', 'art3', 'art4'].forEach(function (k) {
                    art(k).then(function (im) { if (im) { board.setSource(k, im, CROP[k]); thumbs.forEach(function (b) { if (b.key === k) { b.setSource(k, im, CROP[k]); b.draw(); } }); } });
                });
            }, { rootMargin: '900px 0px' }).observe(list);
            if (fine) board.resize(canvas.clientWidth || 280, canvas.clientHeight || 350);
            items.forEach(function (it) {
                var row = $('[data-flap-row]', it);
                var ft = row ? new FlapText(row, { duration: 380, stagger: 22, rest: 'text' }) : null;
                it.addEventListener('mouseenter', function () {
                    if (!fine) return;
                    show(it);
                    if (ft) ft.knock({ stagger: 26, duration: 420 });
                });
                // mobile: a small board per row that flips to its artwork in view
                var th = $('.work__thumb', it);
                if (!fine && th) {
                    var key = it.getAttribute('data-art');
                    var tb = new FlapBoard(th, { cols: 2, rows: 3, gap: 2, radius: 2, split: 1, duration: 520, face: function () { return F.fill(C.card); } });
                    tb.key = key;
                    tb.resize();
                    thumbs.push(tb);
                    new IntersectionObserver(function (es) {
                        if (es[0].isIntersecting) tb.wave(function () { return F.img(key); }, { origin: [0, 0], speed: 90 });
                    }, { threshold: 0.6 }).observe(th);
                }
            });
            if (!fine) return;
            list.addEventListener('mouseleave', hide);
            win.addEventListener('pointermove', function (e) { pos.tx = e.clientX; pos.ty = e.clientY; });
            ticks.push(tick);
        }

        function show(it) {
            if (current === it) return;
            items.forEach(function (i) { i.classList.toggle('is-hover', i === it); });
            list.classList.add('is-hovering');
            var key = it.getAttribute('data-art');
            var from = current ? items.indexOf(current) : -1, to = items.indexOf(it);
            current = it;
            if (!on) { pos.x = pos.tx; pos.y = pos.ty; }
            on = true;
            preview.classList.add('is-on');
            label.textContent = $('.work__tags', it).textContent;
            // moving down the list flips top → bottom, moving up flips bottom → top
            var origin = from > to ? [board.rows, board.cols] : [0, 0];
            board.wave(function () { return F.img(key); }, { origin: origin, speed: 38, jitter: 30 });
        }

        function hide() {
            items.forEach(function (i) { i.classList.remove('is-hover'); });
            list.classList.remove('is-hovering');
            current = null;
            on = false;
            preview.classList.remove('is-on');
            board.wave(function () { return F.clear(); }, { origin: [board.rows, 0], speed: 20 });
        }

        function tick() {
            if (!on && preview.style.opacity === '0') return;
            pos.x = lerp(pos.x, pos.tx, 0.14);
            pos.y = lerp(pos.y, pos.ty, 0.14);
            var w = preview.offsetWidth, h = preview.offsetHeight;
            var x = clamp(pos.x + 28, 8, vw - w - 8), y = clamp(pos.y - h / 2, 70, vh - h - 30);
            var tilt = clamp((pos.tx - pos.x) * 0.04, -6, 6);
            preview.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + tilt.toFixed(2) + 'deg)';
        }

        return { init: init, board: board };
    })();

    /* ======================================================================
       Layers — one collage pulled apart along Z
       ====================================================================== */
    var layers = (function () {
        var section = $('.layers');
        var rig = $('.layers__rig');
        var canvas = $('.layers__board canvas');
        var range = { top: 0, height: 1 };
        var exploded = -1;
        var A = ART.art4;
        var tilt = { x: 0, y: 0, tx: 0, ty: 0 };
        var scene = $('.layers__scene'), labelsBox = $('.layers__labels');
        var labels = $$('.layers__label');
        var geo = null;
        // where each label points: a spot on the left edge of its layer, as
        // fractions of the artboard from its centre
        // visible spots on each layer, as fractions of the artboard from its
        // centre: the field's top corner, the sun's rim, the shirt's shoulder, a
        // leaf tip. The stack turns so the deeper layers slide left, which
        // keeps the left side of every layer in view
        var ANCHOR = [[-0.5, -0.47], [-0.42, -0.054], [-0.315, 0.417], [-0.052, -0.32]];
        var LZ = $$('.layer', rig).map(function (l) { return parseFloat(l.getAttribute('data-z')) || 0; });
        function measureGeo() {
            var sr = scene.getBoundingClientRect(), lr = labelsBox.getBoundingClientRect();
            var cs = getComputedStyle(scene).perspectiveOrigin.split(' ');
            geo = {
                ox: parseFloat(cs[0]), oy: parseFloat(cs[1]),
                cx: sr.width / 2, cy: sr.height / 2,
                dx: sr.left - lr.left, dy: sr.top - lr.top,
                w: rig.offsetWidth, h: rig.offsetHeight,
                d: parseFloat(getComputedStyle(scene).perspective) || 1700,
                lw: labels.map(function (l) { return l.offsetWidth; }), lh: labels.length ? labels[0].offsetHeight : 14
            };
        }
        function project(px, py, pz, rx, ry, rz, sc) {
            px *= sc; py *= sc;
            var c = Math.cos(rz), s = Math.sin(rz);
            var x1 = px * c - py * s, y1 = px * s + py * c, z1 = pz;
            c = Math.cos(ry); s = Math.sin(ry);
            var x2 = x1 * c + z1 * s, z2 = -x1 * s + z1 * c;
            c = Math.cos(rx); s = Math.sin(rx);
            var y3 = y1 * c - z2 * s, z3 = y1 * s + z2 * c;
            var k = geo.d / (geo.d - z3);
            return [geo.ox + (geo.cx + x2 - geo.ox) * k, geo.oy + (geo.cy + y3 - geo.oy) * k];
        }
        section.addEventListener('pointermove', function (e) {
            tilt.tx = (e.clientX / vw - 0.5) * 2; tilt.ty = (e.clientY / vh - 0.5) * 2;
        });
        section.addEventListener('pointerleave', function () { tilt.tx = tilt.ty = 0; });
        var ROWS = [
            ['01', 'FIELD', '-360'],
            ['02', 'SUN', '-170'],
            ['03', 'PORTRAIT', '+040'],
            ['04', 'FOLIAGE', '+230']
        ];
        var board = new FlapBoard(canvas, {
            cols: 21, rows: 4, gap: 2, radius: 1.5, split: 1, duration: 480, glyph: 0.62, gloss: true,
            face: function (t) { return text(t, false); }
        });

        var COLS = [0, 6, 16];
        function text(t, open) {
            var row = ROWS[t.r], c = t.c;
            var bg = '#163A3C', fg = '#EAF4F1';
            for (var k = 2; k >= 0; k--) {
                if (c >= COLS[k]) {
                    var s = row[k];
                    if (k === 2 && !open) s = '0000';
                    var ch = s[c - COLS[k]];
                    return F.char(ch == null ? ' ' : ch, bg, fg);
                }
            }
            return F.char(' ', bg, fg);
        }

        function place() {
            // position each cut-out inside the rig as a % of the artwork, with a
            // pre-blurred silhouette beneath it that only ever fades in and out
            [['sun', '.layer--sun img'], ['figure', '.layer--figure img'], ['leaves', '.layer--leaves img']].forEach(function (p) {
                var b = A[p[0]], el = $(p[1], rig);
                el.style.left = (b[0] / A.w * 100) + '%';
                el.style.top = (b[1] / A.h * 100) + '%';
                el.style.width = (b[2] / A.w * 100) + '%';
                el.style.height = (b[3] / A.h * 100) + '%';
                function shade() {
                    var c = silhouette(el, 'rgb(8,30,32)', 20), pd = c._pad * 100;
                    c.className = 'layer__shade';
                    c.style.left = (b[0] / A.w * 100 - pd * b[2] / A.w) + '%';
                    c.style.top = (b[1] / A.h * 100 - pd * b[2] / A.h) + '%';
                    c.style.width = (b[2] / A.w * 100 * (1 + 2 * c._pad)) + '%';
                    c.style.height = ((b[3] + 2 * c._pad * b[2]) / A.h * 100) + '%';
                    el.parentNode.insertBefore(c, el);
                }
                if (el.complete && el.naturalWidth) shade(); else el.addEventListener('load', shade, { once: true });
            });
            $$('.layer', rig).forEach(function (l) { l.style.setProperty('--z', l.getAttribute('data-z')); });
        }

        /* flap edges: a row of tiles above the section flips to teal as you
           arrive (pulling the colour up); a row below retracts as you leave */
        var edgeBoards = [];
        function edges() {
            $$('.flap-edge', section).forEach(function (wrap) {
                var top = wrap.classList.contains('flap-edge--top');
                var cv = $('canvas', wrap);
                var eb = new FlapBoard(cv, {
                    cols: clamp(Math.round(cv.clientWidth / 64), 8, 28), rows: 1, gap: 0, radius: 0, split: 1, duration: 520, gloss: true,
                    face: function () { return top ? F.clear() : F.fill(getComputedStyle(section).backgroundColor); }
                });
                eb.resize();
                boards.push(eb);
                edgeBoards.push({ board: eb, top: top, el: wrap, on: !top });
            });
        }
        function edgeTick() {
            for (var i = 0; i < edgeBoards.length; i++) {
                var e = edgeBoards[i];
                var y = (e.top ? range.top - e.el.offsetHeight : range.top + range.height) - scrollY;
                var want = e.top ? y < vh * 0.8 : y > vh * 0.55;
                if (want === e.on) continue;
                e.on = want;
                var teal = getComputedStyle(section).backgroundColor;
                e.board.wave(function () { return want ? F.fill(teal) : F.clear(); }, { origin: [0, e.top ? 0 : e.board.cols], speed: 34, jitter: 30 });
            }
        }

        function init() {
            place();
            board.resize();
            boards.push(board);
            measure();
            edges();
        }
        function measure() { range = sceneRange(section); geo = null; }

        function tick() {
            if (edgeBoards.length) edgeTick();
            var p = clamp((scrollY - range.top) / Math.max(1, range.height - range.view), 0, 1);
            if (scrollY + vh < range.top - 50 || scrollY > range.top + range.height + 50) return;
            var e = reduce ? 0.5 : sstep(0.08, 0.5, p) * (1 - sstep(0.8, 0.97, p) * 0.85);
            var turn = reduce ? 0.5 : sstep(0.05, 0.55, p);
            rig.style.setProperty('--explode', e.toFixed(4));
            tilt.x = lerp(tilt.x, reduce ? 0 : tilt.tx, 0.06); tilt.y = lerp(tilt.y, reduce ? 0 : tilt.ty, 0.06);
            // phones get a gentler turn and shallower depth so the stack stays on screen
            var narrow = vw < 700, zk = narrow ? 0.5 : 1;
            var ry = lerp(0, narrow ? 18 : 34, turn) + tilt.x * (4 + 8 * e), rx = lerp(0, narrow ? 8 : 12, turn) - tilt.y * (3 + 6 * e), rz = lerp(0, 2, turn), rs = lerp(1, narrow ? 0.8 : 0.8, e);
            rig.style.setProperty('--zk', zk);
            rig.style.setProperty('--ry', ry.toFixed(2) + 'deg');
            rig.style.setProperty('--rx', rx.toFixed(2) + 'deg');
            rig.style.setProperty('--rz', rz.toFixed(2) + 'deg');
            rig.style.setProperty('--rs', rs.toFixed(4));
            section.style.setProperty('--e', e.toFixed(4));
            var ind = $('.indicator');
            if (ind) ind.classList.toggle('on-deep', e > 0.4 || currentTheme() === 'dark');
            // labels stay flat to the screen and track their layer's projected edge
            if (!geo) measureGeo();
            if (geo.w) {
                var R = Math.PI / 180;
                for (var i = 0; i < labels.length; i++) {
                    var a = ANCHOR[i], pt = project(a[0] * geo.w, a[1] * geo.h, LZ[i] * e * zk, rx * R, ry * R, rz * R, rs);
                    var lx = Math.max(6, pt[0] + geo.dx - geo.lw[i] + 3);     // never off the left edge
                    labels[i].style.transform = 'translate3d(' + lx.toFixed(1) + 'px,' + (pt[1] + geo.dy - geo.lh / 2).toFixed(1) + 'px,0)';
                    labels[i].style.opacity = sstep(0.35, 0.8, e).toFixed(3);
                }
            }
            var open = e > 0.45;
            if (open !== (exploded === 1)) {
                exploded = open ? 1 : 0;
                board.wave(function (t) { return text(t, open); }, { origin: [0, 16], speed: 30, jitter: 40, cycle: 3 });
            }
        }
        ticks.push(tick);
        return { init: init, measure: measure, board: board };
    })();

    /* ======================================================================
       Contact — departures board + one more lifted portrait
       ====================================================================== */
    var contact = (function () {
        var canvas = $('.contact__board canvas');
        var stage = $('.contact__stage');
        var scanvas = $('canvas', stage), fig = $('.stage__figure', stage);
        var box = ART.art2.figure;
        var MESSAGES = [
            ['NEXT DEPARTURE', 'YOUR BIG IDEA'],
            ['NOW BOARDING', 'WEB DESIGN  UX/UI'],
            ['STATUS', 'OPEN FOR PROJECTS'],
            ['DESTINATION', 'A VISUAL STATEMENT']
        ];
        var i = 0, timer = 0;
        var board = new FlapBoard(canvas, {
            cols: 24, rows: 2, gap: 3, radius: 2, split: 1, duration: 520, glyph: 0.64,
            face: function () { return card(' '); }
        });
        var sboard = new FlapBoard(scanvas, {
            cols: 4, aspect: 1.3, gap: 3, radius: 2, split: 1, duration: 600,
            face: function () { return F.img('art2'); },
            alt: function (t) { return t.home && t.home.k === 'img' ? filler(t, 4) : F.img('art2'); }
        });
        sboard.on('layout', function () { register(fig, sboard, 'art2', box); });
        function cols() { return clamp(Math.round(canvas.clientWidth / (vw < 700 ? 30 : 52)), 11, 30); }
        function show() {
            var m = MESSAGES[i % MESSAGES.length];
            i++;
            var wide = board.cols >= 20;
            // wide boards: one line per row plus a gold gate; narrow: each line wraps over two rows
            var map = {};
            if (wide) {
                [m[0], m[1]].forEach(function (line, r) { for (var k = 0; k < line.length; k++) map[r + ':' + (k + 1)] = line[k]; });
            } else {
                var a = layout(m[0], { c0: 1, c1: board.cols, r0: 0, r1: 2, align: 'left' });
                var b = layout(m[1], { c0: 1, c1: board.cols, r0: 2, r1: 4, align: 'left' });
                Object.assign(map, a, b);
            }
            var gateRow = wide ? 0 : board.rows - 1;
            board.wave(function (t) {
                if (t.r === gateRow && t.c >= board.cols - 7) {
                    return F.char('GATE 26'[t.c - (board.cols - 7)], C.gold, '#161512');
                }
                return card(map[t.r + ':' + t.c] || ' ');
            }, { origin: [0, 0], speed: 26, jitter: 20, cycle: 2 });
        }
        function init(img, figImg) {
            board.o.cols = cols();
            board.o.rows = board.o.cols >= 20 ? 2 : 5;
            board.resize();
            boards.push(board);
            shadowFor(fig, figImg);
            sboard.setSource('art2', plate(img, figImg, box, 'art2'), { fx: 0.5, fy: 0.45 });
            sboard.resize();
            stage.classList.add('is-ready');
            var lift = 0, target = 0;
            stage.addEventListener('pointerenter', function () { target = 1; });
            stage.addEventListener('pointerleave', function () { target = 0; });
            ticks.push(function () {
                if (Math.abs(lift - target) < 0.001 && fig._posed) return;
                lift = reduce ? target : lerp(lift, target, 0.08);
                fig._posed = true;
                pose(fig, stage, -lift * 10, -lift * 16, 1 + lift * 0.05, 7 + lift * 10, 9 + lift * 22, lift);
            });
            interactive(sboard, scanvas, { hover: { hold: 1400, chain: 2 }, idle: { every: [1200, 2600] } });
            new IntersectionObserver(function (es) {
                clearInterval(timer);
                if (es[0].isIntersecting) { show(); if (!reduce) timer = setInterval(show, 5200); }
            }, { threshold: 0.2 }).observe(canvas);
        }
        return { init: init, board: board, sboard: sboard, resize: function () { board.o.cols = cols(); board.o.rows = board.o.cols >= 20 ? 2 : 5; } };
    })();

    /* ======================================================================
       Services — flap numerals and a woven strip that spells the service
       ====================================================================== */
    var services = $$('.service').map(function (el, idx) {
        var num = el.getAttribute('data-num'), word = el.getAttribute('data-word');
        var W = 6;                                       // word tiles after the numeral and the diamond
        var diamond = F.tex('diamond' + C.card + C.gold, function (x, w, h) {
            x.fillStyle = C.card; x.fillRect(0, 0, w, h);
            FlapBoard.texture(x, w, h, 0.55);
            x.fillStyle = C.gold;
            x.beginPath(); x.moveTo(w / 2, h * .34); x.lineTo(w * .7, h / 2); x.lineTo(w / 2, h * .66); x.lineTo(w * .3, h / 2); x.closePath(); x.fill();
        });
        function weaveAt(c) { return filler({ r: (c + idx) % 2, c: c + idx * 3 }, 0); }
        // one board per service: numeral · diamond · a woven strip that spells the service on hover
        var board = new FlapBoard($('.service__board', el), {
            cols: 3 + W, rows: 1, gap: 3, radius: 2, split: 1, duration: 520, glyph: 0.62,
            face: function (t) { return t.c < 2 ? card(reduce ? num[t.c] : '0') : t.c === 2 ? diamond : weaveAt(t.c); }
        });
        function wordFace(t) { var w = word; while (w.length < W) w += ' '; return card(w[t.c - 3]); }
        el.addEventListener('mouseenter', function () {
            if (reduce) return;
            board.wave(function (t) { return t.c >= 3 ? wordFace(t) : null; }, { origin: [0, 3], speed: 55, cycle: 2 });
            // the numeral rolls a few cards and lands back on itself
            [0, 1].forEach(function (i) {
                var t = board.tiles[i];
                for (var k = 1; k <= 3; k++) board.flip(t, card(String((+num[i] + k) % 10)), i * 60, 0.2);
                board.flip(t, card(num[i]), 0, 0.6);
            });
        });
        el.addEventListener('mouseleave', function () {
            if (reduce) return;
            board.wave(function (t) { return t.c >= 3 ? weaveAt(t.c) : null; }, { origin: [0, 3 + W], speed: 45 });
        });
        return {
            init: function () {
                board.resize();
                boards.push(board);
                if (reduce) return;
                new IntersectionObserver(function (es, ob) {
                    if (!es[0].isIntersecting) return;
                    ob.disconnect();
                    board.wave(function (t) { return t.c < 2 ? card(num[t.c]) : null; }, { origin: [0, 0], speed: 90, cycle: 3 });
                }, { threshold: 0.6 }).observe(board.canvas);
            }
        };
    });

    /* weeks, kick-off to launch: two big flaps that count up when in view */
    var weeks = (function () {
        var canvas = $('.weeks__board');
        if (!canvas) return { init: function () { } };
        var board = new FlapBoard(canvas, {
            cols: 2, rows: 1, gap: 3, radius: 3, split: 2, duration: 600, glyph: 0.62,
            face: function (t) { return card(reduce ? '04'[t.c] : '0'); }
        });
        return {
            init: function () {
                board.resize();
                boards.push(board);
                if (reduce) return;
                new IntersectionObserver(function (es, ob) {
                    if (!es[0].isIntersecting) return;
                    ob.disconnect();
                    board.wave(function (t) { return card('04'[t.c]); }, { origin: [0, 0], speed: 120, cycle: 2 });
                }, { threshold: 1 }).observe(canvas);
            }
        };
    })();

    /* ======================================================================
       Process timetable — a departures board that follows the open step
       ====================================================================== */
    var timetable = (function () {
        var canvas = $('.timetable canvas');
        if (!canvas) return { init: function () { }, set: function () { } };
        var STEPS = ['WIREFRAMES', 'DESIGN', 'BUILD', 'LAUNCH'];
        var active = 0;
        var board = new FlapBoard(canvas, {
            cols: 19, rows: 4, gap: 2, radius: 1.5, split: 1, duration: 480, glyph: 0.62,
            face: function (t) { return faceAt(t); }
        });
        function status(i) { return i < active ? 'DONE' : i === active ? 'NOW' : i === active + 1 ? 'NEXT' : 'LATER'; }
        function faceAt(t) {
            var i = t.r, st = status(i);
            var dim = st === 'DONE' ? 'rgba(239,233,220,.45)' : C['card-ink'];
            if (t.c < 2) return F.char(pad(i + 1, 2)[t.c], C.card, dim);
            if (t.c >= 3 && t.c < 13) return F.char(STEPS[i][t.c - 3] || ' ', C.card, dim);
            if (t.c >= 14) {
                var ch = st[t.c - 14] || ' ';
                return st === 'NOW' ? F.char(ch, C.gold, '#161512') : F.char(ch, C.card, dim);
            }
            return card(' ');
        }
        var nowEl = $('[data-now]'), now = nowEl ? new FlapText(nowEl, { duration: 380, stagger: 22 }) : null;
        function readout() {
            if (!now) return;
            var txt = 'NOW · WEEK ' + pad(active + 1, 2) + ' · ' + STEPS[active];
            while (txt.length < now.cells.length) txt += ' ';
            now.set(txt.slice(0, now.cells.length), { cycle: 0, stagger: 16 });
        }
        function render(instant) {
            board.wave(function (t) { return faceAt(t); }, { origin: [active, 14], speed: instant ? 0 : 40, cycle: instant || reduce ? 0 : 2 });
            readout();
        }
        canvas.addEventListener('click', function (e) {
            var r = canvas.getBoundingClientRect();
            var row = clamp(Math.floor((e.clientY - r.top) / (r.height / board.rows)), 0, board.rows - 1);
            openStep(row, true);
        });
        return {
            init: function () { board.resize(); boards.push(board); },
            set: function (i) { if (i === active) return; active = i; render(false); },
            render: render
        };
    })();

    /* ======================================================================
       Footer wordmark — the name on seven big flaps; hover turns them into
       slices of the portrait
       ====================================================================== */
    var mark = (function () {
        var canvas = $('.foot__mark canvas');
        var NAME = 'BERMOND';
        var shown = false;
        var board = new FlapBoard(canvas, {
            cols: NAME.length, rows: 1, gap: 4, radius: 3, split: 2, duration: 640, glyph: 0.6,
            face: function () { return card(' '); },
            alt: function () { return F.img('art1'); }
        });
        function init(img) {
            board.setSource('art1', img, { fx: 0.62, fy: 0.3, zoom: 1.6 });
            board.resize();
            interactive(board, canvas, { hover: { hold: 1300, chain: 1 }, idle: { every: [1800, 3600], chain: [1, 2], hold: [900, 1500] } });
            new IntersectionObserver(function (es) {
                if (es[0].isIntersecting && !shown) {
                    shown = true;
                    board.wave(function (t) { return card(NAME[t.c]); }, { origin: [0, 0], speed: 120, cycle: reduce ? 0 : 5 });
                }
            }, { threshold: 0.5 }).observe(canvas);
        }
        return { init: init, board: board };
    })();

    /* ======================================================================
       Typography: headline, hover flips, numbers, clock, indicator
       ====================================================================== */
    var titles = $$('[data-flap-title]').map(function (el) { return new FlapText(el, { duration: 560, stagger: 55, rest: 'text' }); });
    // brushing the headline turns its letters over like cards on a board
    titles.forEach(function (t) { t.brush({ count: 2, stagger: 80, duration: 520 }); });

    $$('[data-flap-hover]').forEach(function (el) {
        var ft = new FlapText(el, { duration: 300, stagger: 18, rest: 'text' });
        var host = el.closest('a, button') || el;
        host.addEventListener('mouseenter', function () { ft.roll({ steps: 2 }); });
        host.addEventListener('focus', function () { ft.roll({ steps: 2 }); });
    });

    $$('[data-flap-num]').forEach(function (el) {
        var target = el.textContent;
        var ft = new FlapText(el, { duration: 520, stagger: 70, glyphs: '0123456789' });
        if (!reduce) ft.cells.forEach(function (c) { c.ch = '0'; c.a.textContent = c.b.textContent = c.f.textContent = c.k.textContent = '0'; });
        new IntersectionObserver(function (es, ob) {
            if (es[0].isIntersecting) { ft.set(target, { cycle: 3, stagger: 90 }); ob.disconnect(); }
        }, { threshold: 0.8 }).observe(el);
    });

    var clockEl = $('[data-clock]');
    var clock = clockEl ? new FlapText(clockEl, { duration: 420, glyphs: '0123456789' }) : null;
    function timeStr() { var d = new Date(); return pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2); }
    if (clock) { clock.set(timeStr(), { stagger: 0 }); setInterval(function () { clock.set(timeStr(), { stagger: 60 }); }, 5000); }

    var indicator = $('.indicator');
    var indNum = new FlapText($('[data-indicator-num]'), { duration: 380, glyphs: '0123456789' });
    var indName = $('[data-indicator-name]');
    var sections = $$('[data-section]');
    var navLinks = $$('.nav__links a');
    var sectionIO = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
            if (!e.isIntersecting) return;
            var idx = sections.indexOf(e.target);
            indNum.set(pad(idx, 2), { stagger: 40 });
            indName.textContent = e.target.getAttribute('data-section');
            indicator.classList.toggle('is-teal', e.target.id === 'layers');
            var id = '#' + e.target.id;
            navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === id); });
        });
    }, { rootMargin: '-45% 0px -54% 0px' });
    sections.forEach(function (s) { sectionIO.observe(s); });

    /* reveal on scroll */
    var revealIO = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    $$('[data-reveal]').forEach(function (el, i) { el.style.transitionDelay = (el.classList.contains('service') || el.classList.contains('step') ? (i % 4) * 90 : 0) + 'ms'; revealIO.observe(el); });

    /* nav: hide on the way down, show on the way up */
    var nav = $('[data-nav]'), lastY = 0;
    ticks.push(function () {
        var y = scrollY;
        if (Math.abs(y - lastY) < 4) return;
        nav.classList.toggle('is-hidden', y > lastY && y > 160);
        nav.classList.toggle('is-solid', y > 40);
        indicator.classList.toggle('is-on', y > vh * 0.6 && y < doc.documentElement.scrollHeight - vh * 1.25);
        lastY = y;
    });

    /* process accordion: one step open at a time, kept in step with the
       timetable board */
    var stepBtns = $$('.step button');
    function setStep(btn, open) {
        var panel = doc.getElementById(btn.getAttribute('aria-controls'));
        if ((btn.getAttribute('aria-expanded') === 'true') === open) return;
        btn.setAttribute('aria-expanded', String(open));
        if (open) {
            panel.hidden = false;
            var h = panel.scrollHeight;
            if (!reduce) panel.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' });
        } else if (reduce) {
            panel.hidden = true;
        } else {
            var a = panel.animate([{ height: panel.scrollHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.65,0,.35,1)' });
            a.onfinish = function () { if (btn.getAttribute('aria-expanded') !== 'true') panel.hidden = true; };
        }
    }
    function openStep(i, reveal) {
        stepBtns.forEach(function (b, j) { if (j !== i) setStep(b, false); });
        setStep(stepBtns[i], true);
        timetable.set(i);
        if (reveal) {
            // bring the opened step into view if it landed below the fold
            setTimeout(function () {
                var li = stepBtns[i].closest('.step'), r = li.getBoundingClientRect();
                if (r.bottom > vh - 40 || r.top < 80) scrollTo(win.scrollY + r.top - 120);
            }, reduce ? 0 : 400);
        }
    }
    stepBtns.forEach(function (btn, i) {
        btn.addEventListener('click', function () {
            if (btn.getAttribute('aria-expanded') === 'true') setStep(btn, false);
            else openStep(i, false);
        });
    });

    /* magnetic pills */
    if (fine && !reduce) {
        $$('[data-magnetic]').forEach(function (el) {
            el.addEventListener('pointermove', function (e) {
                var r = el.getBoundingClientRect();
                var x = (e.clientX - r.left - r.width / 2) * 0.28, y = (e.clientY - r.top - r.height / 2) * 0.38;
                el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
            });
            el.addEventListener('pointerleave', function () {
                el.animate([{ transform: el.style.transform || 'none' }, { transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)' });
                el.style.transform = '';
            });
        });
    }

    /* cursor */
    if (fine) {
        var cur = $('.cursor'), curLabel = $('.cursor__label');
        var cp = { x: -100, y: -100, tx: -100, ty: -100 }, lastScroll = -1;
        var hintBoard = null, hintUntil = 0;
        function cursorState(t) {
            if (!t) return;
            var onBoard = t.tagName === 'CANVAS' && t.closest('.stage, .wall__stage');
            var onLink = !onBoard && t.closest('a, button');
            cur.classList.toggle('is-board', !!onBoard);
            cur.classList.toggle('is-link', !!onLink);
            // the hint shows for a moment on arrival, then gets out of the way of the words
            if (onBoard && onBoard !== hintBoard) { hintBoard = onBoard; hintUntil = performance.now() + 1400; }
            if (!onBoard) hintBoard = null;
            cur.classList.toggle('has-label', !!onBoard && performance.now() < hintUntil);
            if (onBoard) curLabel.textContent = 'Move to flip';
        }
        win.addEventListener('pointermove', function (e) { cp.tx = e.clientX; cp.ty = e.clientY; cursorState(e.target); }, { passive: true });
        doc.addEventListener('pointerleave', function () { cp.tx = cp.ty = -100; });
        ticks.push(function () {
            cp.x = lerp(cp.x, cp.tx, 0.24); cp.y = lerp(cp.y, cp.ty, 0.24);
            cur.style.transform = 'translate3d(' + cp.x.toFixed(1) + 'px,' + cp.y.toFixed(1) + 'px,0)';
            if (scrollY !== lastScroll && cp.tx > 0) { lastScroll = scrollY; cursorState(doc.elementFromPoint(cp.tx, cp.ty)); }
            if (hintBoard && performance.now() > hintUntil && cur.classList.contains('has-label')) cur.classList.remove('has-label');
        });
    }

    /* ======================================================================
       Sound — opt-in, synthesised Solari clatter (no audio files)
       ====================================================================== */
    var sound = (function () {
        var btn = $('[data-sound]'), label = $('[data-sound-label]');
        var ac = null, noise = null, on = false, next = 0;
        function setup() {
            var AC = win.AudioContext || win.webkitAudioContext;
            if (!AC) return false;
            ac = new AC();
            noise = ac.createBuffer(1, Math.round(ac.sampleRate * 0.04), ac.sampleRate);
            var d = noise.getChannelData(0);
            for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
            return true;
        }
        function click(n) {
            if (!on || !ac) return;
            var t = ac.currentTime;
            if (t < next) return;
            next = t + 0.024 + Math.random() * 0.02;           // a busy board rattles, it doesn't roar
            var src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
            src.buffer = noise;
            src.playbackRate.value = 0.8 + Math.random() * 0.5;
            f.type = 'bandpass'; f.frequency.value = 1400 + Math.random() * 2200; f.Q.value = 1.2;
            g.gain.setValueAtTime(Math.min(0.22, 0.08 + n * 0.01), t);
            g.gain.exponentialRampToValueAtTime(0.0008, t + 0.045);
            src.connect(f); f.connect(g); g.connect(ac.destination);
            src.start(t); src.stop(t + 0.05);
        }
        FlapBoard.onflip = function (n) { click(n); };
        FlapText.onflip = function () { click(0.4); };
        btn.addEventListener('click', function () {
            if (!ac && !setup()) return;
            on = !on;
            if (on && ac.state === 'suspended') ac.resume();
            btn.setAttribute('aria-pressed', String(on));
            label.textContent = on ? 'Sound on' : 'Sound';
            if (on) click(3);
        });
        return { click: click };
    })();

    /* email lives in one place: <body data-email="…"> */
    var EMAIL = doc.body.getAttribute('data-email') || 'hello@example.com';
    $$('[data-email]').forEach(function (a) { a.setAttribute('href', 'mailto:' + EMAIL); });

    /* the address as a row of flaps; click copies it */
    (function () {
        var btn = $('[data-copy-email]');
        if (!btn) return;
        var valueEl = $('[data-email-text]', btn), label = $('.email-flap__label', btn);
        valueEl.textContent = EMAIL;
        valueEl.classList.add('flaptext--cards');
        var ft = new FlapText(valueEl, { duration: 380, stagger: 22, glyphs: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' });
        var timer = 0;
        function say(text) {
            var padded = text; while (padded.length < EMAIL.length) padded += ' ';
            ft.set(padded.slice(0, EMAIL.length), { cycle: 1, stagger: 18 });
        }
        btn.addEventListener('click', function () {
            var done = function () {
                label.textContent = 'Copied';
                say('COPIED');
                clearTimeout(timer);
                timer = setTimeout(function () { label.textContent = 'Copy address'; ft.set(EMAIL, { cycle: 1, stagger: 18 }); }, 1800);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(EMAIL).then(done, function () { win.location.href = 'mailto:' + EMAIL; });
            else win.location.href = 'mailto:' + EMAIL;
        });
    })();

    /* mobile menu: a full-screen departures board */
    (function () {
        var toggle = $('[data-menu-toggle]'), menu = $('#menu');
        if (!toggle || !menu) return;
        var words = $$('[data-menu-word]', menu).map(function (el) {
            el.classList.add('flaptext--cards');
            return new FlapText(el, { duration: 420, stagger: 34 });
        });
        function setOpen(open) {
            menu.hidden = !open;
            toggle.setAttribute('aria-expanded', String(open));
            toggle.textContent = open ? 'Close' : 'Menu';
            doc.body.classList.toggle('menu-open', open);
            if (lenis) { if (open) lenis.stop(); else lenis.start(); }
            if (open) {
                words.forEach(function (w, i) { w.intro({ delay: 80 + i * 110, stagger: 40, cycle: 2 }); });
                var first = $('a', menu); if (first) first.focus({ preventScroll: true });
            } else toggle.focus({ preventScroll: true });
        }
        toggle.addEventListener('click', function () { setOpen(menu.hidden); });
        $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
        doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) setOpen(false); });
    })();

    /* ======================================================================
       Theme toggle — a curtain of flaps sweeps the new colours in
       ====================================================================== */
    var toggle = $('[data-theme-toggle]');
    var curtainCanvas = $('.curtain');
    function currentTheme() {
        var t = root.getAttribute('data-theme');
        if (t) return t;
        return win.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    function syncToggle() {
        var t = currentTheme();
        $('[data-theme-label]').textContent = t === 'dark' ? 'Dark' : 'Light';
        toggle.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }
    function applyTheme(t) {
        root.setAttribute('data-theme', t);
        try { localStorage.setItem('theme', t); } catch (e) { }
        readPalette();
        rebuildPlates();
        timetable.render(true);
        syncToggle();
    }
    syncToggle();
    toggle.addEventListener('click', function () {
        var next = currentTheme() === 'dark' ? 'light' : 'dark';
        if (reduce) { applyTheme(next); return; }
        var newPaper = next === 'dark' ? '#12120F' : '#E8E2D5';
        var r = toggle.getBoundingClientRect();
        curtainCanvas.classList.add('is-on');
        vw = win.innerWidth; vh = win.innerHeight;
        var cb = new FlapBoard(curtainCanvas, {
            cols: clamp(Math.round(win.innerWidth / 70), 8, 26), aspect: 1.25, gap: 0, radius: 0, split: 1, duration: 520, gloss: false,
            face: function () { return F.clear(); }
        });
        cb.resize();
        var origin = [r.top / win.innerHeight * cb.rows, (r.left + r.width / 2) / win.innerWidth * cb.cols];
        cb.wave(function () { return F.fill(newPaper); }, { origin: origin, speed: 26, jitter: 24 });
        var phase = 0;
        cb.on('rest', function () {
            if (phase === 0) {
                phase = 1;
                applyTheme(next);
                setTimeout(function () { cb.wave(function () { return F.clear(); }, { origin: origin, speed: 22, jitter: 24 }); }, 60);
            } else if (phase === 1) {
                phase = 2;
                cb.destroy();
                curtainCanvas.classList.remove('is-on');
            }
        });
    });

    var loaded = {};
    function rebuildPlates() {
        if (loaded.art1) { hero.board.setSource('art1', plate(loaded.art1[0], loaded.art1[1], ART.art1.figure, 'art1'), { fx: 0.5, fy: 0.42 }); }
        if (loaded.art3) { wall.board.setSource('art3', plate(loaded.art3[3] || loaded.art3[0], loaded.art3[1], ART.art3.figure, 'art3'), { fx: 0.12, fy: 0.16 }); }
        if (loaded.art2) { contact.sboard.setSource('art2', plate(loaded.art2[0], loaded.art2[1], ART.art2.figure, 'art2'), { fx: 0.5, fy: 0.45 }); }
        boards.forEach(function (b) { b.cache.clear(); b.draw(); });
    }

    /* ======================================================================
       Resize
       ====================================================================== */
    var rt = 0;
    function onResize() {
        vw = win.innerWidth; vh = win.innerHeight;
        wall.resize(); contact.resize();
        boards.forEach(function (b) { if (b.dw) b.resize(); });
        wall.measure(); layers.measure(); hero.measure();
    }
    win.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(onResize, 160); });

    /* ======================================================================
       Boot: loader counts up on a flap counter, then the wall dominoes away
       ====================================================================== */
    var loader = $('.loader');
    var countEl = $('[data-count]');
    var counter = new FlapText(countEl, { duration: 90, stagger: 0, glyphs: '0123456789' });
    var lb = new FlapBoard($('.loader__board'), {
        cols: clamp(Math.round(doc.documentElement.clientWidth / 92), 6, 18), aspect: 1.3, gap: 2, radius: 2, split: 1, duration: 560,
        face: function (t) { return (t.r + t.c) % 9 === 0 ? weave(['warp', 'weft', 'lozenge'][(t.r + t.c) % 3], t.r % 2 === 1) : F.fill(C.card); }
    });
    lb.resize();

    var fontsReady = (doc.fonts && doc.fonts.load) ? Promise.all([
        doc.fonts.load('700 40px "Barlow Condensed"'), doc.fonts.load('400 40px "Funnel Display"'), doc.fonts.load('400 16px "Funnel Sans"')
    ]).catch(function () { }) : Promise.resolve();

    var jobs = [
        fontsReady,
        Promise.all([art('art1'), figureOf('art1')])
    ];
    var done = 0, shown = 0, t0 = performance.now();
    jobs.forEach(function (j) { j.then(function () { done++; }); });
    // second visit in a session: no count, just the flaps clearing away
    var seen = false;
    try { seen = sessionStorage.getItem('bm-seen') === '1'; sessionStorage.setItem('bm-seen', '1'); } catch (e) { }
    if (seen) loader.classList.add('is-quick');
    var MIN = reduce || seen ? 0 : 1100;
    var countTimer = setInterval(function () {
        var real = done / jobs.length;
        var timeP = MIN ? clamp((performance.now() - t0) / MIN, 0, 1) : 1;
        // count from the first frame; the last stretch waits for the hero's art
        var target = Math.floor(Math.min(timeP, 0.6 + 0.4 * real) * 100);
        target = Math.min(target, 99);                 // 100 is set once, from 099
        if (target > shown) { shown = Math.min(100, shown + Math.max(1, Math.round((target - shown) * 0.5))); counter.set(pad(shown, 3), { stagger: 0 }); }
        if (shown >= 100) clearInterval(countTimer);
    }, 110);

    Promise.all(jobs).then(function (res) {
        vw = win.innerWidth; vh = win.innerHeight;
        lb.cache.clear(); lb.draw();
        loaded.art1 = res[1];
        hero.init(res[1][0], res[1][1]);
        work.init();
        layers.init();
        mark.init(res[1][0]);
        services.forEach(function (sv) { sv.init(); });
        timetable.init();
        weeks.init();
        requestAnimationFrame(loop);
        // below the fold: the wall and contact boards stream in behind the loader
        Promise.all([art('art3'), figureOf('art3')]).then(function (r) { loaded.art3 = r; wall.init(r[0], r[1]); });
        Promise.all([art('art2'), figureOf('art2')]).then(function (r) { loaded.art2 = r; contact.init(r[0], r[1]); });
        var wait = Math.max(0, MIN + (MIN ? 150 : 0) - (performance.now() - t0));
        setTimeout(function () {
            clearInterval(countTimer);
            if (reduce || seen) { reveal(); return; }
            // the last two cards: 099, then 100, held a beat before the wipe
            var last = shown < 99 ? ['099', '100'] : ['100'];
            last.forEach(function (v, k) { setTimeout(function () { counter.set(v, { stagger: 0 }); }, k * 130); });
            setTimeout(reveal, (last.length - 1) * 130 + 380);
        }, wait);
    });

    function reveal() {
        if (reduce) { loader.remove(); hero.intro(0); return; }
        loader.classList.add('is-out');
        lb.wave(function () { return F.clear(); }, { origin: [lb.rows, 0], speed: 46, jitter: 70 });
        titles.forEach(function (t, i) { t.intro({ delay: 220 + i * 200, stagger: 44, cycle: 0, duration: 600 }); });
        hero.intro(200);
        lb.on('rest', function () { loader.remove(); lb.destroy(); });
        loader.classList.add('is-done');
    }

    win.addEventListener('load', function () { wall.measure(); layers.measure(); });
})();
