# Moonpark lunar-resort artwork

The live park, construction cards, design previews, public parks and opening films share the same editable Three.js models. The November 10 upgrade rebuilds the spaceport, all eight building types and the character rig around ivory enamel, deep teal, warm brass, coral and pressure glass.

## Architectural customization

Every type has three selectable structural families. Multiple copies can use different families, palettes, names and lighting.

| Type | Retro Resort | Orbital | Expedition |
| --- | --- | --- | --- |
| Mass driver | Rounded station, paired towers and magnetic launch collars | Glazed station and curved support towers | Braced industrial towers and segmented launch housings |
| Earthrise wheel | Round panoramic cabins and paired supports | Curved supports, glass capsules and an outer orbital ring | Octagonal wheel, enclosed angular cabins and trusses |
| Lunar Bounce | Enamel tripod and telescoping mast | Swept arches and a suspended halo | Reinforced tripod and cross-bracing |
| Rover Rally | Open scenic circuit and Moon centerpiece | Glazed planetary pavilion | Industrial shade canopy and exposed supports |
| Moon Pie Kitchen | Rounded diner and striped canopy | Glass pressure pod and floating rings | Ribbed barrel module with external services |
| Crater Coolers | Enamel drinks kiosk and giant iced cup | Glass crystal pavilion | Ribbed pressure module and industrial fittings |
| Lunar Care | Rounded open robot hangar | Glazed maintenance dome | Reinforced service hangar and hazard trim |
| Solar Canopy | Four petal arrays | Six petal arrays and an orbital ring | Two braced industrial arrays |

The existing design values persist in local saves, verified parks and licensed blueprints. Style zero is displayed as Retro Resort. Existing palette, light and coaster-height values continue to render through the same entry points. Food and drinks are the two visible merchant businesses. Maintenance uses park staff.

## Characters and arrival

The articulated visitor rig has human faces, six skin and hair combinations, helmet shells and transparent visors, suit panels, harnesses, buckles, backpacks, hoses, gloves and padded boots. Walking, queuing, boarding, waving and ride occupancy follow actual simulation state. Visitors glance around while idle. Walking lanes and wider queue spacing reduce overlapping bodies. Frame-bounded movement smooths lane changes and joining a queue. Stride follows the distance each character actually moves. Ride seats show their current occupants.

Omar and Mina stand behind their service counters. Nia works inside Lunar Care. The delivery robot has treaded wheels, a face display, antenna, grippers and a cargo tray. Its wheels turn during deliveries and servicing.

The arrival plaza has a curved entrance gantry, glazed terminal wings, planted pressure domes, brass lamps, seating, luggage, a compass inlay and a flight board driven by the shuttle phase. The transit rocket has a shaped nose and hull, swept fins, framed portholes, hull seams, fasteners, landing pistons and engine bells. Its passenger hatch faces the actual boarding route. Existing landing, unloading and departure timing drives the scene.

## Terrain, materials and cameras

A few broad crater basins have broken rims and varied relief. Distant ridges and clustered basalt rocks give the horizon depth. Prepared ground, warm paving and brass-edged plot boundaries distinguish the park. Small benches and planted domes derive from paths and clear automatically as the layout changes.

Generated regolith, botanical foliage and distant starlight supply surface detail. Plants use curved alpha-tested leaf cards inside glass domes. Earth, stars and the Sun use a separate orientation-only sky camera. The visible Sun and directional key share their position. Earth keeps its small apparent size and distant behavior while the player pans.

Physical materials separate enamel, fabric, stone, glass and metal. HDR rendering uses environment reflections, a warm key, cool fill, ambient occlusion, restrained bloom and sun shadows. Static architectural meshes merge across nested groups while articulated ride and character roots retain their transforms. Owned resources are released when models change. Shared geometry, surface materials and leaf textures remain reusable.

The coaster uses one bank frame for the rails, train and front-seat camera. Smoothed roll angles avoid abrupt flips through near-vertical track. The structural spine follows the same frame. Returning to the park restores the camera's vertical axis.

Hardware rendering uses separately bounded desktop and mobile resolution. Sustained slow frames reduce live resolution and shadow size. Software renderers use compact geometry, simpler surface shaders, smaller shadow maps and direct rendering. Offline movie capture uses full geometry and quality. Phone-sized browser checks exercise layout and playback. Physical-device profiling remains a separate hardware check.

## Editable sources and reproduction

- `lib/moon/art-kit.ts` contains shared geometry, material finishes, signs, batching and resource ownership.
- `lib/moon/characters.ts` contains the articulated visitor rig.
- `lib/moon/spacecraft.ts` contains the transit rocket and service rover.
- `lib/moon/resort-props.ts` contains pressure gardens, curved foliage, seating, lamps, roofs, awnings, pastry sculptures and foundations.
- `lib/moon/rides.ts` contains all four ride models and their animation rigs.
- `lib/moon/shops.ts` contains concessions, maintenance and solar variants.
- `lib/moon/scenery.ts` contains terrain, paths, the spaceport, observatory and derived path amenities.
- `lib/moon/world.ts` contains lighting, picking, state-driven animation and camera integration.
- `scripts/game/moon-art.mjs` photographs 24 building variants and 22 portraits from those live models. It checks finite geometry and smooth coaster frames during production.
- `public/art/*-s0-v2.webp`, `*-s1-v2.webp` and `*-s2-v2.webp` are the building previews. Portraits use `*-v2.webp`. The 18 visitor portraits match all three suit groups and six face variants. Omar, Mina and Nia have matching portraits beside their inspector updates.
- `MOONPARK-CINEMA.md` documents the editable film pipeline.

Start the isolated local art server with `npx vite --config scripts/game/visual-preview.config.mjs`. Then run `GAME_URL=http://127.0.0.1:5174 MOON_CAPTURE_GPU=1 node scripts/game/moon-art.mjs`. Omit the GPU flag for portable software capture. Use `--only=food,coaster,guest-0` for a smaller production slice. The art server denies environment files, account keys and Git internals. It runs locally on port 5174.

## Generated bitmap provenance

The built-in image-generation tool produced the following originals. Inspected originals remain in ignored `outputs/moonpark-art-v2/`. FFmpeg resizes and encodes the delivery WebP files. Editable geometry, characters, signs, photographs, camera work and animation are authored in the source modules above.

| Local original | Delivery asset | Role |
| --- | --- | --- |
| `art-direction.png` | Local art reference | Three-dimensional lunar-resort concept and the three architectural families |
| `regolith-source.png` | `public/art/lunar-regolith-v2.webp` | 1536-square lunar terrain albedo |
| `foliage-source.png` | `public/art/lunar-leaves-v2.webp` | 1024-square transparent four-leaf atlas |
| `sky-source.png` | `public/art/lunar-sky-v2.webp` | 2048-by-1024 distant Milky Way texture |

### Generation briefs

The art-direction sheet establishes a premium stylized lunar resort with cream and coral spacecraft, brass docking panels, an arched teal terminal, lush pressure gardens, a rounded pie diner and a copper-and-mint magnetic coaster. It compares rounded Retro Resort, glazed Orbital and ribbed Expedition architecture. Human-faced astronauts have padded suits, chunky boots and expressive proportions. Warm key light and cool shadows separate the objects from natural crater terrain and a distant Earth.

The regolith prompt requests a seamless square, perfectly top-down lunar albedo. Silver slate and warm ash-grey powder contain blue-grey basalt fragments, mineral speckling, tiny stone chips and subtle sediment variation. Flat neutral light and low contrast keep the surface usable at close and distant scales. The whole image is continuous terrain with clean repeat edges.

The foliage prompt requests exactly four isolated upright botanical leaves in a two-by-two transparent atlas with generous gutters. The quadrants contain a jade oval tropical leaf with a pale midrib, a chartreuse-tipped fern, a sage-and-lime variegated pointed leaf, and a curved deep emerald leaf with golden edges. Each leaf has tactile hand-painted veins, flat illumination and complete alpha edges.

The sky prompt requests a two-to-one equirectangular distant-space texture. A nearly black indigo starfield contains an irregular, restrained Milky Way band with muted blue, purple and pale gold dust. Dark upper and lower regions, organic astronomical structure and varied pinprick stars keep the backdrop quiet. The horizontal edges visually continue. Celestial bodies are separate scene objects.

## Sound and credits

The original lunar-resort score, sound effects and narration master are reused. Web Audio separates music and effects, ducks the mix during the opening film, limits peaks and suspends playback in background tabs. Editable audio sources and measured delivery loudness are documented in the cinema file.

The Earth texture is bundled from the [Three.js examples](https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg). Three.js uses [MIT licensing](https://github.com/mrdoob/three.js). Interface controls use Lucide. Narration uses Kokoro 82M v1.0 under Apache-2.0 through the MIT-licensed Kokoro ONNX wrapper. Models, terrain geometry, scripts, score, effects and narration text are original production assets.

## November 10 verification

The production build, TypeScript checks and focused source lint pass. All 17 simulation and 35 contract tests pass. All 18 routine browser cases pass in the production build with software rendering, including a complete opening day, first landing, three-family customization, reload recovery, movie playback and fallback, compact screens, sound, public parks and archived v4 saves. The same 18 cases were exercised with hardware rendering, with the movie playback case repeated after its final encode completed. Four optional transaction-spending browser cases retain their existing opt-in gate.

Both complete delivery videos decode for all 1,200 frames at 30 fps and 40 seconds. Desktop is 1920 by 1080, and mobile is 720 by 1280. Exported spacecraft, founder, robot, overview and front-seat frames were inspected. The original audio master measures −18.0 LUFS integrated and −4.3 dBTP in delivery. A new subjective listening session was outside this visual pass.

An isolated populated scene at 1600 by 1000 on the local RTX 5080 measured about 6.2–7.2 ms per frame across two 60-frame passes, with a GPU finish after each frame. The earlier unmerged scene measured about 8.6 ms in the same authoring harness. These are workstation world-render measurements. Physical-phone performance is outstanding. Compact viewport layout and portrait movie playback are covered by browser checks.
