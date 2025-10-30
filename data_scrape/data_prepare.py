#!/usr/bin/env python3
"""Extract elements under the element with id="a-page" from Wayback HTML files
and write a CSV with fields including xpath and bounding-box (if found in inline style).

Usage:
    python data_prepare.py --input ./wayback_html --output ./elements.csv

Dependencies: beautifulsoup4
    pip install beautifulsoup4
"""

__version__ = "2.0.0"

import argparse
import csv
import os
import re
from bs4 import BeautifulSoup


def parse_style_bbox(style: str):
    """Parse inline CSS style for left/top/width/height (px). Returns dict with x,y,width,height or empty strings."""
    if not style:
        return {"x": "", "y": "", "width": "", "height": ""}
    # simple regex to capture numbers before 'px' for left/top/width/height
    def find_px(key):
        m = re.search(rf"{key}\s*:\s*([\-\d\.]+)px", style, flags=re.IGNORECASE)
        return m.group(1) if m else ""

    return {
        "x": find_px("left") or find_px("x") or "",
        "y": find_px("top") or find_px("y") or "",
        "width": find_px("width"),
        "height": find_px("height"),
    }


def element_xpath(el):
    """Compute a simple absolute XPath for a BeautifulSoup Tag.
    This counts siblings with the same tag name to form indexes.
    """
    parts = []
    current = el
    while current is not None and getattr(current, "name", None):
        parent = current.parent
        # count previous siblings with same tag name
        index = 1
        if parent is not None:
            for sib in current.previous_siblings:
                if getattr(sib, "name", None) == current.name:
                    index += 1
        part = f"{current.name}"
        if index > 1:
            part += f"[{index}]"
        parts.insert(0, part)
        current = parent
    return "/" + "/".join(parts)


def find_page_url(soup: BeautifulSoup):
    # common places to find the original page URL
    tag = soup.find("link", rel="canonical")
    if tag and tag.get("href"):
        return tag.get("href")
    tag = soup.find("meta", property="og:url")
    if tag and tag.get("content"):
        return tag.get("content")
    tag = soup.find("base")
    if tag and tag.get("href"):
        return tag.get("href")
    return ""


def process_file(path: str):
    with open(path, "r", encoding="utf-8", errors="ignore") as fh:
        txt = fh.read()
    soup = BeautifulSoup(txt, "html.parser")

    # Find the main container
    container = soup.find(id="a-page") or soup.find(id="container") or soup.find(class_="content")
    if not container:
        print("No container found.")
        return []
    page_url = find_page_url(soup)
    rows = []
    # iterate descendants that are tags
    elements = list(container.find_all(True))
    for idx, el in enumerate(elements, start=1):
        el_id = el.get("id", "")
        tag_name = el.name
        text = (el.get_text(" ", strip=True) or "")
        class_name = " ".join(el.get("class", [])) if el.get("class") else ""
        bbox = parse_style_bbox(el.get("style", ""))
        xpath = element_xpath(el)
        rows.append({
            "uid": f"{idx:03d}",
            "element_id": el_id,
            "tag_name": tag_name,
            "text_content": text,
            "class_name": class_name,
            "x": bbox["x"],
            "y": bbox["y"],
            "width": bbox["width"],
            "height": bbox["height"],
            "xpath": xpath,
            "page_url": page_url,
            "source_file": os.path.basename(path),
        })
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", "-i", default=os.path.join(os.path.dirname(__file__), 'wayback_html'), help="input folder with saved snapshots")
    ap.add_argument("--output", "-o", default=os.path.join(os.path.dirname(__file__), 'elements.csv'), help="output CSV file")
    args = ap.parse_args()

    input_dir = args.input
    out_csv = args.output

    files = sorted(
        [os.path.join(input_dir, f) for f in os.listdir(input_dir) if f.lower().endswith(".html")]
    )
    if not files:
        print(f"No HTML files found in {input_dir}")
        return

    fieldnames = [
        "uid",
        "element_id",
        "tag_name",
        "text_content",
        "class_name",
        "x",
        "y",
        "width",
        "height",
        "xpath",
        "page_url",
        "source_file",
    ]

    file_exists = os.path.exists(out_csv)
    write_header = True
    # Only write header if file does not exist or is empty
    if file_exists:
        try:
            write_header = os.path.getsize(out_csv) == 0
        except Exception:
            write_header = True
    total = 0
    with open(out_csv, "a", newline="", encoding="utf-8") as outfh:
        writer = csv.DictWriter(outfh, fieldnames=fieldnames)
        if write_header:
            writer.writeheader()
        for fp in files:
            try:
                rows = process_file(fp)
                for r in rows:
                    writer.writerow(r)
                total += len(rows)
                if rows:
                    print(f"Wrote {len(rows)} elements from {os.path.basename(fp)}")
            except Exception as e:
                print(f"Error processing {fp}: {e}")

    print(f"Done. Wrote {total} rows to {out_csv}")


if __name__ == "__main__":
    main()
