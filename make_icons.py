"""Draw the app icons (PNG, no libraries): a blue square with a white magnifier.

    python make_icons.py
"""
import struct
import zlib
from pathlib import Path

NAVY, GOLD = (29, 78, 216), (255, 255, 255)


def pixel(x, y, n):
    u, v = x / n, y / n
    # lens ring
    cx, cy, r_out, r_in = 0.44, 0.44, 0.24, 0.16
    d = ((u - cx) ** 2 + (v - cy) ** 2) ** 0.5
    if r_in <= d <= r_out:
        return GOLD
    # handle: a thick diagonal bar from the ring to the lower right
    t = (u - 0.6) + (v - 0.6)
    along = (u - 0.6) - (v - 0.6)
    if 0 <= t * 0.5 + 0.0 and abs(along) < 0.06 and 0.58 <= (u + v) / 2 <= 0.82:
        return GOLD
    return NAVY


def png(n):
    raw = b"".join(b"\x00" + b"".join(bytes(pixel(x, y, n)) for x in range(n)) for y in range(n))

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", n, n, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


if __name__ == "__main__":
    out = Path(__file__).parent / "assets"
    out.mkdir(exist_ok=True)
    for size in (192, 512):
        (out / f"icon-{size}.png").write_bytes(png(size))
        print("wrote", out / f"icon-{size}.png")
