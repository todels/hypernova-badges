# Hypernova badges (Figma plugin)

Pastes badges from the creator as native Figma layers: one vector per part (plate, gem, facet, each glyph, dots), with all of that part's fills and their blend modes on it, and the 1 px bevels as real inside or outside strokes. No masks, no clip groups. A badge is 5 to 11 layers instead of 15 to 34 paths and 4 to 9 masks.

## Install (once)

1. Figma desktop app: Plugins > Development > Import plugin from manifest...
2. Pick `figma-plugin/manifest.json` in this repo.

## Use

1. In the creator (http://localhost:5230/ or https://todels.github.io/hypernova-badges/):
   - one badge: open it, click **Copy for Figma** in the Editor;
   - a whole family: click **Copy for Figma** next to the family name in the Library;
   - tags: **Copy for Figma** in the Tags tab (one tag, or a whole family), or **Copy tag for Figma** in the Editor.
2. In Figma: Plugins > Development > Hypernova badges. Click the plugin window, press Cmd+V.

The badges land in the middle of the view, one 150 x 150 frame each, selected. You can also drop badge SVG files (for example from `export/`) on the plugin window.

A tag lands as an auto layout frame built like the tag in Figma (HyperNova 1010:75704): Tag (1 px border, black 48%, radius 3) > Pill (20 px tall, radial fill, 0.387 px inside edge, gap 2) > Icon (20 x 20, the badge frame inside, scaled to 28 px and spilling over) + Label (4 px padding, live text with the cap-height trim). The label uses PolySans Trial Median, then PolySans Median, then Inter Semi Bold, whichever this Figma has.

## Files

| File | What it does |
| --- | --- |
| `convert.js` | Badge SVG to layer list: merges each part's fills into one layer, turns clipped strokes into inside or outside strokes, keeps gradients in frame pixels |
| `code.js` | Builds the frames and vectors, turns gradients into Figma's `gradientTransform` from each layer's real bounds |
| `ui.src.html` | The panel; `node figma-plugin/build.mjs` writes `ui.html` with `convert.js` inlined (Figma loads one file) |

Tag SVGs carry the badge as a nested `<svg>` (its viewBox is the crop, its size the 28 px) and the label as `<text>`; `convert.js` turns those into a child frame and a text entry, and `code.js` builds tags (`data-kind="tag"`) with auto layout.

The creator tags every SVG element with its layer (`data-n`, `data-l` in `renderBadge`), so the plugin knows which paths belong together and what to call them. Untagged SVGs still work: paths with the same outline are merged.
