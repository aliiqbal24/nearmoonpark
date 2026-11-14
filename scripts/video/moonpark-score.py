"""Reproducible stereo sound edit for Moonpark's 40-second opening film."""
from pathlib import Path
import json
import os
import subprocess
import urllib.request
import wave

import numpy as np
from kokoro_onnx import Kokoro

OUTPUT = Path("outputs/moonpark-cinema-v7")
SOURCE = OUTPUT / "source"
SOURCE.mkdir(parents=True, exist_ok=True)
RATE = 48000
DURATION = 40
SAMPLES = RATE * DURATION
RANDOM = np.random.default_rng(1789)
MUSIC_URL = "https://www.scottbuckley.com.au/library/wp-content/uploads/2020/05/sb_helios.mp3"
MUSIC_PATH = SOURCE / "helios.mp3"
if not MUSIC_PATH.exists():
    urllib.request.urlretrieve(MUSIC_URL, MUSIC_PATH)


def read_audio(path, start=0, duration=None):
    args = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", str(start), "-i", str(path)]
    if duration is not None:
        args += ["-t", str(duration)]
    args += ["-ac", "2", "-ar", str(RATE), "-f", "f32le", "pipe:1"]
    result = subprocess.run(args, check=True, capture_output=True)
    return np.frombuffer(result.stdout, dtype="<f4").reshape(-1, 2).astype(np.float64)


def write_audio(path, samples):
    samples = np.clip(samples, -1, 1)
    with wave.open(str(path), "wb") as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes((samples * 32767).astype("<i2").tobytes())


def add(layer, samples, start, pan=0):
    offset = round(start * RATE)
    end = min(SAMPLES, offset + len(samples))
    if end <= offset:
        return
    samples = samples[:end - offset]
    if samples.ndim == 1:
        samples = samples[:, None] * np.array([np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)])
    layer[offset:end] += samples


def filtered_noise(duration, low=30, high=5000):
    count = round(duration * RATE)
    signal = RANDOM.normal(size=count)
    spectrum = np.fft.rfft(signal)
    frequency = np.fft.rfftfreq(count, 1 / RATE)
    spectrum *= np.minimum(1, frequency / low) ** 3 / (1 + (frequency / high) ** 6)
    signal = np.fft.irfft(spectrum, count)
    return signal / max(1e-8, np.sqrt(np.mean(signal ** 2)))


music = np.zeros((SAMPLES, 2))
source = read_audio(MUSIC_PATH, 203, DURATION)
# The licensed orchestral performance supplies a continuous musical phrase.
# Dynamics are edited around the launch, Earth reveal and landing.
time = np.arange(SAMPLES) / RATE
music_envelope = np.interp(time, [0, 3.8, 4, 8.8, 9.1, 15.5, 16, 20.8, 21.1, 29, 33, 38, 40],
                           [.08, .2, .65, .65, .85, 1, .55, .7, 1.1, .65, .95, 1.2, 0])
music[:len(source)] = source * music_envelope[:len(source), None] * .9
voice_layer = np.zeros_like(music)
effects = np.zeros_like(music)

# Magnetic launch. Harmonic coils rise into a broadband acceleration rush.
t = np.arange(round(4 * RATE)) / RATE
phase = 2 * np.pi * (75 * t + 68 * t ** 2)
charge = (np.sin(phase) + .22 * np.sin(phase * 2)) * .035 * np.minimum(1, t / .5)
add(effects, charge, 0, -.2)
rush = filtered_noise(3.1, 70, 7200)
t = np.arange(len(rush)) / RATE
envelope = np.sin(np.pi * np.clip(t / 3.1, 0, 1)) ** .8
add(effects, rush * envelope * .12, .9, .25)

# Landing burn and liftoff have independently editable, stereo engine layers.
for start, duration, level in [(9, 7, .12), (33, 6, .09)]:
    rumble = filtered_noise(duration, 25, 1400)
    t = np.arange(len(rumble)) / RATE
    envelope = np.sin(np.pi * t / duration) ** .65
    engine = np.sin(2 * np.pi * 43 * t + .15 * np.sin(2 * np.pi * 2.3 * t))
    add(effects, (rumble * level + engine * .025) * envelope, start, -.18)
    add(effects, filtered_noise(duration, 300, 5000) * envelope * .022, start, .4)

# The touchdown transients coincide with the landing struts settling.
t = np.arange(round(1.4 * RATE)) / RATE
impact = np.sin(2 * np.pi * (58 * t - 9 * t ** 2)) * np.exp(-t * 5) * .22
impact += filtered_noise(1.4, 70, 2200) * np.exp(-t * 13) * .08
add(effects, impact, 15.85)

# Human-scale foley brings the arrival promenade into focus.
for index, start in enumerate(np.arange(16.5, 20.7, .54)):
    step = filtered_noise(.19, 130, 4200)
    t = np.arange(len(step)) / RATE
    add(effects, step * np.exp(-t * 24) * .043, start, (-1) ** index * .3)

# Front-seat track rush and restrained wheel chatter.
rush = filtered_noise(8, 130, 8500)
t = np.arange(len(rush)) / RATE
add(effects, rush * (.035 + .045 * np.sin(np.pi * t / 8)), 21, -.25)
add(effects, filtered_noise(8, 300, 6000) * (.025 + .02 * np.sin(t * 3)), 21, .3)
for start in np.arange(21.2, 28.7, .22):
    t = np.arange(round(.06 * RATE)) / RATE
    add(effects, np.sin(2 * np.pi * 320 * t) * np.exp(-t * 85) * .025, start)

# A bright kitchen bell releases the tension before the final resort reveal.
t = np.arange(round(1.3 * RATE)) / RATE
bell = (np.sin(2 * np.pi * 1568 * t) + .4 * np.sin(2 * np.pi * 2410 * t)) * np.exp(-t * 5) * .035
add(effects, bell, 29.2, .25)

model_dir = Path(os.environ.get("MOON_KOKORO_DIR", ".media-tools/kokoro"))
model = Kokoro(str(model_dir / "kokoro-v1.0.onnx"), str(model_dir / "voices-v1.0.bin"))
script = [
    (.25, "Mass driver online.", "am_michael", 1.0, True),
    (4.6, "Generations dreamed of life on the Moon.", "bm_fable", .99, False),
    (9.6, "Nobody planned the weekend.", "bm_fable", .98, False),
    (16.3, "Your first visitors have come a long way.", "bm_fable", .99, False),
    (23.0, "Build them a story worth bringing home.", "bm_fable", .98, False),
    (29.4, "And yes. We brought the pie.", "bm_fable", .98, False),
    (34.1, "The gates are yours. Make it worth the trip.", "bm_fable", .98, False),
]
segments = []
for index, (start, text, voice, speed, radio) in enumerate(script):
    samples, rate = model.create(text, voice=voice, speed=speed, lang="en-us" if radio else "en-gb")
    length = len(samples) / rate
    audio = np.interp(np.arange(round(length * RATE)) / RATE, np.arange(len(samples)) / rate, samples)
    rms = max(1e-6, np.sqrt(np.mean(audio ** 2)))
    audio *= .14 / rms
    if radio:
        frequency = np.fft.rfftfreq(len(audio), 1 / RATE)
        spectrum = np.fft.rfft(audio)
        spectrum *= (frequency > 300) * (frequency < 3400)
        audio = np.fft.irfft(spectrum, len(audio)) * 1.1
    if start + length > (script[index + 1][0] - .15 if index + 1 < len(script) else 39):
        raise RuntimeError(f"Narration overruns its shot: {text} ({length:.2f}s)")
    add(voice_layer, audio, start)
    write_audio(SOURCE / f"voice-{index}.wav", np.column_stack([audio, audio]))
    end = start + length
    duck = np.minimum(1, np.maximum(0, (time - start + .15) / .15)) * np.minimum(1, np.maximum(0, (end + .35 - time) / .35))
    music *= (1 - duck * .7)[:, None]
    effects *= (1 - duck * .42)[:, None]
    segments.append({"start": start, "end": round(end, 3), "text": text, "voice": voice, "speed": speed})
    print(text, f"{length:.2f}s", flush=True)

fade = np.minimum(1, time / .03) * np.minimum(1, (DURATION - time) / .65)
for name, layer in [("music", music), ("narration", voice_layer), ("effects", effects)]:
    write_audio(OUTPUT / f"{name}-stem.wav", layer * fade[:, None])
mix = (music + voice_layer + effects) * fade[:, None]
peak = np.max(np.abs(mix))
mix *= min(1, .94 / max(peak, 1e-6))
write_audio(OUTPUT / "score-master.wav", mix)

story = {"duration": DURATION, "segments": segments, "music": {
    "title": "Helios", "artist": "Scott Buckley", "source": "https://www.scottbuckley.com.au/library/helios/",
    "license": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "edit": "40-second excerpt beginning at 03:23, with dynamic ducking and synchronized original sound effects",
}}
(OUTPUT / "sound-edit.json").write_text(json.dumps(story, indent=2) + "\n")
Path("public/video/moonpark-opening-v7-story.json").write_text(json.dumps(story, indent=2) + "\n")
print("Wrote the orchestral edit, original effects, narration and separate stereo stems.")
