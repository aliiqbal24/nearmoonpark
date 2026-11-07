# Moonpark opening film

The opening is a 40-second film rendered deterministically from the game's original Three.js scene, at 1920×1080 and 30 fps. A 1280×720 variant serves smaller viewports. Both use H.264 video, stereo AAC audio and a fast-start MP4 container. The complete assets are checked in; playing the game needs no rendering tools, model download or AI service.

The scene begins with Earth in the distant sky, follows the shuttle's approach, reveals the park, rides the mass driver, meets the founder and ends on the park's dream. Short exposure dips conceal deliberate shot changes. Camera paths ease in and out, coaster frames use updated world matrices, and the movie dissolves into the live park. The underlying WebGL renderer pauses during normal film playback. A live camera sequence remains available if video playback fails. Reduced-motion settings use a still image with the narrative text and audio.

Earth and stars render through a separate sky camera that copies orientation but has no observer translation. Earth therefore has no nearby-ground parallax. Its small angular size, directional lighting and restrained rotation give it distance; the Moon's terrain extends to a shaped horizon. It is intentionally no longer a large object on the park map.

## Editable sources

- `lib/moon/cinema.ts`: shot timing, positions, look targets, lenses and transition exposure.
- `lib/moon/world.ts`, `assets.ts`, `dream.ts`: scene, original procedural models, lighting and staged park.
- `scripts/video/moonpark-intro.mjs`: deterministic browser capture and picture-master encoding.
- `scripts/video/moonpark-score.py`: original narration script, score, effects, voice timing, ducking and fades.
- `scripts/video/moonpark-finish.mjs`: delivery encoding, poster generation, full decode checks and manifest.
- `app/moon-game.tsx` and `moonpark.css`: editable narrative headlines, letterboxing, sound controls, playback and the transition to gameplay.

To regenerate pictures, start `npm run dev`, then run `node scripts/video/moonpark-intro.mjs`. `--sample` captures representative stills first. The pipeline uses the configured Chromium binary and FFmpeg; masters and QA files stay in the ignored `outputs/moonpark-cinema` directory.

Audio generation uses Python, NumPy and optionally `kokoro-onnx`. Set `MOON_KOKORO_DIR` to a local directory containing `kokoro-v1.0.onnx` and `voices-v1.0.bin`; the default development location is `.media-tools/kokoro`. Run `python scripts/video/moonpark-score.py`, then `node scripts/video/moonpark-finish.mjs`. The game never loads these models. The public opening manifest records codecs' dimensions, duration, frame count, sizes and SHA-256 hashes. `--verify-only` checks existing deliveries without recompressing them.

## Sound and provenance

Narration is generated locally with Kokoro 82M v1.0, voice `bm_george`, through Kokoro ONNX. The model uses Apache-2.0 licensing: https://huggingface.co/hexgrad/Kokoro-82M . The inference wrapper is MIT: https://github.com/thewh1teagle/kokoro-onnx . The script, musical composition, rocket/rail/popcorn effects, mixing and scene are original. There is no copied Bullfrog/Supercell footage, music or voice performance. The bundled Three.js Earth texture is credited in `VISUALS.md`.

The delivered file decodes for all 1,200 video frames. Audio analysis measured approximately −18.1 LUFS integrated loudness, −4.3 dBTP peak and 3.6 LU loudness range. Representative exported shots and browser playback are checked separately from media metadata. The spoken-line durations fit inside their intended shots. Narrative headlines are editorial titles, not a claim of word-aligned subtitles.
