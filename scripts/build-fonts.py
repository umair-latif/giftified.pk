#!/usr/bin/env python3
"""
Builds the browser copies of the print fonts (task 16, editor <-> print parity).

The server TTFs in src/server/print/fonts/<dir>/ are the single source of
truth. This script
  1. subsets the Liberation fonts to the same Latin set task 06 used for
     Poppins/Playfair/Caveat (drops hinting: nothing else we ship is hinted,
     and unhinted outlines keep browser and node-canvas advances identical),
  2. writes each TTF, unchanged apart from the container, as WOFF2 to
     public/fonts/print/<dir>/<same name>.woff2 (WOFF2 is lossless: same
     glyphs, same metrics), and copies OFL.txt next to them.

Idempotent. Needs fonttools + brotli:  pip install fonttools brotli
  python3 scripts/build-fonts.py
"""
from pathlib import Path
import shutil

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src/server/print/fonts"
OUT = ROOT / "public/fonts/print"

# Task 06's Latin subset: ASCII, Latin-1 and typographic punctuation.
LATIN = (
    list(range(0x20, 0x7F))
    + list(range(0xA0, 0x100))
    + [0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E, 0x2026]
)


def subset_latin(path: Path) -> None:
    opts = subset.Options()
    opts.hinting = False
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.name_languages = ["*"]
    opts.notdef_outline = True
    opts.drop_tables += ["FFTM"]
    font = TTFont(path, recalcTimestamp=False)
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=LATIN)
    sub.subset(font)
    font.save(path)


def add_urdu_space(path: Path) -> None:
    """
    The Nastaliq subset (Arabic block only) has no space glyph, so spaces fell
    back to a DIFFERENT system font in the browser and in node-canvas, and Urdu
    lines wrapped differently. Adds an empty `space` glyph (U+0020, U+00A0)
    with Noto Nastaliq Urdu's own advance (132/1000 em, from the upstream
    Regular's Latin subset, @fontsource/noto-nastaliq-urdu 5.3.0).
    """
    font = TTFont(path, recalcTimestamp=False)
    if 0x20 in font.getBestCmap():
        return
    from fontTools.pens.ttGlyphPen import TTGlyphPen

    order = font.getGlyphOrder() + ["space"]
    font.setGlyphOrder(order)
    font["glyf"].glyphs["space"] = TTGlyphPen(None).glyph()
    font["glyf"].glyphOrder = order
    font["hmtx"].metrics["space"] = (132, 0)
    for table in font["cmap"].tables:
        if table.isUnicode():
            table.cmap[0x20] = "space"
            table.cmap[0xA0] = "space"
    font.save(path)


def drop_space_kerning(path: Path) -> None:
    """
    Chrome never kerns across a space (it shapes word by word); Pango
    (node-canvas) applies the font's space kern pairs. Playfair and Liberation
    Sans have some (e.g. "y" + space), which made lines up to 0.4% wider in
    the browser than in the print. Removing those pairs makes both sides
    identical. Only glyph-pair (format 1) PairPos subtables contain them here.
    """
    font = TTFont(path, recalcTimestamp=False)
    space = font.getBestCmap().get(0x20)
    changed = False
    if space and "GPOS" in font:
        for lookup in font["GPOS"].table.LookupList.Lookup:
            for st in lookup.SubTable:
                if lookup.LookupType == 9:
                    st = st.ExtSubTable
                if getattr(st, "LookupType", lookup.LookupType) != 2:
                    continue
                if st.Format == 1:
                    glyphs = st.Coverage.glyphs
                    keep = [i for i, g in enumerate(glyphs) if g != space]
                    if len(keep) != len(glyphs):
                        st.Coverage.glyphs = [glyphs[i] for i in keep]
                        st.PairSet = [st.PairSet[i] for i in keep]
                        st.PairSetCount = len(st.PairSet)
                        changed = True
                    for ps in st.PairSet:
                        recs = [r for r in ps.PairValueRecord if r.SecondGlyph != space]
                        if len(recs) != len(ps.PairValueRecord):
                            ps.PairValueRecord = recs
                            ps.PairValueCount = len(recs)
                            changed = True
                elif space in st.Coverage.glyphs or st.ClassDef2.classDefs.get(space):
                    raise SystemExit(f"{path.name}: class-based space kerning, handle it")
    if space and "kern" in font:
        for table in font["kern"].kernTables:
            pairs = {k: v for k, v in table.kernTable.items() if space not in k}
            if len(pairs) != len(table.kernTable):
                table.kernTable = pairs
                changed = True
    if changed:
        font.save(path)


def main() -> None:
    for ttf in sorted((SRC / "liberation").glob("*.ttf")):
        subset_latin(ttf)
    add_urdu_space(SRC / "noto-nastaliq-urdu/NotoNastaliqUrdu-Regular.ttf")
    for ttf in sorted(SRC.glob("*/*.ttf")):
        drop_space_kerning(ttf)
    if OUT.exists():
        shutil.rmtree(OUT)
    for ttf in sorted(SRC.glob("*/*.ttf")):
        dest = OUT / ttf.parent.name / (ttf.stem + ".woff2")
        dest.parent.mkdir(parents=True, exist_ok=True)
        font = TTFont(ttf, recalcTimestamp=False)
        font.flavor = "woff2"
        font.save(dest)
        shutil.copy(ttf.parent / "OFL.txt", dest.parent / "OFL.txt")
        print(f"{dest.relative_to(ROOT)}  {dest.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
