#!/usr/bin/env python3
"""Stacks film v5: new PNG, Nigerian Abeo voice, no admin talk."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path("/workspace/artifacts/film")
SHOT = ROOT / "shots4"
CLIPS = ROOT / "clips5"
PUBLIC = Path("/workspace/public/video")
PNG = Path("/workspace/public/founder.png")
VOICE = ROOT / "voice-v5.mp3"
TS = ROOT / "voice-v5.timestamps.json"
ASS = ROOT / "captions-v5.ass"
W, H, FPS = 1920, 1080, 24
SX, SY = 1920 / 1280, 1080 / 720
BG = (8, 12, 12)
FG = (242, 244, 243)
GREEN = (46, 229, 157)
MUTED = (154, 161, 158)
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
CLIPS.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)
FFMPEG = "/usr/local/bin/ffmpeg"


def px(x: float, y: float) -> tuple[int, int]:
    return int(x * SX), int(y * SY)


def F(size: int, bold: bool = True):
    return ImageFont.truetype(FONT_B if bold else FONT_R, size)


def cursor_png() -> Path:
    dest = CLIPS / "cursor.png"
    if dest.exists() and dest.stat().st_size > 200:
        return dest
    im = Image.new("RGBA", (48, 58), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pts = [(4, 4), (4, 46), (14, 36), (22, 56), (30, 52), (21, 34), (42, 34)]
    d.polygon(pts, fill=(255, 255, 255, 255))
    d.line(pts + [pts[0]], fill=(16, 20, 18, 255), width=2)
    im.save(dest)
    return dest


def still(path: Path, title: str, sub: str) -> Path:
    im = Image.new("RGB", (W, H), BG)
    glow = Image.new("RGB", (W, H), BG)
    gd = ImageDraw.Draw(glow)
    gd.ellipse((900, -160, 2100, 900), fill=(0, 70, 48))
    im = Image.blend(im, glow.filter(ImageFilter.GaussianBlur(100)), 0.55)
    founder = Image.open(PNG).convert("RGBA")
    fh = H
    fw = int(founder.width * fh / founder.height)
    founder = founder.resize((fw, fh), Image.Resampling.LANCZOS)
    # clip any leftover fringe by not letting the image hang past the frame
    x = W - fw + 18
    y = 0
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.paste(founder, (x, y), founder)
    im = Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB")
    d = ImageDraw.Draw(im)
    d.text((88, 188), "STACKS", font=F(22), fill=GREEN)
    d.multiline_text((88, 236), title, font=F(62), fill=FG, spacing=8)
    d.multiline_text((88, 520), sub, font=F(26, False), fill=MUTED, spacing=8)
    path.parent.mkdir(exist_ok=True)
    im.save(path, quality=94)
    return path


def kenburns(src: Path, dest: Path, seconds: float) -> None:
    frames = max(int(seconds * FPS), 2)
    vf = (
        f"scale=2200:1238,zoompan=z='min(1.0+0.00022*on,1.035)':"
        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS},format=yuv420p"
    )
    subprocess.check_call(
        [
            FFMPEG, "-y", "-loop", "1", "-i", str(src), "-vf", vf, "-t", f"{seconds:.3f}",
            "-r", str(FPS), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
            "-preset", "veryfast", "-an", str(dest),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def cursor_shot(src: Path, dest: Path, seconds: float, x0: int, y0: int, x1: int, y1: int, travel: float = 0.4) -> None:
    cur = cursor_png()
    travel = min(travel, max(0.18, seconds - 0.12))
    expr_x = f"if(lt(t,{travel:.3f}),{x0}+({x1}-{x0})*(pow(t/{travel:.3f}\\,0.7)),{x1})"
    expr_y = f"if(lt(t,{travel:.3f}),{y0}+({y1}-{y0})*(pow(t/{travel:.3f}\\,0.7)),{y1})"
    subprocess.check_call(
        [
            FFMPEG, "-y",
            "-loop", "1", "-i", str(src),
            "-loop", "1", "-i", str(cur),
            "-filter_complex",
            (
                f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},format=yuv420p[bg];"
                f"[1:v]format=rgba,scale=66:80[cur];"
                f"[bg][cur]overlay=x='{expr_x}':y='{expr_y}':shortest=1"
            ),
            "-t", f"{seconds:.3f}", "-r", str(FPS),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
            "-preset", "veryfast", "-an", str(dest),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def captions() -> Path:
    data = json.loads(TS.read_text())
    chars, times = data["graph_chars"], data["graph_times"]
    text = "".join(chars) if isinstance(chars, list) else chars
    chunks: list[tuple[float, float, str]] = []
    buf, start = "", times[0][0]
    for i, ch in enumerate(text):
        buf += ch
        nxt = text[i + 1] if i + 1 < len(text) else ""
        end_sent = ch in ".!?" and not (ch == "." and nxt.isalnum())
        words = buf.strip().split()
        if end_sent and len(words) >= 2:
            chunks.append((start, times[i][1], " ".join(buf.split())))
            buf = ""
            if i + 1 < len(times):
                start = times[i + 1][0]
        elif len(words) >= 9 and ch == " ":
            chunks.append((start, times[i][1], " ".join(buf.split())))
            buf = ""
            if i + 1 < len(times):
                start = times[i + 1][0]
    if buf.strip():
        chunks.append((start, times[-1][1], " ".join(buf.split())))

    def ts(t: float) -> str:
        h = int(t // 3600)
        m = int((t % 3600) // 60)
        s = t % 60
        return f"{h}:{m:02d}:{s:05.2f}"

    lines = [
        "[Script Info]",
        "ScriptType: v4.00+",
        "PlayResX: 1920",
        "PlayResY: 1080",
        "WrapStyle: 2",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding",
        "Style: Default,DejaVu Sans,42,&H00FFFFFF,&H000000FF,&H00080C0C,&H88000000,0,0,0,0,100,100,0,0,1,2,0,2,80,80,54,1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    last_end = 0.0
    for a, b, msg in chunks:
        a = max(a, last_end + 0.02)
        if b <= a:
            b = a + 0.8
        last_end = b
        safe = msg.replace("\n", " ").replace("{", "(").replace("}", ")")
        lines.append(f"Dialogue: 0,{ts(a)},{ts(b)},Default,,0,0,0,,{safe}")
    ASS.write_text("\n".join(lines))
    return ASS


def concat(files: list[Path], dest: Path) -> None:
    lst = CLIPS / "list.txt"
    lst.write_text("".join(f"file '{p}'\n" for p in files))
    subprocess.check_call(
        [FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(dest)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def mux(video: Path, audio: Path, ass: Path, dest: Path) -> None:
    subprocess.check_call(
        [
            FFMPEG, "-y", "-i", str(video), "-i", str(audio),
            "-vf", f"ass={ass}",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "fast",
            "-c:a", "aac", "-b:a", "192k",
            "-shortest",
            str(dest),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def main() -> None:
    home, apps, detail = SHOT / "home.png", SHOT / "apps.png", SHOT / "app-detail.png"
    tools, writing = SHOT / "tools.png", SHOT / "tools-writing.png"
    formats = SHOT / "workspace-formats.png"

    intro = still(ROOT / "stills" / "v5-intro.jpg", "Hello.\nWelcome to Stacks.", "High-level production. Web apps, plugins, tools.")
    focus = still(ROOT / "stills" / "v5-focus.jpg", "Vibe-coding.\nWith discipline.", "Prompt engineering. Testing. Building.")
    reason = still(ROOT / "stills" / "v5-reason.jpg", "Real problems.\nReal products.", "For companies and businesses that need solutions that work.")
    terms = still(ROOT / "stills" / "v5-terms.jpg", "No app is\nperfect.", "By downloading and using Stacks, you agree to the terms.")
    outro = still(ROOT / "stills" / "v5-outro.jpg", "Built in Nigeria.\nShipped on stacks.ng", "Explore the apps. Explore the tools.")
    Image.open(intro).save(PUBLIC / "poster.jpg", quality=92)

    explore = px(142, 483)
    etools = px(299, 483)
    naija = px(251, 337)
    pablo = px(640, 337)
    email = px(1029, 337)
    dl = px(435, 388)
    share = px(640, 388)
    openb = px(845, 388)
    search = px(640, 257)
    writing_chip = px(366, 325)
    image_chip = px(553, 325)
    video_chip = px(630, 325)
    seo_chip = px(701, 325)
    first = px(251, 445)
    run = px(409, 216)
    regen = px(563, 216)
    dlt = px(717, 216)
    copy = px(871, 216)
    txt = px(373, 540)
    pdf = px(454, 540)
    html = px(541, 540)

    # start times from Abeo word list
    marks = [
        ("intro", 0.00, 15.21),
        ("focus", 15.21, 35.07),
        ("reason", 35.07, 48.98),
        ("home-explore", 48.98, 57.43),
        ("home-tools", 57.43, 61.22),
        ("apps-enter", 61.22, 66.65),
        ("apps-cards", 66.65, 68.40),
        ("click", 68.40, 69.93),
        ("story", 69.93, 72.65),
        ("how", 72.65, 75.20),
        ("share", 75.20, 79.63),
        ("download", 79.63, 82.17),
        ("gallery", 82.17, 85.20),
        ("share2", 85.20, 86.78),
        ("dl2", 86.78, 88.56),
        ("send", 88.56, 90.39),
        ("tools", 90.39, 92.61),
        ("search", 92.61, 94.45),
        ("filter-w", 94.45, 95.84),
        ("filter-i", 95.84, 96.48),
        ("filter-v", 96.48, 97.10),
        ("filter-s", 97.10, 98.78),
        ("pick", 98.78, 100.54),
        ("run", 100.54, 102.07),
        ("result", 102.07, 104.19),
        ("pdf", 104.19, 105.70),
        ("txt", 105.70, 106.82),
        ("html", 106.82, 108.01),
        ("doc", 108.01, 110.25),
        ("img", 110.25, 113.67),
        ("mp4", 113.67, 117.37),
        ("copy", 117.37, 119.03),
        ("share-t", 119.03, 120.61),
        ("save", 120.61, 122.18),
        ("regen", 122.18, 125.15),
        ("eight", 125.15, 129.87),
        ("terms", 129.87, 144.04),
        ("outro", 144.04, 156.20),
    ]

    builders = {
        "intro": lambda d, s: kenburns(intro, d, s),
        "focus": lambda d, s: kenburns(focus, d, s),
        "reason": lambda d, s: kenburns(reason, d, s),
        "home-explore": lambda d, s: cursor_shot(home, d, s, *px(940, 297), *explore, 0.55),
        "home-tools": lambda d, s: cursor_shot(home, d, s, *explore, *etools, 0.35),
        "apps-enter": lambda d, s: cursor_shot(apps, d, s, *etools, *naija, 0.45),
        "apps-cards": lambda d, s: cursor_shot(apps, d, s, *naija, *pablo, 0.4),
        "click": lambda d, s: cursor_shot(apps, d, s, *pablo, *naija, 0.35),
        "story": lambda d, s: cursor_shot(detail, d, s, *dl, *dl, 0.2),
        "how": lambda d, s: cursor_shot(detail, d, s, *dl, *openb, 0.35),
        "share": lambda d, s: cursor_shot(detail, d, s, *openb, *share, 0.35),
        "download": lambda d, s: cursor_shot(detail, d, s, *share, *dl, 0.3),
        "gallery": lambda d, s: cursor_shot(detail, d, s, *dl, *share, 0.28),
        "share2": lambda d, s: cursor_shot(detail, d, s, *share, *share, 0.15),
        "dl2": lambda d, s: cursor_shot(detail, d, s, *share, *dl, 0.28),
        "send": lambda d, s: cursor_shot(detail, d, s, *dl, *share, 0.25),
        "tools": lambda d, s: cursor_shot(tools, d, s, *search, *search, 0.2),
        "search": lambda d, s: cursor_shot(tools, d, s, *search, *search, 0.15),
        "filter-w": lambda d, s: cursor_shot(tools, d, s, *search, *writing_chip, 0.28),
        "filter-i": lambda d, s: cursor_shot(tools, d, s, *writing_chip, *image_chip, 0.2),
        "filter-v": lambda d, s: cursor_shot(tools, d, s, *image_chip, *video_chip, 0.18),
        "filter-s": lambda d, s: cursor_shot(tools, d, s, *video_chip, *seo_chip, 0.2),
        "pick": lambda d, s: cursor_shot(writing, d, s, *seo_chip, *first, 0.35),
        "run": lambda d, s: cursor_shot(formats, d, s, *run, *run, 0.2),
        "result": lambda d, s: cursor_shot(formats, d, s, *run, *pdf, 0.3),
        "pdf": lambda d, s: cursor_shot(formats, d, s, *pdf, *pdf, 0.15),
        "txt": lambda d, s: cursor_shot(formats, d, s, *pdf, *txt, 0.22),
        "html": lambda d, s: cursor_shot(formats, d, s, *txt, *html, 0.22),
        "doc": lambda d, s: cursor_shot(formats, d, s, *html, *copy, 0.28),
        "img": lambda d, s: cursor_shot(formats, d, s, *copy, *dlt, 0.3),
        "mp4": lambda d, s: cursor_shot(formats, d, s, *dlt, *run, 0.3),
        "copy": lambda d, s: cursor_shot(formats, d, s, *copy, *copy, 0.15),
        "share-t": lambda d, s: cursor_shot(formats, d, s, *copy, *px(409, 268), 0.28),
        "save": lambda d, s: cursor_shot(formats, d, s, *px(409, 268), *px(563, 268), 0.25),
        "regen": lambda d, s: cursor_shot(formats, d, s, *px(563, 268), *regen, 0.3),
        "eight": lambda d, s: cursor_shot(formats, d, s, *regen, *run, 0.3),
        "terms": lambda d, s: kenburns(terms, d, s),
        "outro": lambda d, s: kenburns(outro, d, s),
    }

    clips: list[Path] = []
    for i, (name, a, b) in enumerate(marks, 1):
        dest = CLIPS / f"{i:02d}-{name}.mp4"
        builders[name](dest, max(b - a, 0.40))
        clips.append(dest)
        print("clip", dest.name, round(b - a, 2), flush=True)

    raw = CLIPS / "raw.mp4"
    concat(clips, raw)
    mux(raw, VOICE, captions(), PUBLIC / "stacks-in-action.mp4")
    subprocess.check_call(
        [
            FFMPEG, "-y", "-i", str(PUBLIC / "stacks-in-action.mp4"),
            "-t", "4", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20",
            str(PUBLIC / "preview-loop.mp4"),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print("done", PUBLIC / "stacks-in-action.mp4")


if __name__ == "__main__":
    main()
