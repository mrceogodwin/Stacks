#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import json
from pathlib import Path

import edge_tts

ROOT = Path("/workspace/artifacts/film")
TEXT = """Hello, and welcome to Stacks. This is a high-level production house for web apps, plugins, and tools, built here in Nigeria for companies and businesses that need solutions that actually work.

My name is Godwin. For months I have been vibe-coding with real discipline. Prompt engineering, testing, and building. Super focused. Dedicated. I check every app myself before it lands on this platform.

The reason is simple. Companies have real problems, and small businesses have real problems. We solve them by building products that work, not demos that look nice and fail in real life.

This is the home of Stacks. The first thing you see is Explore Apps, and that takes you into the gallery of everything I have built. Explore tools opens the five hundred plus library.

Let us go into Apps I Built. Each card is a real product, not a mock. When you click one, you get the story, a how-it-works video, a share link so other people can come and download it, and a download button. That is how the gallery is meant to work. Share it, download it, send the link.

Now the tool library. Type in search, then filter by writing, image, video, or SEO. Pick any tool and run it. When the result comes out as text, you can download it as PDF, TXT, HTML, or a Word document. If it is an image, you download the picture. If it is a video, you download the MP4. You can copy it, share it, save it, or regenerate another version. Eight actions on every tool. That is the workspace.

If you want to know when I ship a new app, there is a subscribe section on the site. Leave your email, and I will keep you updated.

No app is perfect. By visiting, downloading, or using anything on Stacks, including stacks.ng, you agree to the terms and the policy. Use it wisely. I built these to help, but you remain responsible for how you use the output. Do not paste passwords, keys, or other people's personal data into the tools.

Stacks. Built in Nigeria. Shipped on stacks.ng. Explore the apps, explore the tools, and thank you for being here.
"""


async def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    communicate = edge_tts.Communicate(
        TEXT.strip(),
        "en-NG-AbeoNeural",
        rate="+10%",
        pitch="-1Hz",
        boundary="WordBoundary",
    )
    audio = bytearray()
    words: list[tuple[str, float, float]] = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            start = chunk["offset"] / 10_000_000
            end = start + chunk["duration"] / 10_000_000
            words.append((chunk["text"], start, end))
    mp3 = ROOT / "voice-v6.mp3"
    mp3.write_bytes(bytes(audio))
    chars: list[str] = []
    times: list[list[float]] = []
    for i, (word, a, b) in enumerate(words):
        w = word
        if i and not chars[-1].isspace() and not w.startswith((" ", ".", ",", "!", "?")):
            chars.append(" ")
            times.append([times[-1][1], a])
        n = max(len(w), 1)
        step = (b - a) / n
        for j, ch in enumerate(w):
            chars.append(ch)
            times.append([a + j * step, a + (j + 1) * step])
    duration = times[-1][1] if times else 0
    (ROOT / "voice-v6.timestamps.json").write_text(
        json.dumps({"graph_chars": chars, "graph_times": times, "duration": duration, "words": words})
    )
    print("wrote", mp3, "duration", round(duration, 2), "words", len(words))


if __name__ == "__main__":
    asyncio.run(main())
