#!/usr/bin/env python3
"""Build the Stacks founder film: real cutout, product B-roll, captions, terms."""

from __future__ import annotations

import json
import math
import os
import subprocess
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance

ROOT = Path("/workspace/artifacts/film")
STILLS = ROOT / "stills"
CLIPS = ROOT / "clips"
PUBLIC = Path("/workspace/public/video")
W, H = 1920, 1080
FPS = 24
GREEN = (0, 135, 81)
GREEN_B = (46, 229, 157)
FG = (242, 244, 243)
MUTED = (154, 161, 158)
DIM = (109, 116, 113)

STILLS.mkdir(parents=True, exist_ok=True)
CLIPS.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)


def font_path() -> str:
    for p in [
        str(ROOT / "fonts" / "InterVariable.ttf"),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]:
        if Path(p).exists():
            return p
    return "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


FONT = font_path()
FONT_B = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    if Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf").exists()
    else FONT
)


def F(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_B if bold else FONT, size)


def stage_base() -> Image.Image:
    src = Image.open(ROOT / "stage.jpg").convert("RGB").resize((W, H), Image.Resampling.LANCZOS)
    dark = Image.new("RGB", (W, H), (5, 7, 6))
    return Image.blend(dark, src, 0.55)


def person_cut() -> Image.Image:
    im = Image.open(ROOT / "founder-cut.png").convert("RGBA")
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    a = im.split()[-1]
    a = a.point(lambda p: 0 if p < 48 else p)
    a = a.filter(ImageFilter.MinFilter(3))
    a = a.filter(ImageFilter.GaussianBlur(0.5))
    im.putalpha(a)
    return im


def place_person(canvas: Image.Image, person: Image.Image, *, height: int, x: int, y: int) -> None:
    ratio = height / person.height
    pw = int(person.width * ratio)
    p = person.resize((pw, height), Image.Resampling.LANCZOS)
    # drop shadow
    sh = Image.new("RGBA", (pw + 80, height + 80), (0, 0, 0, 0))
    mask = p.split()[-1].filter(ImageFilter.GaussianBlur(18))
    shadow = Image.new("RGBA", p.size, (0, 0, 0, 140))
    sh.paste(shadow, (40, 40), mask)
    canvas.paste(sh, (x - 40, y - 20), sh)
    canvas.paste(p, (x, y), p)


def mark(draw: ImageDraw.ImageDraw, x: int, y: int) -> None:
    # stacked layers glyph
    g1, g2, g3 = GREEN_B, GREEN, (154, 255, 199)
    for i, col in enumerate((g1, g2)):
        yy = y + 18 - i * 9
        draw.line([(x, yy + 16), (x + 22, yy + 28), (x + 44, yy + 16)], fill=col, width=3)
    draw.polygon([(x, y + 10), (x + 22, y + 22), (x + 44, y + 10), (x + 22, y - 2)], fill=GREEN, outline=g3)
    draw.text((x + 56, y - 2), "STACKS", font=F(28, True), fill=FG)


def kicker(draw: ImageDraw.ImageDraw, x: int, y: int, text: str) -> None:
    draw.text((x, y), text.upper(), font=F(18, True), fill=GREEN_B)


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font, max_w: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=font) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def save(im: Image.Image, name: str) -> Path:
    p = STILLS / name
    im.convert("RGB").save(p, "JPEG", quality=94)
    return p


def still_intro_wide(person: Image.Image) -> Path:
    im = stage_base().convert("RGBA")
    place_person(im, person, height=1040, x=980, y=80)
    d = ImageDraw.Draw(im)
    mark(d, 96, 88)
    kicker(d, 96, 430, "The future of digital creation")
    title = "One place for\neverything I build."
    d.multiline_text((96, 470), title, font=F(72, True), fill=FG, spacing=8)
    d.text((96, 680), "I'm Godwin. This is Stacks.", font=F(28), fill=MUTED)
    return save(im, "01-intro.jpg")


def still_collection(person: Image.Image) -> Path:
    im = stage_base().convert("RGBA")
    place_person(im, person, height=980, x=1080, y=140)
    d = ImageDraw.Draw(im)
    mark(d, 96, 88)
    kicker(d, 96, 360, "The collection")
    d.multiline_text((96, 400), "Apps I built.\nA gallery, not a\ndashboard.", font=F(64, True), fill=FG, spacing=6)
    d.text((96, 680), "NaijaMovies  ·  Pablo  ·  Email  ·  Image  ·  Video", font=F(22), fill=MUTED)
    return save(im, "02-collection.jpg")


def still_site(src: Path, name: str, kicker_s: str, title: str) -> Path:
    shot = Image.open(src).convert("RGB")
    # cover
    ratio = max(W / shot.width, H / shot.height)
    nw, nh = int(shot.width * ratio), int(shot.height * ratio)
    shot = shot.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - W) // 2
    top = (nh - H) // 2
    shot = shot.crop((left, top, left + W, top + H))
    im = shot.convert("RGBA")
    # left cinematic wash so type reads
    wash = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wash)
    for x in range(0, 980):
        a = int(210 * (1 - x / 980) ** 1.15)
        wd.line([(x, 0), (x, H)], fill=(5, 7, 6, a))
    im = Image.alpha_composite(im, wash)
    d = ImageDraw.Draw(im)
    mark(d, 80, 72)
    kicker(d, 80, 400, kicker_s)
    for i, line in enumerate(title.split("\n")):
        d.text((80, 440 + i * 68), line, font=F(56, True), fill=FG)
    return save(im, name)


def still_vault() -> Path:
    im = stage_base().convert("RGBA")
    d = ImageDraw.Draw(im)
    mark(d, 96, 88)
    kicker(d, 96, 280, "Studio")
    d.multiline_text((96, 320), "The vault that\nmakes the tools\nactually run.", font=F(64, True), fill=FG, spacing=6)
    items = [
        "Upload an app and a thumbnail",
        "Write the tool prompt",
        "Add up to 100 API keys",
        "Keys never leave the server",
    ]
    y = 640
    for t in items:
        d.ellipse((100, y + 10, 112, y + 22), fill=GREEN_B)
        d.text((128, y), t, font=F(28), fill=FG)
        y += 56
    return save(im, "05-vault.jpg")


def still_safety(person: Image.Image) -> Path:
    im = stage_base().convert("RGBA")
    place_person(im, person, height=980, x=1100, y=160)
    d = ImageDraw.Draw(im)
    mark(d, 96, 88)
    kicker(d, 96, 340, "Read this")
    d.multiline_text((96, 380), "No app\nis perfect.", font=F(76, True), fill=FG, spacing=4)
    d.text((96, 620), "Stacks is a living product.", font=F(28), fill=MUTED)
    d.text((96, 662), "AI can be wrong. Review every result.", font=F(28), fill=MUTED)
    return save(im, "06-safety.jpg")


def still_terms(title: str, lines: list[str], name: str) -> Path:
    im = stage_base().convert("RGBA")
    d = ImageDraw.Draw(im)
    mark(d, 96, 88)
    kicker(d, 96, 240, "Terms of use")
    d.text((96, 280), title, font=F(52, True), fill=FG)
    y = 380
    body = F(30)
    for line in lines:
        wrapped = wrap_text(d, line, body, 1700)
        for wline in wrapped:
            d.text((96, y), wline, font=body, fill=MUTED)
            y += 46
        y += 18
    d.rectangle((96, 980, 360, 986), fill=GREEN)
    d.text((96, 1000), "By using Stacks you agree to these terms.", font=F(18), fill=DIM)
    return save(im, name)


def still_close(person: Image.Image) -> Path:
    im = stage_base().convert("RGBA")
    place_person(im, person, height=1040, x=1000, y=70)
    d = ImageDraw.Draw(im)
    mark(d, 96, 88)
    kicker(d, 96, 420, "stacks.ng")
    d.multiline_text((96, 460), "Explore with\ncuriosity.\nUse with care.", font=F(64, True), fill=FG, spacing=6)
    d.text((96, 760), "This is Stacks.", font=F(28), fill=MUTED)
    return save(im, "10-close.jpg")


def kenburns(src: Path, dest: Path, seconds: float, zoom_end: float = 1.08, pan: str = "center") -> None:
    frames = max(int(seconds * FPS), 2)
    # start slightly zoomed depending on pan
    if pan == "right":
        xexpr = "'iw*0.12-(iw/zoom-iw)/2'"
        yexpr = "'ih/2-(ih/zoom/2)'"
    elif pan == "left":
        xexpr = "'iw*0.02'"
        yexpr = "'ih/2-(ih/zoom/2)'"
    else:
        xexpr = "'iw/2-(iw/zoom/2)'"
        yexpr = "'(ih/2-(ih/zoom/2))*0.92'"
    vf = (
        f"scale=2200:1238,"
        f"zoompan=z='min(1.0+0.00045*on,{zoom_end})':x={xexpr}:y={yexpr}:"
        f"d={frames}:s={W}x{H}:fps={FPS},"
        f"format=yuv420p"
    )
    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            str(src),
            "-vf",
            vf,
            "-t",
            f"{seconds:.3f}",
            "-r",
            str(FPS),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-crf",
            "18",
            "-preset",
            "veryfast",
            "-an",
            str(dest),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def fade_clip(src: Path, dest: Path, seconds: float) -> None:
    """Static still with a gentle fade in."""
    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            str(src),
            "-t",
            f"{seconds:.3f}",
            "-vf",
            f"scale={W}:{H},fade=t=in:st=0:d=0.45,format=yuv420p",
            "-r",
            str(FPS),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-crf",
            "18",
            "-preset",
            "veryfast",
            "-an",
            str(dest),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def build_subtitles() -> Path:
    data = json.loads((ROOT / "voice.timestamps.json").read_text())
    chars: list[str] = data["graph_chars"]
    times: list[list[float]] = data["graph_times"]
    text = "".join(chars)

    # Split into caption chunks of ~8-12 words on punctuation / newlines
    chunks: list[tuple[float, float, str]] = []
    buf = ""
    start = times[0][0]
    for i, ch in enumerate(chars):
        buf += ch
        words = buf.strip().split()
        end_punct = ch in ".!?"
        newline = ch == "\n"
        long_enough = len(words) >= 9
        if (end_punct or newline or long_enough) and len(words) >= 4:
            t0 = start
            t1 = times[i][1]
            line = " ".join(buf.split())
            # Terms are already on-screen — skip burned captions over that chapter
            if line and not (t0 >= 91.4 and t1 <= 126.8):
                chunks.append((t0, t1, line))
            buf = ""
            if i + 1 < len(times):
                start = times[i + 1][0]
    if buf.strip():
        chunks.append((start, times[-1][1], " ".join(buf.split())))

    def ts(sec: float) -> str:
        if sec < 0:
            sec = 0
        h = int(sec // 3600)
        m = int((sec % 3600) // 60)
        s = int(sec % 60)
        cs = int((sec - math.floor(sec)) * 100)
        return f"{h:d}:{m:02d}:{s:02d}.{cs:02d}"

    # ASS
    header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Alignment, MarginL, MarginR, MarginV, BorderStyle, Outline, Shadow, Encoding
Style: Cap, DejaVu Sans, 34, &H00F3F4F2, &H000000FF, &H00000000, &H90000000, 0, 0, 1, 88, 820, 64, 1, 2, 0, 1

[Events]
Format: Layer, Start, End, Style, Text
"""
    events = []
    for t0, t1, line in chunks:
        # wrap ~42 chars
        wrapped = textwrap.fill(line, width=42).replace("\n", "\\N")
        events.append(f"Dialogue: 0,{ts(t0)},{ts(max(t1, t0 + 0.8))},Cap,{wrapped}")
    path = ROOT / "captions.ass"
    path.write_text(header + "\n".join(events) + "\n")
    return path


def concat_and_mix(clips: list[Path], ass: Path, voice: Path, dest: Path) -> None:
    lst = ROOT / "concat.txt"
    lst.write_text("".join(f"file '{c}'\n" for c in clips))
    raw = CLIPS / "raw.mp4"
    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(lst),
            "-c",
            "copy",
            str(raw),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    # pad video to 2:16 (136s) with last frame if needed
    mixed = dest
    # ambient bed
    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(raw),
            "-i",
            str(voice),
            "-f",
            "lavfi",
            "-i",
            "anoisesrc=color=brown:amplitude=0.012:sample_rate=24000",
            "-filter_complex",
            (
                f"[0:v]ass=captions.ass:fontsdir=/usr/share/fonts/truetype/dejavu[v];"
                f"[1:a]aformat=sample_fmts=fltp:sample_rates=24000:channel_layouts=mono,apad=pad_dur=5[vo];"
                f"[2:a]volume=0.18,afade=t=in:st=0:d=2,afade=t=out:st=130:d=6[bed];"
                f"[vo][bed]amix=inputs=2:duration=first:dropout_transition=2[a]"
            ),
            "-map",
            "[v]",
            "-map",
            "[a]",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-crf",
            "18",
            "-preset",
            "medium",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-movflags",
            "+faststart",
            "-shortest",
            str(mixed),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        cwd=str(ROOT),
    )


def main() -> None:
    print("font", FONT)
    person = person_cut()
    print("person", person.size)

    s1 = still_intro_wide(person)
    s2 = still_collection(person)
    s3 = still_site(ROOT / "site-home.png", "03-site.jpg", "How it works", "No login wall.\nSearch. Filter.\nRun a prompt.")
    s4 = still_site(ROOT / "site-tools.png", "04-apps.jpg", "The tool library", "Five hundred plus\nAI tools. One vault.")
    s5 = still_vault()
    s6 = still_safety(person)
    s7 = still_terms(
        "By using Stacks you agree.",
        [
            "By visiting, downloading, or using Stacks — including stacks.ng — you agree to these terms.",
            "Do not paste passwords, private keys, bank details, or other people's personal data into the tools.",
            "You are responsible for how you use the output. You must have the right to use any content you upload.",
        ],
        "07-terms1.jpg",
    )
    s8 = still_terms(
        "As is. No warranty.",
        [
            "Stacks is not legal, medical, or financial advice. Features can change. Models can fail. Availability is not guaranteed.",
            "Results are provided as is, without a warranty of any kind, to the fullest extent permitted by law.",
            "If you do not agree, do not use Stacks.",
        ],
        "08-terms2.jpg",
    )
    s9 = still_close(person)

    # durations aligned to voice
    shots = [
        (s1, 14.30, "right"),
        (s2, 12.00, "right"),  # 14.30-26.30
        (s3, 16.10, "left"),  # 26.30-42.40
        (s4, 14.62, "center"),  # 42.40-57.02
        (s5, 16.52, "left"),  # 57.02-73.54
        (s6, 18.40, "right"),  # 73.54-91.94
        (s7, 17.85, "center"),  # 91.94-109.79
        (s8, 16.97, "center"),  # 109.79-126.76
        (s9, 9.20, "right"),  # 126.76-136
    ]

    clip_paths: list[Path] = []
    for i, (still, dur, pan) in enumerate(shots, 1):
        dest = CLIPS / f"c{i:02d}.mp4"
        print(f"clip {i} {dur:.2f}s {still.name}")
        kenburns(still, dest, dur, zoom_end=1.07 if i < 7 else 1.05, pan=pan)
        clip_paths.append(dest)

    ass = build_subtitles()
    print("captions", ass)
    out = PUBLIC / "stacks-in-action.mp4"
    concat_and_mix(clip_paths, ass, ROOT / "voice.mp3", out)
    print("wrote", out, "size", out.stat().st_size)

    # poster + 8s preview loop from first still
    poster = PUBLIC / "poster.jpg"
    Image.open(s1).convert("RGB").resize((W, H)).save(poster, "JPEG", quality=90)
    preview = PUBLIC / "preview-loop.mp4"
    kenburns(s1, preview, 8.0, zoom_end=1.06, pan="right")
    print("preview", preview)


if __name__ == "__main__":
    main()
