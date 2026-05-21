#!/usr/bin/env python3
"""
Generate Capimax RT PWA icons.

Source-of-truth: public/icon-source.svg — the brand mark (open-C + three
white slashes) on a navy-emerald gradient background, designed at 512×512
with a maskable-friendly safe inset.

We render that one SVG to every size in the manifest plus a maskable
variant. Rendering uses resvg-py (statically-linked Rust resvg binding)
so we don't need cairo on Windows.

Run from the capimax-preview directory:
    python scripts/generate-icons.py

Output:
  public/icons/icon-{size}.png          (rounded — used in the manifest)
  public/icons/maskable-{size}.png      (full-bleed for Android masks)
  public/icons/apple-touch-icon.png     (180×180, no rounding — iOS rounds)
"""

import os
from pathlib import Path

import resvg_py
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "icon-source.svg"
OUT = ROOT / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
MASKABLE_SIZES = [192, 512]


def render_svg(size: int) -> Image.Image:
    """Render the SVG to a Pillow RGBA image at `size × size`."""
    with open(SRC, "rb") as fh:
        svg = fh.read().decode()
    png_bytes = resvg_py.svg_to_bytes(svg_string=svg, width=size, height=size)
    from io import BytesIO
    return Image.open(BytesIO(bytes(png_bytes))).convert("RGBA")


def rounded_mask(size: int, radius: int) -> Image.Image:
    """L-mode rounded-square mask used for the non-maskable PWA icons."""
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size - 1, size - 1), radius=radius, fill=255,
    )
    return mask


def write_standard(size: int) -> None:
    """Standard icon: rounded square, alpha outside the rounding."""
    img = render_svg(size)
    # iOS-ish corner radius — keeps the visual identity consistent whether
    # the OS rounds the icon itself or trusts our masking.
    radius = int(size * 0.22)
    mask = rounded_mask(size, radius)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    out.save(OUT / f"icon-{size}.png", optimize=True)


def write_maskable(size: int) -> None:
    """Maskable icon: full-bleed background, no rounding. Android applies its
    own mask (circle / squircle / rounded-square). The SVG already includes
    a generous safe zone so even an aggressive circle mask won't crop the
    marks."""
    img = render_svg(size)
    img.save(OUT / f"maskable-{size}.png", optimize=True)


def write_apple_touch_icon() -> None:
    """Apple touch icon: 180×180, opaque navy background, no rounding (iOS
    applies its own corner radius). Saved as RGB, not RGBA, to avoid the
    "this icon has transparency" warning some iOS versions show."""
    img = render_svg(180)
    # Flatten onto opaque navy so iOS's rounding doesn't leak the homescreen
    # wallpaper through any transparent edge pixels.
    bg = Image.new("RGB", (180, 180), (15, 23, 42))
    bg.paste(img, (0, 0), img)
    bg.save(OUT / "apple-touch-icon.png", optimize=True)


def main() -> None:
    for s in SIZES:
        write_standard(s)
        print(f"  wrote icon-{s}.png")
    for s in MASKABLE_SIZES:
        write_maskable(s)
        print(f"  wrote maskable-{s}.png")
    write_apple_touch_icon()
    print("  wrote apple-touch-icon.png (180x180)")

    print(f"\nDone. {len(SIZES) + len(MASKABLE_SIZES) + 1} icons in {OUT}")


if __name__ == "__main__":
    main()
