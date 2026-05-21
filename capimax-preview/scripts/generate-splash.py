#!/usr/bin/env python3
"""Generate iOS apple-touch-startup-image splash screens.

iOS doesn't render the manifest's background_color reliably (pre-16.4) so
we ship one PNG per common device class. The splash uses the same brand
SVG as the icons (icon-source.svg) centred on a navy background, with
"CAPIMAX TOKENIZATION" wordmark below.

Run from the capimax-preview directory:
    python scripts/generate-splash.py
"""

import os
from pathlib import Path
from io import BytesIO

import resvg_py
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ICON_SRC = ROOT / "public" / "icon-source.svg"
OUT = ROOT / "public" / "splash"
OUT.mkdir(parents=True, exist_ok=True)

NAVY_BG = (15, 23, 42)
EMERALD_LIGHT = (52, 211, 153)
WHITE = (255, 255, 255)

SPLASH_SIZES = [
    (640, 1136),   # iPhone SE / 5/5s/5c
    (750, 1334),   # iPhone 8 / 6 / 6s / SE 2nd
    (828, 1792),   # iPhone XR / 11
    (1125, 2436),  # iPhone X / Xs / 11 Pro
    (1170, 2532),  # iPhone 12 / 13 / 14
    (1284, 2778),  # iPhone Pro Max
    (1536, 2048),  # iPad mini / Air
    (1668, 2388),  # iPad Pro 11"
    (2048, 2732),  # iPad Pro 12.9"
]


def render_mark(size: int) -> Image.Image:
    with open(ICON_SRC, "rb") as fh:
        svg = fh.read().decode()
    png_bytes = resvg_py.svg_to_bytes(svg_string=svg, width=size, height=size)
    return Image.open(BytesIO(bytes(png_bytes))).convert("RGBA")


def find_font(size_px: int):
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size_px)
            except OSError:
                continue
    return ImageFont.load_default()


def draw_splash(w: int, h: int) -> Image.Image:
    canvas = Image.new("RGB", (w, h), NAVY_BG)

    # Mark sized to 22% of the shorter dimension, centred at 45% of the height
    # so the wordmark below feels balanced (pure center always reads "too low").
    short = min(w, h)
    mark_size = int(short * 0.22)
    mark = render_mark(mark_size)

    cx = w // 2
    cy = int(h * 0.45)
    canvas.paste(mark, (cx - mark_size // 2, cy - mark_size // 2), mark)

    # Wordmark + tagline
    draw = ImageDraw.Draw(canvas)
    wordmark_size = int(short * 0.045)
    font = find_font(wordmark_size)
    text = "CAPIMAX RT"
    try:
        tb = draw.textbbox((0, 0), text, font=font)
        tw, th = tb[2] - tb[0], tb[3] - tb[1]
    except Exception:
        tw, th = int(len(text) * wordmark_size * 0.55), wordmark_size
    tx = (w - tw) // 2
    ty = cy + mark_size // 2 + int(short * 0.04)
    draw.text((tx, ty), text, fill=WHITE, font=font)

    tagline_size = int(short * 0.025)
    tagline_font = find_font(tagline_size)
    tagline = "Tokenized Real Estate"
    try:
        tb = draw.textbbox((0, 0), tagline, font=tagline_font)
        tw2 = tb[2] - tb[0]
    except Exception:
        tw2 = int(len(tagline) * tagline_size * 0.55)
    tx2 = (w - tw2) // 2
    ty2 = ty + th + int(short * 0.015)
    draw.text((tx2, ty2), tagline, fill=EMERALD_LIGHT, font=tagline_font)

    return canvas


def main() -> None:
    for w, h in SPLASH_SIZES:
        img = draw_splash(w, h)
        path = OUT / f"splash-{w}x{h}.png"
        img.save(path, optimize=True)
        print(f"  wrote {path.name}")
    print(f"\nDone. {len(SPLASH_SIZES)} splash screens in {OUT}")


if __name__ == "__main__":
    main()
