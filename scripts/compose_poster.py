#!/usr/bin/env python3
"""Mint poster: full head in frame, light hem, no green on the face."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

W, H = 1920, 1080
MINT = (238, 243, 240)
FG = (16, 20, 18)
GREEN = (0, 135, 81)
MUTED = (90, 102, 97)
PNG = Path("/workspace/artifacts/film/founder-white.png")
OUT = Path("/workspace/public/video/poster.jpg")
STILL = Path("/workspace/artifacts/film/stills/v7-intro.jpg")
FONT_B = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
FONT_R = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"


def place_founder(base: Image.Image) -> Image.Image:
    """Portrait on the right. Hair fully visible. Shirt still there. Soft hem only."""
    w, h = base.size
    png = Image.open(PNG).convert("RGBA")
    top_pad = 76
    fh = h - top_pad
    fw = int(png.width * fh / png.height)
    png = png.resize((fw, fh), Image.Resampling.LANCZOS)
    r, g, b, a = png.split()
    fade = Image.new("L", (fw, fh), 255)
    fd = ImageDraw.Draw(fade)
    y0 = fh - 64
    for y in range(y0, fh):
        t = (y - y0) / max(fh - y0, 1)
        fd.line([(0, y), (fw, y)], fill=int(255 * (1 - 0.38 * (t ** 1.15))))
    a = ImageChops.multiply(a, fade)
    lf = Image.new("L", (fw, fh), 255)
    ld = ImageDraw.Draw(lf)
    xw = int(fw * 0.09)
    for x in range(0, xw):
        t = 1 - x / max(xw, 1)
        ld.line([(x, 0), (x, fh)], fill=int(255 * (1 - 0.5 * t)))
    a = ImageChops.multiply(a, lf)
    png = Image.merge("RGBA", (r, g, b, a))
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    layer.paste(png, (w - fw - 72, top_pad), png)
    return Image.alpha_composite(base.convert("RGBA"), layer).convert("RGB")


def mint_bg() -> Image.Image:
    im = Image.new("RGB", (W, H), MINT)
    glow = Image.new("RGB", (W, H), MINT)
    gd = ImageDraw.Draw(glow)
    gd.ellipse((1320, -160, 2460, 760), fill=(220, 236, 226))
    return Image.blend(im, glow.filter(ImageFilter.GaussianBlur(88)), 0.28)


def still(title: str, sub: str, dest: Path, portrait: bool = True) -> Path:
    im = place_founder(mint_bg()) if portrait else mint_bg()
    d = ImageDraw.Draw(im)
    fb = ImageFont.truetype(FONT_B, 22)
    ft = ImageFont.truetype(FONT_B, 72)
    fs = ImageFont.truetype(FONT_R, 28)
    d.text((88, 168), "STACKS", font=fb, fill=GREEN)
    d.multiline_text((88, 214), title, font=ft, fill=FG, spacing=8)
    d.multiline_text((88, 430), sub, font=fs, fill=MUTED, spacing=6)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, quality=93, optimize=True)
    return dest


def title_card(title: str, sub: str, dest: Path) -> Path:
    return still(title, sub, dest, portrait=False)


def main() -> None:
    intro = still("Hello.\nWelcome to Stacks.", "Built in Nigeria. Shipped on stacks.ng", STILL)
    Image.open(intro).save(OUT, quality=93, optimize=True, progressive=True)
    print("poster", OUT, OUT.stat().st_size)


if __name__ == "__main__":
    main()
