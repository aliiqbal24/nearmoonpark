# Moonpark lunar-resort artwork

## November 11 cinematic environment release

The main game uses perspective. The separately accessible `/lab/isometric` camera experiment remains available for comparison. This release completes the aerospace material pass across the live park, construction and design photos, portraits, public parks and both v6 opening films.

The spaceport now uses glazed terminal wings, roof equipment, warm interior panels and industrial service structures. The stainless ferry has welded hull segments, pressure hatches, landing struts and animated exhaust. The mass driver gains a lattice gantry and station machinery. The eight attraction types retain three structural designs each, with extra services, rails, control panels and architectural details. Visitor rigs have longer human proportions, pressure suits, harnesses and reflective visors. Official NEAR marks appear on arrival infrastructure, rides, spacecraft and crew suits.

AgX tone mapping, low warm sunlight, blue earthlight, restrained bloom and ambient occlusion separate the materials. Background Earth and stars stay sharp through the cinematic depth-of-field pass. Earth has independent day, night-city, cloud and atmospheric layers, with a directional terminator and ocean highlights. Its apparent diameter is about two degrees. The orientation-only sky camera keeps it distant during park panning. The Sun uses the same direction as the park's key light.

Fractal lunar relief includes broad basins, small nearby craters and distant mountain ridges. The graded build plot uses lunar soil, with service lamps and boundaries around its perimeter. Scanned boulders form nearby clusters; smaller rubble is batched. Full-quality movie capture waits for all scenery assets before rendering its first frame. Software rendering retains compact geometry and simpler surface detail.

### Environment asset sources

- [NASA Deep Star Maps 2020](https://svs.gsfc.nasa.gov/4851/), NASA/Goddard Space Flight Center Scientific Visualization Studio, using Gaia DR2, ESA/Gaia/DPAC. The 4K linear EXR is converted to sRGB WebP as `public/textures/space/starmap-v3.webp`. No constellation illustrations are used.
- [Solar System Scope textures](https://www.solarsystemscope.com/textures/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Day and cloud maps are reduced from 8K to 4K; the night map is 2K. All are encoded to WebP under `public/textures/space/earth-*-v3.webp`. Cloud data drives alpha; day and city maps use sRGB. The game Help contains source and license credits.
- [Poly Haven Moon 02](https://polyhaven.com/a/moon_02), CC0, supplies the 2K lunar diffuse, normal and roughness textures in `public/textures/lunar/`.
- [Poly Haven Moon Rock 02](https://polyhaven.com/a/moon_rock_02), CC0, by Greg Zaal, Jenelle van Heerden and Rico Cilliers, captured at Spaceport Rostock's lab. The 1K glTF, mesh data and textures are in `public/models/lunar-rock/`. Instanced, differently sized and rotated copies form the hero rock clusters.

Original downloads and reference footage remain in ignored local outputs. The higher visual benchmark reviewed for this release is [Super Heavy catch](https://www.airsup.ai/lab/catch), also shared in [Konstantin's demo](https://x.com/konstantinsaifo/status/2120356782690443382). It informed engineering detail, surface finishes and scene depth.

The live park, construction cards, design previews, public parks and opening films share the same editable Three.js models. The November 10 upgrade rebuilds the spaceport, all eight building types and the character rig around ivory enamel, deep teal, warm brass, coral and pressure glass.

## Isometric camera experiment

`/lab/isometric` provides an interactive comparison of a true orthographic isometric camera and the perspective camera. Both modes show the same staged park, animated visitors and shuttle. The preview includes an opening-day layout, animation speeds, attraction selection, bounded panning and scroll or pinch zoom. Its state stays inside the preview component. It uses the ongoing visual rework for its models and terrain. The production game continues to use perspective after the camera review.

The isometric camera uses a 45-degree azimuth and 35.264-degree elevation. Projection-aware picking, screen coordinates and ambient occlusion use the active camera. The default game camera is selected independently of this preview.

Both preview browser cases pass with hardware and software rendering. They exercise camera switching, actual rendered pixels, attraction picking, panning, zooming, layout changes, animation controls and phone-sized screens. The saved-park key and outgoing writes are checked during the camera comparison. Software rendering has a substantial startup and frame-time cost in this prototype. The 18 routine game regression cases also pass with hardware rendering. Four optional transaction-spending cases retain their opt-in gate.

The November 11 terrain study uses the 2K diffuse, OpenGL normal and roughness maps from Poly Haven’s Moon 02 material. Original downloads are stored in `public/textures/lunar/`. The asset is CC0 and was captured at Spaceport Rostock’s lab. Surface geometry, crater profiles, spacecraft, architectural details and character rigs are editable game sources. [Moon 02 material and credits](https://polyhaven.com/a/moon_02).

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

The arrival plaza has a curved entrance gantry, glazed terminal wings, planted pressure domes, brass lamps, seating, luggage, a compass inlay and a flight board driven by the shuttle phase. The official NEAR mark appears on the spacecraft, docking-pad inlay, entrance, transit banners, launch station and crew patches. The transit rocket has a shaped nose and hull, swept fins, framed portholes, hull seams, fasteners, landing pistons and engine bells. Its passenger hatch faces the actual boarding route. Existing landing, unloading and departure timing drives the scene.

## Terrain, materials and cameras

A few broad crater basins have broken rims and varied relief. Distant ridges and clustered basalt rocks give the horizon depth. Prepared ground, warm paving and brass-edged plot boundaries distinguish the park. Small benches and planted domes derive from paths and clear automatically as the layout changes.

Generated regolith, botanical foliage and distant starlight supply surface detail. Plants use curved alpha-tested leaf cards inside glass domes. Earth, stars and the Sun use a separate orientation-only sky camera. The visible Sun and directional key share their position. Earth keeps its small apparent size and distant behavior while the player pans.

Physical materials separate enamel, fabric, stone, glass and metal. HDR rendering uses environment reflections, a warm key, cool fill, ambient occlusion, restrained bloom and sun shadows. Static architectural meshes merge across nested groups while articulated ride and character roots retain their transforms. Owned resources are released when models change. Shared geometry, surface materials and leaf textures remain reusable.

The coaster uses one bank frame for the rails, train and front-seat camera. Smoothed roll angles avoid abrupt flips through near-vertical track. The structural spine follows the same frame. Returning to the park restores the camera's vertical axis.

Hardware rendering uses separately bounded desktop and mobile resolution. Sustained slow frames reduce live resolution and shadow size. Software renderers use compact geometry, simpler surface shaders, smaller shadow maps and direct rendering. Offline movie capture uses full geometry and quality. Phone-sized browser checks exercise layout and playback. Physical-device profiling remains a separate hardware check.

## Editable sources and reproduction

- `lib/near-brand.ts` shares the official mark between the interface and 3D artwork. `public/art/near-protocol-film-v1.svg` supplies the baked movie credit.
- `lib/moon/art-kit.ts` contains shared geometry, material finishes, signs, batching and resource ownership.
- `lib/moon/characters.ts` contains the articulated visitor rig.
- `lib/moon/spacecraft.ts` contains the transit rocket and service rover.
- `lib/moon/resort-props.ts` contains pressure gardens, curved foliage, seating, lamps, roofs, awnings, pastry sculptures and foundations.
- `lib/moon/rides.ts` contains all four ride models and their animation rigs.
- `lib/moon/shops.ts` contains concessions, maintenance and solar variants.
- `lib/moon/scenery.ts` contains terrain, paths, the spaceport, observatory and derived path amenities.
- `lib/moon/world.ts` contains lighting, picking, state-driven animation and camera integration.
- `scripts/game/moon-art.mjs` photographs 24 building variants and 22 portraits from those live models. It checks finite geometry and smooth coaster frames during production.
- `public/art/*-s0-v3.webp`, `*-s1-v3.webp` and `*-s2-v3.webp` are the building previews. Portraits use `*-v3.webp`. The 18 visitor portraits match all three suit groups and six face variants. Omar, Mina and Nia have matching portraits beside their inspector updates.
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

The earlier Earth texture came from the Three.js examples; current Earth and sky map attribution is recorded above. Three.js uses [MIT licensing](https://github.com/mrdoob/three.js). Interface controls use Lucide. Narration uses Kokoro 82M v1.0 under Apache-2.0 through the MIT-licensed Kokoro ONNX wrapper. Models, terrain geometry, scripts, score, effects and narration text are original production assets.

## November 10 verification

The production build, TypeScript checks and focused source lint pass. All 17 simulation and 35 contract tests pass. All 18 routine browser cases pass in the production build with software rendering, including a complete opening day, first landing, three-family customization, reload recovery, movie playback and fallback, compact screens, sound, public parks and archived v4 saves. After the final NEAR-branded film encode, all 18 cases passed again with hardware rendering. Four focused software cases also passed again for complete-day play, final-film playback, movie failure fallback and compact-screen entry. Four optional transaction-spending browser cases retain their existing opt-in gate.

Both complete delivery videos decode for all 1,200 frames at 30 fps and 40 seconds. Desktop is 1920 by 1080, and mobile is 720 by 1280. The v5 brand pass re-renders both full timelines and includes the NEAR credit inside the delivered movies. Exported spacecraft, founder, robot, overview and front-seat frames were inspected. The original audio master measures approximately −18.1 LUFS integrated and −4.3 dBTP in delivery. A new subjective listening session was outside this visual pass.

An isolated populated scene at 1600 by 1000 on the local RTX 5080 measured about 6.2–7.2 ms per frame across two 60-frame passes, with a GPU finish after each frame. The earlier unmerged scene measured about 8.6 ms in the same authoring harness. These are workstation world-render measurements. Physical-phone performance still needs testing. Compact viewport layout and portrait movie playback are covered by browser checks.

## November 11 release verification

The production build and TypeScript checks pass. Focused lint reports no errors and ten existing image-element optimization warnings. The 18 routine game browser cases pass across the production-suite run and the corrected-host authentication recheck; four optional transaction-spending cases remain opt-in. The initial auth check used `127.0.0.1` against a server whose request origin was `localhost`, correctly receiving a 403. With the runner on the server's host, anonymous ranked provisioning and profile changes return 401 as intended.

Both camera-preview cases pass with hardware graphics and with software rendering. Software uses a 0.6 render ratio and reduced torus geometry for small suit and architectural rings; hardware and offline captures retain their full geometry. Software rendering remains slower. Physical-phone performance is unmeasured.

The v6 desktop and portrait films each decode for 1,200 frames, 30 fps and 40 seconds, with stereo 48 kHz audio. Exported Earth, arrival, founder, coaster, robot and park-overview frames were inspected. The rebuilt terminal initially obscured the robot shot; it is now staged on the empty arrival pad with clear framing in both aspect ratios. Its two-second replacement is assembled from deterministic source frames. Original full picture masters and the first v6 pass remain in ignored local outputs. The unchanged audio master measures about −18.0 LUFS integrated and −4.3 dBTP after delivery encoding. No new subjective audio audition is claimed for this visual pass.

The current Rust/WASM engine and public contract configuration retain their previous SHA-256 hashes. The browser checks include archived v4 saves, published parks and first-landing clock behavior. This visual release performs no new testnet purchases, contract migration or economy changes.
