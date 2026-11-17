# Hypernova badge creator

A system for building Hypernova badges from a small JSON spec. The badge catalogue in Figma (Hypernova Internal, node 418:6334) has families A to K. A, B, C, H, I and K are drawn in Figma ("Badges update 1", 28 badges) and rebuilt from scratch by the engine. D, E, F, G and J are new, each on one of the 7 base shapes drawn in Figma (node 586:8480), and the level badges are their own family on the brilliant.

Run it:

```
python3 -m http.server 5230 --bind 127.0.0.1
```

Then open http://localhost:5230/

## Files

| File | What it is |
| --- | --- |
| `engine.js` | Shapes (incl. `petals`, `puff`, `burst` glyphs drawn from the bases, `rot` on glyphs), palettes, blend maths, dot rule, `renderBadge(spec)` to SVG |
| `catalog.js` | Families (plate + gem pairs), the Figma badges (A, B, C, H, I, K), the new families (D, E, F, G, J), colours, the level family and bands |
| `digits.js` | PolySans Bulky and Bulky Wide digits as vector outlines, for level numbers |
| `presets.js` | Glyph sets for the generator and the placement rule |
| `app.js`, `index.html`, `style.css` | The creator UI: Library, Editor, Generator, Rules |
| `ref/` | 150 px renders of the Figma originals, used by the compare views |
| `themes.js` | Themed silhouettes (crown, flame, padlock, anchor...) where the gem is the icon, in review rounds |
| `lab.html` | Shape lab, http://localhost:5230/lab.html, shows every round with keep/cut notes |
| `test.html` | Hooks for headless screenshot tests |
| `figma-plugin/` | Figma plugin: pastes badges as native layers (see Into Figma) |

## Spec

```json
{
  "id": "B_7", "name": "$1B", "rarity": "purple", "level": 6,
  "plate": { "shape": "hex", "w": 80, "h": 92, "y": 29, "params": { "shoulder": 23, "r": 24 } },
  "gem":   { "shape": "hex", "w": 58, "h": 66, "y": 42, "params": { "shoulder": 16.5, "r": 16 } },
  "glyphs": [
    { "shape": "hex", "w": 42, "h": 50, "y": 50, "style": "recess", "alpha": 0.21, "params": { "shoulder": 12.5, "r": 8 } },
    { "shape": "sparkle", "w": 28, "h": 36, "y": 57, "style": "glass", "light": "high" }
  ]
}
```

- Everything is centred on x = 75. `x` on a glyph makes a mirrored pair.
- Glyph styles: `glass`, `glass-tint`, `recess`, `inlay` (a second gem in another colour), `solid`.
- `light`: `center` or `high` (see Rules).
- `parts` makes a compound glyph with one gradient and one bevel; `evenodd` cuts holes (rings).
- Options: `dotPhase` (`auto`, `split`, `anchored`), `dotInset` (default 5), `dotClear` (gap to the gem, default 3), `ornaments` (`topBar`, `bottomChevron`, `sideArrows`, `edgeBars`: four lines top, bottom, left, right), `customColor` (any hex, palette derived).
- Gem options: `rarity` (a different colour for the gem), `bezel: { w, h, y, params, stone }` (faceted setting around a stone, K_5). Glass glyph options: `fill` (white base, 0 to 1), `shade` (right half darker).
- `renderBadge(spec, { target: 'figma' })` keeps Figma's native blend layers instead of the baked facet.

## Rules in short

- Layers: plate (tint, 20% radial, inside bevel), gem (3 stop gradient, inside bevel), left facet (palette recipe, own bevel), glyphs (outside bevel), dots and ornaments.
- Bevel: 1 px, black to white top to bottom, Overlay.
- Shapes are defined by their right half and mirrored. Fillets are true circular arcs. Whole pixels, even widths.
- Dots: all on one line 5 px inside the plate outline (same distance from the edge everywhere), spaced evenly by length along it, skipping anything within 3 px of the gem. Snapped to whole pixels and mirrored.
- Blue's left facet uses Figma's Linear Burn, which subtracts its alpha from every channel. The engine computes it exactly and bakes it, since browsers have no linear burn.

## Base shapes from Figma

Seven base shapes drawn in Figma (Hypernova Internal, node 586:8480) are rebuilt as families: Pennant, Flower, Cushion (cushion gem on a cloud plate), Brilliant, Octagon, U shield and Wavy seal. Each outline is the right half of the Figma vector, mirrored, with sizes snapped to whole pixels and centred on 75. They are the bases of families D, E, F, G, J and the levels, and are in the Editor's plate + gem presets and the Generator's families. Their Figma renders are in `ref/bases/`.

Gradients follow Figma's export rule: a palette's gem and facet gradient is one handle pair in the shape's own 0 to 1 space, turned into pixel end points per box (`linGrad` with `GEM_REF` / `HALF_REF` in `engine.js`).

## Themed shapes

The gem outline is the icon itself (crown, padlock, anchor). The plate is that outline grown by 11 px and lightly smoothed (`plate: { of: 'gem', d: 11, smooth: 3 }`), and an optional recess is the outline shrunk (`{ of: 'gem', d: -7 }`). Same layers, bevels and blend rules as every other badge. Shapes are defined as right halves in `themes.js` and mirrored. Round 1 notes which shapes were cut and why; rounds 2 and 3 are the current set.

## Families A to K

Each family owns one base shape; no two share one (`FAMILY_SHAPES` in `catalog.js`).

| Family | Badges | Shape | Colours |
| --- | --- | --- | --- |
| A. Onboarding | 5 | Oval (Figma) | as drawn |
| B. Volume ladder | 7 | Hexagon (Figma) | as drawn |
| C. Payout ladder | 5 | Shield (Figma) | as drawn |
| D. Trading-days ladder | 5 | Flower | silver, silver, blue, purple, purple |
| E. Nova milestones | 4 + Comeback | Wavy seal | blue, purple, gold, gold; Comeback blue |
| F. Identity / OG | 3 | U shield | blue, gold, gold (launch month, first 100, OG) |
| G. Quirky & behavioural | 12 | Cushion on the cloud plate | 5 silver, 5 blue, purple, gold |
| H. Collection ladder | 3 | Rhombus (Figma) | as drawn |
| I. Referral milestones | 3 | Crest (Figma) | as drawn |
| J. Repeatables | 3 | Pennant | all common, silver |
| K. Competition & leaderboard | 5 | Star (Figma) | as drawn |
| L. Levels | any | Brilliant | bands |

The octagon is spare (`SPARE_SHAPES`). Names, rarities and tags of D, E, F, G and J come from the catalogue (`NEW_FAMILIES`).

The glyphs are drawn from the family's own outline, never from another family: a flower with 3, 4, 5 then 6 petals (`petals`); the wavy seal gem itself, smaller, and rings of it; smaller U shields; clouds with 3 to 5 fluffs (`puff`) and the cushion itself (rings, stacked stones, a sprout; glyphs can turn with `rot`); the pennant's notched flag. The rarer the badge, the fuller: the top of a family has two layers of its shape (recessed under glass, or a ring around a core) plus an echo of the gem.

## Colours

Badge colours follow the Figma badges (A, B, C, H, I, K): a badge takes the colour its catalogue rarity has there (`RARITY_COLOUR`): common silver, rare blue, epic purple, legendary gold. Colours repeat inside a family, as in Figma. Every family runs from lowest to rarest, and the icon gets fuller as the badge gets rarer. Dots: step + 1 on ladders, by rarity on sets (common 2, rare 3, epic 4, legendary 5, `RARITY_DOTS`). Bronze and ruby are level colours, not badge rarities. A badge can still set its own colour (`colour`).

Silver, gold, purple and blue are measured from Figma; bronze and ruby use the same recipe (bronze like gold, ruby like purple).

## Level badges

Levels are one family on the brilliant, the diamond, which no badge family uses (`LEVEL_FAMILY`). Each band is a step of that ladder and adds a little; the number is PolySans as outlines, engraved by default; dots = progress through the band (1 to 5).

| Band | Levels | Step |
| --- | --- | --- |
| Bronze | 1 to 19 | Plain gem |
| Silver | 20 to 49 | Inner echo |
| Gold | 50 to 99 | Echo + top bar |
| Ruby | 100 to 199 | Echo + top bar + bottom line, glass number |
| Purple | 200+ | Two echoes + top bar + bottom line, glass number |

## Into Figma

The Figma plugin in `figma-plugin/` pastes badges as native layers: one vector per part with all its fills and blend modes, and the bevels as real 1 px inside or outside strokes, so no masks. Click **Copy for Figma** (Editor, or next to a family in the Library), then press Cmd+V in the plugin. Install and details: `figma-plugin/README.md`.

`export/` holds single badges as SVG (150 x 150 on the black frame, Figma's native blend layers). Made with `renderBadge(spec, { target: 'figma' })`, the same as Copy for Figma. Drop them on the plugin window for native layers; pasted straight onto the canvas, Figma turns the bevels into masks.

## Open questions

- Gold, ruby and purple level ranges were not given by the client. 50 to 99, 100 to 199 and 200+ are placeholders (`LEVEL_BANDS`).
- PolySans on this machine is the trial version; the digits in `digits.js` come from it. Swap in the licensed font outlines before shipping.
- Level to dot count is not consistent across ladders in Figma (A and B start at 2, I at 3, K always 4).
- I_2 uses the silver plate tint, C_4 has two glyphs lit from below, H gems have no centre line. See the Rules tab for the full list.
- K row was exported from Figma as bitmaps, so it is matched by eye: K_1 and K_2 are close, K_3 and K_4 are approximations. K_5 is rebuilt from the 2x bitmap inside the Figma group (faceted gold setting), mean difference 3.1.
- Which shape goes to which family is one line each in `FAMILY_SHAPES`; the octagon is spare.
- The catalogue lists 8 payout steps (C) and 6 volume steps (B); Figma has 5 and 7 (with a $250M alternate).
- The one Figma badge off the rarity rule is B_4 $50M: rare in the catalogue, drawn silver.
- G_12 shows four edge lines (`edgeBars`) instead of dots, so its rarity shows by colour only.
