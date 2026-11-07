# Moonpark art direction and production

Moonpark uses a handcrafted lunar-resort style. Ivory enamel, dark teal structural parts, mint lighting, gold hardware and individual ride colors make the buildings readable from above. The same editable Three.js models appear in the live park, construction cards, inspector photographs and opening film.

## Live artwork

All eight attractions have rounded shells, service hatches, inset lights, foundation bolts and boarding details. The taller mass driver has twin rails, cross-ties, footings, braced supports and a covered station. Earthrise has suspended, independently upright rounded cabins and perimeter bulbs. Lunar Bounce has an orbital Moon centerpiece. Rover Rally has a continuous banked road ribbon, working vehicles, lights, roll bars and an island display. Concessions have striped awnings, counters, products and roof sculptures. Solar panels have individual inset cells and a power cabinet.

Astronauts have reflective visors, helmet fittings, life-support packs, suit panels, gloves and articulated limbs. Actual visitor states drive walking, queues, purchases, riding and boarding. Happy departing guests wave. Merchant owners stand beside their businesses and remain selectable. Wheeled service robots carry actual paid supply orders and perform maintenance.

Fine panel seams, fasteners and deck stencils appear on each attraction platform. Suit harnesses and cuff fittings remain legible in close-ups.

The transit rocket has an ogive nose, cabin windows, landing struts, engine bells and layered additive exhaust. Soft radial dust sprites represent the landing plume. The spaceport has inset guidance rings, safety markings, benches, boarding rails and an enamel entrance gantry. Shuttles descend, dock, unload and collect homebound visitors every forty simulation seconds. Eight-person inbound groups continue until all 96 guests have arrived.

Lunar terrain uses a generated regolith texture over deterministic sculpted terrain and crater relief. The park has a dusty prepared surface, subtle plot markers, paneled paths, cable edging and lighted boundary blocks. Nearby rocks and the NEAR observatory use original geometry. Earth and stars occupy a separate distant sky, without ground-scale parallax. The title uses a lower, closer view of the staged park.

## Interface and rendering

Construction cards and inspector panels use supersampled, lossless WebP photographs of the actual models. Guest and adviser portraits use the same character rig. Enamel gradients, recessed controls, a gold cash badge and restrained depth keep the interface consistent with the park. Desktop and mobile layouts retain the existing controls and information hierarchy. Reduced-motion settings suppress decorative thumbnail movement.

The renderer uses HDR multisampling, ground-truth ambient occlusion, restrained highlight bloom, environment reflections, a warm directional key, cool rim light, physical materials and sun shadows. Static meshes merge by material. Character suit details use vertex colors to keep each articulated character to six draw calls. Shared geometry/materials remain reusable, while replaced model resources and scene-owned textures are released. Mobile pixel ratio and shadows remain capped separately from desktop and offline film rendering. Sustained slow frames lower live render resolution and shadow-map size automatically. Expensive screen effects yield to the direct render path on software renderers, unsupported float targets and slow devices. Offline masters retain full quality. Portrait phones receive a separately rendered opening film.

Actual positive ledger receipts produce coin trails and sounds. Partnership completion has a distinct larger reward. Nearby receipts merge at high speed, and the cash HUD counts smoothly. The park canvas stays mounted through decisions and closing.

## In-game sound and sky

The landing page uses a lunar-resort layout with a live staged park, clear play controls and prominent NEAR Protocol ownership information. The official NEAR symbol is reproduced from the [NEAR website](https://near.org/).

The distant sky combines seeded star layers, a generated Milky Way texture, a solar disc with optical glare and a textured Earth. The visible sun and scene lighting share a direction. All celestial elements stay in the separate sky scene, preserving their apparent distance during camera movement.

An original eighty-second stereo score uses a thirty-two-bar arrangement of warm pads, plucked chords, celesta, bass and quiet percussion. Construction, coins, engine rumble, closing and confirmed NEAR licenses have layered effects. The Web Audio mixer separates music and effects, ducks them during the opening film, limits peaks, bounds concurrent effects and suspends sound in background tabs. Run `python scripts/game/moon-audio.py` with NumPy and FFmpeg to rebuild the MP3 assets. Editable WAV masters are retained in ignored `outputs/moonpark-audio/`. The soundtrack master measures −17.1 LUFS with a −2.8 dBFS true peak before the in-game mix.

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

Type checking and all ten routine browser checks pass, including complete construction-to-closing gameplay, persistence, mobile layout, partnerships, first landing, film playback, video fallback and unavailable floating-point targets. The optional transaction-spending NEAR browser test is excluded from this visual pass. The earlier v3 protocol evidence remains in `MOONPARK-VERIFICATION.md`.

Both complete 1,200-frame exports decode successfully. Their manifest records sizes and SHA-256 hashes. Exported park, founder and robot-comedy frames were inspected separately, and portrait playback was checked in a phone-sized browser. The original audio master was reused, with measured delivery loudness of −18.0 LUFS and peak −4.3 dBTP. A new listening review was outside this pass.

An isolated 1600×1000 world-render sample on the local RTX 5080 measured 3.13 ms per frame across sixty frames, with a GPU finish at every frame. This measurement covers the Three.js world on this workstation. Physical-phone performance profiling remains outstanding. Software-rendered Chromium also completed the routine gameplay checks, with a longer allowance for asynchronous replay after the test clock jumps forward.
