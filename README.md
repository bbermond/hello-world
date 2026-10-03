# Bermond — Digital Designer

A scroll-driven portfolio that merges a minimalist layout with Pan-African
collage art and airport split-flap ("Solari") boards.

- **Every image is a board of flaps.** Tiles flip in perspective — with
  gravity, a small bounce and light/shadow — when the cursor moves over them
  (knocking the next tiles over like dominoes), randomly on their own, and in
  waves as you scroll, revealing words underneath.
- **Figures separate from the background.** The hero is Bermond's own
  portrait, built from the artwork's layers: the board shows the background
  and rear geometry, and the portrait, the foreground geometry and the fine
  lines float above it on their own planes, each with its own parallax. On
  scroll they lift off — nearest first — to uncover the message underneath.
  The other portraits are torn-paper cut-outs; when one lifts, its board
  keeps a halftone imprint of the figure, like a page the picture was torn
  from.
- **Scroll-driven scenes.** The hero board flips into its message, the
  manifesto wall turns the artwork into words and back, and a collage is
  pulled apart into its layers in 3D.

## Run it

No build step — it is plain HTML, CSS and JavaScript.

```bash
npx serve .            # or: python3 -m http.server
```

Then open the printed URL. Serve it over HTTP rather than double-clicking
`index.html`: browsers like Chrome refuse to load web fonts from `file://`
pages, so the typography would fall back to system fonts.

## Structure

```
index.html            page markup and copy
main.css              design tokens (light + dark), layout, split-flap type
index.js              page orchestration: loader, scenes, interactions
js/flapboard.js       canvas split-flap board engine (images, glyphs, waves)
js/flaptext.js        split-flap animation for real DOM text
assets/img/           artworks, cut-outs, depth layers, grain, favicon, og
assets/fonts/         self-hosted woff2 fonts
assets/vendor/        Lenis smooth scroll (MIT)
```

## Make it yours

- **Email** — set it once on `<body data-email="you@domain.com">` in
  `index.html` (it currently uses the placeholder `hello@example.com`). It
  feeds every mailto link and the flap row in the contact section, which
  copies the address on click.
- **Share image** — `og:image` points at `assets/img/og.jpg` with a relative
  path; once the site has a domain, make it an absolute URL so social
  networks pick it up.
- **Social links** — the Dribbble, Behance, LinkedIn and Instagram links point
  at each platform's home page; replace them with your profiles.
- **Projects** — the four entries under *Selected Work* are placeholders; edit
  the names, tags and years in `index.html`. Each row's `data-art` picks the
  artwork shown in its flap preview.
- **Messages on the boards** — `MSG` (manifesto wall), `MESSAGES` (contact
  departures board), `STEPS` (process timetable), the hero text
  `HELLO I’M BERMOND` and the footer `NAME` live in `index.js`. A soft hyphen
  (`\u00AD` in a string) marks where a long word may break.
- **Portrait** — the hero uses `assets/img/bermond*.{avif,webp}`: `bermond`
  (background + rear geometry, shown on the board), `bermond-figure` (the
  portrait), `bermond-front` (foreground geometry), `bermond-lines` (lines
  and marks) and `bermond-flat` (the flattened artwork, used without
  JavaScript). Their crop boxes, in a 2508 px square, are in `ART.bermond`
  at the top of `index.js`.
- **New artwork** — add `artN.webp` plus a cut-out `artN-figure.webp` (same
  scale, cropped to the figure) and record the crop box in the `ART` table at
  the top of `index.js`; the board, the halftone imprint and the registration
  are derived from it.

## How the cut-outs were made

The hero portrait comes from Bermond's layered file (five layers). The
portrait, rear geometry and lines line up with the flattened artwork; the
foreground geometry layer had been exported about 1.2× too large, so it was
re-registered to the artwork with SIFT feature matching refined by ECC
alignment. Paint that sits on the face stays with the portrait; the fine
lines float as their own plane. The graphic layers were upscaled with
ESRGAN; the face keeps plain resampling, because ESRGAN smoothed its
painterly texture. Faint texture under 4% opacity was dropped from the
lines, and the layers ship as AVIF with WebP fallbacks (about 460 KB).

The other artworks were upscaled with ESRGAN (2×, and 4× for the full-width
wall), segmented with IS-Net (`@imgly/background-removal-node`), then cleaned
up by hand with art-directed polygons, morphology and signed-distance
anti-aliasing. Each cut-out is finished as torn paper: noisy tear lines with
paper fibres along them, and a thin irregular paper rim. The teal artwork was
split into four layers (field, sun, portrait, leaves); the parts of the sun
hidden behind the portrait were rebuilt as flat orange with the original
texture feathered in.

## Accessibility and performance

- Real text everywhere: animated cells are `aria-hidden` with a visually
  hidden copy of the words; boards are decorative and their messages are
  repeated as screen-reader text.
- `prefers-reduced-motion` turns off smooth scrolling, flips, waves and the
  loader; without JavaScript the page renders as a static collage.
- Boards only redraw the tiles that move, idle flips pause off-screen, and
  shadows are pre-blurred bitmaps so nothing re-filters per frame.
- Flap sound is opt-in and synthesised with Web Audio (no audio files).

## Credits

- Collage artworks signed **“Hej ’24”** — all rights remain with the artist.
  Make sure you have permission before publishing them.
- Fonts (SIL Open Font License): Funnel Display & Funnel Sans, Barlow
  Condensed, Geist Mono.
- [Lenis](https://github.com/darkroomengineering/lenis) smooth scroll (MIT).
