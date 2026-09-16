#!/usr/bin/env python3
"""Directed Stacks walkthrough v4: sharp PNG, accurate cursor, text-export beat."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path("/workspace/artifacts/film")
SHOT = ROOT / "shots4"
CLIPS = ROOT / "clips4"
PUBLIC = Path("/workspace/public/video")
PNG = Path("/workspace/public/founder.png")
VOICE = ROOT / "voice-v4b.mp3"
TS = ROOT / "voice-v4b.timestamps.json"
ASS = ROOT / "captions-v4.ass"
W, H, FPS = 1920, 1080, 24
SX, SY = 1920 / 1280, 1080 / 720
MINT = (243, 246, 244)
FG = (16, 20, 18)
GREEN = (0, 135, 81)
MUTED = (74, 85, 80)
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
CLIPS.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)


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
    im = Image.new("RGB", (W, H), MINT)
    glow = Image.new("RGB", (W, H), MINT)
    gd = ImageDraw.Draw(glow)
    gd.ellipse((980, -120, 2200, 980), fill=(214, 236, 224))
    im = Image.blend(im, glow.filter(ImageFilter.GaussianBlur(90)), 0.45)
    founder = Image.open(PNG).convert("RGBA")
    fh = int(H * 1.06)
    fw = int(founder.width * fh / founder.height)
    founder = founder.resize((fw, fh), Image.Resampling.LANCZOS)
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    black = Image.new("RGBA", founder.size, (16, 20, 18, 0))
    black.putalpha(founder.split()[-1].point(lambda a: int(a * 0.32)))
    shadow.paste(black, (W - fw + 30, H - fh + 40), black)
    im = Image.alpha_composite(im.convert("RGBA"), shadow.filter(ImageFilter.GaussianBlur(16))).convert("RGB")
    im.paste(founder, (W - fw + 6, H - fh + 16), founder)
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
        f"scale=2200:1238,zoompan=z='min(1.0+0.00028*on,1.04)':"
        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS},format=yuv420p"
    )
    subprocess.check_call(
        [
            "ffmpeg", "-y", "-loop", "1", "-i", str(src), "-vf", vf, "-t", f"{seconds:.3f}",
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
            "ffmpeg", "-y",
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
        elif len(words) >= 10 and ch == " ":
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
        "Style: Default,DejaVu Sans,42,&H00FFFFFF,&H000000FF,&H00101412,&H88000000,0,0,0,0,100,100,0,0,1,2,0,2,80,80,54,1",
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
        [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
            "-c", "copy", str(dest),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def mux(video: Path, audio: Path, ass: Path, dest: Path) -> None:
    subprocess.check_call(
        [
            "ffmpeg", "-y", "-i", str(video), "-i", str(audio),
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
    work, formats = SHOT / "workspace-empty.png", SHOT / "workspace-formats.png"
    about = SHOT / "about.png"

    intro = still(ROOT / "stills" / "v4-intro.jpg", "Hello.\nWelcome to Stacks.", "High-level production. Web apps, plugins, tools.")
    focus = still(ROOT / "stills" / "v4-focus.jpg", "Super focused.\nDedicated.", "Months of vibe-coding. Every app tested.")
    terms = still(ROOT / "stills" / "v4-terms.jpg", "No app is\nperfect.", "By downloading and using Stacks, you agree to the terms.")
    outro = still(ROOT / "stills" / "v4-outro.jpg", "Built in Nigeria.\nShipped on stacks.ng", "Explore the apps. Explore the tools.")

    # 1280x720 page coords -> 1920x1080
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

    clips: list[Path] = []
    n = 0

    def add(name: str, fn) -> Path:
        nonlocal n
        n += 1
        dest = CLIPS / f"{n:02d}-{name}.mp4"
        fn(dest)
        clips.append(dest)
        print("clip", dest.name, flush=True)
        return dest

    add("intro", lambda d: kenburns(intro, d, 12.70))
    add("focus", lambda d: kenburns(focus, d, 11.06))
    add("home-explore", lambda d: cursor_shot(home, d, 4.70, *px(940, 297), *explore, 0.55))
    add("home-gallery", lambda d: cursor_shot(home, d, 2.89, *explore, *explore, 0.2))
    add("home-tools", lambda d: cursor_shot(home, d, 3.26, *explore, *etools, 0.35))
    add("apps-enter", lambda d: cursor_shot(apps, d, 2.08, *etools, *naija, 0.45))
    add("apps-cards", lambda d: cursor_shot(apps, d, 1.92, *naija, *pablo, 0.4))
    add("apps-email", lambda d: cursor_shot(apps, d, 0.91, *pablo, *email, 0.28))
    add("click-app", lambda d: cursor_shot(apps, d, 2.79, *email, *naija, 0.4))
    add("story", lambda d: cursor_shot(detail, d, 3.51, *dl, *dl, 0.2))
    add("share", lambda d: cursor_shot(detail, d, 3.28, *dl, *share, 0.35))
    add("download", lambda d: cursor_shot(detail, d, 1.63, *share, *openb, 0.3))
    add("gallery-how", lambda d: cursor_shot(detail, d, 2.36, *openb, *dl, 0.35))
    add("share2", lambda d: cursor_shot(detail, d, 1.63, *dl, *share, 0.28))
    add("send", lambda d: cursor_shot(detail, d, 0.94, *share, *share, 0.15))
    add("tools-enter", lambda d: cursor_shot(tools, d, 1.73, *search, *search, 0.2))
    add("search", lambda d: cursor_shot(tools, d, 1.13, *search, *search, 0.15))
    add("filter-w", lambda d: cursor_shot(tools, d, 0.90, *search, *writing_chip, 0.28))
    add("filter-i", lambda d: cursor_shot(tools, d, 0.70, *writing_chip, *image_chip, 0.22))
    add("filter-v", lambda d: cursor_shot(tools, d, 0.70, *image_chip, *video_chip, 0.2))
    add("filter-s", lambda d: cursor_shot(tools, d, 0.93, *video_chip, *seo_chip, 0.22))
    add("pick", lambda d: cursor_shot(writing, d, 1.24, *seo_chip, *first, 0.35))
    add("run", lambda d: cursor_shot(formats, d, 1.24, *run, *run, 0.2))
    add("pdf", lambda d: cursor_shot(formats, d, 2.20, *run, *pdf, 0.4))
    add("txt", lambda d: cursor_shot(formats, d, 2.20, *pdf, *txt, 0.28))
    add("html", lambda d: cursor_shot(formats, d, 2.21, *txt, *html, 0.28))
    add("copy", lambda d: cursor_shot(formats, d, 1.54, *html, *copy, 0.35))
    add("share-t", lambda d: cursor_shot(formats, d, 1.46, *copy, *px(409, 268), 0.28))
    add("save", lambda d: cursor_shot(formats, d, 1.46, *px(409, 268), *px(563, 268), 0.25))
    add("regen", lambda d: cursor_shot(formats, d, 2.13, *px(563, 268), *regen, 0.3))
    add("eight", lambda d: cursor_shot(formats, d, 1.99, *regen, *dlt, 0.28))
    add("workspace", lambda d: cursor_shot(formats, d, 1.38, *dlt, *run, 0.3))
    add("terms", lambda d: kenburns(terms, d, 10.88))
    add("outro", lambda d: kenburns(outro, d, 9.00))

    raw = CLIPS / "raw.mp4"
    concat(clips, raw)
    mux(raw, VOICE, captions(), PUBLIC / "stacks-in-action.mp4")

    # poster already built; extract a preview loop from intro
    subprocess.check_call(
        [
            "ffmpeg", "-y", "-i", str(PUBLIC / "stacks-in-action.mp4"),
            "-t", "4", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20",
            str(PUBLIC / "preview-loop.mp4"),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print("done", PUBLIC / "stacks-in-action.mp4")


if __name__ == "__main__":
    main()
