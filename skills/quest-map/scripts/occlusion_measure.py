"""
occlusion_measure.py — OCR-based text coordinate detection for image-occlusion.

Usage:
  python occlusion_measure.py <image_path> [--annotate]

Output:
  - Image dimensions (naturalWidth x naturalHeight)
  - Detected text labels with pixel bbox + percentage coords
  - With --annotate: saves <image>_annotated.png for visual confirmation

Dependencies:
  pip install pillow pytesseract
  Plus Tesseract OCR engine:
    Windows: https://github.com/UB-Mannheim/tesseract/wiki
    macOS:   brew install tesseract
    Linux:   sudo apt install tesseract-ocr
"""

import sys
from pathlib import Path

def _check_deps():
    missing = []
    try:
        from PIL import Image
    except ImportError:
        missing.append("pillow")
    try:
        import pytesseract
    except ImportError:
        missing.append("pytesseract")
    if missing:
        print(f"ERROR: Missing packages: {', '.join(missing)}")
        print(f"  pip install {' '.join(missing)}")
        print()
        print("Also install Tesseract OCR engine:")
        print("  Windows: https://github.com/UB-Mannheim/tesseract/wiki")
        print("  macOS:   brew install tesseract")
        print("  Linux:   sudo apt install tesseract-ocr")
        sys.exit(1)

_check_deps()

from PIL import Image, ImageDraw
import pytesseract


def detect_elements(path: str, min_conf: int = 30) -> list[dict]:
    """Use pytesseract to detect text bounding boxes, grouping words per line."""
    img = Image.open(path)
    W, H = img.width, img.height
    data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)

    raw = []
    for i, text in enumerate(data['text']):
        text = text.strip()
        if not text or data['conf'][i] < min_conf:
            continue
        raw.append({
            'x': data['left'][i], 'y': data['top'][i],
            'w': data['width'][i], 'h': data['height'][i],
            'text': text, 'conf': data['conf'][i],
            'block': data['block_num'][i], 'line': data['line_num'][i],
        })

    # Group words on same line into single labels
    lines = {}
    for r in raw:
        key = (r['block'], r['line'])
        lines.setdefault(key, []).append(r)

    results = []
    for words in lines.values():
        x0 = min(w['x'] for w in words)
        y0 = min(w['y'] for w in words)
        x1 = max(w['x'] + w['w'] for w in words)
        y1 = max(w['y'] + w['h'] for w in words)
        label = ' '.join(w['text'] for w in words)
        avg_conf = sum(w['conf'] for w in words) // len(words)
        results.append({
            'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0,
            'x_pct': round(x0 * 100 / W), 'y_pct': round(y0 * 100 / H),
            'w_pct': round((x1 - x0) * 100 / W), 'h_pct': round((y1 - y0) * 100 / H),
            'type': 'text_label', 'label': label, 'conf': avg_conf,
        })

    results.sort(key=lambda e: (e['y'], e['x']))
    return results


def annotate_image(path: str, elements: list[dict], out_path: str | None = None):
    img = Image.open(path).convert('RGBA')
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    colors = [(255, 80, 80), (80, 200, 80), (80, 80, 255),
              (255, 180, 0), (180, 0, 255), (0, 200, 200)]
    for i, el in enumerate(elements):
        c = colors[i % len(colors)]
        x, y, w, h = el['x'], el['y'], el['w'], el['h']
        draw.rectangle([x, y, x + w, y + h], fill=c + (60,), outline=c + (220,), width=3)
        tag = f"[{i}] \"{el['label']}\" x={x} y={y}"
        draw.rectangle([x, max(0, y - 22), x + len(tag) * 7, y], fill=(0, 0, 0, 180))
        draw.text((x + 2, max(0, y - 20)), tag, fill=(255, 255, 255, 255))

    combined = Image.alpha_composite(img, overlay).convert('RGB')
    if out_path is None:
        p = Path(path)
        out_path = str(p.parent / (p.stem + '_annotated.png'))
    combined.save(out_path)
    return out_path


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python occlusion_measure.py <image_path> [--annotate]")
        sys.exit(1)

    path = sys.argv[1]
    annotate = '--annotate' in sys.argv

    img = Image.open(path)
    W, H = img.width, img.height
    print(f"\nImage: {path}")
    print(f"naturalWidth={W}  naturalHeight={H}\n")

    elements = detect_elements(path)
    print(f"Detected {len(elements)} text labels:\n")
    for i, el in enumerate(elements):
        print(f"  [{i}] \"{el['label']}\"  (conf={el['conf']})")
        print(f"       pixel:  x={el['x']} y={el['y']} w={el['w']} h={el['h']}")
        print(f"       pct:    left={el['x_pct']}% top={el['y_pct']}% w={el['w_pct']}% h={el['h_pct']}%")
        print()

    if annotate:
        out = annotate_image(path, elements)
        print(f"Annotated image saved: {out}")
