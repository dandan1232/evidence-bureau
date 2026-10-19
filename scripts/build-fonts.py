"""Subset the official Noto SC variable fonts to the game's shipped text.

Install fonttools and brotli, then pass the downloaded Sans and Serif TTF paths.
Source and license links are recorded in public/fonts/README.md.
"""

import argparse
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sans", type=Path)
    parser.add_argument("serif", type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    sources = [*root.glob("src/**/*.tsx"), *root.glob("src/**/*.ts")]
    sources += list(root.glob("public/cases/**/locales/*.json"))
    text = "".join(path.read_text(encoding="utf-8") for path in sources)
    unicodes = {ord(char) for char in text}
    unicodes.update(range(0x20, 0x180))
    unicodes.update(range(0x2000, 0x2070))
    unicodes.update(range(0x3000, 0x3040))
    unicodes.update(range(0xFF00, 0xFFF0))

    for source, name in [(args.sans, "sans"), (args.serif, "serif")]:
        font = TTFont(source)
        options = subset.Options()
        options.flavor = "woff2"
        options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14, 16, 17]
        subsetter = subset.Subsetter(options)
        subsetter.populate(unicodes=unicodes)
        subsetter.subset(font)
        instantiateVariableFont(font, {"wght": (400, 700)}, inplace=True)
        font.flavor = "woff2"
        target = root / "public" / "fonts" / f"bureau-{name}-sc.woff2"
        font.save(target)
        print(f"{target.name}: {target.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
