"""Render Moonpark's original in-game music and tactile stereo sound effects."""
from pathlib import Path
import subprocess
import wave

import numpy as np

RATE = 44100
DESTINATION = Path("public/audio")
MASTERS = Path("outputs/moonpark-audio")
DESTINATION.mkdir(parents=True, exist_ok=True)
MASTERS.mkdir(parents=True, exist_ok=True)
random = np.random.default_rng(2207)


def frequency(note):
    return 440 * 2 ** ((note - 69) / 12)


def instrument(note, duration, kind="bell"):
    time = np.arange(round(duration * RATE)) / RATE
    hz = frequency(note)
    attack = np.minimum(1, time / 0.008)
    if kind == "pad":
        envelope = np.minimum(1, time / 0.9) * np.minimum(1, (duration - time) / 1.2)
        sound = sum(np.sin(2 * np.pi * hz * ratio * time) for ratio in (0.998, 1, 2.003)) / 3
    elif kind == "bass":
        envelope = attack * np.exp(-time * 3.6) * np.minimum(1, (duration - time) / 0.08)
        sound = np.sin(2 * np.pi * hz * time) + 0.22 * np.sin(2 * np.pi * hz * 2 * time)
    elif kind == "pluck":
        envelope = attack * np.exp(-time * 5.5)
        sound = sum(np.sin(2 * np.pi * hz * ratio * time) / ratio ** 2 for ratio in (1, 2, 3, 4))
    else:
        envelope = attack * np.exp(-time * 2.8)
        sound = (
            np.sin(2 * np.pi * hz * time + 1.1 * np.sin(2 * np.pi * hz * 2.01 * time) * np.exp(-time * 7))
            + 0.16 * np.sin(2 * np.pi * hz * 3.99 * time) * np.exp(-time * 8)
        )
    return sound * envelope * np.minimum(1, (duration - time) / 0.03)


def add(mix, sound, start, gain=1, pan=0, wrap=False):
    offset = round(start * RATE)
    stereo = sound[:, None] * np.array([np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)]) * gain
    end = offset + len(stereo)
    if wrap:
        indices = np.arange(offset, end) % len(mix)
        mix[indices] += stereo
    else:
        count = min(len(stereo), len(mix) - offset)
        if count > 0:
            mix[offset:offset + count] += stereo[:count]


def room(mix, wrap=False):
    dry = mix.copy()
    for delay, gain in [(0.043, 0.13), (0.079, 0.11), (0.137, 0.08), (0.223, 0.06), (0.347, 0.04), (0.511, 0.025)]:
        samples = round(delay * RATE)
        if wrap:
            mix += np.roll(dry[:, ::-1], samples, axis=0) * gain
        else:
            mix[samples:] += dry[:-samples, ::-1] * gain
    return mix


def export(name, mix, music=False):
    peak = np.max(np.abs(mix))
    mix *= (0.76 if music else 0.78) / max(peak, 0.001)
    if not music:
        count = min(len(mix), round(0.035 * RATE))
        mix[-count:] *= np.linspace(1, 0, count)[:, None]
    path = MASTERS / f"{name}.wav"
    with wave.open(str(path), "wb") as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes((np.clip(mix, -1, 1) * 32767).astype("<i2").tobytes())
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(path), "-c:a", "libmp3lame", "-b:a", "160k" if music else "128k", str(DESTINATION / f"{name}-v1.mp3")], check=True)
    print(f"Rendered {name}, {len(mix) / RATE:.2f}s", flush=True)


# Thirty-two bars in D major. Two arranged halves keep a nine-minute day varied.
beat = 60 / 96
bar = beat * 4
music = np.zeros((round(bar * 32 * RATE), 2))
chords = [([62, 66, 69, 73, 76], 38), ([61, 64, 69, 71, 76], 37), ([59, 62, 66, 69, 73], 35), ([55, 59, 62, 66, 69], 31), ([62, 66, 69, 73, 76], 38), ([59, 62, 66, 69, 73], 35), ([55, 59, 62, 66, 69], 31), ([57, 61, 64, 67, 71], 33)]
melody = [
    [(0, 78), (1.5, 76), (2.5, 73)], [(0.5, 76), (2, 73), (3, 71)],
    [(0, 74), (1, 73), (2.5, 69)], [(0.5, 71), (2, 69), (3, 66)],
    [(0, 73), (1.5, 74), (2.5, 78)], [(0.5, 76), (2, 74), (3, 73)],
    [(0, 71), (1.5, 74), (2.5, 73)], [(0.5, 69), (2, 73)],
]
for index in range(32):
    start = index * bar
    notes, bass = chords[index % 8]
    for voice, note in enumerate(notes):
        add(music, instrument(note - 12, bar + 1.2, "pad"), start, 0.045, (voice - 2) * 0.26, True)
    for position, note in [(0, bass), (1.75, bass + 12), (2.5, bass + 7), (3.5, bass + 12)]:
        add(music, instrument(note, 0.55, "bass"), start + position * beat, 0.24 if position == 0 else 0.13, 0, True)
    for position in (0.5, 1.5, 2.75, 3.5):
        for voice, note in enumerate(notes[:4]):
            add(music, instrument(note + (12 if index >= 16 else 0), 0.75, "pluck"), start + position * beat + voice * 0.012, 0.027, (voice - 1.5) * 0.32, True)
    # Leave space every fourth bar. The second half answers with a lower melody.
    if index % 4 != 3:
        for position, note in melody[index % 8]:
            add(music, instrument(note - (12 if index >= 16 else 0), 1.5), start + position * beat, 0.11, -0.13 if index < 16 else 0.16, True)
    for position in range(8):
        length = round(0.075 * RATE)
        noise = random.normal(0, 1, length)
        noise = noise - np.convolve(noise, np.ones(9) / 9, mode="same")
        envelope = np.exp(-np.arange(length) / RATE * 70)
        add(music, noise * envelope, start + position * beat / 2, 0.016 if position % 2 else 0.009, 0.35, True)
    for position in (0, 2):
        time = np.arange(round(0.15 * RATE)) / RATE
        kick = np.sin(2 * np.pi * (47 * time + 1.5 * (1 - np.exp(-time * 35)))) * np.exp(-time * 28)
        add(music, kick, start + position * beat, 0.07, 0, True)
export("lunar-day", room(music, True), True)

for name, duration in [("cash", 0.8), ("build", 1.5), ("rocket", 5.2), ("finish", 3.6), ("error", 0.5), ("reward", 2.2), ("contract", 1.6)]:
    mix = np.zeros((round(duration * RATE), 2))
    if name == "cash":
        for index, note in enumerate((93, 98, 105)):
            add(mix, instrument(note, 0.5), index * 0.045, 0.23, (index - 1) * 0.35)
    elif name == "build":
        for index, when in enumerate((0, 0.095, 0.21)):
            time = np.arange(round(0.18 * RATE)) / RATE
            clunk = (np.sin(2 * np.pi * 115 * time) * 0.6 + random.normal(0, 0.22, len(time))) * np.exp(-time * 32)
            add(mix, clunk, when, 0.25, (index - 1) * 0.25)
        for index, note in enumerate((74, 81, 86)):
            add(mix, instrument(note, 0.85), 0.25 + index * 0.09, 0.18, index * 0.2 - 0.2)
    elif name == "rocket":
        time = np.arange(len(mix)) / RATE
        noise = random.normal(0, 1, len(time))
        rumble = np.convolve(noise, np.ones(65) / 65, mode="same")
        envelope = np.sin(np.pi * time / duration) ** 1.3
        engine = np.sin(2 * np.pi * 43 * time + 0.7 * np.sin(time * 7))
        add(mix, (rumble * 1.1 + engine * 0.065) * envelope, 0, 0.7)
        add(mix, np.convolve(noise, np.ones(11) / 11, mode="same") * envelope, 0, 0.08, 0.35)
    elif name == "error":
        add(mix, instrument(55, 0.35, "pluck"), 0, 0.35)
        add(mix, instrument(50, 0.3, "pluck"), 0.08, 0.25)
    else:
        notes = {"finish": (62, 66, 69, 73, 78, 81, 86), "reward": (74, 78, 81, 86), "contract": (74, 81, 86)}[name]
        for index, note in enumerate(notes):
            add(mix, instrument(note, min(1.7, duration - index * 0.12 - 0.1)), index * 0.12, 0.18, (index / len(notes) - 0.5) * 0.7)
    export(name, room(mix))
