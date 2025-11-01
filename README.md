python POCs/extract-archive-data/archive_reader.py --url https://web.archive.org/web/20250108035403/https://www.amazon.in/ --flatten

# Capture web elements
python archive_reader.py capture --url https://example.com --flatten

# Fetch Wayback Machine snapshots
python POCs/extract-archive-data/archive_reader.py snapshots --url https://www.amazon.in/ --years 2023 2024 --mode random

# With specific output file
python POCs/extract-archive-data/archive_reader.py snapshots --url https://www.amazon.in/ --years 2023 --output my_snapshots.json


python POCs/extract-archive-data/archive_reader.py capture-snapshots --file snapshots_20251101_191123.json --limit 5 --flatten

python POCs/extract-archive-data/archive_reader.py capture-snapshots --file snapshots_20251101_191123.json --output-dir my_captures --flatten

python POCs/extract-archive-data/archive_reader.py capture-snapshots --file snapshots_20251101_191123.json --flatten