# Moonpark presentation and credits

Moonpark uses a persistent Three.js park with original procedural lunar terrain, rides, astronauts, rovers, rockets, concession kiosks and a small NEAR observatory. Actual visitor state drives walking, queues, occupancy and ride progress. Delivery vehicles follow connected paths for actual supply orders. The park stays mounted across decisions and at closing.

Drag to pan, scroll/pinch or use the zoom controls, right-drag to orbit and use Home to reset the view. Guests have hover details and selectable inspectors. A coaster has a front-seat camera. Placement previews show footprint validity and the entrance; smart connection purchases the necessary path tiles. Mobile controls provide the same construction and inspection flow.

The 40-second opening is a live 3D sequence: rocket arrival, an optimistic lunar park reveal, a founder welcome, a mass-driver ride and a popcorn-robot gag before pulling back to the starter plot. It is skippable. Reduced-motion preferences use a steady overview. It is original and uses no Bullfrog or Supercell footage, logos, music or assets.

Current models and synthesized WebAudio are gameplay-prototype assets. The asset upgrade follows human playtesting; no final cinematic export, finished soundtrack or production character art is claimed. Sound starts with the player's opening click and can be muted.

The Earth diffuse texture is bundled locally from the Three.js examples: https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg . Upstream project and MIT notices: https://github.com/mrdoob/three.js . All other scene geometry is generated in this repository. Lucide supplies interface icons through the declared dependency.

Pixel ratio is capped, path tiles use instancing, and scene geometry, controls and observers are disposed on unmount. Browser automation checks the persistent canvas and core desktop/mobile interactions. Human testing on representative devices is still needed for final performance and presentation decisions.

The previous Mars presentation notes are archived in `MARS-VISUALS.md`.
