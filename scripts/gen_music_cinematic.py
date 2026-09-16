#!/usr/bin/env python3
"""Cinematic lo-fi tech bed: pads, soft kick, low bass. Original."""
from __future__ import annotations

import math
import wave
from pathlib import Path

import numpy as np

OUT = Path("/workspace/artifacts/film/music-cinematic.wav")
CLICK = Path("/workspace/artifacts/film/click.wav")
SR = 44100
SECONDS = 130
BPM = 88


def main() -> None:
    n = SR * SECONDS
    t = np.arange(n) / SR
    mix = np.zeros(n, dtype=np.float64)

    # pads
    chords = [
        (65.41, 98.00, 130.81, 196.00),
        (73.42, 110.00, 146.83, 220.00),
        (82.41, 123.47, 164.81, 246.94),
        (73.42, 110.00, 174.61, 220.00),
    ]
    chord_len = int(4 * 60 / BPM * SR)
    pos = 0
    i = 0
    while pos < n:
        take = min(chord_len, n - pos)
        tt = np.arange(take) / SR
        fade = np.minimum(tt * 3, 1.0) * np.minimum((take / SR - tt) * 2.2, 1.0)
        pad = np.zeros(take)
        for f, a in zip(chords[i % 4], (0.16, 0.10, 0.08, 0.05)):
            pad += np.sin(2 * math.pi * f * tt) * a
            pad += np.sin(2 * math.pi * f * 1.004 * tt) * a * 0.4
        mix[pos : pos + take] += pad * fade
        pos += take
        i += 1

    # kick every beat, quiet
    beat = 60 / BPM
    kick_n = int(0.18 * SR)
    kt = np.arange(kick_n) / SR
    kick = np.sin(2 * math.pi * (70 * np.exp(-kt * 18)) * kt) * np.exp(-kt * 14)
    b = 0.0
    while b < SECONDS:
        s = int(b * SR)
        e = min(s + kick_n, n)
        mix[s:e] += kick[: e - s] * 0.22
        b += beat

    # hi hat whisper
    hat = np.random.default_rng(3).standard_normal(int(0.04 * SR)) * np.linspace(1, 0, int(0.04 * SR))
    b = beat / 2
    while b < SECONDS:
        s = int(b * SR)
        e = min(s + len(hat), n)
        mix[s:e] += hat[: e - s] * 0.03
        b += beat

    # click SFX
    cn = int(0.09 * SR)
    ct = np.arange(cn) / SR
    click = np.sin(2 * math.pi * 2400 * ct) * np.exp(-ct * 80)
    click += np.sin(2 * math.pi * 900 * ct) * np.exp(-ct * 50) * 0.4
    click = (click / (np.max(np.abs(click)) or 1) * 0.5 * 32767).astype(np.int16)

    peak = np.max(np.abs(mix)) or 1
    mix = mix / peak * 0.34
    pcm = (mix * 32767).astype(np.int16)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    with wave.open(str(CLICK), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(click.tobytes())
    print("wrote", OUT, CLICK)


if __name__ == "__main__":
    main()
