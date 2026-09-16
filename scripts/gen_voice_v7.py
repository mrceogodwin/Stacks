#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import json
from pathlib import Path

import edge_tts

ROOT = Path("/workspace/artifacts/film")
TEXT = """Welcome to Stacks. A production house for web apps, plugins, and tools, built in Nigeria for companies and businesses that need software that actually works.

This is the home of Stacks. Explore Apps opens the gallery of live products. Explore tools opens a library of more than five hundred tools for writing, images, video, marketing, and SEO.

Inside Apps I Built, every card is a real product. Click one. You get the story, a how-it-works film, a share link, and a download. Share it with a client. Download it. Send the link.

Now the tool library. Type in search, then filter. Writing. Image. Video. SEO. Pick any tool and run it.

The workspace is where the work finishes. Text downloads as PDF, TXT, HTML, or a Word document. Images download as pictures. Video downloads as MP4. Copy the result, share it, save it, or regenerate another version. Eight actions on every tool.

Writing tools draft emails, captions, and reports. Image tools build product photos and graphics. Video tools produce clips you can ship. SEO tools help pages get found. The library keeps growing, so teams can solve more of the work in one place.

When a new app goes live, the updates list is how people hear about it. Leave an email. No spam. Just the product, as it ships.

Stacks is built for companies and small businesses that need solutions, not demos. Products that work in real life. Tools that save time. A catalog that keeps expanding.

Use Stacks with care. By visiting, downloading, or using anything here, including stacks.ng, you agree to the terms and the policy. Do not paste passwords, keys, or other people's personal data into tools.

Stacks. Built in Nigeria. Shipped on stacks.ng. Explore the apps. Explore the tools.
"""


async def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    communicate = edge_tts.Communicate(
        TEXT.strip(),
        "en-US-JennyNeural",
        rate="+6%",
        pitch="+0Hz",
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
    mp3 = ROOT / "voice-v7.mp3"
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
    (ROOT / "voice-v7.timestamps.json").write_text(
        json.dumps({"graph_chars": chars, "graph_times": times, "duration": duration, "words": words})
    )
    print("wrote", mp3, "duration", round(duration, 2), "words", len(words))


if __name__ == "__main__":
    asyncio.run(main())
