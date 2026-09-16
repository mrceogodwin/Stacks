#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import json
from pathlib import Path

import edge_tts

ROOT = Path("/workspace/artifacts/film")
TEXT = """From concept to deployment. Welcome to Stacks. One central hub for everything we build.

Meet Stacks. One place for web apps, plugins, and tools. Built in Nigeria. Shipped for companies, businesses, and people who need software that actually works.

Explore our custom web applications. NaijaMovies. Pablo AI. The AI Email Writer. And many more on the way. Every card is a real product, with a preview of how it works.

This is the apps and ecosystem. Engineered for scale and seamless performance. We never stop building solutions for everyday business, companies, and people.

Powered by a library of over five hundred developer tools. Writing. Images. Video. Marketing. SEO. Search, filter, and run.

The workspace is where the work finishes. High quality output you can download as PDF, TXT, HTML, Word, PNG, or MP4. Copy it. Share it. Save it. Or generate it again.

An integrated control layer manages prompt engines and API infrastructure, so the results stay production ready.

Stop building in silos. One showroom. One library. One workflow. From idea to something you can ship.

Streamline your workflow, and see Stacks in action today at stacks.ng. Explore the apps. Explore the tools.
"""


async def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    communicate = edge_tts.Communicate(
        TEXT.strip(),
        "en-US-GuyNeural",
        rate="-8%",
        pitch="-3Hz",
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
    mp3 = ROOT / "voice-cinematic.mp3"
    mp3.write_bytes(bytes(audio))
    duration = words[-1][2] if words else 0
    (ROOT / "voice-cinematic.json").write_text(
        json.dumps({"words": words, "duration": duration})
    )
    print("wrote", mp3, "duration", round(duration, 2), "words", len(words))


if __name__ == "__main__":
    asyncio.run(main())
