# Landmark visual layer

Every one of the 24 existing property names has an explicit entry in
`landmarkVisuals.mjs`. Names select architecture; prices, ownership, tile colours,
and game state never affect the architectural palette or model selection.

## Structure

- `landmarkVisuals.mjs`: named model, material palette, reference height, and signature features.
- `LandmarkModels.mjs`: 24 distinct compositions of shared architectural parts.
- `LandmarkParts.mjs`: reusable bevelled blocks, arches, domes, roof shells, columns,
  beams, window grids, trees, and faceted terrain. Positions use local miniature units.
- `PropertyLandmark.mjs`: dispatches property models and preserves special-space models.
- `resources.mjs`: instances repeated geometry by colour and surface finish. Glass,
  metal, stone, and lightly illuminated windows share cached materials. No lights or
  external model/texture downloads are added.

## Constraints

Keep each model within local x ±0.91 and z ±0.43. The existing tile layout supplies
the origin, inward direction, rotation, and scale. The tile, labels, token lane,
board layout, camera, movement, and token-overlay render pass are unchanged.

`height` is an art-direction reference; tower recipes use it for their crowns.
Other recipes use fixed proportions for their signature structures, so their final
measured height can differ slightly. Do not apply a uniform height to every model.

For another property, add its explicit configuration and compose reusable parts.
Avoid selecting a generic model with a modulo operation. Future GLB replacements
should use the same local origin and footprint and remain independent of game state.

## Checks

Run `node tests/landmark-visuals.mjs` and `node tests/game-regression.cjs`.
The visual test checks all 24 identities, distinct recipes, multi-colour palettes,
property-colour independence, bounds, and geometry/draw-batch budgets. The current
property models use 648 instanced parts, approximately 27,100 triangles, and 99
material/geometry batches. These counts exclude the unchanged board and tokens.

Visually reviewed all models in a contact sheet and the full board; additionally
checked normal player views with four overlapping tokens and a 390 px portrait
viewport. Desktop review reported approximately 60 fps; this is not a physical
phone performance benchmark.
