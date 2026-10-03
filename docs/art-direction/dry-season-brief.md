# Art-direction brief: "Harmattan", the dry-season portfolio

**Client:** Bermond Yange · **Site:** bermondyange.com · **Status:** v1 brief, ready for build
**Builds on:** the three-track portfolio in this repo (`assets/data.js`, `?track=craft|product|leader`)

---

## 1. The big idea

*A walk through the dry season, from the market to the future.*

The visitor walks a red dirt road out of Kumbo in the Harmattan season. Dust hides and reveals the work. One hand-drawn pencil line, taken from Bermond's own sketch, runs the whole way down the page. It draws each scene, ties one scene to the next, and finally signs Bermond's name.

**Tone:** warm, tactile and playful, but confident. Think of a 1970s Cameroonian market poster seen through an Afrofuturist lens. It should feel crafted, never kitsch, and every effect should earn its place by revealing the work.

**Experience rules:**
1. Scroll is the camera. Nothing moves unless the visitor scrolls or moves the cursor.
2. Everything is touchable. The cursor is a hand in the market: tiles flip, eyes follow, dust parts.
3. The work stays readable. Every case study is real HTML text and can be found without the effects.

---

## 2. References: what to take, what to leave

| # | Reference | Take | Leave |
|---|---|---|---|
| 1 | *Last Defenders* poster (Siphephile Sibanyoni) | Black-and-white photo cutouts on flat pastel, a sun disc behind the head, broken arc letterforms stacked vertically, wide-tracked caps | The artwork itself. It's a third-party piece, used for inspiration only and never reproduced or shipped |
| 2 | Cubist cut-wood face | Fragmented portrait planes, terracotta wood grain, carved negative-space lines. This is the treatment for Bermond's portrait | — |
| 3 | Geometric tile grid | Quarter-circles, arches, four-point stars, chevrons on a modular grid. The colour state above and the outline-only state below become **the front and back of every flip tile** | The exact palette, which is re-tuned to dry season |
| 4 | Kumbo dirt road | The hero landscape, the haze, the road's S-curve as the scroll path | The photo itself unless licensed. Prefer Bermond's own Kumbo photos |
| 5 | Bermond's layout sketch (`refs/05-layout-sketch.png`) | Name hand-lettered top-left, a text block under it, a tile wall on the left, Bermond standing on the right in a hat with hands on hips, a dotted path winding down to the hills, and a vertical ladder on the right edge | — |
| 6 | Bermond's portrait (café, mustard corduroy puffer) | **The hero photo.** It's front-on, the eyes are sharp and level to camera, and the jacket colour *is* Harmattan Gold | The café background, the other people in frame, the earbud and the newspaper. All are removed in the cutout |

The sketch's right-edge **ladder becomes the scroll progress rail**: each rung is a chapter, and a dust-coloured dot climbs down the rail as you scroll.

Only Bermond's own sketch is committed to `refs/`. The other references stay out of the repo because they aren't ours to redistribute.

---

## 3. Visual language

### Palette: dry season → Afrofuture
| Token | Hex | Use |
|---|---|---|
| Harmattan Gold | `#E2B04A` | Primary warm, sun, the colour of Bermond's jacket |
| Laterite Red | `#B4532A` | Roads, earth, tile accents |
| Dust | `#E9D3B0` | Main background, paper |
| Savanna Straw | `#C9A66B` | Grass, secondary fills |
| Charcoal Line | `#1E1A17` | The pencil line, body text |
| Ndop Indigo | `#2B3A7A` | Ndop cloth motifs, links |
| Kumbo Night | `#1C1530` | Afrofuture chapter background |
| Pop accents (Afrofuture only) | Sky `#8FB3FF` · Sun `#FFE58A` · Lilac `#B98BFF` · Coral `#FF9E7A` | The ref 1 energy, used sparingly |

### Pattern
A tile system derived from ref 3 and re-coloured with the palette, crossed with Nso **Ndop cloth** motifs (the indigo-and-white resist-dyed geometry of the Kumbo region). Ndop is the cultural bridge between the market and the future. Every pattern sits on one 8-unit grid so any tile can swap with any other.

### Type
- **Display:** "Unbounded" (or "Syne"), with geometric, poster-wall energy. Labels use wide-tracked caps (`letter-spacing: .35em`) as in ref 1.
- **Body:** "Inter", at 17–18px for long reading.
- **Signature:** Bermond's hand-lettered name from the sketch, vectorised. It draws itself in at the start and signs off at the end.
- Arc and fragment letterforms (ref 1) are allowed for chapter titles only.

### Imagery
Real photos (the market, the road, Bermond) are cut out and set in **black and white or warm duotone over flat colour shapes**, layered with poster graphics and tiles. A paper grain sits over everything (an SVG noise filter at about 6% opacity). Portraits get the cubist cut treatment from ref 2 in chapter 2, with the photo kept intact underneath so it never stops looking like Bermond.

### The line
A single charcoal pencil stroke about 2.5px wide, with slight width jitter (an SVG path plus a roughen filter). It's the same line in every transition and it never changes style.

---

## 4. Scroll story

**Travelling object: Bermond's hat** from the sketch, a woven straw hat with a band in Laterite Red. A Harmattan gust blows it off in chapter 2, it tumbles through every transition along a scroll-linked motion path, and it lands back on Bermond's head in the final chapter.

| # | Scene | What happens | Content (from `assets/data.js`) |
|---|---|---|---|
| 0 | **Arrival: Kumbo market** | A market stall wall of photo cutouts and pasted graphic posters fills the screen, with dry-season haze. The hand-lettered name draws itself in top-left, and the pencil line starts there | `person.name` and the track `headline` |
| 1 | **The poster wall** | Each poster is a project tile. Hovering flips it (front: the artwork, back: the outline pattern plus a one-line summary). Clicking opens the case study | `craft` track projects: CITS, CIMFEST, NewU, Colorfluid |
| 2 | **Meet Bermond** | Bermond's cutout stands on the right as in the sketch, over a Harmattan Gold sun disc (a nod to ref 1). As the cursor approaches, **the eyes pop forward and follow it**. A gust lifts the hat and the journey begins | Track `summary` and `skills` |
| 3 | **The road** | The sketch's dotted path becomes the red dirt road. Scrolling walks the camera down it while hills, shrubs and lone trees parallax past. Career milestones sit on roadside signposts | `experience` timeline |
| 4 | **Dust-storm reveals** | Each case study arrives inside a swirling Harmattan dust whirl that clears to show the content against a golden savanna | `product` track projects |
| 5 | **Afrofuture** | Night falls. Kumbo Night, Ndop indigo and the pop accents take over, along with ref 1-style cutouts, arc letterforms and the sun disc. The work is shown as the market of the future | `leader` track: IkniteOS, Iknite Studio, the MVP masterclass |
| 6 | **Home** | The hat lands back on Bermond's head. The pencil line loops and signs the name. Contact details and links appear | `person` email and links |

**Tracks still work.** `?track=` sets the hero line and decides which chapter's projects lead and which are collapsed into a "more work" drawer.
**Escape hatch:** a persistent "Skip the walk →" link goes to the plain portfolio (moved to `/classic/`) for recruiters in a hurry.

---

## 5. Interaction spec

### Tile flip (hover)
- CSS 3D `rotateY(180deg)` over 420ms with `cubic-bezier(.34,1.56,.64,1)`, which gives a slight overshoot.
- Front is the colour pattern and back is the outline-only pattern (ref 3, top vs bottom).
- **Ripple:** the tile under the cursor flips first. Neighbours flip with a delay of about 40ms per ring outward, up to 3 rings, so it feels like brushing past a stall.
- A tile won't flip again for 600ms, so wiggling the cursor doesn't strobe it.
- **Sound:** a short clay-tile *clack* from 4 sampled variants with pitch randomised ±8% and volume falling off with distance from the cursor. Web Audio, at most 8 voices at once.

### Domino transitions (between chapters)
- A full-width tile band sits on every chapter boundary. Its tiles flip **sequentially like dominos**, left to right along a row and then down to the next row, **scrubbed by scroll** so scrolling back up stands them back up.
- The **pencil line draws across the band** (SVG `stroke-dashoffset`) just ahead of the flip front, so the line appears to knock the dominos over. The back faces reveal the next chapter's palette.

### Eyes that pop and follow
- The portrait has separate layers for the face, the eye whites, the pupils and lids, and the hat.
- Within 220px of the face, the eyes **pop out**: they scale to 1.25 with a spring easing (stiffness 300, damping 12) and gain a soft drop shadow, like a cartoon double-take.
- The pupils track the cursor (`atan2`, clamped to 35% of the eye radius). The lids blink every 4–7s at random, and the eyes settle back when the cursor leaves.
- On touch, the pupils follow the last touch point, or device tilt where it's permitted.
- With reduced motion, the eyes stay in place and only the pupils follow.

### Dust-storm reveal
- A canvas particle vortex of about 1,500 particles in Dust, Straw and Laterite, with a few motes in Gold. The section is masked by a growing radial clearing at the centre of the vortex.
- It's scrubbed by scroll: entering winds the storm up, mid-section clears it, and leaving lets it settle as drifting haze.
- Mobile uses about 500 particles. With reduced motion it becomes a simple fade from Dust to the content.

### Hat
- An SVG or WebP cutout on a GSAP MotionPath that spans the whole document and is tied to scroll progress. It gets a small rotation wobble driven by scroll velocity.

### Progress rail
- The ladder from the sketch, fixed to the right edge. One rung per chapter, labelled on hover. Clicking a rung scrolls to that chapter, and the active rung fills Gold.

### Sound
- **Off by default**, with a visible "Sound" toggle top-right (browsers block audio until someone interacts). With sound on, the tile clacks play over an optional low ambient bed of wind and a distant market murmur at -24 dB.

---

## 6. Tech approach
- A static site as now, with **no build step**. Libraries load from cdnjs or jsdelivr: **GSAP + ScrollTrigger + MotionPathPlugin** for the scroll choreography and **Lenis** for smooth scroll. Dust uses plain canvas 2D.
- Files: `story.html`, `assets/story.js`, `assets/story.css`, `assets/story/` (images and audio). Content is read only from `assets/data.js`, with nothing hard-coded.
- **Performance budget:** under 3 MB transferred on first load with later chapters lazy-loaded, images in AVIF with a WebP fallback, max 2400px wide. 60fps on a 2020 MacBook Air and at least 45fps on a mid-range Android phone.
- **Accessibility:** real text in reading order. `prefers-reduced-motion` turns transitions into cuts and tile flips into crossfades, and turns off the dust and the eye pop. Every interactive tile is keyboard-focusable (focus flips it, Enter opens it). Sound is opt-in and contrast is AA throughout.
- **Mobile:** with no hover, tiles flip as a domino sequence when they scroll into view and on tap. Bermond moves above the text instead of beside it.

---

## 7. Assets

### From Bermond
- [ ] **The portrait** (café photo, mustard puffer) at full resolution. Commit it to `assets/story/src/portrait.jpg` or drop it in the session.
- [ ] A **full-body shot**, hands on hips, ideally in a hat (from the sketch). If there isn't one, the hat gets added as an illustrated layer and the composition crops at the waist.
- [ ] Own photos of Kumbo roads, hills and markets, in the dry season if possible.
- [ ] Final poster and brand files for CITS, CIMFEST and NewU.
- [ ] The sketch at full resolution (the current copy is at `refs/05-layout-sketch.png`).
- [ ] A licence decision on ref 4, or a replacement photo.

### Portrait cutout spec
Remove the café background, **both people in the background**, the newspaper and the earbud. Make three versions: (a) a clean colour cutout, (b) a high-contrast black and white (ref 1 treatment), and (c) a cubist cut-wood overlay (ref 2) with the face still recognisable. Export the eye whites, pupils and lids as separate transparent layers aligned to the face.

### To generate (Codex / image model)
- A market stall wall
- A five-layer savanna parallax set: sky, far hills, near hills, shrubs, road
- 24 tile designs (front and back)
- The hat cutout
- A pencil-line texture
- 4 tile clack sounds plus an ambient bed (record them or source CC0)

---

## 8. Image-generation prompts

**Market wall:**
> Wide photographic scene of a dry-season open-air market in Kumbo, Northwest Cameroon. A wooden stall wall plastered with hand-painted and printed graphic posters, harmattan haze, warm golden late-afternoon light, red laterite dust on the ground. Documentary style, 35mm, no legible text, 21:9.

**Savanna parallax layers** (one image per layer):
> Dry-season savanna hills of Bui division, Cameroon: rolling red-brown hills, sparse shrubs and lone trees, a curving red dirt road, pale dusty sky. Painted in flat, slightly textured shapes on a transparent background. Layer: [sky | far hills | near hills | shrubs and trees | road].

**Tiles:**
> A set of 24 square geometric tiles: quarter circles, arches, four-point stars and chevrons, inspired by Nso Ndop cloth and mid-century African modernist pattern. Palette #E2B04A #B4532A #E9D3B0 #C9A66B #2B3A7A #1C1530. Flat vector with crisp edges. Also a matching outline-only version of every tile: a 2px #1E1A17 line on #E9D3B0.

**Portrait, cubist treatment:**
> Turn the supplied photo into a cubist cut-wood portrait: fragmented terracotta wood-grain planes with carved negative-space lines. Keep the face recognisable and keep the mustard corduroy jacket colour. Leave the eyes clean and unobstructed so they can be replaced by animated layers.

**Hat:**
> A woven straw hat with a laterite-red band, three-quarter view, isolated on a transparent background, photographic cutout with soft natural light.

---

## 9. Codex hand-off prompt

Paste this into Codex on Bermond's computer:

> Repo `bbermond/hello-world`, branch `agent-blink_cld/youthful-fermi-kydu8m`. Read `docs/art-direction/dry-season-brief.md` and `CLAUDE.md` first. Build `story.html`, `assets/story.js` and `assets/story.css` as a static site with no build step, using GSAP + ScrollTrigger + MotionPathPlugin and Lenis from cdnjs or jsdelivr. All copy comes from `assets/data.js` and none is hard-coded.
> Work in milestones and commit after each one:
> 1. Chapter skeleton (§4) with real text, the progress rail, and pencil-line SVG transitions between chapters.
> 2. Tile component: hover ripple flip, domino scroll band, clack audio with an opt-in toggle (§5).
> 3. Portrait: cutout per §7, layered eyes that pop and follow, and the hat motion path.
> 4. Dust-storm reveal canvas and the Afrofuture chapter.
> 5. Polish: performance budget and accessibility (§6), with reduced-motion and mobile fallbacks.
>
> Generate the assets in §8 into `assets/story/` (AVIF/WebP). Never reproduce reference 1 (a third-party artwork). Don't put personal information beyond what's already in `assets/data.js`.

---

## 10. Milestones and sign-off

| # | Milestone | Sign-off |
|---|---|---|
| 1 | Brief approved, assets supplied | Bermond |
| 2 | Greybox: chapters, rail, line transitions, real content | Bermond + creative-director agent |
| 3 | Tiles, sound, eyes | Bermond |
| 4 | Dust, hat, Afrofuture | Bermond |
| 5 | Polish, performance and accessibility pass; `story.html` becomes the homepage and the current site moves to `/classic/` | Bermond |

**QA at every milestone:** headless Chromium scrolls through every chapter at 1280px and 375px with zero console errors, takes a screenshot per chapter, and runs a second pass with reduced motion emulated to confirm all content stays readable with the effects off.
