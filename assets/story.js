// Harmattan story renderer. Content comes only from window.PORTFOLIO (assets/data.js).
// Art direction: docs/art-direction/dry-season-brief.md. Asset slots: assets/story/README.md.
(function () {
  "use strict";
  const D = window.PORTFOLIO;
  const params = new URLSearchParams(location.search);
  const trackKey = D.tracks[params.get("track")] ? params.get("track") : "product";
  const T = D.tracks[trackKey];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  function rng(seed) {
    let a = typeof seed === "string" ? [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) : seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

  // ---------- Palette & tile motifs (brief §3, ref 3 + Ndop) ----------
  const C = {
    gold: "#E2B04A", red: "#B4532A", dust: "#E9D3B0", straw: "#C9A66B", line: "#1E1A17",
    indigo: "#2B3A7A", night: "#1C1530", sky: "#8FB3FF", sun: "#FFE58A", lilac: "#B98BFF", coral: "#FF9E7A", paper: "#F3E4C8"
  };
  const SCHEMES = {
    day: [
      [C.gold, C.red, C.indigo], [C.red, C.dust, C.gold], [C.indigo, C.gold, C.dust], [C.straw, C.red, C.line],
      [C.dust, C.indigo, C.red], [C.line, C.gold, C.red], [C.red, C.indigo, C.dust], [C.gold, C.line, C.dust]
    ],
    night: [
      [C.night, C.sky, C.sun], [C.indigo, C.lilac, C.coral], [C.sky, C.night, C.sun], [C.coral, C.night, C.lilac], [C.lilac, C.indigo, C.sun]
    ]
  };
  // Each motif: list of [svg tag, attrs, role] in a 100×100 box. role: fg | ac
  const MOTIFS = [
    [["path", 'd="M0 0H100A100 100 0 0 1 0 100Z"', "fg"], ["circle", 'cx="74" cy="74" r="12"', "ac"]],
    [["path", 'd="M10 100V50A40 40 0 0 1 90 50V100Z"', "fg"], ["path", 'd="M30 100V56A20 20 0 0 1 70 56V100Z"', "ac"]],
    [["path", 'd="M50 4Q56 44 96 50Q56 56 50 96Q44 56 4 50Q44 44 50 4Z"', "fg"]],
    [["path", 'd="M0 18L50 52L100 18V44L50 78L0 44Z"', "fg"], ["path", 'd="M0 72L50 100H0Z"', "ac"]],
    [["path", 'd="M50 6L94 50L50 94L6 50Z"', "fg"], ["path", 'd="M50 30L70 50L50 70L30 50Z"', "ac"]],
    [["path", 'd="M0 0A50 50 0 0 0 100 0Z"', "fg"], ["path", 'd="M0 100A50 50 0 0 1 100 100Z"', "ac"]],
    [["circle", 'cx="50" cy="50" r="36"', "fg"], ["circle", 'cx="50" cy="50" r="13"', "ac"]],
    [["path", 'd="M0 100L50 8L100 100Z"', "fg"], ["path", 'd="M32 100L50 66L68 100Z"', "ac"]],
    [["rect", 'y="8" width="100" height="18"', "fg"], ["rect", 'y="41" width="100" height="18"', "ac"], ["rect", 'y="74" width="100" height="18"', "fg"]],
    [["path", 'd="M0 100V0A100 100 0 0 1 100 100Z"', "fg"], ["path", 'd="M0 100V34A66 66 0 0 1 66 100Z"', "ac"], ["path", 'd="M0 100V67A33 33 0 0 1 33 100Z"', "fg"]],
    [["path", 'd="M0 50C25 10 75 90 100 50V100H0Z"', "fg"]],
    [["path", 'd="M38 0H62V38H100V62H62V100H38V62H0V38H38Z"', "fg"], ["circle", 'cx="50" cy="50" r="9"', "ac"]]
  ];
  function shapes(motif, scheme, outline) {
    return MOTIFS[motif].map(([tag, attrs, role]) => outline
      ? `<${tag} ${attrs} fill="none" stroke="${C.line}" stroke-width="2.5"/>`
      : `<${tag} ${attrs} fill="${role === "fg" ? scheme[1] : scheme[2]}"/>`).join("");
  }
  function faceSVG(cls, motif, scheme, rot, outline) {
    const bg = outline ? C.paper : scheme[0];
    return `<svg class="face ${cls}" viewBox="0 0 100 100" preserveAspectRatio="none"><rect width="100" height="100" fill="${bg}"/><g transform="rotate(${rot} 50 50)">${shapes(motif, scheme, outline)}</g></svg>`;
  }
  // back: "outline" (ref 3 bottom row) or a scheme array (next chapter's palette)
  function makeTile(r, frontSchemes, back) {
    const t = el("div", "tile");
    const motif = Math.floor(r() * MOTIFS.length);
    const rot = Math.floor(r() * 4) * 90;
    const front = faceSVG("front", motif, pick(r, frontSchemes), rot, false);
    const backSVG = back === "outline"
      ? faceSVG("back", motif, null, rot, true)
      : faceSVG("back", Math.floor(r() * MOTIFS.length), pick(r, back), Math.floor(r() * 4) * 90, false);
    t.innerHTML = `<div class="tile-in">${front}${backSVG}</div>`;
    t._s = 0; t._h = 0; t._last = 0; t._in = t.firstChild;
    return t;
  }
  function renderTile(t) {
    const turns = t._s + t._h;
    if (!reduce) t._in.style.transform = `rotateY(${turns * 180}deg)`;
    t.classList.toggle("is-back", turns % 2 === 1);
  }

  // ---------- Sound: synthesised clay-tile clack (brief §5) ----------
  const audio = { on: false, ctx: null, master: null, noise: null, voices: 0, lastFrame: 0 };
  function initAudio() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    audio.ctx = new Ctx();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.6;
    audio.master.connect(audio.ctx.destination);
    const len = Math.floor(audio.ctx.sampleRate * 0.08);
    audio.noise = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const d = audio.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    return true;
  }
  function clack(vol = 1) {
    if (!audio.on || audio.voices >= 8) return;
    const ctx = audio.ctx, t = ctx.currentTime;
    const pitch = 1 + (Math.random() * 0.16 - 0.08);
    const src = ctx.createBufferSource();
    src.buffer = audio.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 1900 * pitch; bp.Q.value = 5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.7 * vol, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
    const thump = ctx.createOscillator();
    thump.frequency.value = 210 * pitch;
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.25 * vol, t);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(bp).connect(g).connect(audio.master);
    thump.connect(tg).connect(audio.master);
    src.start(t); src.stop(t + 0.09);
    thump.start(t); thump.stop(t + 0.06);
    audio.voices++;
    src.onended = () => { audio.voices--; };
  }
  const soundBtn = $("[data-sound]");
  soundBtn.addEventListener("click", () => {
    if (!audio.ctx && !initAudio()) return;
    audio.on = !audio.on;
    if (audio.on) audio.ctx.resume();
    soundBtn.setAttribute("aria-pressed", String(audio.on));
    soundBtn.textContent = audio.on ? "Sound on" : "Sound off";
    if (audio.on) clack(0.8);
  });

  // ---------- Hover ripple: neighbours flip ring by ring (~40ms per ring) ----------
  function hoverFlip(t, ring) {
    const now = performance.now();
    if (now - t._last < 600) return;
    t._last = now;
    t._h++;
    renderTile(t);
    clack(1 / (1 + ring * 1.5));
  }
  function attachRipple(container, getGrid, rings) {
    let lastIdx = -1;
    const handle = (e) => {
      const tile = e.target.closest && e.target.closest(".tile");
      if (!tile) return;
      const { tiles, cols } = getGrid();
      const idx = tiles.indexOf(tile);
      if (idx < 0 || idx === lastIdx) return;
      lastIdx = idx;
      const r0 = Math.floor(idx / cols), c0 = idx % cols;
      tiles.forEach((t, j) => {
        const d = Math.max(Math.abs(Math.floor(j / cols) - r0), Math.abs((j % cols) - c0));
        if (d <= rings) setTimeout(() => hoverFlip(t, d), d * 40);
      });
    };
    container.addEventListener("pointermove", handle);
    container.addEventListener("pointerdown", handle);
    container.addEventListener("pointerleave", () => { lastIdx = -1; });
  }

  // ---------- Copy & navigation ----------
  document.title = `${D.person.name} · ${T.label} · Harmattan`;
  const tracksNav = $("[data-tracks]");
  Object.entries(D.tracks).forEach(([k, t]) => {
    const a = el("a", "", t.label);
    a.href = `?track=${k}`;
    if (k === trackKey) a.setAttribute("aria-current", "page");
    tracksNav.append(a);
  });
  $$("[data-skip]").forEach((a) => { a.href = `index.html?track=${trackKey}`; });
  $("[data-eyebrow]").textContent = T.eyebrow;
  $("[data-headline]").textContent = T.headline;
  $("[data-summary]").textContent = T.summary;
  $("[data-about-summary]").textContent = T.summary;
  $("[data-languages]").textContent = D.person.languages;
  $("[data-location]").textContent = D.person.location;
  const skills = $("[data-skills]");
  T.skills.forEach((s) => skills.append(el("li", "", s)));
  const trackChapter = $(`[data-track="${trackKey}"]`);
  if (trackChapter) {
    $("[data-jump]").href = `#${trackChapter.id}`;
    $("[data-jump]").textContent = `Walk to ${trackChapter.dataset.title} ↓`;
    trackChapter.querySelector("h2").insertAdjacentHTML("beforeend", ' <span class="track-badge">Your track</span>');
  }
  const mail = `mailto:${D.person.email}`;
  $("[data-email]").href = mail;
  const links = $("[data-links]");
  D.person.links.forEach((l) => {
    const a = el("a", "", `${l.label} ↗`);
    a.href = l.url; a.target = "_blank"; a.rel = "noopener";
    links.append(a);
  });
  $("[data-year]").textContent = new Date().getFullYear();

  // ---------- Which projects go in which chapter ----------
  // The active track's chapter keeps all its featured work; other chapters skip repeats.
  // Leftover projects join the product chapter so nothing gets lost.
  const chapterOrder = ["craft", "product", "leader"];
  const claimed = new Set();
  const byTrack = {};
  [trackKey, ...chapterOrder.filter((k) => k !== trackKey)].forEach((k) => {
    byTrack[k] = D.tracks[k].featured.filter((id) => D.projects[id] && !claimed.has(id));
    byTrack[k].forEach((id) => claimed.add(id));
  });
  Object.keys(D.projects).forEach((id) => { if (!claimed.has(id)) byTrack.product.push(id); });

  function projectBody(p, wrap) {
    const role = el("p", "role", p.role);
    const sum = el("p", "", p.summary);
    const ul = el("ul");
    (p.outcomes || []).forEach((o) => ul.append(el("li", "", o)));
    wrap.append(role, sum, ul);
    if (p.link) {
      const a = el("a", "", "Visit ↗");
      a.href = p.link; a.target = "_blank"; a.rel = "noopener";
      wrap.append(a);
    }
  }

  // ---------- 0 · Market wall + hero tile wall ----------
  function posterSVG(seed, schemes) {
    const r = rng(seed);
    let cells = "";
    for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) {
      const s = pick(r, schemes), m = Math.floor(r() * MOTIFS.length), rot = Math.floor(r() * 4) * 90;
      cells += `<g transform="translate(${x * 100} ${y * 100})"><rect width="100" height="100" fill="${s[0]}"/><g transform="rotate(${rot} 50 50)">${shapes(m, s, false)}</g></g>`;
    }
    return `<svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice">${cells}</svg>`;
  }
  const wall = $("[data-market-wall]");
  for (let i = 0; i < 24; i++) {
    const p = el("div", "mposter");
    p.style.transform = `rotate(${(rng(i)() * 6 - 3).toFixed(1)}deg)`;
    p.innerHTML = posterSVG(`m${i}`, SCHEMES.day);
    wall.append(p);
  }
  const heroWall = $("[data-wall]");
  const wallRng = rng("wall");
  const wallTiles = [];
  for (let i = 0; i < 40; i++) { const t = makeTile(wallRng, SCHEMES.day, "outline"); wallTiles.push(t); heroWall.append(t); }
  attachRipple(heroWall, () => ({ tiles: wallTiles, cols: 8 }), 2);

  // ---------- Portrait (placeholder illustration) with eyes ----------
  // When the real cutout arrives: replace the <g class="placeholder-body"> with
  // <image href="assets/story/portrait-cutout.webp" .../> and update EYES to the photo's eye centres.
  const EYES = [{ x: 168, y: 214 }, { x: 232, y: 214 }];
  const HAT_SVG = `<svg viewBox="0 0 150 90"><ellipse cx="75" cy="66" rx="72" ry="16" fill="#D9B26A" stroke="#1E1A17" stroke-width="2"/><path d="M35 64C35 30 50 12 75 12C100 12 115 30 115 64Z" fill="#E2BE78" stroke="#1E1A17" stroke-width="2"/><path d="M36 50C60 57 90 57 114 50L115 61C90 68 60 68 35 61Z" fill="#B4532A"/><path d="M48 30C66 26 84 26 102 30M42 42C64 38 86 38 108 42M20 70C55 78 95 78 130 70" fill="none" stroke="#A8834A" stroke-width="1.5"/></svg>`;
  function buildPortrait(fig, sun) {
    const eyes = EYES.map((e, i) => `<g class="eye" data-eye="${i}"><ellipse class="eye-white" cx="${e.x}" cy="${e.y}" rx="17" ry="10.5"/><g class="pupil-g"><circle class="pupil" cx="${e.x}" cy="${e.y}" r="7"/><circle class="glint" cx="${e.x + 2.5}" cy="${e.y - 2.5}" r="2"/></g><ellipse class="lid" cx="${e.x}" cy="${e.y}" rx="18" ry="11.5"/></g>`).join("");
    fig.insertAdjacentHTML("afterbegin", `<svg class="portrait" viewBox="0 0 400 500" role="img" aria-label="Illustrated placeholder of Bermond">
      ${sun ? `<circle cx="200" cy="215" r="172" fill="${C.gold}"/>` : `<circle cx="200" cy="230" r="150" fill="${C.straw}"/>`}
      <g class="placeholder-body">
        <path d="M30 500C40 385 115 338 200 334C285 338 360 385 370 500Z" fill="#C8922B" stroke="#1E1A17" stroke-width="2"/>
        <path d="M120 360C150 420 250 420 280 360L268 350C240 395 160 395 132 350Z" fill="#2B3A7A"/>
        <path d="M200 380V500" stroke="#1E1A17" stroke-width="3"/>
        <path d="M172 285H228V352C214 362 186 362 172 352Z" fill="#4A2D1F"/>
        <ellipse cx="122" cy="222" rx="12" ry="20" fill="#5A3826"/><ellipse cx="278" cy="222" rx="12" ry="20" fill="#5A3826"/>
        <ellipse cx="200" cy="212" rx="78" ry="96" fill="#5A3826"/>
        <path d="M124 186C118 122 166 100 200 100C238 100 286 120 276 186C262 156 232 146 200 146C168 146 138 156 124 186Z" fill="#1A0F0A"/>
        <path d="M150 196Q168 188 186 196M214 196Q232 188 250 196" fill="none" stroke="#1A0F0A" stroke-width="5" stroke-linecap="round"/>
        <path d="M200 222Q194 248 186 252Q200 258 214 252" fill="none" stroke="#3C2417" stroke-width="3" stroke-linecap="round"/>
        <path d="M178 276Q200 284 222 276" fill="none" stroke="#1A0F0A" stroke-width="4" stroke-linecap="round"/>
        <path d="M160 270Q200 320 240 270Q236 300 200 306Q164 300 160 270Z" fill="#1A0F0A" opacity=".55"/>
      </g>
      <g class="eyes">${eyes}</g>
      <g class="static-hat" transform="translate(125 64)">${HAT_SVG.replace("<svg ", '<svg width="150" height="90" ')}</g>
      <circle class="hat-anchor" cx="200" cy="128" r="1" fill="none"/>
    </svg>`);
    const svg = fig.querySelector("svg.portrait");
    const state = { fig, svg, eyesG: svg.querySelector(".eyes"), pupils: $$(".pupil-g", svg), whites: $$(".eye-white", svg), scale: 1, vel: 0 };
    (function blink() {
      setTimeout(() => {
        svg.classList.add("blink");
        setTimeout(() => svg.classList.remove("blink"), 200);
        blink();
      }, 4000 + Math.random() * 3000);
    })();
    return state;
  }
  const portraits = [buildPortrait($('[data-portrait="hero"]'), true), buildPortrait($('[data-portrait="home"]'), false)];
  const pointer = { x: -9999, y: -9999, has: false };
  addEventListener("pointermove", (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.has = true; }, { passive: true });
  addEventListener("pointerdown", (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.has = true; }, { passive: true });

  function updateEyes(dt) {
    portraits.forEach((p) => {
      const r = p.svg.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const k = r.width / 400;
      let near = false;
      p.whites.forEach((w, i) => {
        const cx = r.left + EYES[i].x * k, cy = r.top + EYES[i].y * k;
        const dx = pointer.x - cx, dy = pointer.y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < 220) near = true;
        const max = 6.2; // ≈35% of the eye radius, in SVG units
        const m = pointer.has ? Math.min(max, dist / k / 18) : 0;
        const a = Math.atan2(dy, dx);
        p.pupils[i].setAttribute("transform", `translate(${(Math.cos(a) * m).toFixed(2)} ${(Math.sin(a) * m * 0.6).toFixed(2)})`);
      });
      if (reduce) return;
      // Spring towards the pop scale (stiffness 300, damping 12)
      const target = near ? 1.25 : 1;
      const acc = 300 * (target - p.scale) - 12 * p.vel;
      p.vel += acc * dt;
      p.scale += p.vel * dt;
      p.eyesG.style.transform = `scale(${p.scale.toFixed(3)})`;
      p.eyesG.style.filter = near ? "drop-shadow(0 4px 3px rgba(0,0,0,.35))" : "";
      p.fig.dataset.eyes = near ? "pop" : "rest";
    });
  }

  // ---------- 1 · Posters ----------
  const postersEl = $("[data-posters]");
  byTrack.craft.forEach((id) => {
    const p = D.projects[id];
    const card = el("article", "poster");
    card.tabIndex = 0;
    card.setAttribute("aria-label", p.title);
    const inner = el("div", "poster-in");
    const front = el("div", "poster-face poster-front");
    front.setAttribute("aria-hidden", "true");
    front.innerHTML = posterSVG(id, SCHEMES.day).replace('viewBox="0 0 300 400"', 'viewBox="0 0 300 400" style="grid-column:1/-1;grid-row:1/-1"');
    const title = el("div", "poster-title");
    title.append(el("h3", "", p.title), el("p", "", p.kicker));
    front.append(title);
    const back = el("div", "poster-face poster-back");
    back.insertAdjacentHTML("beforeend", `<svg class="watermark" viewBox="0 0 100 100" aria-hidden="true">${shapes(rng(id)() * MOTIFS.length | 0, null, true)}</svg>`);
    back.append(el("h3", "", p.title));
    projectBody(p, back);
    inner.append(front, back);
    card.append(inner);
    const set = (on) => {
      if (card.classList.contains("is-flipped") === on) return;
      card.classList.toggle("is-flipped", on);
      clack(0.9);
    };
    if (!coarse) {
      card.addEventListener("pointerenter", () => set(true));
      card.addEventListener("pointerleave", () => set(false));
    } else {
      card.addEventListener("click", (e) => { if (!e.target.closest("a")) set(!card.classList.contains("is-flipped")); });
    }
    card.addEventListener("focusin", () => set(true));
    card.addEventListener("focusout", (e) => { if (!card.contains(e.relatedTarget)) set(false); });
    postersEl.append(card);
  });

  // ---------- 3 · Road ----------
  const ms = $("[data-milestones]");
  D.experience.forEach((x) => {
    const li = el("li");
    li.append(el("span", "years", x.years), el("strong", "", x.role), el("span", "org", x.org));
    ms.append(li);
  });
  const shrubs = $(".l-near .shrubs");
  const sr = rng("shrubs");
  for (let i = 0; i < 26; i++) {
    shrubs.insertAdjacentHTML("beforeend", `<circle cx="${(sr() * 1000).toFixed(0)}" cy="${(330 + sr() * 60).toFixed(0)}" r="${(8 + sr() * 22).toFixed(0)}"/>`);
  }
  const road = $("[data-road]");
  const roadBed = $(".road-bed", road), roadLine = $(".road-line", road);
  let roadLen = 0;
  function layoutRoad() {
    const wrap = road.parentElement;
    const W = wrap.clientWidth, H = wrap.clientHeight;
    road.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const items = $$("li", ms);
    let d = `M${W / 2} 0`;
    let prevY = 0, prevX = W / 2;
    items.forEach((li, i) => {
      const y = li.offsetTop + li.offsetHeight + 40;
      const x = W / 2 + (i % 2 ? -1 : 1) * W * 0.07;
      const my = (prevY + y) / 2;
      d += ` C${prevX} ${my} ${x} ${my} ${x} ${y}`;
      prevX = x; prevY = y;
    });
    d += ` C${prevX} ${(prevY + H) / 2} ${W / 2} ${(prevY + H) / 2} ${W / 2} ${H}`;
    roadBed.setAttribute("d", d);
    roadLine.setAttribute("d", d);
    roadLen = roadBed.getTotalLength();
    roadBed.style.strokeDasharray = `${roadLen}`;
  }

  // ---------- 4 · Storm cards ----------
  const storms = $("[data-storms]");
  byTrack.product.forEach((id) => {
    const p = D.projects[id];
    const wrap = el("div", "storm");
    const card = el("article", "storm-card");
    card.append(el("p", "kicker", p.kicker), el("h3", "", p.title));
    projectBody(p, card);
    const tags = el("ul", "tags");
    (p.tags || []).forEach((t) => tags.append(el("li", "", t)));
    card.append(tags);
    wrap.append(card);
    storms.append(wrap);
  });

  // ---------- 5 · Afrofuture ----------
  const arc = $("[data-arc-title]");
  const pastel = [C.sky, C.sun, C.lilac, C.coral];
  let li = 0;
  arc.innerHTML = arc.textContent.split(" ").map((word) => `<span class="arc-word">${[...word].map((ch) => {
    const i = li++;
    return `<span class="ch-letter" style="color:${pastel[i % 4]};transform:translateY(${(i % 3) * 6 - 6}px) rotate(${(i % 5) - 2}deg)">${esc(ch)}</span>`;
  }).join("")}</span>`).join(" ");
  const future = $("[data-future]");
  byTrack.leader.forEach((id, i) => {
    const p = D.projects[id];
    const card = el("article", "fcard");
    const s = SCHEMES.night[i % SCHEMES.night.length];
    card.insertAdjacentHTML("afterbegin", `<svg class="corner" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" fill="${s[0]}"/>${shapes(i % MOTIFS.length, s, false)}</svg>`);
    card.append(el("p", "kicker", p.kicker), el("h3", "", p.title));
    projectBody(p, card);
    future.append(card);
  });

  // ---------- Domino bands ----------
  const bands = $$("[data-band]").map((band, bi) => ({ band, bi, tiles: [], cols: 0, n: 0, line: null, len: 0 }));
  function buildBand(b) {
    const { band } = b;
    const size = innerWidth < 720 ? 40 : 56;
    const cols = Math.ceil(band.clientWidth / size);
    const rows = 2;
    const r = rng(`band${b.bi}`);
    const from = SCHEMES[band.dataset.from], to = SCHEMES[band.dataset.to];
    band.classList.toggle("to-night", band.dataset.to === "night");
    band.innerHTML = "";
    band.style.setProperty("--tile", `${size}px`);
    const grid = el("div", "band-grid");
    grid.style.gridTemplateColumns = `repeat(${cols}, ${size}px)`;
    b.tiles = [];
    for (let i = 0; i < cols * rows; i++) { const t = makeTile(r, from, to); b.tiles.push(t); grid.append(t); }
    b.cols = cols; b.n = 0;
    band.append(grid);
    // The pencil line that knocks the dominos over
    const W = cols * size, H = rows * size;
    let d = `M-10 ${H / 2}`;
    for (let x = 30; x <= W + 30; x += 30) d += ` L${x} ${(H / 2 + Math.sin(x / 70 + b.bi) * H * 0.18 + (r() * 6 - 3)).toFixed(1)}`;
    band.insertAdjacentHTML("beforeend", `<svg class="band-line" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMid slice"><path d="${d}"/></svg>`);
    b.line = $(".band-line path", band);
    b.len = b.line.getTotalLength();
    b.line.style.strokeDasharray = `${b.len}`;
    b.line.style.strokeDashoffset = reduce ? "0" : `${b.len}`;
  }
  bands.forEach((b) => attachRipple(b.band, () => ({ tiles: b.tiles, cols: b.cols }), 1));

  // ---------- Progress rail ----------
  const sections = $$("main > section.ch");
  const railList = $("[data-rail]");
  const rungs = sections.map((s) => {
    const li = el("li");
    const btn = el("button");
    btn.type = "button";
    btn.append(el("span", "", s.dataset.title));
    btn.setAttribute("aria-label", `Go to ${s.dataset.title}`);
    btn.addEventListener("click", () => s.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }));
    li.append(btn);
    railList.append(li);
    return btn;
  });
  const railDot = $("[data-rail-dot]");

  // ---------- Dust storm canvas ----------
  const canvas = $("[data-dust]");
  const ctx2d = canvas.getContext("2d");
  const N = coarse || innerWidth < 720 ? 500 : 1500;
  const dustColors = [C.dust, C.straw, C.red, C.straw, C.dust, C.gold];
  const motes = Array.from({ length: N }, (_, i) => ({
    a: Math.random() * Math.PI * 2, r: Math.pow(Math.random(), 0.6), s: 0.4 + Math.random() * 1.4,
    z: 0.6 + Math.random() * 2.2, c: dustColors[i % dustColors.length], o: Math.random() * Math.PI * 2
  }));
  let dustActive = false;
  function sizeCanvas() {
    const dpr = Math.min(1.5, devicePixelRatio || 1);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function stormState(card) {
    const r = card.parentElement.getBoundingClientRect();
    const c = r.top + r.height / 2;
    const p = 1 - c / innerHeight; // 0: centre at bottom of screen · 1: centre at top
    const clear = p < 0.3 ? 1 : p < 0.55 ? (0.55 - p) / 0.25 : 0;
    const draw = p < -0.2 || p > 1.2 ? 0 : Math.max(clear, 0.12);
    return { r, clear, draw };
  }
  function updateDust(dt, time) {
    let best = null;
    $$(".storm-card", storms).forEach((card) => {
      const st = stormState(card);
      card.style.clipPath = reduce ? "" : `circle(${((1 - st.clear) * 75).toFixed(1)}% at 50% 50%)`;
      if (!reduce) card.style.opacity = String(0.25 + 0.75 * (1 - st.clear));
      if (!best || st.draw > best.draw) best = st;
    });
    if (reduce || !best || best.draw <= 0) {
      if (dustActive) { ctx2d.clearRect(0, 0, innerWidth, innerHeight); dustActive = false; }
      return;
    }
    dustActive = true;
    ctx2d.clearRect(0, 0, innerWidth, innerHeight);
    const cx = clamp(best.r.left + best.r.width / 2, 0, innerWidth);
    const cy = clamp(best.r.top + best.r.height / 2, 0, innerHeight);
    const R = Math.max(innerWidth, innerHeight) * 0.6;
    const I = best.draw;
    const haze = ctx2d.createRadialGradient(cx, cy, 0, cx, cy, R);
    haze.addColorStop(0, `rgba(233,211,176,${(0.92 * best.clear).toFixed(3)})`);
    haze.addColorStop(0.55, `rgba(201,166,107,${(0.55 * best.clear).toFixed(3)})`);
    haze.addColorStop(1, "rgba(201,166,107,0)");
    ctx2d.fillStyle = haze;
    ctx2d.fillRect(0, 0, innerWidth, innerHeight);
    const count = Math.floor(N * (0.25 + 0.75 * I));
    for (let i = 0; i < count; i++) {
      const m = motes[i];
      m.a += m.s * (0.4 + 1.6 * I) * dt;
      const rad = R * m.r * (0.35 + 0.65 * (1 - best.clear * 0.3)) + Math.sin(time * 0.001 + m.o) * 12;
      const x = cx + Math.cos(m.a) * rad;
      const y = cy + Math.sin(m.a) * rad * 0.55 + Math.sin(time * 0.0007 + m.o) * 20 * (1 - I);
      ctx2d.globalAlpha = (0.25 + 0.55 * I) * (0.4 + 0.6 * (1 - m.r * 0.5));
      ctx2d.fillStyle = m.c;
      ctx2d.fillRect(x, y, m.z * (1 + 4 * I), m.z); // streaks while the wind is up
    }
    ctx2d.globalAlpha = 1;
  }

  // ---------- Flying hat ----------
  const hat = $("[data-hat]");
  const hatLayer = $("[data-hat-layer]"); // clips the hat so it never widens the page
  hat.innerHTML = HAT_SVG;
  const anchors = $$(".hat-anchor");
  let lastScroll = scrollY, wobble = 0;
  function docPoint(node) {
    const r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2 + scrollX, y: r.top + r.height / 2 + scrollY };
  }
  function updateHat(dt) {
    if (reduce) return;
    const a = docPoint(anchors[0]), b = docPoint(anchors[1]);
    const ka = portraits[0].svg.getBoundingClientRect().width / 400;
    const kb = portraits[1].svg.getBoundingClientRect().width / 400;
    // The hat leaves the head only once the visitor scrolls, and is always home at the bottom
    const follow = scrollY + Math.min(innerHeight * 0.32, a.y - 2);
    const atEnd = scrollY >= document.documentElement.scrollHeight - innerHeight - 2 ||
      homeSection.getBoundingClientRect().top <= innerHeight * 0.2;
    const y = atEnd ? b.y : clamp(follow, a.y, b.y);
    const u = (y - a.y) / Math.max(1, b.y - a.y);
    const wander = Math.sin(u * Math.PI * 7) * innerWidth * 0.3 * Math.sin(u * Math.PI);
    const ease = clamp((u - 0.85) / 0.15);
    const minX = innerWidth > 900 ? lerp(innerWidth * 0.66, innerWidth * 0.08, ease * ease) : innerWidth * 0.08;
    const x = clamp(lerp(a.x, b.x, u) + wander, minX, innerWidth * 0.86);
    const vel = (scrollY - lastScroll) / Math.max(dt, 0.001);
    lastScroll = scrollY;
    wobble = lerp(wobble, clamp(vel * 0.02, -25, 25), 0.15);
    const k = lerp(ka, kb, u) * 1.67; // hat spans the head at either end
    const rot = u * 1440 + (u > 0 && u < 1 ? wobble : 0);
    // Resting on a head: in front. In flight: behind the copy so it never hides text.
    hatLayer.style.zIndex = u <= 0.001 || u >= 0.999 ? "35" : "1";
    // Origin is the hat's crown base (75,64), so that point lands exactly on (x, y)
    hat.style.transform = `translate(${(x - 75).toFixed(1)}px, ${(y - 64).toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${k.toFixed(3)})`;
  }

  // ---------- Main loop ----------
  const roadSection = $("#road");
  const signoff = $("[data-signoff]");
  const homeSection = $("#home");
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const vh = innerHeight;

    // Domino bands: flips scrubbed by scroll, line drawn just ahead
    bands.forEach((b) => {
      const r = b.band.getBoundingClientRect();
      // Always evaluated (6 bands), so a band resets even if you scroll past it in one jump
      const p = clamp((vh - r.top) / (vh * 0.7));
      if (!reduce) b.line.style.strokeDashoffset = String(b.len * (1 - clamp(p * 1.12)));
      const n = reduce ? 0 : Math.round(p * b.tiles.length);
      if (n !== b.n) {
        const lo = Math.min(n, b.n), hi = Math.max(n, b.n);
        for (let i = lo; i < hi; i++) { b.tiles[i]._s = i < n ? 1 : 0; renderTile(b.tiles[i]); }
        if (now - audio.lastFrame > 45) { clack(0.45); audio.lastFrame = now; }
        b.n = n;
      }
    });

    // Road draws itself as you walk; parallax hills
    const rr = roadSection.getBoundingClientRect();
    const rp = clamp((vh * 0.6 - rr.top) / rr.height);
    if (roadLen) roadBed.style.strokeDashoffset = String(roadLen * (1 - (reduce ? 1 : rp)));
    if (!reduce) $$("[data-parallax]", roadSection).forEach((l) => { l.style.transform = `translateY(${(-rp * 260 * l.dataset.parallax).toFixed(1)}px)`; });

    // Sign-off line
    const hr = homeSection.getBoundingClientRect();
    const hp = reduce ? 1 : clamp((vh - hr.top) / (vh * 0.8));
    signoff.style.strokeDashoffset = String(1600 * (1 - hp));
    signoff.style.fill = hp >= 1 ? C.line : "transparent";

    // Progress rail
    let cur = 0;
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top <= vh * 0.4) cur = i; });
    rungs.forEach((b, i) => { if (i === cur) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
    const total = document.documentElement.scrollHeight - vh;
    railDot.style.top = `${(clamp(scrollY / Math.max(1, total)) * 100).toFixed(2)}%`;
    document.body.classList.toggle("night-rail", sections[cur].id === "future");

    const docH = document.documentElement.scrollHeight;
    if (hatLayer._h !== docH) { hatLayer._h = docH; hatLayer.style.height = `${docH}px`; }
    updateEyes(dt);
    updateHat(dt);
    updateDust(dt, now);
    requestAnimationFrame(frame);
  }

  function layout() {
    bands.forEach(buildBand);
    layoutRoad();
    sizeCanvas();
  }
  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(layout, 150); });
  layout();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutRoad);
  requestAnimationFrame(frame);
})();
