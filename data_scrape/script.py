import os
import requests
import time
import json
import random
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Configuration
DOMAIN = "flipkart.com"
START_YEAR = 2024
END_YEAR = 2025
SAVE_DIR = os.path.join(os.path.dirname(__file__), 'wayback_html')
MAX_SNAPSHOTS = None  # set to an int to limit downloads during testing, or None for all
MIN_DELAY = 1.5
MAX_DELAY = 3.0
CONTACT_EMAIL = "sing.shekhawat67@gmail.com"  # put a real contact address

os.makedirs(SAVE_DIR, exist_ok=True)

# create a session with retries and polite headers
session = requests.Session()
session.headers.update({
    "User-Agent": f"Wayback-scraper/1.0 (+{CONTACT_EMAIL})",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
})
retry_strategy = Retry(
    total=5,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=frozenset(["GET"]),
    backoff_factor=1,  # exponential backoff: 1s, 2s, 4s...
    raise_on_status=False,
)
adapter = HTTPAdapter(max_retries=retry_strategy)
session.mount("https://", adapter)
session.mount("http://", adapter)

# Step 1: Get timestamps from CDX API
print("[*] Fetching snapshot timestamps...")
cdx_url = f"https://web.archive.org/cdx/search/cdx?url={DOMAIN}&from={START_YEAR}&to={END_YEAR}&output=json&fl=timestamp,original&filter=statuscode:200"
try:
    resp = session.get(cdx_url, timeout=20)
    resp.raise_for_status()
    data = resp.json()[1:]  # skip header row
except Exception as e:
    print(f"[!] Failed to fetch CDX list: {e}")
    data = []

print(f"[*] Found {len(data)} snapshots")

# Step 2: Download HTML for each snapshot
count = 0
# helper: determine whether an existing saved file looks like a valid snapshot
def is_valid_snapshot(path: str) -> bool:
    if not os.path.exists(path):
        return False
    try:
        size = os.path.getsize(path)
        # tiny files are likely partial or errors
        if size < 200:
            return False
        # check for common Wayback/archival error phrases in the start of the file
        with open(path, "r", encoding="utf-8", errors="ignore") as fh:
            snippet = fh.read(2000).lower()
            bad_phrases = [
                "wayback machine doesn't have",
                "page not available",
                "captured url is not available",
                "this capture is not available",
                "not archived",
                "error"
            ]
            for p in bad_phrases:
                if p in snippet:
                    return False
        return True
    except Exception:
        return False
for idx, (timestamp, url) in enumerate(data):
    if MAX_SNAPSHOTS is not None and count >= MAX_SNAPSHOTS:
        break

    archive_url = f"https://web.archive.org/web/{timestamp}/{url}"
    save_path = os.path.join(SAVE_DIR, f"{timestamp}.html")

    # skip if we already have a valid saved snapshot
    if is_valid_snapshot(save_path):
        print(f"[ ] Skipping existing valid {save_path}")
        continue

    try:
        r = session.get(archive_url, timeout=20)
        # Respect explicit 429 Retry-After if provided
        if r.status_code == 429:
            ra = r.headers.get("Retry-After")
            wait = int(ra) if ra and ra.isdigit() else 60
            print(f"[!] Received 429. Sleeping {wait}s (Retry-After) and retrying later.")
            time.sleep(wait)
            continue

        if r.status_code == 200:
            # write to a temporary file first then atomically move into place
            tmp_path = save_path + ".part"
            with open(tmp_path, "w", encoding="utf-8") as f:
                f.write(r.text)
            try:
                os.replace(tmp_path, save_path)
            except Exception:
                # fallback to rename if replace fails
                os.rename(tmp_path, save_path)
            count += 1
            print(f"[{count}/{len(data)}] Saved {save_path}")
        else:
            print(f"[!] Skipped {timestamp}, status {r.status_code}")

    except Exception as e:
        print(f"[!] Error {timestamp}: {e}")

    # polite random delay between requests
    time.sleep(random.uniform(MIN_DELAY, MAX_DELAY))