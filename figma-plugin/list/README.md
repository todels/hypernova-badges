# Badge list in Figma

Builds every badge and tag as native layers in the HyperNova file (9ncoRzsXfnGOrpFW6WEgjx), page 🔱 Badges, section "Badges update 3" (one panel per family, as the old "Badges update 2"). Done through the Figma MCP (`use_figma`), which needs a Full seat in the polify team.

`use_figma` scripts can't fetch, and a script is at most 50 KB, so the layer data goes in as uploads:

1. `node export.cjs <dir>` (local server on 127.0.0.1:5230 running): one `famNN.json` per family, the plugin's layer data (convert.js) for each badge (no background) and tag.
2. `node carrier.cjs` (run in the folder that holds `figlist/`): packs each JSON into `carNN.svg`, ASCII text in `<text>` chunks of 8000 characters (`HBnn.i.count:...`).
3. `upload_assets` with the page id 917:116837, then POST each carrier (`hb-data-NN.svg`). Figma imports them as frames named `hb-data-NN` with text layers.
4. Run `build.js` through `use_figma` (set `ONLY` to the families, `SECTION_ID` after the first run). It reads the carriers, checks the chunk count, and builds with the plugin's code (code.js).
5. Delete the `hb-data-*` frames.

Tag labels use PolySans when Figma can load it, otherwise Inter Semi Bold (the MCP side has no PolySans).
