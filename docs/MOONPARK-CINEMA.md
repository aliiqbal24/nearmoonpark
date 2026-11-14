# Moonpark opening film v7

The current opening is a 40-second, 60 fps film with 2,400 frames in each delivery. Desktop is 1920×1080. Mobile uses a separately composed 720×1280 render. The film opens on a magnetic coaster launch, reveals Earth, lands a passenger rocket, welcomes visitors, rides the mass driver, visits the kitchen and ends with the player's invitation to open the park.

The film uses the playable Three.js models, terrain, materials, custom coaster curves and character rigs. An expanded established park is staged for the cinematic. Editorial cuts have no black exposure dips. The last shot approaches the gameplay camera. H.264 High Profile, AAC stereo and fast-start MP4 support hardware playback. The WebGL scene pauses during the movie.

The soundtrack edits a continuous 40-second excerpt of “Helios” by Scott Buckley, starting at 03:23. It is licensed under CC BY 4.0. Original stereo effects add the magnetic launch, engine burn, touchdown, footsteps, wheel chatter and kitchen bell. Locally generated Kokoro narration uses bm_fable with an am_michael radio cue. The mix ducks music and effects around speech and targets −16 LUFS and −1.8 dBTP. The encoded delivery measures −15.75 LUFS, −1.67 dBTP and 4.5 LU loudness range. Music, narration and effects have separate editable stems. [Music source](https://www.scottbuckley.com.au/library/helios/) and [license](https://creativecommons.org/licenses/by/4.0/).

Both complete exports decode successfully. Exported desktop and portrait contact sheets were visually reviewed, including a corrected front-seat insert that hides the camera's own train and riders. Continuous browser playback completed the handoff in 40.9 seconds on desktop and 40.8 seconds in portrait. On this workstation, sampled frame counters recorded 2 dropped frames out of 2,302 and 3 out of 2,290 respectively. Both runs reported zero page errors. This environment cannot audition audio. Signal levels, speech timing, ducking and stereo structure were checked, while perceptual listening remains for a person with audio playback.

The current camera source is `lib/moon/cinema.ts`. `scripts/video/moonpark-intro.mjs` captures deterministic 60 fps picture masters and supports `--sample`, `--range=0,4` and `--portrait`. `scripts/video/moonpark-score.py` generates narration, the sound edit and its stems. Set MOON_KOKORO_DIR to the local model folder. `scripts/video/moonpark-finish.mjs` composites branding and titles, encodes delivery files, checks all frames and writes their hashes. Masters and review outputs are kept in the ignored `outputs/moonpark-cinema-v7` directory. The game plays the checked-in exports without production tools or models.

## Sky clarity revision

The v7 deliveries are refreshed with the shared 8K KTX2 Milky Way layer and analytic point stars. Both full picture masters are re-rendered at 60 fps. The Milky Way is graded below the point-star foreground to reduce visible grain. PNG frame capture uses Chrome’s speed-optimized lossless encoder. Decoded pixel hashes match the regular Playwright capture in the reviewed sample. Earlier picture masters, the corrected front-seat inserts and previous public exports are preserved in `outputs/moonpark-cinema-v7/sky-v3-originals`. Full new masters supersede those inserts. Delivery encoding uses CRF 18 with an 8.5 Mbps ceiling on desktop and CRF 20 with a 3.2 Mbps ceiling in portrait to retain fine stars through motion. The story, soundtrack and timings use the existing editable masters. File hashes in the public manifest identify this revision.

## Earlier v6 production record


The v6 opening is a 40-second film rendered deterministically from the game's original Three.js scene, at 1920×1080 and 30 fps. A separately rendered 720×1280 portrait variant serves smaller viewports. Both use H.264 video, stereo AAC audio and a fast-start MP4 container. The complete assets are checked in; playing the game needs no rendering tools, model download or AI service.

The scene begins with Earth in the distant sky, follows the shuttle's approach, reveals the park, rides the mass driver, meets the founder and ends on the park's dream. Short exposure dips conceal deliberate shot changes. Camera paths ease in and out, coaster frames use updated world matrices, and the movie dissolves into the live park. The underlying WebGL renderer pauses during normal film playback. A live camera sequence remains available if video playback fails. Reduced-motion settings use a still image with the narrative text and audio.

Earth and stars render through a separate sky camera that copies orientation but has no observer translation. Earth therefore has no nearby-ground parallax. Its small angular size, directional lighting and restrained rotation give it distance. The Moon's terrain extends to a shaped horizon.

## Editable sources

- `lib/moon/cinema.ts` controls shot timing, positions, look targets, lenses and transition exposure.
- `lib/moon/world.ts`, `assets.ts`, `scenery.ts` and `dream.ts` integrate the scene, lighting and staged park. Editable models are split between `characters.ts`, `spacecraft.ts`, `rides.ts`, `shops.ts`, `resort-props.ts` and `art-kit.ts`.
- `scripts/video/moonpark-intro.mjs` captures deterministic browser frames and encodes picture masters.
- `scripts/video/moonpark-score.py` contains the original narration script, score, effects, voice timing, ducking and fades.
- `scripts/video/moonpark-finish.mjs` encodes deliveries, generates the poster, checks full decoding and writes the manifest.
- `app/moon-game.tsx` and `moonpark.css` control editable narrative headlines, letterboxing, sound controls, playback and the transition to gameplay.

To regenerate pictures, start `npx vite --config scripts/game/visual-preview.config.mjs`, then run `GAME_URL=http://127.0.0.1:5174 node scripts/video/moonpark-intro.mjs`. `--sample` captures representative stills first. Run the capture a second time with `--portrait` to produce the mobile picture master. The pipeline uses the configured Chromium binary and FFmpeg; masters and QA files stay in the ignored `outputs/moonpark-cinema` directory.

Audio generation uses Python, NumPy and optionally `kokoro-onnx`. Set `MOON_KOKORO_DIR` to a local directory containing `kokoro-v1.0.onnx` and `voices-v1.0.bin`; the default development location is `.media-tools/kokoro`. Run `python scripts/video/moonpark-score.py`, then `node scripts/video/moonpark-finish.mjs`. The game never loads these models. The public opening manifest records codecs' dimensions, duration, frame count, sizes and SHA-256 hashes. `--verify-only` checks existing deliveries without recompressing them.

## Sound and provenance

Narration is generated locally with Kokoro 82M v1.0, voice `bm_george`, through Kokoro ONNX. The model uses Apache-2.0 licensing and the inference wrapper uses MIT licensing. The script, musical composition, rocket/rail/popcorn effects, mixing and scene are original. The bundled Three.js Earth texture is credited in `VISUALS.md`. [Kokoro model](https://huggingface.co/hexgrad/Kokoro-82M), [Kokoro ONNX wrapper](https://github.com/thewh1teagle/kokoro-onnx).

The delivered file decodes for all 1,200 video frames. Audio analysis measured approximately −18.1 LUFS integrated loudness, −4.3 dBTP peak and 3.6 LU loudness range. Representative exported shots and browser playback are checked separately from media metadata. The spoken-line durations fit inside their intended shots. Narrative headlines follow the editable scene timing.

## Visual-upgrade delivery

The v5 film includes the rebuilt lunar resort, glazed arrival terminal, pressure gardens, human-faced visitors, three architectural families, magnetic launch collars, warm/cool HDR lighting and smoothed coaster banking. It re-renders the complete upgraded live park with the same deterministic camera timing and original audio master. Desktop and mobile files are `public/video/moonpark-opening-v5.mp4` and `public/video/moonpark-opening-v5-mobile.mp4`. The matching still is `public/video/moonpark-opening-v5-poster.jpg`. The finish script decodes both complete exports and records their hashes in `public/video/moonpark-opening.json`. Earlier media remains in Git history and local `outputs/moonpark-cinema/v2-originals` and `v3-originals`.

On this workstation, the native Chromium binary can render through the NVIDIA Vulkan backend. The verified capture command is `GAME_URL=http://127.0.0.1:5174 MOON_CAPTURE_GPU=1 CHROMIUM_PATH=/usr/lib/chromium/chromium node scripts/video/moonpark-intro.mjs`. Add `--portrait` for the mobile master. Omit these environment variables to retain the portable software-compatible path. Chromium documents headless GPU enablement at https://chromium.googlesource.com/chromium/src.git/+/main/docs/gpu/using-gpu-hardware-in-headless-chrome.md . This is a local production setting and does not change visitors' browser configuration.

The v5 export re-renders the complete scene with the current low side padding, smoothed visitor movement, NEAR-branded spacecraft, docking pad, entrance, banners, launch station and crew suits. The arrival shot begins at passenger eye level and rises into a park reveal. Portrait arrival and closing shots use separate lens framing. Earlier v4 masters and the final pre-branding edit are retained locally in `outputs/moonpark-cinema/v4-originals` and `v4-final`.

The finish script encodes into a private staging directory, decodes both variants, verifies their frame counts and publishes complete files through atomic renames. The manifest is published last. `--verify-only` checks existing deliveries without rewriting them.

## NEAR Protocol presentation

`lib/near-brand.ts` holds the official NEAR mark used by the React interface and extruded 3D emblems. `public/art/near-protocol-film-v1.svg` is the editable film lockup. The finish script composites it inside both movie files within a centered safe area. Standalone playback therefore includes the NEAR Protocol credit. The in-game live fallback uses the shared mark, and the closing chapter displays the Moonpark title and NEAR identity.

The visual benchmark supplied during the pass is [Kevin Ngo’s boat-world demo](https://x.com/kevin_t_ngo/status/2119868968307695818). Representative reference frames were reviewed for foreground layering, warm/cool contrast, material detail and deliberate reveals. Moonpark retains its lunar-resort art direction. The reference footage stays in ignored local QA output.

## November 11 v6 delivery

Both full timelines are rendered from the current aerospace scene, including the stainless ferry, industrial terminal, revised character proportions, lattice mass-driver gantry, natural lunar build plot, scanned rocks and the layered Earth. The opening camera centers distant Earth; the landing and founder shots are reframed for the taller models. Background starlight and Earth bypass cinematic depth blur. Portrait arrival and closing shots keep their separate framing. The original score and narration master are reused. `sceneryReady` gates offline capture so texture or mesh loading cannot leak into a recorded frame.

Deliveries use immutable `moonpark-opening-v6` filenames. The previous v5 files remain for cached clients and the previous picture masters are retained in ignored `outputs/moonpark-cinema/v5-originals`. The production manifest is published last after both complete files decode. Environment asset attribution is recorded in `docs/VISUALS.md` and in game Help.
