# Living colony presentation

The playable colony is a persistent isometric Three.js scene. Economic decisions never replace it with a separate management screen. A dismissible council panel holds the existing eight decisions; time, three vital reserves, funds, population and wellbeing remain at the screen edges.

## Interactions

Drag the terrain to pan, scroll/pinch or use +/− to zoom, and reset with the home button. Right-drag rotates the view. Select a production building, or use the five resource icons, to inspect it and focus the camera. Residents and cargo rovers have hover details; selecting one pins its details. Arrow keys pan a focused canvas and +/− zoom.

The time slider sets 1–4× playback and the fast button toggles 1×/4×. The authoritative simulation advances one sol at a time at the selected cadence. Pending decisions pause economic progress while residents retain ambient movement. NEAR execution still waits for confirmation; visuals do not manufacture new economic outcomes while a transaction is pending.

Rover manifests come from confirmed trades. Workers' status comes from their institution's power and payroll state. Warehouse stocks, warning markers, workshop activity, construction scaffolding, upgrades and dust conditions reflect the same run state. Hovered household budgets are aggregate cohort funds, not invented individual wallets.

The opening is a skippable 26-second live first-person scene from the Mars observation deck. It shows Earth, an incoming asteroid, impact, loss of uplink, and the transition to governing the colony. Optional synthesized sound is off by default. The scene honors reduced-motion preferences for camera motion.

## Assets and implementation

Buildings, people, vehicles, terrain, lighting, paths, crops, and observation-deck geometry are original procedural assets. Static geometry is batched by material, pixel ratio is capped, and static shadows are cached. Renderers, controls, observers and geometry are disposed when leaving a scene. The colony renderer stays mounted across economic decisions.

Earth diffuse texture: https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg — distributed with the three.js examples. Upstream project and notices: https://github.com/mrdoob/three.js (MIT). The texture is bundled locally; playing does not depend on a third-party image request.

This is an original Martian village presentation inspired by the legibility and interaction pattern of village-management games. It uses no Supercell art, names, interfaces, or game assets.
