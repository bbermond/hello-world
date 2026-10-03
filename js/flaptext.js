/*!
 * FlapText — split-flap typography for real DOM text.
 *
 * Wraps each character of an element in a cell made of two clipped halves and
 * a hinged leaf. The element keeps an aria-label with its text, so assistive
 * tech reads words, not cells. Flips run on the Web Animations API.
 */
(function (root) {
  'use strict';

  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // fall, hit the stop, settle
  var FALL = [
    { transform: 'rotateX(0deg)', offset: 0, easing: 'cubic-bezier(.55,0,.85,.3)' },
    { transform: 'rotateX(-180deg)', offset: 0.74, easing: 'ease-out' },
    { transform: 'rotateX(-163deg)', offset: 0.86, easing: 'ease-in' },
    { transform: 'rotateX(-180deg)', offset: 1 }
  ];

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  function Cell(ch) {
    var c = this.node = el('span', 'fx');
    c.setAttribute('aria-hidden', 'true');
    this.size = el('span', 'fx__s', ch);          // invisible sizer: keeps the original width
    this.a = el('span', 'fx__a', ch);             // top half (next)
    this.b = el('span', 'fx__b', ch);             // bottom half (current)
    this.l = el('span', 'fx__l');                 // hinged leaf
    this.f = el('span', 'fx__f', ch);             // leaf front (current top)
    this.k = el('span', 'fx__k', ch);             // leaf back (next bottom)
    this.l.appendChild(this.f); this.l.appendChild(this.k);
    c.appendChild(this.size); c.appendChild(this.a); c.appendChild(this.b); c.appendChild(this.l);
    this.ch = ch;
    this.queue = [];
    this.busy = false;
    if (ch === ' ') c.classList.add('fx--space');
  }

  Cell.prototype.to = function (ch, dur, delay) {
    this.queue.push({ ch: ch, dur: dur, delay: delay || 0 });
    if (!this.busy) this._next();
  };

  Cell.prototype._next = function () {
    var self = this;
    var q = this.queue.shift();
    if (!q) { this.busy = false; return; }
    this.busy = true;
    if (q.ch === this.ch) { this._next(); return; }
    var go = function () {
      var from = self.ch, to = q.ch;
      self.a.textContent = to;
      self.f.textContent = from;
      self.k.textContent = to;
      self.b.textContent = from;
      self.node.classList.add('is-flipping');
      var anim = self.l.animate(FALL, { duration: q.dur, fill: 'none' });
      if (FlapText.onflip) FlapText.onflip();
      var shade = self.f.animate([{ opacity: 1 }, { opacity: 0.35 }], { duration: q.dur * 0.37, easing: 'ease-in', fill: 'forwards' });
      anim.onfinish = anim.oncancel = function () {
        shade.cancel();
        self.b.textContent = to;
        self.f.textContent = to;
        self.ch = to;
        self.node.classList.remove('is-flipping');
        self._next();
      };
    };
    if (q.delay) setTimeout(go, q.delay); else go();
  };

  function FlapText(node, opts) {
    this.node = node;
    this.o = Object.assign({ duration: 460, stagger: 38, glyphs: GLYPHS }, opts || {});
    this.text = node.textContent;
    node.textContent = '';
    node.classList.add('flaptext');
    // assistive tech reads this copy; the animated cells are aria-hidden
    var sr = el('span', 'sr-only', this.text);
    node.appendChild(sr);
    this.cells = [];
    for (var i = 0; i < this.text.length; i++) {
      var cell = new Cell(this.text[i]);
      this.cells.push(cell);
      node.appendChild(cell.node);
    }
  }

  /* Flip to a new string (same length is ideal; extra cells blank out). */
  FlapText.prototype.set = function (str, opt) {
    opt = opt || {};
    var dur = opt.duration || this.o.duration;
    var stagger = opt.stagger == null ? this.o.stagger : opt.stagger;
    for (var i = 0; i < this.cells.length; i++) {
      var ch = i < str.length ? str[i] : ' ';
      var cell = this.cells[i];
      if (reduce) { cell.queue.length = 0; cell.ch = ch; cell.a.textContent = cell.b.textContent = cell.f.textContent = cell.k.textContent = ch; continue; }
      cell.queue.length = 0;
      var d = (opt.delay || 0) + i * stagger;
      for (var k = 0; k < (opt.cycle || 0); k++) {
        cell.to(this._rand(cell.ch), dur * 0.42, k === 0 ? d : 0);
        d = 0;
      }
      cell.to(ch, opt.cycle ? dur * 0.7 : dur, d);
    }
  };

  /* Flip every letter through a few random glyphs and back home. */
  FlapText.prototype.scramble = function (opt) {
    opt = opt || {};
    if (reduce) return;
    var dur = opt.duration || this.o.duration;
    var stagger = opt.stagger == null ? this.o.stagger : opt.stagger;
    var cycles = opt.cycle == null ? 2 : opt.cycle;
    for (var i = 0; i < this.cells.length; i++) {
      var cell = this.cells[i];
      if (cell.busy || this.text[i] === ' ') continue;
      var d = (opt.delay || 0) + i * stagger;
      for (var k = 0; k < cycles; k++) { cell.to(this._rand(this.text[i]), dur * 0.45, k === 0 ? d : 0); }
      cell.to(this.text[i], dur * 0.7, 0);
    }
  };

  /* Start blank and drop every letter into place. */
  FlapText.prototype.intro = function (opt) {
    opt = opt || {};
    if (reduce) return;
    for (var i = 0; i < this.cells.length; i++) {
      var cell = this.cells[i];
      cell.ch = ' ';
      cell.a.textContent = cell.b.textContent = cell.f.textContent = cell.k.textContent = ' ';
    }
    this.set(this.text, opt);
  };

  FlapText.prototype._rand = function (avoid) {
    var g = this.o.glyphs, c;
    do { c = g[(Math.random() * g.length) | 0]; } while (c === avoid && g.length > 1);
    var orig = avoid || '';
    return orig === orig.toLowerCase() && orig !== orig.toUpperCase() ? c.toLowerCase() : c;
  };

  root.FlapText = FlapText;
})(window);
