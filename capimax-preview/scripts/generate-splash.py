#!/usr/bin/env python3
"""Generate iOS apple-touch-startup-image splash screens.

iOS doesn't render the manifest's background_color the way Android does
(at least not pre-16.4) — it needs a literal PNG per device class for the
splash. Modern Chromium/Android uses the manifest just fine, so this is
strictly an iOS workaround.

We render one PNG per common iPhone/iPad portrait resolution. Each is a
solid navy background with the brand "C" mark centered and a small
wordmark below.

Run from the capimax-preview directory:
    python scripts/generate-splash.py
"""

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

NAVY_BG = (15, 23, 42)
EMERALD_LIGHT = (52, 211, 153)
EMERALD_DARK = (5, 150, 105)
WHITE = (255, 255, 255)

# A small set covers the bulk of modern iOS devices; iOS scales the
# closest match if an exact size is missing.
SPLASH_SIZES = [
    (640, 1136),   # iPhone SE / 5/5s/5c (older but still around)
    (750, 1334),   # iPhone 8 / 6 / 6s / SE 2nd
    (828, 1792),   # iPhone XR / 11
    (1125, 2436),  # iPhone X / Xs / 11 Pro
    (1170, 2532),  # iPhone 12 / 13 / 14
    (1284, 2778),  # iPhone Pro Max
    (1536, 2048),  # iPad mini / Air
    (1668, 2388),  # iPad Pro 11"
    (2048, 2732),  # iPad Pro 12.9"
]


def find_font(size_px: int):
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf",
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
    img = Image.new("RGB", (w, h), NAVY_BG)
    draw = ImageDraw.Draw(img)

    cx, cy = w // 2, h // 2
    # Logo size: ~22% of the shorter dimension
    short = min(w, h)
    mark_size = int(short * 0.22)
    radius = mark_size // 2
    stroke_w = max(int(mark_size * 0.14), 4)

    bbox = (cx - radius, cy - radius, cx + radius, cy + radius)
    # Open-C arc, mirrors the favicon mark.
    draw.arc(bbox, start=35, end=325, fill=EMERALD_LIGHT, width=stroke_w)

    # Inner ghost stroke
    inner_r = radius - stroke_w
    if inner_r > 0:
        draw.arc(
            (cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r),
            start=40, end=320, fill=WHITE, width=max(int(stroke_w * 0.25), 2),
        )

    # Accent dot at the opening of the C
    dot_r = max(int(mark_size * 0.04), 3)
    dx = cx + int(radius * 0.95)
    dy = cy - int(radius * 0.05)
    draw.ellipse((dx - dot_r, dy - dot_r, dx + dot_r, dy + dot_r),
                 fill=EMERALD_LIGHT)

    # Wordmark
    wordmark_size = int(short * 0.045)
    font = find_font(wordmark_size)
    text = "CAPIMAX RT"
    # Pillow ≥ 10 uses textbbox; fall back to textlength on older.
    try:
        tb = draw.textbbox((0, 0), text, font=font)
        tw, th = tb[2] - tb[0], tb[3] - tb[1]
    except Exception:
        tw = int(len(text) * wordmark_size * 0.55)
        th = wordmark_size
    tx = (w - tw) // 2
    ty = cy + radius + int(short * 0.05)
    draw.text((tx, ty), text, fill=WHITE, font=font)

    tagline_size = int(short * 0.025)
    tagline_font = find_font(tagline_size)
    tagline = "Tokenized Real Estate"
    try:
        tb = draw.textbbox((0, 0), tagline, font=tagline_font)
        tw2, _ = tb[2] - tb[0], tb[3] - tb[1]
    except Exception:
        tw2 = int(len(tagline) * tagline_size * 0.55)
    tx2 = (w - tw2) // 2
    ty2 = ty + th + int(short * 0.015)
    draw.text((tx2, ty2), tagline, fill=EMERALD_LIGHT, font=tagline_font)

    return img


def main() -> None:
    out_dir = Path(__file__).resolve().parent.parent / "public" / "splash"
    out_dir.mkdir(parents=True, exist_ok=True)
    for w, h in SPLASH_SIZES:
        img = draw_splash(w, h)
        path = out_dir / f"splash-{w}x{h}.png"
        img.save(path, optimize=True)
        print(f"  wrote {path.name}")
    print(f"\nDone. {len(SPLASH_SIZES)} splash screens in {out_dir}")


if __name__ == "__main__":
    main()
