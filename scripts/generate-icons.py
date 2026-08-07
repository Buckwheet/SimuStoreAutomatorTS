#!/usr/bin/env python3
"""Generate the SimuStore Automator extension icons.

Design: dark rounded square (matches the panel theme #343a40), a gold coin
sitting in a light-gray shopping cart. Pure geometric shapes - no fonts.

Usage: python scripts/generate-icons.py
Output: chrome-extension/icon48.png, chrome-extension/icon128.png
"""

from PIL import Image, ImageDraw

PANEL_BG = "#343a40"
COIN_GOLD = "#f0b429"
COIN_DARK = "#d39e00"
CART_LIGHT = "#f8f9fa"
WHEEL_GRAY = "#adb5bd"


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = size / 128.0  # scale factor, design is authored at 128x128

    def r(v: float) -> int:
        return int(round(v * s))

    # Background: dark rounded square
    d.rounded_rectangle(
        [0, 0, size - 1, size - 1], radius=r(26), fill=PANEL_BG
    )

    # Cart basket (rounded rect) + handle
    d.rounded_rectangle(
        [r(30), r(78), r(98), r(112)], radius=r(10), fill=CART_LIGHT
    )
    d.line([(r(98), r(78)), (r(98), r(60))], fill=CART_LIGHT, width=r(9))
    d.line([(r(98), r(60)), (r(86), r(60))], fill=CART_LIGHT, width=r(9))

    # Wheels
    d.ellipse([r(42), r(110), r(58), r(126)], fill=WHEEL_GRAY)
    d.ellipse([r(72), r(110), r(88), r(126)], fill=WHEEL_GRAY)

    # Gold coin resting on the basket
    d.ellipse([r(46), r(36), r(84), r(74)], fill=COIN_GOLD)
    d.ellipse([r(52), r(42), r(78), r(68)], fill=COIN_DARK)

    return img


def main() -> None:
    for size in (48, 128):
        out = f"chrome-extension/icon{size}.png"
        draw_icon(size).save(out)
        print(f"wrote {out}")


if __name__ == "__main__":
    main()
