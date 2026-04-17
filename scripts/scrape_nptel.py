#!/usr/bin/env python3
"""
Scrape content from the NPTEL ai2 platform: practice questions, flashcards, and lecture notes.

Usage:
    # Single course
    python3 scrape_nptel.py --course noc26_cs52 --cookie "auth_token=..." [options]

    # Discover and scrape all CS courses for a year
    python3 scrape_nptel.py --discover noc26 --cookie "auth_token=..." [options]

    --course      Course ID (e.g. noc26_cs52)
    --discover    Year prefix to scan for all CS courses (e.g. noc26); saves one file per course
    --cookie      Full cookie string copied from browser DevTools
                  Must include: auth_token, last_verified_at, token_issued_at
    --output      Output file or directory path
                  Single course: file path (default: <course_id>_content.json)
                  Discover mode: directory path (default: ./<year>_cs/)
    --weeks       Comma-separated week numbers to scrape (e.g. 1,2,3); default: all
    --content     Comma-separated content types to fetch: pqs,flash,notes (default: pqs,flash,notes)
    --delay       Seconds to wait between requests (default: 0.5)
    --flat        Save as flat lists per content type instead of nested by week/lecture
"""

import argparse
import json
import time
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    print("requests not installed. Run: pip install requests")
    sys.exit(1)


BASE_URL = "https://ai2.onlinecourses.nptel.ac.in"


def make_session(cookie_str: str) -> requests.Session:
    session = requests.Session()
    session.headers.update({
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; nptel-scraper)",
    })
    for part in cookie_str.split(";"):
        part = part.strip()
        if "=" in part:
            name, _, value = part.partition("=")
            session.cookies.set(name.strip(), value.strip(), domain="ai2.onlinecourses.nptel.ac.in")
    return session


def get_structure(session: requests.Session, course_id: str) -> list[dict]:
    url = f"{BASE_URL}/api/structure/{course_id}"
    resp = session.get(url)
    resp.raise_for_status()
    try:
        data = resp.json()
    except Exception as e:
        raise ValueError(f"Could not parse structure response: {e}")
    if not isinstance(data, list):
        raise ValueError(f"Unexpected structure response: {data}")
    return data


def _fetch_json(session: requests.Session, url: str) -> dict | list | None:
    """Fetch a URL; return parsed JSON or None if unavailable (404 / HTML / bad JSON)."""
    resp = session.get(url)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    ct = resp.headers.get("content-type", "")
    if "application/json" not in ct:
        return None  # Got SPA HTML — content not available for this lecture
    try:
        return resp.json()
    except Exception:
        return None  # Malformed JSON from API — skip silently


def _fetch_text(session: requests.Session, url: str) -> str | None:
    """Fetch a URL; return text or None if unavailable."""
    resp = session.get(url)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    text = resp.text
    if "<html" in text[:100].lower():
        return None
    return text


def fetch_pqs(session: requests.Session, course_id: str, week: str, lecture: str) -> list[dict] | None:
    data = _fetch_json(session, f"{BASE_URL}/api/content/{course_id}/{week}/{lecture}/pqs")
    return data if isinstance(data, list) else None


def fetch_flash(session: requests.Session, course_id: str, week: str, lecture: str) -> list[dict] | None:
    data = _fetch_json(session, f"{BASE_URL}/api/content/{course_id}/{week}/{lecture}/flash")
    if isinstance(data, dict):
        # API returns {"flashcards": [...]}
        return data.get("flashcards") or data.get("flash") or None
    return data if isinstance(data, list) else None


def fetch_notes(session: requests.Session, course_id: str, week: str, lecture: str) -> str | None:
    return _fetch_text(session, f"{BASE_URL}/api/content/{course_id}/{week}/{lecture}/notes")


def human_name(lecture_id: str) -> str:
    """Convert Lecture_W1L24_Lecture_02___IO___Loop → 'Lecture 02 - IO Loop'"""
    parts = lecture_id.split("_", 2)  # ['Lecture', 'W1L24', 'Lecture_02___IO___Loop']
    if len(parts) < 3:
        return lecture_id
    rest = parts[2].replace("___", " - ", 1).replace("___", " ").replace("__", " ").replace("_", " ")
    return rest.strip()


def discover_cs_courses(session: requests.Session, year_prefix: str) -> list[dict]:
    """Scan noc26_cs01..noc26_cs99 and return all valid course mappings."""
    found = []
    print(f"Scanning {year_prefix}_cs01..{year_prefix}_cs99 for available courses...")
    for i in range(1, 100):
        course_id = f"{year_prefix}_cs{i:02d}"
        try:
            resp = session.get(f"{BASE_URL}/api/mapping/{course_id}", timeout=10)
            if resp.status_code == 200 and "application/json" in resp.headers.get("content-type", ""):
                data = resp.json()
                if isinstance(data, dict) and "course_title" in data:
                    found.append({"id": course_id, "title": data["course_title"]})
                    print(f"  FOUND  {course_id:20s}  {data['course_title']}")
        except Exception:
            pass
    return found


def scrape_course(
    session: requests.Session,
    course_id: str,
    content_types: set[str],
    weeks_filter: str | None,
    delay: float,
    flat: bool,
) -> tuple[dict, dict]:
    """Scrape a single course. Returns (output_dict, counts_dict)."""
    structure = get_structure(session, course_id)

    if weeks_filter:
        wanted = {f"Week_{w.strip()}" for w in weeks_filter.split(",")}
        structure = [w for w in structure if w["week"] in wanted]

    structure.sort(key=lambda w: int(w["week"].replace("Week_", "")))
    total_lectures = sum(len(w["lessons"]) for w in structure)
    print(f"  {len(structure)} weeks, {total_lectures} lectures")

    result: dict = {}
    flat_pqs: list = []
    flat_flash: list = []
    done = 0
    counts: dict = {"pqs": 0, "flash": 0, "notes": 0}

    for week_entry in structure:
        week = week_entry["week"]
        lectures = week_entry["lessons"]
        week_num = week.replace("Week_", "")
        result[week] = {}

        print(f"  [{week}]")

        for lecture in lectures:
            name = human_name(lecture)
            done += 1
            parts = []
            entry: dict = {"lecture_name": name}

            try:
                if "pqs" in content_types:
                    pqs = fetch_pqs(session, course_id, week, lecture)
                    time.sleep(delay)
                    entry["pqs"] = pqs or []
                    if pqs:
                        counts["pqs"] += len(pqs)
                        parts.append(f"{len(pqs)}pqs")
                        if flat:
                            for q in pqs:
                                q.update({"course_id": course_id, "week": week_num,
                                          "lecture_id": lecture, "lecture_name": name})
                            flat_pqs.extend(pqs)

                if "flash" in content_types:
                    flash = fetch_flash(session, course_id, week, lecture)
                    time.sleep(delay)
                    entry["flashcards"] = flash or []
                    if flash:
                        counts["flash"] += len(flash)
                        parts.append(f"{len(flash)}flash")
                        if flat:
                            for f in flash:
                                f.update({"course_id": course_id, "week": week_num,
                                          "lecture_id": lecture, "lecture_name": name})
                            flat_flash.extend(flash)

                if "notes" in content_types:
                    notes = fetch_notes(session, course_id, week, lecture)
                    time.sleep(delay)
                    entry["notes"] = notes
                    if notes:
                        counts["notes"] += 1
                        parts.append("notes")

            except Exception as e:
                parts.append(f"ERROR:{e}")

            label = ", ".join(parts) if parts else "none"
            print(f"    [{done}/{total_lectures}] {name[:55]}  →  {label}")
            result[week][lecture] = entry

    if flat:
        output: dict = {}
        if "pqs" in content_types:
            output["pqs"] = flat_pqs
        if "flash" in content_types:
            output["flashcards"] = flat_flash
        if "notes" in content_types:
            output["notes"] = {
                week: {lec: result[week][lec].get("notes") for lec in result[week]}
                for week in result
            }
    else:
        output = result

    return output, counts


def main():
    parser = argparse.ArgumentParser(description="Scrape NPTEL ai2 practice questions, flashcards, and notes")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--course", help="Single course ID, e.g. noc26_cs52")
    group.add_argument("--discover", metavar="YEAR_PREFIX",
                       help="Scan and scrape all CS courses for a year prefix, e.g. noc26")
    parser.add_argument("--cookie", required=True, help="Cookie string from browser DevTools")
    parser.add_argument("--output", help="Output file (single course) or directory (discover mode)")
    parser.add_argument("--weeks", help="Comma-separated week numbers to scrape (default: all)")
    parser.add_argument("--content", default="pqs,flash,notes",
                        help="Content types: pqs,flash,notes (default: all three)")
    parser.add_argument("--delay", type=float, default=0.5, help="Delay between requests in seconds")
    parser.add_argument("--flat", action="store_true",
                        help="Output flat lists per content type instead of nested by week/lecture")
    args = parser.parse_args()

    content_types = {c.strip() for c in args.content.split(",")}
    valid = {"pqs", "flash", "notes"}
    unknown = content_types - valid
    if unknown:
        print(f"Unknown content types: {unknown}. Valid: {valid}")
        sys.exit(1)

    session = make_session(args.cookie)

    if args.course:
        # --- Single course mode ---
        output_path = Path(args.output) if args.output else Path(f"{args.course}_content.json")
        print(f"Fetching course structure for {args.course}...")
        try:
            output, counts = scrape_course(
                session, args.course, content_types, args.weeks, args.delay, args.flat
            )
        except Exception as e:
            print(f"ERROR: {e}")
            sys.exit(1)

        output_path.write_text(json.dumps(output, indent=2, ensure_ascii=False))
        print("\nSummary:")
        if "pqs" in content_types:
            print(f"  Practice questions : {counts['pqs']}")
        if "flash" in content_types:
            print(f"  Flashcards         : {counts['flash']}")
        if "notes" in content_types:
            print(f"  Lectures with notes: {counts['notes']}")
        print(f"  Output             : {output_path}")

    else:
        # --- Discover mode: scan + scrape all CS courses ---
        out_dir = Path(args.output) if args.output else Path(f"{args.discover}_cs")
        out_dir.mkdir(parents=True, exist_ok=True)

        courses = discover_cs_courses(session, args.discover)
        if not courses:
            print("No CS courses found.")
            sys.exit(1)

        print(f"\nFound {len(courses)} CS courses. Starting scrape → {out_dir}/\n")
        total_counts: dict = {"pqs": 0, "flash": 0, "notes": 0}

        for i, course in enumerate(courses, 1):
            cid = course["id"]
            title = course["title"]
            out_file = out_dir / f"{cid}_content.json"

            if out_file.exists():
                print(f"[{i}/{len(courses)}] {cid} — already exists, skipping")
                continue

            print(f"[{i}/{len(courses)}] {cid}  {title}")
            try:
                output, counts = scrape_course(
                    session, cid, content_types, args.weeks, args.delay, args.flat
                )
                out_file.write_text(json.dumps(output, indent=2, ensure_ascii=False))
                for k in total_counts:
                    total_counts[k] += counts[k]
                print(f"  → saved {out_file.name}  "
                      f"(pqs:{counts['pqs']} flash:{counts['flash']} notes:{counts['notes']})\n")
            except Exception as e:
                print(f"  ERROR scraping {cid}: {e}\n")

        print("=== All done ===")
        print(f"  Total practice questions : {total_counts['pqs']}")
        print(f"  Total flashcards         : {total_counts['flash']}")
        print(f"  Total lectures with notes: {total_counts['notes']}")
        print(f"  Output directory         : {out_dir}/")


if __name__ == "__main__":
    main()
