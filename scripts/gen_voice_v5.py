#!/usr/bin/env python3
"""Nigerian English narration (Abeo) + word timestamps for the Stacks film."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

import edge_tts

ROOT = Path("/workspace/artifacts/film")
TEXT = """Hello. Welcome to Stacks. This is a high-level production house for web apps, plugins, and tools. We build here in Nigeria, for companies and businesses that need solutions that actually work.

My name is Godwin. For months I have been vibe-coding with discipline. Prompt engineering. Testing. Building. Super focused. Dedicated. I test every app myself, one after the other, before it lands on this platform.

The reason is simple. Companies have real problems. Small businesses have real problems. We solve them by building products that work, not demos that look nice and fail in real life.

This is the home. The first thing you see is Explore Apps. That takes you into the gallery of everything I built. Explore tools opens the five hundred plus library.

Let us go into Apps I Built. Each card is a real product. Not a mock. Click one. Inside, you get the story. You get a how-it-works video. You get a share link, so other people can come and download it. And you get a download button.

That is how the gallery is meant to work. Share it. Download it. Send the link.

Now the tool library. Type in search. Filter by writing, image, video, or SEO. Pick any tool. Run it. When the result comes out as text, download it as PDF, as TXT, as HTML, or as a Word document. If it is an image, you download the picture. If it is a video, you download the MP4. Copy it. Share it. Save it. Regenerate if you want another version.

Eight actions on every tool. That is the workspace.

No app is perfect. By downloading and using anything on Stacks, you agree to the terms. Use it wisely. I built these to help, but you remain responsible for how you use the output.

Stacks. Built in Nigeria. Shipped on stacks.ng. Explore the apps. Explore the tools. Thank you.
"""


async def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    communicate = edge_tts.Communicate(TEXT.strip(), "en-NG-AbeoNeural", rate="-6%", boundary="WordBoundary")
    audio = bytearray()
    words: list[tuple[str, float, float]] = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            start = chunk["offset"] / 10_000_000
            end = start + chunk["duration"] / 10_000_000
            words.append((chunk["text"], start, end))
    mp3 = ROOT / "voice-v5.mp3"
    mp3.write_bytes(bytes(audio))
    chars: list[str] = []
    times: list[list[float]] = []
    for i, (word, a, b) in enumerate(words):
        # edge-tts words often include trailing space/punct already
        w = word
        if i and not chars[-1].isspace() and not w.startswith((" ", ".", ",", "!", "?")):
            chars.append(" ")
            gap_s = times[-1][1]
            times.append([gap_s, a])
        n = max(len(w), 1)
        step = (b - a) / n
        for j, ch in enumerate(w):
            chars.append(ch)
            times.append([a + j * step, a + (j + 1) * step])
    duration = times[-1][1] if times else 0
    (ROOT / "voice-v5.timestamps.json").write_text(
        json.dumps({"graph_chars": chars, "graph_times": times, "duration": duration, "words": words})
    )
    print("wrote", mp3, "duration", round(duration, 2), "words", len(words))


if __name__ == "__main__":
    asyncio.run(main())
