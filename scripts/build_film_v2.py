#!/usr/bin/env python3
"""Light-skin Stacks explainer with a moving mouse cursor."""

from __future__ import annotations

import json
import math
import subprocess
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/workspace/artifacts/film")
CLIPS = ROOT / "clips2"
PUBLIC = Path("/workspace/public/video")
W, H, FPS = 1920, 1080, 24
MINT = (232, 238, 234)
FG = (16, 20, 18)
GREEN = (0, 135, 81)
MUTED = (74, 85, 80)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
VOICE = ROOT / "voice-v3.mp3"
ASS = ROOT / "captions-v2.ass"

CLIPS.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)


def F(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT if bold else FONT_R, size)


def cursor_png() -> Path:
    p = ROOT / "cursor.png"
    im = Image.new("RGBA", (42, 52), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pts = [(2, 2), (2, 40), (12, 32), (20, 50), (26, 47), (18, 30), (36, 30)]
    d.polygon(pts, fill=(255, 255, 255, 255), outline=(10, 14, 12, 255))
    d.line(pts + [pts[0]], fill=(10, 14, 12, 255), width=2)
    im.save(p)
    return p


def still_intro() -> Path:
    im = Image.new("RGB", (W, H), MINT)
    d = ImageDraw.Draw(im)
    founder = Image.open("/workspace/public/founder.png").convert("RGBA")
    fh = 980
    fw = int(founder.width * fh / founder.height)
    founder = founder.resize((fw, fh), Image.Resampling.LANCZOS)
    im.paste(founder, (W - fw + 40, 80), founder)
    d.text((96, 160), "STACKS", font=F(22), fill=GREEN)
    d.multiline_text((96, 210), "Hello.\nWelcome to Stacks.", font=F(72), fill=FG, spacing=8)
    d.text((96, 430), "High-level production. Web apps, plugins, tools.", font=F(26, False), fill=MUTED)
    path = ROOT / "stills" / "v2-intro.jpg"
    path.parent.mkdir(exist_ok=True)
    im.save(path, quality=92)
    return path


def still_close() -> Path:
    im = Image.new("RGB", (W, H), MINT)
    d = ImageDraw.Draw(im)
    founder = Image.open("/workspace/public/founder.png").convert("RGBA")
    fh = 980
    fw = int(founder.width * fh / founder.height)
    founder = founder.resize((fw, fh), Image.Resampling.LANCZOS)
    im.paste(founder, (W - fw + 40, 90), founder)
    d.text((96, 280), "STACKS.NG", font=F(22), fill=GREEN)
    d.multiline_text((96, 330), "Built in Nigeria.\nShipped on stacks.ng.", font=F(64), fill=FG, spacing=8)
    d.text((96, 540), "Use with care.", font=F(26, False), fill=MUTED)
    path = ROOT / "stills" / "v2-close.jpg"
    im.save(path, quality=92)
    return path


def still_studio() -> Path:
    im = Image.new("RGB", (W, H), MINT)
    d = ImageDraw.Draw(im)
    d.text((96, 200), "STUDIO", font=F(22), fill=GREEN)
    d.multiline_text((96, 250), "The vault behind\nthe library.", font=F(64), fill=FG, spacing=8)
    for i, line in enumerate(
        ["Upload an app and a thumbnail", "Write the tool prompt", "Add API keys", "Keys never leave the server"]
    ):
        y = 560 + i * 70
        d.ellipse((100, y + 10, 118, y + 28), fill=GREEN)
        d.text((140, y), line, font=F(32, False), fill=FG)
    path = ROOT / "stills" / "v2-studio.jpg"
    im.save(path, quality=92)
    return path


def kenburns(src: Path, dest: Path, seconds: float, pan: str = "center") -> None:
    frames = max(int(seconds * FPS), 2)
    x = "'iw/2-(iw/zoom/2)'"
    y = "'ih/2-(ih/zoom/2)'"
    if pan == "right":
        x = "'iw*0.18-(iw/zoom-iw)/2'"
    elif pan == "left":
        x = "'iw*0.04'"
    vf = (
        f"scale=2200:1238,zoompan=z='min(1.0+0.0004*on,1.06)':x={x}:y={y}:"
        f"d={frames}:s={W}x{H}:fps={FPS},format=yuv420p"
    )
    subprocess.check_call(
        [
            "ffmpeg", "-y", "-loop", "1", "-i", str(src), "-vf", vf,
            "-t", f"{seconds:.3f}", "-r", str(FPS), "-c:v", "libx264",
            "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "veryfast", "-an", str(dest),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def cursor_clip(src: Path, dest: Path, seconds: float, x0: int, y0: int, x1: int, y1: int) -> None:
    cur = cursor_png()
    # cover 1920x1080
    subprocess.check_call(
        [
            "ffmpeg", "-y",
            "-loop", "1", "-i", str(src),
            "-loop", "1", "-i", str(cur),
            "-filter_complex",
            (
                f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
                f"format=yuv420p[bg];"
                f"[1:v]format=rgba[cur];"
                f"[bg][cur]overlay=x='{x0}+({x1}-{x0})*t/{seconds:.3f}':"
                f"y='{y0}+({y1}-{y0})*t/{seconds:.3f}':shortest=1"
            ),
            "-t", f"{seconds:.3f}", "-r", str(FPS),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
            "-preset", "veryfast", "-an", str(dest),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def build_subtitles() -> Path:
    data = json.loads((ROOT / "voice-v3.timestamps.json").read_text())
    chars, times = data["graph_chars"], data["graph_times"]
    chunks: list[tuple[float, float, str]] = []
    buf = ""
    start = times[0][0]
    for i, ch in enumerate(chars):
        buf += ch
        words = buf.strip().split()
        if (ch in ".!?" or ch == "\n") and len(words) >= 2:
            t0, t1 = start, times[i][1]
            line = " ".join(buf.split())
            if line:
                chunks.append((t0, t1, line))
            buf = ""
            if i + 1 < len(times):
                start = times[i + 1][0]
    if buf.strip():
        chunks.append((start, times[-1][1], " ".join(buf.split())))

    def ts(sec: float) -> str:
        h = int(sec // 3600)
        m = int((sec % 3600) // 60)
        s = int(sec % 60)
        cs = int((sec - math.floor(sec)) * 100)
        return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

    header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Alignment, MarginL, MarginR, MarginV, BorderStyle, Outline, Shadow, Encoding
Style: Cap, DejaVu Sans, 34, &H00141210, &H00FFFFFF, &H00D8E4DC, 0, 2, 70, 70, 48, 1, 0, 0, 1

[Events]
Format: Layer, Start, End, Style, Text
"""
    # VO is delayed 4s by the title hold
    offset = 4.0
    events = []
    for t0, t1, line in chunks:
        wrapped = textwrap.fill(line, width=46).replace("\n", r"\N")
        events.append(f"Dialogue: 0,{ts(t0+offset)},{ts(max(t1, t0+0.7)+offset)},Cap,{wrapped}")
    ASS.write_text(header + "\n".join(events) + "\n")
    return ASS


def concat_mix(clips: list[Path]) -> None:
    lst = ROOT / "concat2.txt"
    lst.write_text("".join(f"file '{c}'\n" for c in clips))
    raw = CLIPS / "raw.mp4"
    subprocess.check_call(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(raw)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    out = PUBLIC / "stacks-in-action.mp4"
    subprocess.check_call(
        [
            "ffmpeg", "-y", "-i", str(raw), "-i", str(VOICE),
            "-f", "lavfi", "-i", "anoisesrc=color=brown:amplitude=0.008:sample_rate=24000",
            "-filter_complex",
            (
                f"[0:v]ass=captions-v2.ass:fontsdir=/usr/share/fonts/truetype/dejavu[v];"
                f"[1:a]adelay=4000|4000,apad=pad_dur=8[vo];"
                f"[2:a]volume=0.12,afade=t=in:st=0:d=1,afade=t=out:st=112:d=6[bed];"
                f"[vo][bed]amix=inputs=2:duration=first:dropout_transition=2[a]"
            ),
            "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium",
            "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-shortest",
            str(out),
        ],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, cwd=str(ROOT),
    )
    print("wrote", out, out.stat().st_size)


def main() -> None:
    intro = still_intro()
    close = still_close()
    studio = still_studio()
    home, apps, tools, work = (
        ROOT / "shot-home.png",
        ROOT / "shot-apps.png",
        ROOT / "shot-tools.png",
        ROOT / "shot-workspace.png",
    )

    shots: list[Path] = []
    print("title")
    kenburns(intro, CLIPS / "a.mp4", 8.0, "right")
    shots.append(CLIPS / "a.mp4")
    print("founder")
    kenburns(intro, CLIPS / "b.mp4", 31.0, "right")
    shots.append(CLIPS / "b.mp4")
    print("home cursor")
    cursor_clip(home, CLIPS / "c.mp4", 12.0, 220, 620, 430, 430)
    shots.append(CLIPS / "c.mp4")
    print("apps cursor")
    cursor_clip(apps, CLIPS / "d.mp4", 17.0, 180, 520, 980, 640)
    shots.append(CLIPS / "d.mp4")
    print("tools cursor")
    cursor_clip(tools, CLIPS / "e.mp4", 12.0, 640, 280, 900, 520)
    shots.append(CLIPS / "e.mp4")
    print("workspace cursor")
    cursor_clip(work, CLIPS / "f.mp4", 17.0, 400, 520, 860, 640)
    shots.append(CLIPS / "f.mp4")
    print("studio")
    kenburns(studio, CLIPS / "g.mp4", 14.0, "left")
    shots.append(CLIPS / "g.mp4")
    print("close")
    kenburns(close, CLIPS / "h.mp4", 18.0, "right")
    shots.append(CLIPS / "h.mp4")

    build_subtitles()
    concat_mix(shots)
    Image.open(intro).resize((W, H)).save(PUBLIC / "poster.jpg", quality=90)
    kenburns(intro, PUBLIC / "preview-loop.mp4", 8.0, "right")


if __name__ == "__main__":
    main()
