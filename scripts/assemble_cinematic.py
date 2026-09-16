#!/usr/bin/env python3
"""Scale, title, mix, and mux the 2-minute 3D Stacks film."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

FFMPEG = "/usr/local/bin/ffmpeg"
ROOT = Path("/workspace/artifacts/film")
PUBLIC = Path("/workspace/public/video")
NORM = Path("/tmp/c3d/norm")
NORM.mkdir(parents=True, exist_ok=True)
FONT_B = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
FONT_R = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"

SOURCES = [
    "/workspace/artifacts/imagine_videos/e2338523-58fb-485c-b0f8-3491bd273e05.mp4",
    "/workspace/artifacts/imagine_videos/24708ea9-20bc-4acd-a6fa-cf02b9aaca8d.mp4",
    "/workspace/artifacts/imagine_videos/3b86d67a-908c-47b0-89f5-9e70cd719ad7.mp4",
    "/workspace/artifacts/imagine_videos/16e61e38-8be5-4aaa-be23-54c300ddab6c.mp4",
    "/workspace/artifacts/imagine_videos/86301560-434c-463a-9bac-9c4aa44edfef.mp4",
    "/workspace/artifacts/imagine_videos/96e64d6c-db6f-457b-bcf6-c652529f1d49.mp4",
    "/workspace/artifacts/imagine_videos/0762faf0-11c2-49ce-9025-c9639d019dc1.mp4",
    "/workspace/artifacts/imagine_videos/db82f06d-71f9-4a28-bb69-14623abcefd2.mp4",
]

HEADLINES = [
    (0.00, 15.00, "MEET STACKS", "One place for everything we build"),
    (15.00, 30.00, "APPS & ECOSYSTEM", "NaijaMovies · Pablo AI · Email Writer"),
    (30.00, 45.00, "KEEP BUILDING", "Solutions for business, companies, and people"),
    (45.00, 60.00, "500+ TOOLS", "Writing · Images · Video · SEO"),
    (60.00, 75.00, "THE WORKSPACE", "PDF · TXT · HTML · Word · PNG · MP4"),
    (75.00, 90.00, "PRODUCTION READY", "Prompt engines. API infrastructure."),
    (90.00, 105.00, "ONE WORKFLOW", "Stop building in silos"),
    (105.00, 120.00, "stacks.ng", "Explore apps. Explore tools."),
]


def ts(t: float) -> str:
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def write_ass() -> Path:
    data = json.loads((ROOT / "voice-cinematic.json").read_text())
    words = data["words"]
    chunks: list[tuple[float, float, str]] = []
    buf: list[str] = []
    start = words[0][1]
    for w, a, b in words:
        token = w
        buf.append(token)
        joined = " ".join(buf)
        if token.endswith((".", "!", "?")) and len(buf) >= 3:
            chunks.append((start, b, joined))
            buf = []
            start = b
        elif len(buf) >= 9:
            chunks.append((start, b, joined))
            buf = []
            start = b
    if buf:
        chunks.append((start, words[-1][2], " ".join(buf)))

    lines = [
        "[Script Info]", "ScriptType: v4.00+", "PlayResX: 1920", "PlayResY: 1080", "WrapStyle: 2", "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding",
        "Style: Title,Liberation Sans,72,&H00FFFFFF,&H000000FF,&H00101412,&H80000000,-1,0,0,0,100,100,0,0,1,3,0,8,60,60,56,1",
        "Style: Sub,Liberation Sans,32,&H00B8E6C8,&H000000FF,&H00101412,&H80000000,0,0,0,0,100,100,1.2,0,1,2,0,8,60,60,140,1",
        "Style: Cap,Liberation Sans,36,&H00FFFFFF,&H000000FF,&H00101412,&H88000000,0,0,0,0,100,100,0,0,1,2,0,2,80,80,46,1",
        "", "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    for a, b, title, sub in HEADLINES:
        safe_t = title.replace("{", "(").replace("}", ")")
        safe_s = sub.replace("{", "(").replace("}", ")")
        lines.append(f"Dialogue: 1,{ts(a)},{ts(b)},Title,,0,0,0,,{safe_t}")
        lines.append(f"Dialogue: 1,{ts(a)},{ts(b)},Sub,,0,0,0,,{safe_s}")
    last = 0.0
    for a, b, msg in chunks:
        a = max(a, last + 0.02)
        if b <= a:
            b = a + 0.7
        last = b
        safe = msg.replace("\n", " ").replace("{", "(").replace("}", ")")
        lines.append(f"Dialogue: 0,{ts(a)},{ts(b)},Cap,,0,0,0,,{safe}")
    dest = ROOT / "cinematic.ass"
    dest.write_text("\n".join(lines))
    return dest


def normalize() -> list[Path]:
    out: list[Path] = []
    for i, src in enumerate(SOURCES, 1):
        dest = NORM / f"{i:02d}.mp4"
        subprocess.check_call(
            [
                FFMPEG, "-y", "-i", src,
                "-vf", "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=24,format=yuv420p",
                "-t", "15", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17",
                "-preset", "veryfast", "-an", str(dest),
            ],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        out.append(dest)
        print("norm", dest.name, flush=True)
    return out


def concat(files: list[Path], dest: Path) -> None:
    lst = NORM / "list.txt"
    lst.write_text("".join(f"file '{p}'\n" for p in files))
    subprocess.check_call(
        [FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(dest)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def mix_audio(dest: Path, duration: float) -> None:
    fade = max(duration - 3.5, 1)
    subprocess.check_call(
        [
            FFMPEG, "-y",
            "-i", str(ROOT / "voice-cinematic.mp3"),
            "-i", str(ROOT / "music-cinematic.wav"),
            "-filter_complex",
            (
                f"[1:a]atrim=0:{duration:.3f},volume=0.16,afade=t=in:st=0:d=1.4,afade=t=out:st={fade:.3f}:d=3.2[m];"
                f"[0:a]volume=1.12,afade=t=in:st=0:d=0.12[v];"
                f"[v][m]amix=inputs=2:duration=longest:dropout_transition=3,alimiter=limit=0.95[a]"
            ),
            "-map", "[a]", "-t", f"{duration:.3f}", "-c:a", "libmp3lame", "-b:a", "192k", str(dest),
        ],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def mux(video: Path, audio: Path, ass: Path, dest: Path) -> None:
    subprocess.check_call(
        [
            FFMPEG, "-y", "-i", str(video), "-i", str(audio),
            "-vf", f"ass={ass}",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "fast",
            "-c:a", "aac", "-ar", "44100", "-b:a", "192k", "-shortest", str(dest),
        ],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def poster(src_frame: Path) -> None:
    im = Image.open(src_frame).convert("RGB").resize((1920, 1080), Image.Resampling.LANCZOS)
    shade = Image.new("RGB", (1920, 1080), (8, 12, 10))
    im = Image.blend(im, shade, 0.18)
    d = ImageDraw.Draw(im)
    fb = ImageFont.truetype(FONT_B, 22)
    ft = ImageFont.truetype(FONT_B, 72)
    fs = ImageFont.truetype(FONT_R, 28)
    d.text((88, 160), "STACKS", font=fb, fill=(16, 185, 129))
    d.multiline_text((88, 210), "Meet Stacks.\nOne place for\neverything we build.", font=ft, fill=(242, 244, 243), spacing=6)
    d.text((88, 500), "From concept to deployment.", font=fs, fill=(168, 186, 176))
    dest = PUBLIC / "poster.jpg"
    im.save(dest, quality=92, optimize=True)
    print("poster", dest)


def main() -> None:
    files = normalize()
    raw = NORM / "raw.mp4"
    concat(files, raw)
    ass = write_ass()
    duration = 120.0
    mix_path = ROOT / "mix-cinematic.mp3"
    mix_audio(mix_path, duration)
    mux(raw, mix_path, ass, PUBLIC / "stacks-in-action.mp4")
    subprocess.check_call(
        [FFMPEG, "-y", "-ss", "2.2", "-i", SOURCES[0], "-frames:v", "1", "-update", "1", str(NORM / "poster-src.jpg")],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    poster(NORM / "poster-src.jpg")
    print("done")


if __name__ == "__main__":
    main()
