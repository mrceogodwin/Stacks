#!/usr/bin/env python3
"""Stacks film v6: mint stills, overlay PNG, smooth cursor, Abeo +10%."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path("/workspace/artifacts/film")
SHOT = Path("/workspace/public/film-shots")
CLIPS = Path("/workspace/public/film-clips")
PUBLIC = Path("/workspace/public/video")
PNG = Path("/workspace/public/founder.png")
VOICE = ROOT / "voice-v6.mp3"
TS = ROOT / "voice-v6.timestamps.json"
ASS = ROOT / "captions-v6.ass"
W, H, FPS = 1920, 1080, 24
SX, SY = 1920 / 1280, 1080 / 720
MINT = (238, 243, 240)
FG = (16, 20, 18)
GREEN = (0, 135, 81)
MUTED = (74, 85, 80)
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FFMPEG = "/usr/local/bin/ffmpeg"
CLIPS.mkdir(parents=True, exist_ok=True)


def px(x: float, y: float) -> tuple[int, int]:
    return int(x * SX), int(y * SY)


def F(size: int, bold: bool = True):
    return ImageFont.truetype(FONT_B if bold else FONT_R, size)


def cursor_png() -> Path:
    dest = CLIPS / "cursor.png"
    if dest.exists():
        return dest
    im = Image.new("RGBA", (64, 76), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pts = [(6, 4), (6, 58), (20, 46), (28, 70), (38, 66), (28, 44), (54, 44)]
    d.polygon(pts, fill=(255, 255, 255, 255))
    d.line(pts + [pts[0]], fill=(20, 24, 22, 230), width=3)
    im.filter(ImageFilter.SMOOTH).save(dest)
    return dest


def still(path: Path, title: str, sub: str) -> Path:
    im = Image.new("RGB", (W, H), MINT)
    glow = Image.new("RGB", (W, H), MINT)
    gd = ImageDraw.Draw(glow)
    gd.ellipse((1100, -180, 2300, 820), fill=(214, 236, 224))
    im = Image.blend(im, glow.filter(ImageFilter.GaussianBlur(90)), 0.42)
    founder = Image.open(PNG).convert("RGBA")
    fh = int(H * 0.94)
    fw = int(founder.width * fh / founder.height)
    founder = founder.resize((fw, fh), Image.Resampling.LANCZOS)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.paste(founder, (W - fw + 10, H - fh + 8), founder)
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
        f"scale=2160:1215,zoompan=z='min(1.0+0.00018*on,1.028)':"
        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS},format=yuv420p"
    )
    subprocess.check_call(
        [FFMPEG, "-y", "-loop", "1", "-i", str(src), "-vf", vf, "-t", f"{seconds:.3f}",
         "-r", str(FPS), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17",
         "-preset", "veryfast", "-an", str(dest)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def cursor_shot(src: Path, dest: Path, seconds: float, x0: int, y0: int, x1: int, y1: int, travel: float = 0.55) -> None:
    cur = cursor_png()
    travel = min(max(0.32, seconds * 0.58), max(0.24, seconds - 0.16))
    # cosine ease, no commas inside pow()
    ease = f"(1-cos(PI*if(lt(t,{travel:.3f}),t/{travel:.3f},1)))/2"
    expr_x = f"{x0}+({x1}-{x0})*{ease}"
    expr_y = f"{y0}+({y1}-{y0})*{ease}"
    subprocess.check_call(
        [
            FFMPEG, "-y", "-loop", "1", "-i", str(src), "-loop", "1", "-i", str(cur),
            "-filter_complex",
            (
                f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},format=yuv420p[bg];"
                f"[1:v]format=rgba,scale=72:86[cur];"
                f"[bg][cur]overlay=x='{expr_x}':y='{expr_y}':shortest=1"
            ),
            "-t", f"{seconds:.3f}", "-r", str(FPS),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17",
            "-preset", "veryfast", "-an", str(dest),
        ],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
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
        if end_sent and len(words) >= 3:
            chunks.append((start, times[i][1], " ".join(buf.split())))
            buf = ""
            if i + 1 < len(times):
                start = times[i + 1][0]
        elif len(words) >= 11 and ch == " ":
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
        "[Script Info]", "ScriptType: v4.00+", "PlayResX: 1920", "PlayResY: 1080", "WrapStyle: 2", "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding",
        "Style: Default,DejaVu Sans,40,&H00FFFFFF,&H000000FF,&H00101412,&H88000000,0,0,0,0,100,100,0,0,1,2,0,2,80,80,52,1",
        "", "[Events]",
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
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def mux(video: Path, audio: Path, ass: Path, dest: Path) -> None:
    subprocess.check_call(
        [FFMPEG, "-y", "-i", str(video), "-i", str(audio), "-vf", f"ass={ass}",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "fast",
         "-c:a", "aac", "-ar", "44100", "-b:a", "192k", "-shortest", str(dest)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def main() -> None:
    home, apps, detail = SHOT / "home.jpg", SHOT / "apps.jpg", SHOT / "app-detail.jpg"
    tools, writing = SHOT / "tools.jpg", SHOT / "tools-writing.jpg"
    formats = SHOT / "workspace.jpg"

    intro = still(ROOT / "stills" / "v6-intro.jpg", "Hello.\nWelcome to Stacks.", "Built in Nigeria. Shipped on stacks.ng")
    focus = still(ROOT / "stills" / "v6-focus.jpg", "Vibe-coding.\nWith discipline.", "Prompt engineering. Testing. Building.")
    reason = still(ROOT / "stills" / "v6-reason.jpg", "Real problems.\nReal products.", "For companies and businesses that need solutions that work.")
    sub = still(ROOT / "stills" / "v6-sub.jpg", "New apps.\nFirst.", "Leave your email. I’ll write when I ship.")
    terms = still(ROOT / "stills" / "v6-terms.jpg", "No app is\nperfect.", "By using Stacks, you agree to the terms and the policy.")
    outro = still(ROOT / "stills" / "v6-outro.jpg", "Built in Nigeria.\nShipped on stacks.ng", "Explore the apps. Explore the tools.")

    explore, etools = px(142, 483), px(299, 483)
    naija, pablo, email = px(251, 337), px(640, 337), px(1029, 337)
    dl, share, openb = px(435, 388), px(640, 388), px(845, 388)
    search = px(640, 257)
    writing_chip, image_chip = px(366, 325), px(553, 325)
    video_chip, seo_chip = px(630, 325), px(701, 325)
    first = px(251, 445)
    run, regen, dlt, copy = px(409, 216), px(563, 216), px(717, 216), px(871, 216)
    txt, pdf, html = px(373, 540), px(454, 540), px(541, 540)

    marks = [
        ("intro", 0.00, 11.20),
        ("focus", 11.20, 25.98),
        ("reason", 25.98, 37.19),
        ("home-explore", 37.19, 44.35),
        ("home-tools", 44.35, 47.59),
        ("apps-enter", 47.59, 52.98),
        ("click", 52.98, 56.06),
        ("share", 56.06, 58.57),
        ("download", 58.57, 62.93),
        ("send", 62.93, 65.92),
        ("tools", 65.92, 68.78),
        ("filter-w", 68.78, 70.06),
        ("filter-i", 70.06, 70.57),
        ("filter-v", 70.57, 71.07),
        ("filter-s", 71.07, 72.51),
        ("pick", 72.51, 74.56),
        ("result", 74.56, 77.34),
        ("pdf", 77.34, 78.00),
        ("txt", 78.00, 78.76),
        ("html", 78.76, 79.55),
        ("doc", 79.55, 81.33),
        ("img", 81.33, 84.25),
        ("mp4", 84.25, 87.41),
        ("copy", 87.41, 89.77),
        ("regen", 89.77, 91.81),
        ("eight", 91.81, 95.84),
        ("sub", 95.84, 103.36),
        ("terms", 103.36, 123.42),
        ("outro", 123.42, 133.40),
    ]

    builders = {
        "intro": lambda d, s: kenburns(intro, d, s),
        "focus": lambda d, s: kenburns(focus, d, s),
        "reason": lambda d, s: kenburns(reason, d, s),
        "home-explore": lambda d, s: cursor_shot(home, d, s, *px(940, 297), *explore),
        "home-tools": lambda d, s: cursor_shot(home, d, s, *explore, *etools),
        "apps-enter": lambda d, s: cursor_shot(apps, d, s, *etools, *naija),
        "click": lambda d, s: cursor_shot(apps, d, s, *naija, *pablo),
        "share": lambda d, s: cursor_shot(detail, d, s, *dl, *share),
        "download": lambda d, s: cursor_shot(detail, d, s, *share, *dl),
        "send": lambda d, s: cursor_shot(detail, d, s, *dl, *openb),
        "tools": lambda d, s: cursor_shot(tools, d, s, *search, *search),
        "filter-w": lambda d, s: cursor_shot(tools, d, s, *search, *writing_chip),
        "filter-i": lambda d, s: cursor_shot(tools, d, s, *writing_chip, *image_chip),
        "filter-v": lambda d, s: cursor_shot(tools, d, s, *image_chip, *video_chip),
        "filter-s": lambda d, s: cursor_shot(tools, d, s, *video_chip, *seo_chip),
        "pick": lambda d, s: cursor_shot(writing, d, s, *seo_chip, *first),
        "result": lambda d, s: cursor_shot(formats, d, s, *run, *pdf),
        "pdf": lambda d, s: cursor_shot(formats, d, s, *pdf, *pdf),
        "txt": lambda d, s: cursor_shot(formats, d, s, *pdf, *txt),
        "html": lambda d, s: cursor_shot(formats, d, s, *txt, *html),
        "doc": lambda d, s: cursor_shot(formats, d, s, *html, *copy),
        "img": lambda d, s: cursor_shot(formats, d, s, *copy, *dlt),
        "mp4": lambda d, s: cursor_shot(formats, d, s, *dlt, *run),
        "copy": lambda d, s: cursor_shot(formats, d, s, *copy, *px(409, 268)),
        "regen": lambda d, s: cursor_shot(formats, d, s, *px(409, 268), *regen),
        "eight": lambda d, s: cursor_shot(formats, d, s, *regen, *run),
        "sub": lambda d, s: kenburns(sub, d, s),
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
    print("done")


if __name__ == "__main__":
    main()
