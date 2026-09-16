#!/usr/bin/env python3
"""Directed Stacks walkthrough: Nigerian English VO + accurate cursor."""

from __future__ import annotations

import json
import math
import subprocess
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/workspace/artifacts/film")
CLIPS = ROOT / "clips3"
PUBLIC = Path("/workspace/public/video")
W, H, FPS = 1920, 1080, 24
SX, SY = 1920 / 1280, 1080 / 720
MINT = (232, 238, 234)
FG = (16, 20, 18)
GREEN = (0, 135, 81)
MUTED = (74, 85, 80)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
VOICE = ROOT / "voice-ng.mp3"
ASS = ROOT / "captions-v3.ass"
CLIPS.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)


def px(x: float, y: float) -> tuple[int, int]:
    return int(x * SX), int(y * SY)


def F(size: int, bold: bool = True):
    return ImageFont.truetype(FONT if bold else FONT_R, size)


CUR = ROOT / "cursor.png"


def cursor_png() -> Path:
    if CUR.exists() and CUR.stat().st_size > 100:
        return CUR
    im = Image.new("RGBA", (44, 54), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pts = [(3, 3), (3, 42), (13, 33), (21, 52), (28, 49), (19, 31), (38, 31)]
    d.polygon(pts, fill=(255, 255, 255, 255))
    d.line(pts + [pts[0]], fill=(16, 20, 18, 255), width=2)
    im.save(CUR)
    return CUR


def still(path: Path, title: str, sub: str) -> Path:
    im = Image.new("RGB", (W, H), MINT)
    d = ImageDraw.Draw(im)
    founder = Image.open("/workspace/public/founder.png").convert("RGBA")
    fh = 980
    fw = int(founder.width * fh / founder.height)
    founder = founder.resize((fw, fh), Image.Resampling.LANCZOS)
    im.paste(founder, (W - fw + 60, 70), founder)
    d.text((96, 200), "STACKS", font=F(22), fill=GREEN)
    d.multiline_text((96, 250), title, font=F(64), fill=FG, spacing=10)
    d.text((96, 520), sub, font=F(26, False), fill=MUTED)
    path.parent.mkdir(exist_ok=True)
    im.save(path, quality=92)
    return path


def kenburns(src: Path, dest: Path, seconds: float) -> None:
    frames = max(int(seconds * FPS), 2)
    vf = (
        f"scale=2300:1294,zoompan=z='min(1.0+0.00035*on,1.05)':"
        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS},format=yuv420p"
    )
    subprocess.check_call(
        ["ffmpeg", "-y", "-loop", "1", "-i", str(src), "-vf", vf, "-t", f"{seconds:.3f}",
         "-r", str(FPS), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
         "-preset", "veryfast", "-an", str(dest)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def cursor_shot(src: Path, dest: Path, seconds: float, x0: int, y0: int, x1: int, y1: int, travel: float = 0.45) -> None:
    cur = cursor_png()
    travel = min(travel, max(0.2, seconds - 0.12))
    expr_x = f"if(lt(t,{travel:.3f}),{x0}+({x1}-{x0})*(pow(t/{travel:.3f}\\,0.7)),{x1})"
    expr_y = f"if(lt(t,{travel:.3f}),{y0}+({y1}-{y0})*(pow(t/{travel:.3f}\\,0.7)),{y1})"
    subprocess.check_call(
        [
            "ffmpeg", "-y",
            "-loop", "1", "-i", str(src),
            "-loop", "1", "-i", str(cur),
            "-filter_complex",
            (
                f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},format=yuv420p[bg];"
                f"[1:v]format=rgba[cur];"
                f"[bg][cur]overlay=x='{expr_x}':y='{expr_y}':shortest=1"
            ),
            "-t", f"{seconds:.3f}", "-r", str(FPS),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
            "-preset", "veryfast", "-an", str(dest),
        ],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def captions() -> Path:
    data = json.loads((ROOT / "voice-ng.timestamps.json").read_text())
    chars, times = data["graph_chars"], data["graph_times"]
    chunks: list[tuple[float, float, str]] = []
    buf, start = "", times[0][0]
    for i, ch in enumerate(chars):
        buf += ch
        words = buf.strip().split()
        if ch in ".!?" and len(words) >= 2:
            chunks.append((start, times[i][1], " ".join(buf.split())))
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

    body = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Alignment, MarginL, MarginR, MarginV, BorderStyle, Outline, Shadow, Encoding
Style: Cap, DejaVu Sans, 32, &H00141210, &H00FFFFFF, &H00D8E4DC, 0, 2, 80, 80, 42, 1, 0, 0, 1

[Events]
Format: Layer, Start, End, Style, Text
"""
    lines = []
    for t0, t1, line in chunks:
        wrapped = textwrap.fill(line, width=48).replace("\n", r"\N")
        lines.append(f"Dialogue: 0,{ts(t0)},{ts(max(t1, t0 + 0.6))},Cap,{wrapped}")
    ASS.write_text(body + "\n".join(lines) + "\n")
    return ASS


def concat_mix(clips: list[Path]) -> None:
    lst = ROOT / "concat3.txt"
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
            "-f", "lavfi", "-i", "anoisesrc=color=brown:amplitude=0.006:sample_rate=24000",
            "-filter_complex",
            (
                f"[0:v]ass={ASS.name}:fontsdir=/usr/share/fonts/truetype/dejavu[v];"
                f"[1:a]apad=pad_dur=2[vo];"
                f"[2:a]volume=0.1,afade=t=in:st=0:d=1,afade=t=out:st=116:d=4[bed];"
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
    intro = still(ROOT / "stills" / "ng-intro.jpg", "Hello.\nWelcome to Stacks.", "Built in Nigeria. Shipped on stacks.ng")
    close = still(ROOT / "stills" / "ng-close.jpg", "This is Stacks.", "Use with care.")
    studio = still(ROOT / "stills" / "ng-studio.jpg", "Studio.\nThe control room.", "Apps. Films. Keys. Prompts.")

    home, apps, tools, work, appd = (
        ROOT / "shot-home.png",
        ROOT / "shot-apps.png",
        ROOT / "shot-tools.png",
        ROOT / "shot-workspace.png",
        ROOT / "shot-app-detail.png",
    )

    explore = px(911, 38)
    naija, pablo, email = px(251, 336), px(640, 336), px(1029, 336)
    video, image, job = px(251, 527), px(640, 527), px(1029, 527)
    search, writing, imgf, vidf, seo = px(640, 256), px(366, 324), px(553, 324), px(630, 324), px(701, 324)
    first = px(251, 445)
    run, regen, dl, copy = px(409, 424), px(563, 424), px(717, 424), px(871, 424)
    share, save, fav, clear = px(409, 476), px(563, 476), px(717, 476), px(871, 476)
    adl, ashare = px(435, 388), px(640, 388)
    founder = px(776, 320)

    shots: list[Path] = []
    n = 0

    def add(fn, *a, **k):
        nonlocal n
        n += 1
        dest = CLIPS / f"{n:02d}.mp4"
        print(dest.name, a[-1] if a else "")
        fn(*a, dest=dest, **k) if False else None
        return dest

    # Use explicit calls
    kenburns(intro, CLIPS / "01.mp4", 15.98)
    kenburns(intro, CLIPS / "02.mp4", 27.38)  # 15.98 -> 43.36 vibe + showroom
    # home: 43.22-48.20 land + tap explore
    cursor_shot(home, CLIPS / "03.mp4", 5.0, *founder, *explore, travel=0.7)
    # apps cards 48.20-57.44
    cursor_shot(apps, CLIPS / "04.mp4", 2.1, *explore, *naija, travel=0.4)
    cursor_shot(apps, CLIPS / "05.mp4", 0.9, *naija, *pablo, travel=0.28)
    cursor_shot(apps, CLIPS / "06.mp4", 1.4, *pablo, *email, travel=0.3)
    cursor_shot(apps, CLIPS / "07.mp4", 1.8, *email, *video, travel=0.3)
    cursor_shot(apps, CLIPS / "08.mp4", 1.1, *video, *image, travel=0.25)
    cursor_shot(apps, CLIPS / "09.mp4", 1.1, *image, *job, travel=0.25)
    cursor_shot(apps, CLIPS / "10.mp4", 1.1, *job, *naija, travel=0.35)
    # download / share 57.44-62.33
    cursor_shot(appd, CLIPS / "11.mp4", 2.4, *adl, *adl, travel=0.2)
    cursor_shot(appd, CLIPS / "12.mp4", 2.5, *adl, *ashare, travel=0.35)
    # tools 62.33-72.10
    cursor_shot(tools, CLIPS / "13.mp4", 4.7, *search, *search, travel=0.2)
    cursor_shot(tools, CLIPS / "14.mp4", 0.8, *search, *writing, travel=0.25)
    cursor_shot(tools, CLIPS / "15.mp4", 0.65, *writing, *imgf, travel=0.2)
    cursor_shot(tools, CLIPS / "16.mp4", 0.75, *imgf, *vidf, travel=0.2)
    cursor_shot(tools, CLIPS / "17.mp4", 0.93, *vidf, *seo, travel=0.2)
    cursor_shot(tools, CLIPS / "18.mp4", 1.15, *seo, *first, travel=0.35)
    # workspace 72.10-83.51
    cursor_shot(work, CLIPS / "19.mp4", 2.93, *first, px(640, 336)[0], px(640, 336)[1], travel=0.4)
    cursor_shot(work, CLIPS / "20.mp4", 0.64, *run, *run, travel=0.15)
    cursor_shot(work, CLIPS / "21.mp4", 1.01, *run, *regen, travel=0.22)
    cursor_shot(work, CLIPS / "22.mp4", 1.34, *regen, *dl, travel=0.22)
    cursor_shot(work, CLIPS / "23.mp4", 0.71, *dl, *copy, travel=0.2)
    cursor_shot(work, CLIPS / "24.mp4", 0.62, *copy, *share, travel=0.2)
    cursor_shot(work, CLIPS / "25.mp4", 0.60, *share, *save, travel=0.18)
    cursor_shot(work, CLIPS / "26.mp4", 0.69, *save, *fav, travel=0.18)
    cursor_shot(work, CLIPS / "27.mp4", 0.73, *fav, *clear, travel=0.18)
    cursor_shot(work, CLIPS / "28.mp4", 2.14, *clear, *run, travel=0.4)
    kenburns(studio, CLIPS / "29.mp4", 14.33)
    kenburns(close, CLIPS / "30.mp4", 20.5)

    files = sorted(CLIPS.glob("*.mp4"))
    captions()
    concat_mix(files)
    Image.open(intro).save(PUBLIC / "poster.jpg", quality=90)
    kenburns(intro, PUBLIC / "preview-loop.mp4", 6.0)


if __name__ == "__main__":
    main()
