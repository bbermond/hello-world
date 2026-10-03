# Story asset slots

`story.html` runs end to end with procedural placeholders: tiles, the portrait illustration, the hat, hills and dust are all drawn in SVG or canvas. Each slot below can be replaced with real or generated art without touching the interaction code. The prompts are in `docs/art-direction/dry-season-brief.md` §8.

| Slot | File to add | Size | Where it plugs in | Notes |
|---|---|---|---|---|
| Portrait cutout | `portrait-cutout.webp` | 1600×2000, transparent | `buildPortrait()` in `assets/story.js`: replace `<g class="placeholder-body">` with `<image href="assets/story/portrait-cutout.webp" width="400" height="500"/>` | Source is the café photo. Remove the background, both people behind, the newspaper and the earbud. Then update `EYES` to the eye centres in the 400×500 box, and export the eye whites and pupils as clean areas so the animated eyes sit on top |
| Portrait, cubist | `portrait-cubist.webp` | 1600×2000, transparent | Optional alternate for chapter 2 | Brief §3, ref 2 treatment |
| Market wall | `market-wall.webp` + `.avif` | 2400×1030 (21:9) | `[data-market-wall]` in `story.html`: set it as a background image and drop the generated posters | Duotone at about 35% opacity |
| Savanna layers | `savanna-sky/far/near/shrubs/road.webp` | 2400×960 each, transparent | `.road-sky .layer` SVGs in chapter 3 (keep `data-parallax`) | Five parallax depths |
| Tiles | `tiles/front-01…24.svg`, `tiles/back-01…24.svg` | 100×100 viewBox | `MOTIFS` in `assets/story.js` | Keep the 8-unit grid so tiles stay swappable |
| Hat | `hat.webp` | 600×360, transparent | `HAT_SVG` in `assets/story.js` | Keep the crown-base pivot at (75, 64) in a 150×90 box |
| Clack sounds | `clack-1…4.mp3` | under 15 KB each | `clack()` in `assets/story.js` (currently synthesised) | Optional. The synthesised clack works today |
| Ambient bed | `ambient-wind-market.mp3` | under 300 KB, loopable | New `<audio>` element, played only while sound is on | Optional |

Only ship Bermond's own images and licensed or generated assets. Never put third-party reference images here.
