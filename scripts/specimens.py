# /// script
# requires-python = ">=3.11"
# dependencies = ["fonttools", "brotli", "uharfbuzz"]
# ///
"""Draw the specimens from the fonts their projects ship, into content/specimens.json.

Run: uv run scripts/specimens.py <projects-root>
"""

import io
import json
import sys
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

SPECIMENS = {
    "tangut": ("\U00018164", "Philology/tangut-input/app/public/fonts/NotoSerifTangut-Regular.woff2"),
    "jurchen": ("\U00018E01", "Philology/jurchen-input/app/public/fonts/AlariXuwasunJurchen-Regular.woff2"),
    "khitan": ("\U00018B67", "Philology/khitan-input/app/public/fonts/NotoSerifKhitanSmallScript-Regular.woff2"),
    "han": ("字", "Fonts/genzui/releases/v0.114/GenZuiSerif-Regular.ttf"),
    "hangul": ("ᄊᆞ", "Korean/old-hangul-note/public/fonts/NanumMyeongjo-YetHangul.woff2"),
    "kana": ("\U0001B127", "Philology/tangut-input/fonts/Kureedo-Regular.woff2"),
    "ainu": ("ㇷ゚", "Philology/tangut-input/fonts/Kureedo-Regular.woff2"),
    "across": ("字か", "Fonts/genzui/releases/v0.114/GenZuiSerif-Regular.ttf"),
    "layout": ("訓", "Fonts/genzui/releases/v0.114/GenZuiSerif-Regular.ttf"),
}


def draw(text: str, path: Path) -> dict[str, str]:
    font = TTFont(path)
    buffer = io.BytesIO()
    font.flavor = None
    font.save(buffer)
    face = hb.Face(buffer.getvalue())
    shaper = hb.Font(face)
    run = hb.Buffer()
    run.add_str(text)
    run.guess_segment_properties()
    hb.shape(shaper, run)

    glyphs = font.getGlyphSet()
    order = font.getGlyphOrder()
    placed = []
    x = 0
    for info, pos in zip(run.glyph_infos, run.glyph_positions):
        placed.append((order[info.codepoint], x + pos.x_offset, pos.y_offset))
        x += pos.x_advance

    bounds = BoundsPen(glyphs)
    for name, dx, dy in placed:
        glyphs[name].draw(TransformPen(bounds, (1, 0, 0, 1, dx, dy)))
    x0, y0, x1, y1 = bounds.bounds

    pen = SVGPathPen(glyphs, ntos=lambda v: f"{v:.0f}")
    for name, dx, dy in placed:
        glyphs[name].draw(TransformPen(pen, (1, 0, 0, -1, dx, -dy)))
    # A square box around the ink, so that every specimen sits at one size.
    side = max(x1 - x0, y1 - y0)
    left = (x0 + x1 - side) / 2
    top = -(y0 + y1 + side) / 2
    return {"viewBox": f"{left:.0f} {top:.0f} {side:.0f} {side:.0f}", "d": pen.getCommands()}


def main() -> None:
    root = Path(sys.argv[1])
    drawn = {key: draw(text, root / font) for key, (text, font) in SPECIMENS.items()}
    out = Path(__file__).parent.parent / "content/specimens.json"
    out.write_text(json.dumps(drawn, ensure_ascii=False) + "\n")


main()
