/*!
 * Bermond — portfolio
 * Scroll-driven split-flap collage. Needs js/flapboard.js and js/flaptext.js;
 * Lenis (smooth scroll) is optional.
 */
(function () {
    'use strict';

    var doc = document, root = doc.documentElement, win = window;
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
        art1: { w: 1472, h: 1472, figure: [301, 111, 1005, 1123] },
        art2: { w: 1472, h: 1472, figure: [376, 252, 629, 864] },
        art3: { w: 1472, h: 1472, figure: [166, 239, 741, 1233] },
        art4: { w: 1920, h: 2400, figure: [0, 704, 1722, 1696], sun: [144, 254, 1631, 1631], leaves: [849, 72, 1071, 1031] }
    };

    /* ---------- palette ---------- */
    var C = {};
    function readPalette() {
        var cs = getComputedStyle(root);
        ['paper', 'paper-2', 'ink', 'card', 'card-ink', 'hole', 'red', 'green', 'gold', 'olive', 'oxblood', 'ochre', 'forest', 'orange', 'teal', 'teal-ink']
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
    function figureOf(key) { return loadImg('assets/img/' + key + '-figure.webp'); }

    /* The artwork with a dark silhouette where the figure was lifted out —
       the board shows this, the cut-out floats above it. */
    function plate(img, fig, box, color) {
        var c = doc.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        var x = c.getContext('2d');
        x.drawImage(img, 0, 0);
        if (!fig) return c;
        var s = doc.createElement('canvas');
        s.width = box[2]; s.height = box[3];
        var sx = s.getContext('2d');
        sx.drawImage(fig, 0, 0, box[2], box[3]);
        sx.globalCompositeOperation = 'source-in';
        sx.fillStyle = color;
        sx.fillRect(0, 0, s.width, s.height);
        // grow the silhouette by a hair so no fringe of the original survives
        var o = 2;
        [[-o, 0], [o, 0], [0, -o], [0, o], [0, 0]].forEach(function (d) { x.drawImage(s, box[0] + d[0], box[1] + d[1]); });
        return c;
    }

    /* ---------- woven filler cards (kente-inspired) ---------- */
    function weave(n) {
        var id = 'weave' + n + C.card;
        return F.tex(id, function (x, w, h) {
            var g = C.gold, gr = C.green, r = C.red, k = C.card;
            x.fillStyle = k; x.fillRect(0, 0, w, h);
            var u = w / 12;
            switch (n % 6) {
                case 0: // gold | green | gold bands with black threads
                    x.fillStyle = g; x.fillRect(0, 0, w, h);
                    x.fillStyle = gr; x.fillRect(w * .32, 0, w * .36, h);
                    x.fillStyle = k; x.fillRect(w * .3, 0, u * .5, h); x.fillRect(w * .68, 0, u * .5, h);
                    break;
                case 1: // thin horizontal stripes
                    var cols = [r, g, gr, k, g];
                    for (var i = 0; i < 10; i++) { x.fillStyle = cols[i % cols.length]; x.fillRect(0, i * h / 10, w, h / 10 + .5); }
                    break;
                case 2: // checker
                    x.fillStyle = g; x.fillRect(0, 0, w, h);
                    x.fillStyle = gr; x.fillRect(0, 0, w / 2, h / 2); x.fillRect(w / 2, h / 2, w / 2, h / 2);
                    break;
                case 3: // red field, gold warp thread
                    x.fillStyle = r; x.fillRect(0, 0, w, h);
                    x.fillStyle = g; x.fillRect(w * .44, 0, w * .12, h);
                    x.fillStyle = k; x.fillRect(w * .41, 0, u * .35, h); x.fillRect(w * .56, 0, u * .35, h);
                    break;
                case 4: // green field, gold diamond
                    x.fillStyle = gr; x.fillRect(0, 0, w, h);
                    x.fillStyle = g; x.beginPath(); x.moveTo(w / 2, h * .2); x.lineTo(w * .8, h / 2); x.lineTo(w / 2, h * .8); x.lineTo(w * .2, h / 2); x.closePath(); x.fill();
                    break;
                default: // black with gold zigzag
                    x.strokeStyle = g; x.lineWidth = Math.max(1.5, w / 16);
                    x.beginPath();
                    for (var j = 0; j <= 4; j++) { var yy = h * (.18 + j * .16); x.lineTo(j % 2 ? w * .78 : w * .22, yy); }
                    x.stroke();
            }
        });
    }
    function filler(t, salt) {
        var v = ((t.r * 7 + t.c * 13 + (salt || 0) * 5) % 11 + 11) % 11;
        if (v < 4) return F.fill(C.card);
        if (v === 4) return F.fill(C.olive);
        return weave(v + (salt || 0));
    }
    function card(ch) { return F.char(ch, C.card, C['card-ink']); }

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
        var left = region.c0 + Math.floor((width - longest) / 2);
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
        if (!reduce && opt.idle !== false) board.idle(opt.idle);
        board.visible = false;
        new IntersectionObserver(function (es) { board.visible = es[0].isIntersecting; }, { rootMargin: '100px' }).observe(canvas);
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
        fig.parentNode.insertBefore(c, fig);
        fig._shadow = c;
        return c;
    }

    /* Place a cut-out (and its shadow) over its board so it registers with
       the artwork. */
    function register(fig, board, key, box) {
        var m = board.mapping(key);
        if (!m) return;
        var x = m.x + box[0] * m.scale, y = m.y + box[1] * m.scale, w = box[2] * m.scale, h = box[3] * m.scale;
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
        var x0 = m ? m.x + box[0] * m.scale : 0, x1 = m ? m.x + (box[0] + box[2]) * m.scale : 0;
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
        var msg = {}, state = 'img', ready = false;
        var mouse = { x: 0, y: 0, tx: 0, ty: 0 };

        var board = new FlapBoard(canvas, {
            cols: 8, aspect: 1.28, gap: 3, radius: 2, split: 1, duration: 620,
            face: function (t) { return reduce ? F.img('art1') : filler(t, 7); },
            alt: function (t) { return msg[t.r + ':' + t.c] ? card(msg[t.r + ':' + t.c]) : filler(t, 1); }
        });
        board.on('layout', function () {
            register(fig, board, 'art1', box);
            msg = layout('BERMOND DIGITAL DESIGNER', { c0: 0, c1: board.cols, r0: 0, r1: board.rows });
        });

        function init(img, figImg) {
            shadowFor(fig, figImg);
            board.setSource('art1', plate(img, figImg, box, C.hole), { fx: 0.5, fy: 0.42 });
            board.resize();
            if (reduce) stage.classList.add('is-ready');
            ready = true;
        }

        /* opening: the board assembles the artwork tile by tile, then the
           cut-out settles into its silhouette */
        function intro(delay) {
            if (reduce) { interactive(board, canvas, { hover: { hold: 1500, chain: 2 } }); return; }
            board.wave(function () { return F.img('art1'); }, { origin: [0, board.cols], speed: 62, jitter: 90, cycle: 2, delay: delay || 0 });
            setTimeout(function () { stage.classList.add('is-ready'); }, (delay || 0) + 1250);
            setTimeout(function () { interactive(board, canvas, { hover: { hold: 1500, chain: 2 } }); }, (delay || 0) + 1900);
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
            var lift = reduce ? 0 : sstep(0, 0.55, p);
            // the cut-out leaves its silhouette behind and comes toward you
            pose(fig, stage, mx * 9 - lift * 18, my * 6 - lift * 70, 1 + lift * 0.07, -mx * 7 + 6 + lift * 10, 10 + my * 4 + lift * 30, lift);
            canvas.style.transform = 'translate3d(' + (-mx * 3).toFixed(2) + 'px,' + (-my * 2 + p * 60).toFixed(2) + 'px,0)';
            for (var i = 0; i < accents.length; i++) {
                var d = accents[i]._d || (accents[i]._d = parseFloat(accents[i].getAttribute('data-depth')) || 0.5);
                accents[i].style.transform = 'translate3d(' + (mx * d * 14).toFixed(2) + 'px,' + (my * d * 9 - p * d * 120).toFixed(2) + 'px,0)';
            }
            // scrolling past a third of the hero flips the board to its message
            var want = p > 0.3 ? 'msg' : p < 0.2 ? 'img' : state;
            if (want !== state) {
                state = want;
                var o = [ (fig.offsetTop + fig.offsetHeight * 0.3) / (board.cssH / board.rows), (fig.offsetLeft + fig.offsetWidth * 0.55) / (board.cssW / board.cols) ];
                if (state === 'msg') board.wave(function (t) { return board.o.alt(t); }, { origin: o, speed: 70, jitter: 60, cycle: 2 });
                else board.wave(function () { return F.img('art1'); }, { origin: [board.rows, 0], speed: 55, jitter: 40 });
            }
        }
        ticks.push(tick);

        return { board: board, init: init, intro: intro, section: section };
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
        var maps = [{}, {}];
        var MSG = ['EVERY IMAGE HAS A STORY UNDER\u00ADNEATH', 'DESIGN THAT FLIPS THE SCRIPT'];
        var stepText = null;

        var board = new FlapBoard(canvas, {
            cols: 22, aspect: 1.3, gap: 3, radius: 2, split: 1, duration: 600,
            face: function () { return F.img('art3'); },
            alt: function (t) { return t.home && t.home.k === 'img' ? (faceFor(1, t)) : F.img('art3'); }
        });

        function faceFor(i, t) {
            if (i === 0 || i === 3) return F.img('art3');
            var ch = maps[i - 1][t.r + ':' + t.c];
            return ch ? card(ch) : filler(t, i + 2);
        }

        board.on('layout', function () {
            register(fig, board, 'art3', box);
            region = freeRegion(board, 'art3', box, 7);
            fitsBeside = !!region;
            var reg = region || { c0: 0, c1: board.cols, r0: 0, r1: board.rows };
            maps = MSG.map(function (m) { return layout(m, reg); });
            if (stageIdx > 0) { var s = stageIdx; stageIdx = -1; apply(s, true); }
        });

        function cols() {
            var w = stage.clientWidth;
            return clamp(Math.round(w / (w < 700 ? 44 : 62)), 8, 24);
        }

        function init(img, figImg) {
            board.o.cols = cols();
            shadowFor(fig, figImg);
            board.setSource('art3', plate(img, figImg, box, C.hole), { fx: 0.12, fy: 0.16 });
            board.resize();
            stage.classList.add('is-ready');
            interactive(board, canvas, { hover: { hold: 1200, chain: 2 }, idle: { every: [900, 2000], chain: [2, 4], hold: [700, 1300] } });
            stepText = stepEl ? new FlapText(stepEl, { duration: 420 }) : null;
            ready = true;
            measure();
        }

        function apply(s, instant) {
            if (s === stageIdx) return;
            var prev = stageIdx;
            stageIdx = s;
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

        return { board: board, init: init, measure: measure, resize: function () { board.o.cols = cols(); }, debug: function () { return { range: range, ready: ready, stageIdx: stageIdx, region: region, vh: vh, scrollY: scrollY }; } };
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
            ['art1', 'art2', 'art3', 'art4'].forEach(function (k) {
                art(k).then(function (im) { if (im) { board.setSource(k, im, {}); thumbs.forEach(function (b) { if (b.key === k) { b.setSource(k, im, {}); b.draw(); } }); } });
            });
            if (fine) board.resize(canvas.clientWidth || 280, canvas.clientHeight || 350);
            items.forEach(function (it) {
                var row = $('[data-flap-row]', it);
                var ft = row ? new FlapText(row, { duration: 380, stagger: 22 }) : null;
                it.addEventListener('mouseenter', function () {
                    if (!fine) return;
                    show(it);
                    if (ft) ft.scramble({ cycle: 1, stagger: 18 });
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
        section.addEventListener('pointermove', function (e) {
            tilt.tx = (e.clientX / vw - 0.5) * 2; tilt.ty = (e.clientY / vh - 0.5) * 2;
        });
        section.addEventListener('pointerleave', function () { tilt.tx = tilt.ty = 0; });
        var ROWS = [
            ['LAYER', 'ELEMENT', 'DEPTH'],
            ['01', 'FIELD', '-360'],
            ['02', 'SUN', '-170'],
            ['03', 'PORTRAIT', '+040'],
            ['04', 'FOLIAGE', '+230']
        ];
        var board = new FlapBoard(canvas, {
            cols: 21, rows: 5, gap: 2, radius: 1.5, split: 1, duration: 480, glyph: 0.62, gloss: true,
            face: function (t) { return text(t, false); }
        });

        var COLS = [0, 6, 16];
        function text(t, open) {
            var row = ROWS[t.r], c = t.c, head = t.r === 0;
            var bg = head ? 'transparent' : '#163A3C', fg = head ? 'rgba(15,42,44,.8)' : '#EAF4F1';
            for (var k = 2; k >= 0; k--) {
                if (c >= COLS[k]) {
                    var s = row[k];
                    if (k === 2 && !head && !open) s = '0000';
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

        function init() {
            place();
            board.resize();
            boards.push(board);
            measure();
        }
        function measure() { range = sceneRange(section); }

        function tick() {
            var p = clamp((scrollY - range.top) / Math.max(1, range.height - range.view), 0, 1);
            if (scrollY + vh < range.top - 50 || scrollY > range.top + range.height + 50) return;
            var e = reduce ? 0.5 : sstep(0.08, 0.5, p) * (1 - sstep(0.8, 0.97, p) * 0.85);
            var turn = reduce ? 0.5 : sstep(0.05, 0.55, p);
            rig.style.setProperty('--explode', e.toFixed(4));
            tilt.x = lerp(tilt.x, reduce ? 0 : tilt.tx, 0.06); tilt.y = lerp(tilt.y, reduce ? 0 : tilt.ty, 0.06);
            rig.style.setProperty('--ry', (lerp(0, -38, turn) + tilt.x * (4 + 8 * e)).toFixed(2) + 'deg');
            rig.style.setProperty('--rx', (lerp(0, 16, turn) - tilt.y * (3 + 6 * e)).toFixed(2) + 'deg');
            rig.style.setProperty('--rz', (lerp(0, -2, turn)).toFixed(2) + 'deg');
            rig.style.setProperty('--rs', lerp(1, 0.8, e).toFixed(4));
            var open = e > 0.45;
            if (open !== (exploded === 1)) {
                exploded = open ? 1 : 0;
                board.wave(function (t) { return text(t, open); }, { origin: [0, 16], speed: 30, jitter: 40, cycle: open ? 2 : 1 });
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
            alt: function (t) { return filler(t, 4); }
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
                var a = layout(m[0], { c0: 0, c1: board.cols, r0: 0, r1: 2 });
                var b = layout(m[1], { c0: 0, c1: board.cols, r0: 2, r1: 4 });
                Object.assign(map, a, b);
            }
            board.wave(function (t) {
                if (wide && t.r === 0 && t.c >= board.cols - 7) {
                    return F.char('GATE 26'[t.c - (board.cols - 7)], C.gold, '#161512');
                }
                return card(map[t.r + ':' + t.c] || ' ');
            }, { origin: [0, 0], speed: 26, jitter: 20, cycle: 2 });
        }
        function init(img, figImg) {
            board.o.cols = cols();
            board.o.rows = board.o.cols >= 20 ? 2 : 4;
            board.resize();
            boards.push(board);
            shadowFor(fig, figImg);
            sboard.setSource('art2', plate(img, figImg, box, C.hole), { fx: 0.5, fy: 0.45 });
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
        return { init: init, board: board, sboard: sboard, resize: function () { board.o.cols = cols(); board.o.rows = board.o.cols >= 20 ? 2 : 4; } };
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
    var titles = $$('[data-flap-title]').map(function (el) { return new FlapText(el, { duration: 560, stagger: 55, glyphs: 'ACEGINOSUXZ' }); });
    $('.hero__title').addEventListener('mouseenter', function () {
        titles.forEach(function (t, i) { t.scramble({ cycle: 1, stagger: 34, delay: i * 120 }); });
    });

    $$('[data-flap-hover]').forEach(function (el) {
        var ft = new FlapText(el, { duration: 300, stagger: 18 });
        var host = el.closest('a, button') || el;
        host.addEventListener('mouseenter', function () { ft.scramble({ cycle: 1 }); });
        host.addEventListener('focus', function () { ft.scramble({ cycle: 1 }); });
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
            indNum.set(pad(idx + 1, 2), { stagger: 40 });
            indName.textContent = e.target.getAttribute('data-section');
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

    /* process accordion */
    $$('.step button').forEach(function (btn) {
        var panel = doc.getElementById(btn.getAttribute('aria-controls'));
        var weekEl = $('.step__week', panel), week = weekEl ? new FlapText(weekEl, { duration: 420, stagger: 30, glyphs: '0123456789' }) : null;
        var weekText = week ? week.text : '';
        btn.addEventListener('click', function () {
            var open = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', String(!open));
            if (!open) {
                panel.hidden = false;
                if (week) { week.set(weekText.replace(/\d/g, '0'), { stagger: 0, duration: 1 }); setTimeout(function () { week.set(weekText, { cycle: 2, stagger: 60 }); }, 120); }
                var h = panel.scrollHeight;
                if (!reduce) panel.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' });
            } else if (reduce) {
                panel.hidden = true;
            } else {
                var a = panel.animate([{ height: panel.scrollHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.65,0,.35,1)' });
                a.onfinish = function () { panel.hidden = true; };
            }
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
        function cursorState(t) {
            if (!t) return;
            var onBoard = t.tagName === 'CANVAS' && t.closest('.stage, .wall__stage');
            var onLink = !onBoard && t.closest('a, button');
            cur.classList.toggle('is-board', !!onBoard);
            cur.classList.toggle('is-link', !!onLink);
            cur.classList.toggle('has-label', !!onBoard);
            if (onBoard) curLabel.textContent = 'Move to flip';
        }
        win.addEventListener('pointermove', function (e) { cp.tx = e.clientX; cp.ty = e.clientY; cursorState(e.target); }, { passive: true });
        doc.addEventListener('pointerleave', function () { cp.tx = cp.ty = -100; });
        ticks.push(function () {
            cp.x = lerp(cp.x, cp.tx, 0.24); cp.y = lerp(cp.y, cp.ty, 0.24);
            cur.style.transform = 'translate3d(' + cp.x.toFixed(1) + 'px,' + cp.y.toFixed(1) + 'px,0)';
            if (scrollY !== lastScroll && cp.tx > 0) { lastScroll = scrollY; cursorState(doc.elementFromPoint(cp.tx, cp.ty)); }
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

    /* email placeholder lives in one place */
    var EMAIL = doc.body.getAttribute('data-email') || 'hello@example.com';
    $$('[data-email]').forEach(function (a) { a.setAttribute('href', 'mailto:' + EMAIL); });

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
        if (loaded.art1) { hero.board.setSource('art1', plate(loaded.art1[0], loaded.art1[1], ART.art1.figure, C.hole), { fx: 0.5, fy: 0.42 }); }
        if (loaded.art3) { wall.board.setSource('art3', plate(loaded.art3[0], loaded.art3[1], ART.art3.figure, C.hole), { fx: 0.12, fy: 0.16 }); }
        if (loaded.art2) { contact.sboard.setSource('art2', plate(loaded.art2[0], loaded.art2[1], ART.art2.figure, C.hole), { fx: 0.5, fy: 0.45 }); }
        boards.forEach(function (b) { b.cache.clear(); b.draw(); });
    }

    /* ======================================================================
       Resize
       ====================================================================== */
    var rt = 0;
    function onResize() {
        vw = win.innerWidth; vh = win.innerHeight;
        wall.resize(); contact.resize();
        [hero.board, wall.board, contact.board, contact.sboard, layers.board, mark.board].forEach(function (b) { if (b.dw) b.resize(); });
        wall.measure(); layers.measure();
    }
    win.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(onResize, 160); });

    /* ======================================================================
       Boot: loader counts up on a flap counter, then the wall dominoes away
       ====================================================================== */
    var loader = $('.loader');
    var countEl = $('[data-count]');
    var counter = new FlapText(countEl, { duration: 300, stagger: 0, glyphs: '0123456789' });
    var lb = new FlapBoard($('.loader__board'), {
        cols: clamp(Math.round(doc.documentElement.clientWidth / 92), 6, 18), aspect: 1.3, gap: 2, radius: 2, split: 1, duration: 560,
        face: function (t) { return (t.r + t.c) % 9 === 0 ? weave(t.r + t.c) : F.fill(C.card); }
    });
    lb.resize();

    var fontsReady = (doc.fonts && doc.fonts.load) ? Promise.all([
        doc.fonts.load('700 40px "Barlow Condensed"'), doc.fonts.load('400 40px "Funnel Display"'), doc.fonts.load('400 16px "Funnel Sans"')
    ]).catch(function () { }) : Promise.resolve();

    var jobs = [
        fontsReady,
        Promise.all([art('art1'), figureOf('art1')]),
        Promise.all([art('art3'), figureOf('art3')]),
        Promise.all([art('art2'), figureOf('art2')])
    ];
    var done = 0, shown = 0, t0 = performance.now();
    jobs.forEach(function (j) { j.then(function () { done++; }); });
    var MIN = reduce ? 0 : 1500;
    var countTimer = setInterval(function () {
        var real = done / jobs.length;
        var timeP = clamp((performance.now() - t0) / MIN, 0, 1);
        var target = Math.floor(Math.min(real, timeP) * 100);
        if (target > shown) { shown = Math.min(100, shown + Math.max(1, Math.round((target - shown) * 0.5))); counter.set(pad(shown, 3), { stagger: 0 }); }
        if (shown >= 100) clearInterval(countTimer);
    }, 110);

    Promise.all(jobs).then(function (res) {
        vw = win.innerWidth; vh = win.innerHeight;
        lb.cache.clear(); lb.draw();
        loaded.art1 = res[1]; loaded.art3 = res[2]; loaded.art2 = res[3];
        hero.init(res[1][0], res[1][1]);
        wall.init(res[2][0], res[2][1]);
        contact.init(res[3][0], res[3][1]);
        work.init();
        layers.init();
        mark.init(res[1][0]);
        requestAnimationFrame(loop);
        var wait = Math.max(0, MIN + 250 - (performance.now() - t0));
        setTimeout(function () {
            clearInterval(countTimer);
            counter.set('100', { stagger: 0 });
            setTimeout(reveal, reduce ? 0 : 420);
        }, wait);
    });

    function reveal() {
        if (reduce) { loader.remove(); hero.intro(0); return; }
        loader.classList.add('is-out');
        lb.wave(function () { return F.clear(); }, { origin: [lb.rows, 0], speed: 46, jitter: 70 });
        titles.forEach(function (t, i) { t.intro({ delay: 380 + i * 260, stagger: 60, cycle: 2 }); });
        hero.intro(520);
        lb.on('rest', function () { loader.remove(); lb.destroy(); });
        loader.classList.add('is-done');
    }

    if (/[?&]debug/.test(location.search)) win.__bm = { hero: hero, wall: wall, work: work, layers: layers, contact: contact, lenis: lenis };
    win.addEventListener('load', function () { wall.measure(); layers.measure(); });
})();
