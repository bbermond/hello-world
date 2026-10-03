# Bermond — Digital Designer

A scroll-driven portfolio that merges a minimalist layout with Pan-African
collage art and airport split-flap ("Solari") boards.

- **Every image is a board of flaps.** Tiles flip in perspective — with
  gravity, a small bounce and light/shadow — when the cursor moves over them
  (knocking the next tiles over like dominoes), randomly on their own, and in
  waves as you scroll, revealing words underneath.
- **Figures separate from the background.** Each portrait is a cut-out that
  floats above its board; when it lifts it leaves a dark silhouette behind,
  like a figure cut out of a magazine page.
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
  `index.html` (it currently uses the placeholder `hello@example.com`).
- **Social links** — the Dribbble, Behance, LinkedIn and Instagram links point
  at each platform's home page; replace them with your profiles.
- **Projects** — the four entries under *Selected Work* are placeholders; edit
  the names, tags and years in `index.html`. Each row's `data-art` picks the
  artwork shown in its flap preview.
- **Messages on the boards** — `MSG` (manifesto wall), `MESSAGES` (contact
  departures board) and the hero text `BERMOND DIGITAL DESIGNER` live in
  `index.js`. Soft hyphens (`­`) mark where long words may break.
- **New artwork** — add `artN.webp` plus a cut-out `artN-figure.webp` (same
  scale, cropped to the figure) and record the crop box in the `ART` table at
  the top of `index.js`; the board, the silhouette and the registration are
  derived from it.

## How the cut-outs were made

The source images were upscaled 2× with ESRGAN, segmented with IS-Net
(`@imgly/background-removal-node`), then cleaned up by hand with art-directed
polygons, morphology and signed-distance anti-aliasing. The teal artwork was
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
