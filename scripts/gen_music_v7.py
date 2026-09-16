#!/usr/bin/env python3
"""Soft ambient pad under the narrator. Original, no sample pack."""
from __future__ import annotations

import math
import wave
from pathlib import Path

import numpy as np

OUT = Path("/workspace/artifacts/film/music-v7.wav")
SR = 44100
SECONDS = 200


def tone(freq: float, n: int, amp: float) -> np.ndarray:
    t = np.arange(n) / SR
    # slight chorus
    a = np.sin(2 * math.pi * freq * t)
    b = np.sin(2 * math.pi * freq * 1.003 * t + 0.4)
    env = np.linspace(0, 1, n, endpoint=False)
    fade = np.minimum(env * 8, 1.0) * np.minimum((1 - env) * 6, 1.0)
    return ((a * 0.62 + b * 0.38) * amp * fade).astype(np.float64)


def main() -> None:
    n = SR * SECONDS
    mix = np.zeros(n, dtype=np.float64)
    # slow C major pads, 8-second chords
    progression = [
        (130.81, 164.81, 196.00, 261.63),  # C
        (174.61, 220.00, 261.63, 329.63),  # F
        (196.00, 246.94, 293.66, 392.00),  # G
        (164.81, 196.00, 246.94, 329.63),  # Em
    ]
    chord_len = 8 * SR
    pos = 0
    i = 0
    while pos < n:
        freqs = progression[i % len(progression)]
        take = min(chord_len, n - pos)
        pad = np.zeros(take)
        amps = (0.11, 0.08, 0.07, 0.05)
        for f, a in zip(freqs, amps):
            pad += tone(f, take, a)
        mix[pos : pos + take] += pad
        pos += take
        i += 1
    # very quiet high shimmer
    t = np.arange(n) / SR
    shimmer = 0.012 * np.sin(2 * math.pi * 523.25 * t) * (0.5 + 0.5 * np.sin(2 * math.pi * 0.07 * t))
    mix += shimmer
    # gentle low rumble
    mix += 0.04 * np.sin(2 * math.pi * 65.41 * t)
    # normalize quietly
    peak = np.max(np.abs(mix)) or 1.0
    mix = mix / peak * 0.28
    pcm = (mix * 32767).astype(np.int16)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print("wrote", OUT, OUT.stat().st_size)


if __name__ == "__main__":
    main()
