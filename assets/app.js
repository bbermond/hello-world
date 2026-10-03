// Renders the portfolio from window.PORTFOLIO.
// Share a focused version with ?track=craft | product | leader (default: product).
(function () {
  const data = window.PORTFOLIO;
  const params = new URLSearchParams(location.search);
  const trackKey = data.tracks[params.get("track")] ? params.get("track") : "product";
  const track = data.tracks[trackKey];
  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };

  document.title = `${data.person.name} · ${track.label}`;

  const nav = $("[data-tracks]");
  Object.entries(data.tracks).forEach(([key, t]) => {
    const a = el("a", key === trackKey ? "active" : "", t.label);
    a.href = `?track=${key}`;
    if (key === trackKey) a.setAttribute("aria-current", "page");
    nav.append(a);
  });

  $("[data-eyebrow]").textContent = track.eyebrow;
  $("[data-headline]").textContent = track.headline;
  $("[data-summary]").textContent = track.summary;
  $("[data-location]").textContent = data.person.location;
  $("[data-languages]").textContent = data.person.languages;

  const mail = `mailto:${data.person.email}`;
  $("[data-email]").href = mail;
  const mailText = $("[data-email-text]");
  mailText.href = mail;
  mailText.textContent = data.person.email;

  const links = $("[data-links]");
  data.person.links.forEach((l) => {
    const a = el("a", "link", l.label);
    a.href = l.url;
    a.target = "_blank";
    a.rel = "noopener";
    links.append(a);
  });

  const grid = $("[data-projects]");
  track.featured.forEach((id, i) => {
    const p = data.projects[id];
    if (!p) return;
    const card = el("article", i === 0 ? "card lead" : "card");
    card.append(el("p", "kicker", p.kicker));
    card.append(el("h3", "", p.title));
    card.append(el("p", "role", p.role));
    card.append(el("p", "", p.summary));
    const ul = el("ul", "outcomes");
    p.outcomes.forEach((o) => ul.append(el("li", "", o)));
    card.append(ul);
    const tags = el("p", "tags");
    p.tags.forEach((t) => tags.append(el("span", "", t)));
    card.append(tags);
    if (p.link) {
      const a = el("a", "link", "Visit ↗");
      a.href = p.link;
      a.target = "_blank";
      a.rel = "noopener";
      card.append(a);
    }
    grid.append(card);
  });

  const skills = $("[data-skills]");
  track.skills.forEach((s) => skills.append(el("li", "", s)));

  const tl = $("[data-experience]");
  data.experience.forEach((x) => {
    const li = el("li");
    li.append(el("span", "years", x.years));
    const body = el("div");
    body.append(el("strong", "", x.role));
    body.append(el("span", "org", x.org));
    li.append(body);
    tl.append(li);
  });

  $("[data-year]").textContent = new Date().getFullYear();
})();
