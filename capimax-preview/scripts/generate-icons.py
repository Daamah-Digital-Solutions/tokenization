#!/usr/bin/env python3
"""
Generate Capimax RT PWA icons.

Creates a square emerald-on-navy icon containing the Capimax "C"
mark in all sizes the manifest lists, plus a maskable variant for
each size (with a generous safe zone so Android's circular/squircle
mask won't crop the mark).

Run from the capimax-preview directory:
    python scripts/generate-icons.py

Output: public/icons/icon-{size}.png  (square / standard)
        public/icons/maskable-{size}.png (with safe-zone padding)
        public/icons/apple-touch-icon.png (180x180, no mask)

The icon is rendered with Pillow only — no SVG renderer required.
"""

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Brand palette (mirrors tailwind.config.js + manifest.json)
NAVY_DARK = (10, 41, 40)        # #0A2928 — the dark mark color from favicon.svg
NAVY_BG = (15, 23, 42)          # #0f172a — manifest background
EMERALD_DARK = (5, 150, 105)    # #059669
EMERALD_LIGHT = (52, 211, 153)  # #34d399
WHITE = (255, 255, 255)

SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
MASKABLE_SIZES = [192, 512]


def vertical_gradient(w: int, h: int, top: tuple, bottom: tuple) -> Image.Image:
    """Vertical linear gradient between two RGB colors."""
    base = Image.new("RGB", (w, h), top)
    for y in range(h):
        t = y / max(h - 1, 1)
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        for x in range(w):
            base.putpixel((x, y), (r, g, b))
    return base


def gradient_fast(w: int, h: int, top: tuple, bottom: tuple) -> Image.Image:
    """Faster vertical gradient using horizontal strip blit."""
    base = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / max(h - 1, 1)
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        base.putpixel((0, y), (r, g, b))
    return base.resize((w, h))


def rounded_rect_mask(size: int, radius: int) -> Image.Image:
    """Black-on-white rounded-square mask (L mode)."""
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def find_font(size_px: int) -> ImageFont.FreeTypeFont:
    """Try to find a bold sans serif; fall back to default."""
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size_px)
            except OSError:
                continue
    return ImageFont.load_default()


def draw_icon(size: int, *, maskable: bool = False) -> Image.Image:
    """Draw a single icon at the given size."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    # Background: rounded square for standard icon, full bleed for maskable
    if maskable:
        bg = gradient_fast(size, size, EMERALD_DARK, NAVY_BG).convert("RGBA")
        img.paste(bg, (0, 0))
    else:
        radius = int(size * 0.22)  # iOS-ish corner radius
        bg = gradient_fast(size, size, EMERALD_DARK, NAVY_BG).convert("RGBA")
        mask = rounded_rect_mask(size, radius)
        img.paste(bg, (0, 0), mask)

    draw = ImageDraw.Draw(img)

    # Safe zone — maskable icons need ~80% inner content area
    inner_pad = int(size * 0.18) if maskable else int(size * 0.08)
    inner_size = size - 2 * inner_pad

    # The "C" mark (Capimax) — drawn as a heavy circle arc to mimic the
    # logo's open-C in favicon.svg, with a glowing emerald stroke and a
    # white inner accent stroke.
    stroke_w = max(int(inner_size * 0.16), 3)
    cx, cy = size // 2, size // 2
    radius = inner_size // 2 - stroke_w // 2

    # Outer emerald stroke
    bbox = (cx - radius, cy - radius, cx + radius, cy + radius)
    draw.arc(bbox, start=35, end=325, fill=EMERALD_LIGHT, width=stroke_w)

    # Inner white highlight stroke — slightly inset
    inner_radius = radius - stroke_w // 2 - max(2, stroke_w // 6)
    if inner_radius > 0:
        inner_bbox = (cx - inner_radius, cy - inner_radius,
                      cx + inner_radius, cy + inner_radius)
        inset_stroke = max(int(stroke_w * 0.28), 2)
        draw.arc(inner_bbox, start=40, end=320, fill=WHITE, width=inset_stroke)

    # Small accent dot at the opening of the C — the "tokenization" node
    dot_radius = max(int(inner_size * 0.06), 3)
    dx = cx + int(radius * 0.95)
    dy = cy - int(radius * 0.05)
    draw.ellipse(
        (dx - dot_radius, dy - dot_radius, dx + dot_radius, dy + dot_radius),
        fill=EMERALD_LIGHT,
    )

    return img


def main() -> None:
    here = Path(__file__).resolve().parent
    out_dir = here.parent / "public" / "icons"
    out_dir.mkdir(parents=True, exist_ok=True)

    for s in SIZES:
        icon = draw_icon(s, maskable=False)
        path = out_dir / f"icon-{s}.png"
        icon.save(path, optimize=True)
        print(f"  wrote {path.name} ({s}x{s})")

    for s in MASKABLE_SIZES:
        icon = draw_icon(s, maskable=True)
        path = out_dir / f"maskable-{s}.png"
        icon.save(path, optimize=True)
        print(f"  wrote {path.name} ({s}x{s} maskable)")

    # Apple touch icon — 180x180, opaque background for iOS home screens.
    apple = draw_icon(180, maskable=False)
    apple_bg = Image.new("RGBA", (180, 180), NAVY_BG + (255,))
    apple_bg.alpha_composite(apple)
    apple_bg.convert("RGB").save(out_dir / "apple-touch-icon.png", optimize=True)
    print("  wrote apple-touch-icon.png (180x180)")

    print(f"\nDone. {len(SIZES) + len(MASKABLE_SIZES) + 1} icons in {out_dir}")


if __name__ == "__main__":
    main()
