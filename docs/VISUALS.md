# Moonpark art direction and production

Moonpark uses a handcrafted lunar-resort style. Ivory enamel, dark teal structural parts, mint lighting, gold hardware and individual ride colors make the buildings readable from above. The same editable Three.js models appear in the live park, construction cards, inspector photographs and opening film.

## Live artwork

All eight attractions have rounded shells, service hatches, inset lights, foundation bolts and boarding details. The mass driver has twin rails, cross-ties, footings, braced supports and a covered station. Earthrise has suspended, independently upright cabins and perimeter bulbs. Lunar Bounce has an orbital Moon centerpiece. Rover Rally has working vehicles, lights, roll bars and an island display. Concessions have striped awnings, counters, products and roof sculptures. Solar panels have individual inset cells and a power cabinet.

Astronauts have reflective visors, helmet fittings, life-support packs, suit panels, gloves and articulated limbs. Actual visitor states drive walking, queues, purchases, riding and boarding. Happy departing guests wave. Merchant owners stand beside their businesses and remain selectable. Wheeled service robots carry actual paid supply orders and perform maintenance.

The transit rocket has an ogive nose, cabin windows, landing struts, engine bells and layered additive exhaust. The spaceport has inset guidance rings, safety markings, benches, boarding rails and an enamel entrance gantry. Shuttles descend, dock, unload and collect homebound visitors every forty simulation seconds. Eight-person inbound groups continue until all 96 guests have arrived.

Lunar terrain uses a generated regolith texture over deterministic sculpted terrain and crater relief. The park has a dusty prepared surface, subtle plot markers, paneled paths, cable edging and lighted boundary blocks. Nearby rocks and the NEAR observatory use original geometry. Earth and stars occupy a separate distant sky, without ground-scale parallax. The title uses a lower, closer view of the staged park.

## Interface and rendering

Construction cards and inspector panels use transparent WebP photographs of the actual models. Guest and adviser portraits use the same character rig. Enamel gradients, recessed controls, a gold cash badge and restrained depth keep the interface consistent with the park. Desktop and mobile layouts retain the existing controls and information hierarchy. Reduced-motion settings suppress decorative thumbnail movement.

The renderer uses environment reflections, a warm directional key, cool rim light, physical materials and sun shadows. Static meshes merge by material. Character suit details use vertex colors to keep each articulated character to six draw calls. Shared geometry/materials remain reusable, while replaced model resources and scene-owned textures are released. Mobile pixel ratio and shadows remain capped separately from desktop and offline film rendering. Sustained slow frames lower live render resolution and shadow-map size automatically. Offline masters retain full quality. Portrait phones receive a separately rendered opening film.

Actual positive ledger receipts produce coin trails and sounds. Partnership completion has a distinct larger reward. Nearby receipts merge at high speed, and the cash HUD counts smoothly. The park canvas stays mounted through decisions and closing.

## Editable sources

- `lib/moon/assets.ts` contains original rides, characters, spacecraft, service robots, signs and material batching.
- `lib/moon/scenery.ts` contains terrain, the spaceport, paths and observatory.
- `lib/moon/world.ts` contains lighting, cameras, picking and state-driven animation.
- `scripts/game/moon-art.mjs` photographs eight attractions and seven character portraits. Run it against `npm run dev` with `node scripts/game/moon-art.mjs`.
- `public/art/*-v1.webp` contains the sixteen optimized artwork files consumed by the game.
- `MOONPARK-CINEMA.md` documents the reproducible opening-film production.

## Generated texture

The built-in image-generation tool produced the original regolith bitmap. The selected image was inspected, resized to 1024×1024 and encoded as `public/art/lunar-regolith-v1.webp`. The uncompressed original is retained locally in `outputs/lunar-regolith-original.png`. All ride and character photographs come from the original code-native 3D models.

The generation prompt follows.

> Use case: stylized-concept. Asset type: seamless game terrain albedo texture for a polished stylized 3D lunar theme park. Generate a square, perfectly top-down orthographic flat texture of fine moon regolith, dusty cool silver gray with subtle warm gray mineral grains, many tiny granular particles, occasional small embedded flat stone chips, shallow overlapping ancient microcrater impressions. Beautiful high-end stylized realism, tactile but low contrast, physically plausible powdery surface. Uniform soft neutral illumination with NO directional cast shadows, NO horizon, NO perspective, NO objects or footprints or text, no baked ambient occlusion, no large identifiable feature. Texture must seamlessly tile on all edges. The whole image is the ground texture, designed to repeat across a large lunar surface without conspicuous repetition.

## Credits

The Earth diffuse texture is bundled locally from https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg . Three.js carries MIT notices at https://github.com/mrdoob/three.js . Interface control icons use Lucide. Narration uses Kokoro 82M v1.0 under Apache-2.0 through the MIT-licensed Kokoro ONNX wrapper. The cinema document records their primary sources. Models, terrain geometry, camera work, score, effects and narration text are original. No Bullfrog or Supercell footage, music, logos or game assets are used.

## Visual-upgrade verification

Type checking and all nine routine browser checks pass, including complete construction-to-closing gameplay, persistence, mobile layout, partnerships, first landing, film playback and fallback. The optional transaction-spending NEAR browser test is excluded from this visual pass. The earlier v3 protocol evidence remains in `MOONPARK-VERIFICATION.md`.

Both complete 1,200-frame exports decode successfully. Their manifest records sizes and SHA-256 hashes. Exported park, founder and robot-comedy frames were inspected separately, and portrait playback was checked in a phone-sized browser. The original audio master was reused, with measured delivery loudness of −18.0 LUFS and peak −4.3 dBTP. A new listening review was outside this pass.

An isolated 1600×1000 world-render sample on the local RTX 5080 measured 2.05 ms per frame across sixty frames, with a GPU finish at every frame. This measurement covers the Three.js world on this workstation. Physical-phone performance profiling remains outstanding. Software-rendered Chromium also completed the routine gameplay checks, with a longer allowance for asynchronous replay after the test clock jumps forward.
