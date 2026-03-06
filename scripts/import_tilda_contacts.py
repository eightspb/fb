#!/usr/bin/env python3
"""
One-time import of Tilda contacts from tildacontacts.txt into contacts table.
Handles Windows-1251 encoding, semicolon delimiter, multi-value fields.
"""

import csv
import os
import sys
import re

try:
    import psycopg2
except ImportError:
    print("Installing psycopg2...")
    os.system("pip install psycopg2-binary -q")
    import psycopg2

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/postgres"
)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE = os.path.join(SCRIPT_DIR, "tildacontacts.txt")


def clean(value):
    """Strip whitespace and quotes."""
    if not value:
        return None
    v = value.strip().strip('"').strip()
    return v if v else None


def first_value(s):
    """Take first value from pipe-separated string."""
    if not s:
        return None
    parts = [p.strip() for p in s.split('|')]
    v = parts[0].strip().strip('"').strip()
    return v if v else None


def build_full_name(name, surname):
    """Combine name + surname into full_name."""
    name = first_value(name) or ''
    surname = first_value(surname) or ''
    # If name already contains surname (or looks like full name), use as-is
    if len(name.split()) >= 2:
        return name
    if surname and surname.lower() not in name.lower():
        combined = f"{surname} {name}".strip()
        return combined if combined else name
    return name or surname or None


def parse_speciality(spec, speciality):
    """Pick best speciality value."""
    # 'Speciality' column has cleaner data than 'Spec'
    v = first_value(speciality) or first_value(spec)
    return clean(v)


def main():
    if not os.path.exists(INPUT_FILE):
        print(f"File not found: {INPUT_FILE}")
        sys.exit(1)

    # Try reading with Windows-1251, fall back to UTF-8
    rows = []
    for encoding in ('windows-1251', 'utf-8-sig', 'utf-8'):
        try:
            with open(INPUT_FILE, encoding=encoding, errors='replace') as f:
                reader = csv.DictReader(f, delimiter=';')
                rows = list(reader)
            print(f"Read {len(rows)} rows with encoding={encoding}")
            # Check if headers look correct (no garbage)
            headers = list(rows[0].keys()) if rows else []
            if any('\ufffd' in h for h in headers):
                rows = []
                continue
            break
        except Exception as e:
            print(f"  {encoding} failed: {e}")
            rows = []

    if not rows:
        print("Could not read file")
        sys.exit(1)

    print(f"Columns: {list(rows[0].keys())}")

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    imported = 0
    skipped = 0
    errors = []

    for i, row in enumerate(rows):
        # Map columns (case-insensitive)
        r = {k.strip().lower(): v for k, v in row.items()}

        email = clean(r.get('email', ''))
        name_raw = r.get('name', '')
        surname_raw = r.get('surname', '')
        phone_raw = r.get('phone', '')
        city_raw = r.get('city', '')
        company_raw = r.get('company', '')
        spec_raw = r.get('spec', '')
        speciality_raw = r.get('speciality', '')
        source_raw = r.get('source', '')
        request_id_raw = r.get('request id', '') or r.get('request_id', '')

        full_name = build_full_name(name_raw, surname_raw)
        if not full_name:
            skipped += 1
            continue

        # Skip service emails
        if email and email.lower() in ('doc@fibroadenoma.net', 'info@zenitmed.ru'):
            skipped += 1
            continue

        phone = first_value(phone_raw)
        city = first_value(city_raw)
        institution = first_value(company_raw)
        speciality = parse_speciality(spec_raw, speciality_raw)

        # Collect source URLs
        source_urls = []
        if source_raw:
            for u in source_raw.split('|'):
                u = u.strip()
                if u:
                    source_urls.append(u)

        # Collect Tilda request IDs
        tilda_ids = []
        if request_id_raw:
            for rid in request_id_raw.split('|'):
                rid = rid.strip()
                if rid:
                    tilda_ids.append(rid)

        tags = ['tilda-import']

        try:
            cur.execute(
                """
                INSERT INTO contacts
                  (full_name, email, phone, city, institution, speciality,
                   tags, status, import_source, source_urls, tilda_request_ids)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
                """,
                (
                    full_name,
                    email or None,
                    phone or None,
                    city or None,
                    institution or None,
                    speciality or None,
                    tags,
                    'archived',
                    'tilda',
                    source_urls,
                    tilda_ids,
                )
            )
            imported += 1
        except Exception as e:
            errors.append(f"Row {i+2}: {e}")
            skipped += 1

    conn.commit()
    cur.close()
    conn.close()

    print(f"\n✓ Imported: {imported}")
    print(f"  Skipped:  {skipped}")
    print(f"  Total:    {len(rows)}")
    if errors:
        print(f"\nErrors ({len(errors)}):")
        for e in errors[:20]:
            print(f"  {e}")


if __name__ == '__main__':
    main()
