# PUI Fortune — Blender landmark collection

28 original stylised architectural miniatures, built in Blender through Blender MCP.
The board now uses lightweight exports of all 28 models. The editable Blender
originals and review renders remain here. Integration changes only the visual layer;
rules, camera, token movement, ownership and saving code are unchanged. The existing
palm-oil mill asset is untouched.

## Open and review

- Open `PUI-Fortune-Landmark-Atelier.blend` in Blender.
- The active scene is **PUI Fortune | Landmark Atelier**. The previous default scene is preserved separately.
- The Outliner has **World landmarks**, **Jail and transit**, and **Studio and labels** collections.
- All 28 miniatures are marked as Blender assets, with individual rendered thumbnails.
- Select a model in the Outliner and use **View → Frame Selected** for a close-up.
- `landmark-collection.png` is the complete studio render; `previews/` contains 28 close-ups.
- `manifest.json` lists asset names, signature features, dimensions and evaluated triangle counts.

## Contents

24 models match the existing property names: Taipei 101, Petronas Twin Towers,
Marina Bay Sands, Burj Khalifa, Eiffel Tower, Sagrada Família, Colosseum, Big Ben,
Acropolis, Christ the Redeemer, Machu Picchu, Taj Mahal, Angkor Wat, Sydney Opera House,
Golden Gate Bridge, Statue of Liberty, Moai of Rapa Nui, Chichén Itzá, Pyramids of Giza,
Neuschwanstein Castle, Mount Fuji, Great Wall of China, Hagia Sophia and Grand Canyon.

Four additional models cover Jail, Go to Jail and the two Transit Stations.
**West** and **East** identify the two visual variants only; the game's Transit Station names are unchanged.

## Export conventions

`glb/` contains one self-contained model per file. No textures or online asset libraries
are required. Each miniature is one mesh with material slots. The studio lights,
floor, labels, neighbouring models and previous scene are excluded from exports.

- Blender uses Z-up; GLB export converts to the usual glTF Y-up convention.
- Exports have their ground-level origin at the centre of the base.
- Standard base footprint is approximately **1.474 × 0.806** Blender units.
- Each asset retains its own height, creating a varied skyline.
- Material colours are architectural, independent of property and ownership colours.
- Soft-edge bevels are editable in Blender and applied in the GLB exports.
- These are review-quality originals. Lighter game copies live in
  `../../assets/models/landmarks/` and retain the architectural palettes and silhouettes.

## Game integration

`../../components/board3d/BlenderLandmarks.mjs` maps exact property names and existing
Jail/Transit indices to the exports. It fits each miniature to its existing footprint,
faces entrances outward and batches geometry by material. All 28 game copies total
118,446 triangles and approximately 4.48 MiB, rendered in 30 material batches.
Individual failed downloads fall back to the previous procedural model.

Upgrade fairy lights fit the imported bounds. The existing token overlay pass stays
unchanged, keeping animal pieces visible in front of buildings.

To regenerate game copies in Blender, load `export_game_assets.py` into a namespace
and call `export_game_range(0, 28)`. It temporarily simplifies exports and restores
the original geometry modifiers afterward; do not save simplified artist models.
Run `node tests/blender-landmarks.mjs` from the project root to check real assets,
tile mapping, bounds, picking metadata, loading failures and disposal.

## Source and regeneration

`build_landmarks.py` contains the geometry, materials and reusable architectural helpers.
It is intended for Blender's Python environment. Executing its definitions creates
or selects the atelier scene, but does not automatically run the whole build.

In Blender's Python Console, load it with an explicit namespace:

```python
ns = {}
exec(compile(open('/Users/janicefong/Desktop/PUI MONOPOLY/art/blender-landmarks/build_landmarks.py').read(), 'build_landmarks.py', 'exec'), ns)
```

For a fresh atelier, call `ns['build_range'](0, 28)`, then `ns['setup_studio']()`.
Existing indexed miniatures are skipped by `build_range`; do not call `setup_studio`
again on the finished studio. Use `render_asset(index)` for individual close-ups,
`restore_gallery()` and `render_overview()` for the collection render,
`export_range(0, 28)` for GLBs, then `organize_library()` and `save_library()`.

All meshes were authored procedurally for this project. No third-party model assets,
AI model-generation services, purchased artwork or online downloads were used.
