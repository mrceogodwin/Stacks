#!/usr/bin/env python3
"""Stacks film v8: explainer starts on the product UI. Portrait is poster-only."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from compose_poster import still as compose_still
from compose_poster import title_card

ROOT = Path("/workspace/artifacts/film")
SHOT = Path("/workspace/public/film-shots")
CLIPS = Path("/workspace/public/film-clips")
PUBLIC = Path("/workspace/public/video")
VOICE = ROOT / "voice-v8.mp3"
MUSIC = ROOT / "music-v7.wav"
MIX = ROOT / "mix-v8.mp3"
TS = ROOT / "voice-v8.timestamps.json"
ASS = ROOT / "captions-v8.ass"
W, H, FPS = 1920, 1080, 24
SX, SY = 1920 / 1280, 1080 / 720
FFMPEG = "/usr/local/bin/ffmpeg"
CLIPS.mkdir(parents=True, exist_ok=True)


def px(x: float, y: float) -> tuple[int, int]:
    return int(x * SX), int(y * SY)


def load_words() -> list[tuple[str, float, float]]:
    data = json.loads(TS.read_text())
    return [(w[0], float(w[1]), float(w[2])) for w in data["words"]]


def t_of(words: list[tuple[str, float, float]], needle: str, start_at: float = 0.0) -> float:
    n = [p.lower().strip(".,!?'\"") for p in needle.split()]
    toks = [(w.lower().strip(".,!?'\""), a, b) for w, a, b in words]
    for i in range(len(toks) - len(n) + 1):
        if toks[i][1] < start_at - 0.05:
            continue
        if [toks[i + j][0] for j in range(len(n))] == n:
            return toks[i][1]
    raise KeyError(needle)


def cursor_png() -> Path:
    dest = CLIPS / "cursor.png"
    if dest.exists():
        return dest
    from PIL import Image, ImageDraw

    im = Image.new("RGBA", (64, 76), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pts = [(6, 4), (6, 58), (20, 46), (28, 70), (38, 66), (28, 44), (54, 44)]
    d.polygon(pts, fill=(255, 255, 255, 255))
    d.line(pts + [pts[0]], fill=(20, 24, 22, 230), width=3)
    im.save(dest)
    return dest


def kenburns(src: Path, dest: Path, seconds: float) -> None:
    frames = max(int(seconds * FPS), 2)
    vf = (
        f"scale=2160:1215,zoompan=z='min(1.0+0.00016*on,1.024)':"
        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS},format=yuv420p"
    )
    subprocess.check_call(
        [FFMPEG, "-y", "-loop", "1", "-i", str(src), "-vf", vf, "-t", f"{seconds:.3f}",
         "-r", str(FPS), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17",
         "-preset", "veryfast", "-an", str(dest)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def cursor_shot(src: Path, dest: Path, seconds: float, x0: int, y0: int, x1: int, y1: int) -> None:
    cur = cursor_png()
    travel = min(max(0.38, seconds * 0.55), max(0.28, seconds - 0.18))
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


def captions(words: list[tuple[str, float, float]]) -> Path:
    data = json.loads(TS.read_text())
    chars, times = data["graph_chars"], data["graph_times"]
    text = "".join(chars) if isinstance(chars, list) else chars
    chunks: list[tuple[float, float, str]] = []
    buf, start = "", times[0][0]
    for i, ch in enumerate(text):
        buf += ch
        nxt = text[i + 1] if i + 1 < len(text) else ""
        end_sent = ch in ".!?" and not (ch == "." and nxt.isalnum())
        wordn = buf.strip().split()
        if end_sent and len(wordn) >= 3:
            chunks.append((start, times[i][1], " ".join(buf.split())))
            buf = ""
            if i + 1 < len(times):
                start = times[i + 1][0]
        elif len(wordn) >= 10 and ch == " ":
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
        "Style: Default,DejaVu Sans,38,&H00FFFFFF,&H000000FF,&H00101412,&H88000000,0,0,0,0,100,100,0,0,1,2,0,2,80,80,48,1",
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


def mix_audio(voice: Path, music: Path, dest: Path, duration: float) -> None:
    fade_out = max(duration - 3.2, 1.0)
    subprocess.check_call(
        [
            FFMPEG, "-y",
            "-i", str(voice),
            "-i", str(music),
            "-filter_complex",
            (
                f"[1:a]atrim=0:{duration:.3f},volume=0.12,afade=t=in:st=0:d=1.6,afade=t=out:st={fade_out:.3f}:d=2.8[m];"
                f"[0:a]volume=1.08,afade=t=in:st=0:d=0.06[v];"
                f"[v][m]amix=inputs=2:duration=first:dropout_transition=2,alimiter=limit=0.95[a]"
            ),
            "-map", "[a]", "-c:a", "libmp3lame", "-b:a", "192k", str(dest),
        ],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


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
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "fast",
         "-c:a", "aac", "-ar", "44100", "-b:a", "160k", "-shortest", str(dest)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def load_coords() -> dict:
    p = SHOT / "coords.json"
    if p.exists():
        return json.loads(p.read_text())
    return {}


def c(coords: dict, key: str, fallback: tuple[int, int]) -> tuple[int, int]:
    if key in coords:
        x, y = coords[key]
        if 20 <= x <= 1260 and 20 <= y <= 700:
            return px(x, y)
    return px(*fallback)


def main() -> None:
    words = load_words()
    duration = words[-1][2] + 1.6
    coords = load_coords()

    # Poster keeps the portrait. In-film title cards do not.
    compose_still("Hello.\nWelcome to Stacks.", "Built in Nigeria. Shipped on stacks.ng", PUBLIC / "poster.jpg")
    intro = title_card("Software\nthat works.", "Web apps, plugins, and tools for real businesses.", ROOT / "stills" / "v8-intro.jpg")
    sub = title_card("New apps.\nFirst.", "Leave an email. Hear about it as it ships.", ROOT / "stills" / "v8-sub.jpg")
    terms = title_card("Use it\nwith care.", "Terms and policy apply. No secrets in tools.", ROOT / "stills" / "v8-terms.jpg")
    outro = title_card("Built in Nigeria.\nShipped on stacks.ng", "Explore the apps. Explore the tools.", ROOT / "stills" / "v8-outro.jpg")

    home, apps, detail = SHOT / "home.jpg", SHOT / "apps.jpg", SHOT / "app-detail.jpg"
    tools, writing = SHOT / "tools.jpg", SHOT / "tools-writing.jpg"
    image_shot = SHOT / "tools-image.jpg"
    video_shot = SHOT / "tools-video.jpg"
    formats = SHOT / "workspace.jpg"
    if not image_shot.exists():
        image_shot = tools
    if not video_shot.exists():
        video_shot = tools

    explore = c(coords, "explore", (142, 500))
    etools = c(coords, "exploreTools", (300, 500))
    naija = c(coords, "app0", (251, 360))
    pablo = c(coords, "app1", (640, 360))
    dl = c(coords, "download", (435, 400))
    share = c(coords, "share", (640, 400))
    openb = c(coords, "open", (845, 400))
    search = c(coords, "search", (640, 250))
    writing_chip = c(coords, "filterWriting", (360, 318))
    image_chip = c(coords, "filterImage", (500, 318))
    video_chip = c(coords, "filterVideo", (620, 318))
    seo_chip = c(coords, "filterSeo", (740, 318))
    first_tool = c(coords, "tool0", (250, 430))
    run = c(coords, "run", (409, 220))
    regen = c(coords, "regen", (563, 220))
    dlt = c(coords, "dlTool", (717, 220))
    copy = c(coords, "copy", (871, 220))
    txt = c(coords, "txt", (373, 545))
    pdf = c(coords, "pdf", (454, 545))
    html = c(coords, "html", (541, 545))
    doc = c(coords, "doc", (640, 545))

    t_start = t_of(words, "Stacks is a production")
    t_home = t_of(words, "This is the home")
    t_explore = t_of(words, "Explore Apps opens")
    t_etools = t_of(words, "Explore tools opens")
    t_inside = t_of(words, "Inside Apps")
    t_click = t_of(words, "Click one")
    t_share = t_of(words, "Share it with")
    t_download = t_of(words, "Download it")
    t_send = t_of(words, "Send the link")
    t_library = t_of(words, "Now the tool")
    t_filter = t_of(words, "then filter")
    t_writing = t_of(words, "Writing", t_filter)
    t_image = t_of(words, "Image", t_writing)
    t_video = t_of(words, "Video", t_image)
    t_seo = t_of(words, "SEO", t_video)
    t_pick = t_of(words, "Pick any tool")
    t_work = t_of(words, "The workspace")
    t_fields = t_of(words, "Each tool has")
    t_pdf = t_of(words, "PDF")
    t_txt = t_of(words, "TXT")
    t_html = t_of(words, "HTML")
    t_word = t_of(words, "Word document")
    t_pictures = t_of(words, "Images download")
    t_mp4 = t_of(words, "Video downloads")
    t_copy = t_of(words, "Copy the result")
    t_regen = t_of(words, "regenerate another")
    t_eight = t_of(words, "Eight actions")
    t_writing_tools = t_of(words, "Writing tools draft")
    t_image_tools = t_of(words, "Image tools build")
    t_video_tools = t_of(words, "Video tools produce")
    t_seo_tools = t_of(words, "SEO tools help")
    t_updates = t_of(words, "When a new app")
    t_solutions = t_of(words, "Stacks is built for companies")
    t_care = t_of(words, "Use Stacks with care")
    t_outro = t_of(words, "Stacks Built in Nigeria")
    end = duration

    marks = [
        ("intro", t_start, t_home),
        ("home-open", t_home, t_explore),
        ("home-explore", t_explore, t_etools),
        ("home-tools", t_etools, t_inside),
        ("apps-enter", t_inside, t_click),
        ("click", t_click, t_share),
        ("share", t_share, t_download),
        ("download", t_download, t_send),
        ("send", t_send, t_library),
        ("tools", t_library, t_writing),
        ("filter-w", t_writing, t_image),
        ("filter-i", t_image, t_video),
        ("filter-v", t_video, t_seo),
        ("filter-s", t_seo, t_pick),
        ("pick", t_pick, t_work),
        ("fields", t_work, t_pdf),
        ("pdf", t_pdf, t_txt),
        ("txt", t_txt, t_html),
        ("html", t_html, t_word),
        ("doc", t_word, t_pictures),
        ("img", t_pictures, t_mp4),
        ("mp4", t_mp4, t_copy),
        ("copy", t_copy, t_regen),
        ("regen", t_regen, t_eight),
        ("eight", t_eight, t_writing_tools),
        ("more-w", t_writing_tools, t_image_tools),
        ("more-i", t_image_tools, t_video_tools),
        ("more-v", t_video_tools, t_seo_tools),
        ("more-s", t_seo_tools, t_updates),
        ("sub", t_updates, t_solutions),
        ("reason", t_solutions, t_care),
        ("terms", t_care, t_outro),
        ("outro", t_outro, end),
    ]

    builders = {
        "intro": lambda d, s: kenburns(intro, d, s),
        "home-open": lambda d, s: cursor_shot(home, d, s, *px(980, 280), *explore),
        "home-explore": lambda d, s: cursor_shot(home, d, s, *explore, *explore),
        "home-tools": lambda d, s: cursor_shot(home, d, s, *explore, *etools),
        "apps-enter": lambda d, s: cursor_shot(apps, d, s, *etools, *naija),
        "click": lambda d, s: cursor_shot(apps, d, s, *naija, *pablo),
        "share": lambda d, s: cursor_shot(detail, d, s, *dl, *share),
        "download": lambda d, s: cursor_shot(detail, d, s, *share, *dl),
        "send": lambda d, s: cursor_shot(detail, d, s, *dl, *openb),
        "tools": lambda d, s: cursor_shot(tools, d, s, *search, *search),
        "filter-w": lambda d, s: cursor_shot(tools, d, s, *search, *writing_chip),
        "filter-i": lambda d, s: cursor_shot(tools, d, s, *writing_chip, *image_chip),
        "filter-v": lambda d, s: cursor_shot(image_shot, d, s, *image_chip, *video_chip),
        "filter-s": lambda d, s: cursor_shot(video_shot, d, s, *video_chip, *seo_chip),
        "pick": lambda d, s: cursor_shot(writing, d, s, *seo_chip, *first_tool),
        "fields": lambda d, s: cursor_shot(formats, d, s, *run, *run),
        "pdf": lambda d, s: cursor_shot(formats, d, s, *run, *pdf),
        "txt": lambda d, s: cursor_shot(formats, d, s, *pdf, *txt),
        "html": lambda d, s: cursor_shot(formats, d, s, *txt, *html),
        "doc": lambda d, s: cursor_shot(formats, d, s, *html, *doc),
        "img": lambda d, s: cursor_shot(formats, d, s, *doc, *dlt),
        "mp4": lambda d, s: cursor_shot(formats, d, s, *dlt, *run),
        "copy": lambda d, s: cursor_shot(formats, d, s, *copy, *copy),
        "regen": lambda d, s: cursor_shot(formats, d, s, *copy, *regen),
        "eight": lambda d, s: cursor_shot(formats, d, s, *regen, *run),
        "more-w": lambda d, s: cursor_shot(writing, d, s, *first_tool, *first_tool),
        "more-i": lambda d, s: cursor_shot(image_shot, d, s, *image_chip, *first_tool),
        "more-v": lambda d, s: cursor_shot(video_shot, d, s, *video_chip, *first_tool),
        "more-s": lambda d, s: cursor_shot(tools, d, s, *search, *writing_chip),
        "sub": lambda d, s: kenburns(sub, d, s),
        "reason": lambda d, s: kenburns(intro, d, s),
        "terms": lambda d, s: kenburns(terms, d, s),
        "outro": lambda d, s: kenburns(outro, d, s),
    }

    clips: list[Path] = []
    for i, (name, a, b) in enumerate(marks, 1):
        dest = CLIPS / f"{i:02d}-{name}.mp4"
        sec = max(b - a, 0.40)
        builders[name](dest, sec)
        clips.append(dest)
        print("clip", dest.name, round(sec, 2), flush=True)

    raw = CLIPS / "raw.mp4"
    concat(clips, raw)
    mix_audio(VOICE, MUSIC, MIX, duration)
    mux(raw, MIX, captions(words), PUBLIC / "stacks-in-action.mp4")
    print("done", round(duration, 2), "bytes", (PUBLIC / "stacks-in-action.mp4").stat().st_size)


if __name__ == "__main__":
    main()
