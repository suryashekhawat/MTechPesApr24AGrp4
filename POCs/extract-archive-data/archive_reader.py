import argparse
import json
import os
import sys
import uuid
import random
import requests
import datetime
from pathlib import Path
from urllib.parse import urlparse, quote
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
import pandas as pd


def fetch_snapshots(url: str, year: int, limit: int = 1000):
    """
    Query Wayback Machine CDX API for snapshots of a given URL for a specific year.
    
    Args:
        url: Target URL to fetch snapshots for
        year: Year to query snapshots from
        limit: Maximum number of results to return
        
    Returns:
        List of unique snapshot records
    """
    from_date = f"{year}0101000000"
    to_date = f"{year}1231235959"
    
    api_url = (
        f"https://web.archive.org/cdx/search/cdx?url={quote(url)}&output=json"
        f"&filter=statuscode:200&from={from_date}&to={to_date}&limit={limit}"
    )
    
    try:
        response = requests.get(api_url, timeout=30)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"❌ Failed to fetch snapshots for {year}: {e}", file=sys.stderr)
        return []
    
    if not data or len(data) < 2:
        print(f"⚠️ No snapshots found for {year}.")
        return []
    
    header, *rows = data
    result = [dict(zip(header, row)) for row in rows]
    
    # Deduplicate identical digests
    seen = set()
    unique = []
    for item in result:
        digest = item.get("digest")
        if digest and digest not in seen:
            seen.add(digest)
            unique.append(item)
    
    print(f"✅ {len(unique)} unique snapshots found for {year}.")
    return unique


def filter_snapshots_by_pattern(snapshots, mode="random", specific_days=None):
    """
    Filter snapshots by random/alternate months and optional specific dates.
    
    Args:
        snapshots: List of snapshot records with 'timestamp' field
        mode: Selection mode - "random", "alternate", or "all"
        specific_days: Optional list of days of month to include
        
    Returns:
        Filtered list of snapshot records
    """
    if not snapshots:
        return []
    
    df = pd.DataFrame(snapshots)
    df["date"] = df["timestamp"].apply(lambda t: datetime.datetime.strptime(t, "%Y%m%d%H%M%S"))
    df["month"] = df["date"].dt.month
    df["day"] = df["date"].dt.day
    
    months = sorted(df["month"].unique())
    if mode == "alternate":
        selected_months = months[::2]
    elif mode == "random":
        selected_months = random.sample(months, max(1, len(months) // 2)) if months else []
    else:
        selected_months = months
    
    filtered = df[df["month"].isin(selected_months)]
    
    if specific_days:
        filtered = filtered[filtered["day"].isin(specific_days)]
    
    # Drop temporary columns used for filtering (date, month, day) before converting to dict
    # Keep only the original columns from the snapshot records
    columns_to_drop = ["date", "month", "day"]
    filtered = filtered.drop(columns=[col for col in columns_to_drop if col in filtered.columns])
    
    # Convert to dict and ensure all values are JSON-serializable
    result = filtered.to_dict(orient="records")
    
    # Convert any remaining pandas Timestamp objects to strings
    for record in result:
        for key, value in record.items():
            if isinstance(value, pd.Timestamp):
                record[key] = value.isoformat()
            elif pd.isna(value):
                record[key] = None
    
    return result


def capture_elements(url: str, output_file: str = "elements.json", flatten: bool = False):
    """
    Capture web elements and metadata from a given URL using Playwright.
    
    Args:
        url: Web URL to capture elements from
        output_file: Path to save the JSON output file
        flatten: Whether to also create a flattened CSV version
    """
    # Validate URL
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        raise ValueError(f"Invalid URL: {url}. Must include scheme (http/https)")
    
    img_dir = "elements_img"
    os.makedirs(img_dir, exist_ok=True)

    # Get the directory where this script is located
    script_dir = Path(__file__).parent
    js_file_path = script_dir / "element_capture.js"
    
    if not js_file_path.exists():
        raise FileNotFoundError(f"JavaScript file not found: {js_file_path}")

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False)
            page = browser.new_page()

            try:
                print(f"Navigating to {url} ...")
                page.goto(url, timeout=180000, wait_until="domcontentloaded")
            except PlaywrightTimeout:
                print(f"⚠️ Timeout while loading {url}. Proceeding with partial content...")

            page.wait_for_timeout(5000)

            # Load external JavaScript from file
            with open(js_file_path, "r", encoding="utf-8") as js_file:
                js_script = js_file.read()

            elements = page.evaluate(js_script)
            enriched_elements = []

            for i, el in enumerate(elements):
                print(f"Processing element {i} with XPath: {el.get('xpath')}")
                uid = str(uuid.uuid4())
                el['uid'] = uid
                enriched_elements.append(el)

            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(enriched_elements, f, indent=2, ensure_ascii=False)

            print(
                f"✅ Captured {len(enriched_elements)} elements using XPath with scrolling and visibility check. JSON -> {output_file}, images -> {img_dir}"
            )
            
            # Close browser before context manager exits (though context manager will handle it)
            browser.close()
            
        # Flatten outside the Playwright context to avoid event loop issues
        if flatten:
            flatten_elements_recursive(output_file, "elements_flat.csv")
                
    except Exception as e:
        print(f"❌ Error during capture: {e}", file=sys.stderr)
        raise


def capture_from_snapshots(snapshots: list, output_dir: str = "captured_data", flatten: bool = False):
    """
    Capture elements from Wayback Machine snapshots.
    
    Args:
        snapshots: List of snapshot records with 'timestamp' and 'original' fields
        output_dir: Directory to save captured element files
        flatten: Whether to also create flattened CSV files
    """
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    if not snapshots:
        print("⚠️ No snapshots found.")
        return
    
    print(f"📋 Processing {len(snapshots)} snapshots...")
    
    successful = 0
    failed = 0
    
    for i, snapshot in enumerate(snapshots, 1):
        timestamp = snapshot.get("timestamp")
        original_url = snapshot.get("original")
        
        if not timestamp or not original_url:
            print(f"⚠️ Skipping snapshot {i}: missing timestamp or original URL")
            failed += 1
            continue
        
        # Construct Wayback Machine URL
        wayback_url = f"https://web.archive.org/web/{timestamp}/{original_url}"
        
        # Create output filename based on timestamp
        output_filename = f"elements_{timestamp}.json"
        output_path = os.path.join(output_dir, output_filename)
        
        print(f"\n[{i}/{len(snapshots)}] Processing snapshot {timestamp}...")
        print(f"   URL: {wayback_url}")
        
        try:
            capture_elements(wayback_url, output_path, flatten)
            
            if flatten:
                # Rename the default flatten output to match
                default_flat = "elements_flat.csv"
                flat_output = os.path.join(output_dir, f"elements_{timestamp}_flat.csv")
                if os.path.exists(default_flat):
                    os.rename(default_flat, flat_output)
                    print(f"   ✅ Flattened CSV saved: {flat_output}")
            
            successful += 1
            
        except KeyboardInterrupt:
            print("\n⚠️ Interrupted by user")
            raise
        except Exception as e:
            print(f"   ❌ Failed to capture snapshot {timestamp}: {e}", file=sys.stderr)
            failed += 1
            continue
    
    print(f"\n✅ Completed processing:")
    print(f"   Successful: {successful}")
    print(f"   Failed: {failed}")
    print(f"   Output directory: {output_dir}")


def flatten_elements_recursive(input_file: str, output_csv: str = "elements_flat.csv"):
    """
    Flatten the nested elements.json structure into rows and columns.
    Each child (and nested child) becomes its own row, preserving parent info.
    """

    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    flat_records = []

    def flatten_element(element, parent_uid=None, parent_xpath=None, depth=0):
        record = {
            "uid": element.get("uid"),
            "parent_uid": parent_uid,
            "parent_xpath": parent_xpath,
            "tag": element.get("tag"),
            "id": element.get("id"),
            "classes": ",".join(element.get("classes", [])) if element.get("classes") else None,
            "xpath": element.get("xpath"),
            "depth": depth,
            "textContent": element.get("textContent"),
            "childrenCount": element.get("childrenCount"),
            "x": element.get("boundingBox", {}).get("x"),
            "y": element.get("boundingBox", {}).get("y"),
            "width": element.get("boundingBox", {}).get("width"),
            "height": element.get("boundingBox", {}).get("height"),
            "display": element.get("computedStyle", {}).get("display"),
            "position": element.get("computedStyle", {}).get("position"),
            "color": element.get("computedStyle", {}).get("color"),
            "backgroundColor": element.get("computedStyle", {}).get("backgroundColor"),
            "zIndex": element.get("computedStyle", {}).get("zIndex"),
            "visibility": element.get("computedStyle", {}).get("visibility"),
        }

        flat_records.append(record)

        # Recursively flatten child elements
        for child in element.get("children", []):
            flatten_element(
                child,
                parent_uid=element.get("uid"),
                parent_xpath=element.get("xpath"),
                depth=depth + 1,
            )

    # Process all top-level elements
    for el in data:
        flatten_element(el)

    # Convert flattened records into a DataFrame and save
    df = pd.DataFrame(flat_records)
    df.to_csv(output_csv, index=False, encoding="utf-8")

    print(f"✅ Flattened {len(flat_records)} elements into {output_csv}, preserving parent-child hierarchy.")


def main():
    parser = argparse.ArgumentParser(
        description="Archive reader tool for capturing web elements and fetching Wayback Machine snapshots.",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands", required=True)
    
    # Subcommand: capture - Capture web elements
    capture_parser = subparsers.add_parser(
        "capture",
        help="Capture web elements and metadata from a URL",
        description="Capture web elements and metadata from a given URL using Playwright."
    )
    capture_parser.add_argument(
        "--url", required=True, help="Web URL to capture elements from (e.g. https://example.com)"
    )
    capture_parser.add_argument(
        "--output", default="elements.json", help="Path to save the JSON output file (default: elements.json)"
    )
    capture_parser.add_argument(
        "--flatten", action="store_true", help="Also create a flattened CSV file (elements_flat.csv)"
    )
    
    # Subcommand: snapshots - Fetch Wayback Machine snapshots
    snapshots_parser = subparsers.add_parser(
        "snapshots",
        help="Fetch and filter Wayback Machine snapshots",
        description="Fetch and filter Wayback Machine snapshots by year and pattern."
    )
    snapshots_parser.add_argument(
        "--url", required=True, help="Target URL to fetch snapshots for."
    )
    snapshots_parser.add_argument(
        "--years", nargs="+", type=int, required=True,
        help="List of years to query (e.g., 2023 2024 2025)."
    )
    snapshots_parser.add_argument(
        "--mode", choices=["random", "alternate", "all"], default="random",
        help="Month selection pattern (default: random)."
    )
    snapshots_parser.add_argument(
        "--dates", nargs="*", type=int,
        help="Specific days of the month to include (e.g., 1 15 30)."
    )
    snapshots_parser.add_argument(
        "--limit", type=int, default=1000,
        help="Maximum results per year (default: 1000)."
    )
    snapshots_parser.add_argument(
        "--output", type=str,
        help="Output file path (default: snapshots_YYYYMMDD_HHMMSS.json)."
    )
    
    # Subcommand: capture-snapshots - Capture elements from snapshot JSON file
    capture_snapshots_parser = subparsers.add_parser(
        "capture-snapshots",
        help="Capture elements from Wayback Machine snapshots in a JSON file",
        description="Read snapshots from a JSON file and capture elements for each Wayback Machine URL."
    )
    capture_snapshots_parser.add_argument(
        "--file", required=True,
        help="Path to JSON file containing snapshot records (from snapshots command output)."
    )
    capture_snapshots_parser.add_argument(
        "--output-dir", default="captured_data",
        help="Directory to save captured element files (default: captured_data)."
    )
    capture_snapshots_parser.add_argument(
        "--flatten", action="store_true",
        help="Also create flattened CSV files for each capture."
    )
    capture_snapshots_parser.add_argument(
        "--limit", type=int,
        help="Limit the number of snapshots to process (for testing)."
    )

    args = parser.parse_args()

    try:
        if args.command == "capture":
            capture_elements(args.url, args.output, args.flatten)
        
        elif args.command == "snapshots":
            all_filtered = []
            
            for year in args.years:
                snapshots = fetch_snapshots(args.url, year, args.limit)
                filtered = filter_snapshots_by_pattern(snapshots, args.mode, args.dates)
                all_filtered.extend(filtered)
            
            if not all_filtered:
                print("⚠️ No filtered snapshots found.")
                sys.exit(0)
            
            if args.output:
                output_file = args.output
            else:
                output_file = f"snapshots_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(all_filtered, f, indent=2, ensure_ascii=False)
            
            print(f"✅ Saved {len(all_filtered)} filtered snapshots → {output_file}")
        
        elif args.command == "capture-snapshots":
            # Load snapshots
            if not os.path.exists(args.file):
                raise FileNotFoundError(f"Snapshots file not found: {args.file}")
            
            with open(args.file, "r", encoding="utf-8") as f:
                all_snapshots = json.load(f)
            
            total_count = len(all_snapshots)
            
            # Apply limit if specified
            if args.limit and args.limit > 0:
                snapshots = all_snapshots[:args.limit]
                print(f"📋 Limiting to {args.limit} snapshots (out of {total_count} total)")
            else:
                snapshots = all_snapshots
            
            capture_from_snapshots(snapshots, args.output_dir, args.flatten)
            
    except (ValueError, FileNotFoundError) as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n⚠️ Interrupted by user", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
