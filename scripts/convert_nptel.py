#!/usr/bin/env python3
"""
Convert scraped NPTEL data into the app's public/nptel/ format.

Output structure:
  public/nptel/
    catalog.json                   ← course index
    noc26_cs67/
      structure.json               ← week/lecture list (names + counts, no content)
      Week_1_Lecture_W1L23_...json ← per-lecture content: {notes, flashcards, questions}
      ...

Usage:
    python3 convert_nptel.py
    python3 convert_nptel.py --input scripts/nptel_data --output public/nptel
"""

import argparse
import json
import re
import hashlib
from pathlib import Path

COURSE_SUBJECTS = {
    'noc26_cs67': 'Algorithms',
    'noc26_cs69': 'Algorithms',
    'noc26_cs23': 'Computer Architecture',
    'noc26_cs35': 'Computer Networks',
    'noc26_cs60': 'Computer Networks',
    'noc26_cs39': 'Databases',
    'noc26_cs56': 'Compiler Design',
    'noc26_cs52': 'C++ Programming',
    'noc26_cs53': 'C Programming',
}

OPTION_IDS = ['a', 'b', 'c', 'd', 'e']


def make_question_id(course_id: str, week: str, lecture_id: str, index: int) -> str:
    raw = f"{course_id}_{week}_{lecture_id}_{index}"
    return 'nptel_' + hashlib.md5(raw.encode()).hexdigest()[:10]


def convert_pq(q: dict, qid: str) -> dict | None:
    """Convert an NPTEL practice question to the app's Question format."""
    options_raw = q.get('options', [])
    answer_text = q.get('answer', '').strip()

    if not options_raw or not answer_text:
        return None

    # Match answer text back to option index
    correct_id = None
    for i, opt_text in enumerate(options_raw):
        if opt_text.strip() == answer_text:
            correct_id = OPTION_IDS[i]
            break

    # Fallback: partial match
    if correct_id is None:
        for i, opt_text in enumerate(options_raw):
            if answer_text in opt_text or opt_text in answer_text:
                correct_id = OPTION_IDS[i]
                break

    if correct_id is None:
        return None  # Can't determine correct answer — skip

    # Build question HTML with options embedded as <ol>
    question_text = q.get('question', '').strip()
    options_html = ''.join(f'<li>{opt}</li>' for opt in options_raw)
    full_html = (
        f'<p>{question_text}</p>'
        f'<ol style="list-style-type:upper-alpha">{options_html}</ol>'
    )

    explanation = q.get('explanation', '').strip()
    if explanation:
        full_html += f'<p class="explanation" style="display:none">{explanation}</p>'

    return {
        'id': qid,
        'text': full_html,
        'type': 'MCQ',
        'options': [{'id': OPTION_IDS[i], 'text': chr(65 + i)} for i in range(len(options_raw))],
        'correctAnswer': correct_id,
        'marks': 1,
        'penalty': 0,
        'difficulty': q.get('difficulty', ''),
    }


def slugify(s: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def human_week(week_key: str) -> str:
    """'Week_1' → 'Week 1'"""
    return week_key.replace('_', ' ')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', default='scripts/nptel_data')
    parser.add_argument('--output', default='public/nptel')
    args = parser.parse_args()

    input_dir = Path(args.input)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    catalog = []
    total_files = 0
    total_questions = 0
    total_flashcards = 0

    for data_file in sorted(input_dir.glob('*_content.json')):
        course_id = data_file.stem.replace('_content', '')
        subject = COURSE_SUBJECTS.get(course_id, 'Other')

        print(f"\n{course_id}  ({subject})")

        raw = json.loads(data_file.read_text())
        course_out = output_dir / course_id
        course_out.mkdir(exist_ok=True)

        structure = []   # [{week, humanWeek, lectures: [{id, name, qCount, flashCount, hasNotes}]}]
        course_q_total = 0
        course_flash_total = 0

        # Sort weeks numerically
        weeks = sorted(raw.keys(), key=lambda w: int(w.replace('Week_', '')))

        for week_key in weeks:
            week_lectures = raw[week_key]
            week_num = int(week_key.replace('Week_', ''))
            week_entry = {
                'week': week_key,
                'humanWeek': human_week(week_key),
                'lectures': [],
            }

            # Sort lectures by their W#L## prefix
            def lec_sort_key(lec_id):
                m = re.search(r'W(\d+)L(\d+)', lec_id)
                return (int(m.group(1)), int(m.group(2))) if m else (0, 0)

            for lec_id in sorted(week_lectures.keys(), key=lec_sort_key):
                entry = week_lectures[lec_id]
                lec_name = entry.get('lecture_name', lec_id)
                pqs_raw = entry.get('pqs', [])
                flashcards_raw = entry.get('flashcards', [])
                notes = entry.get('notes') or None

                # Convert questions
                questions = []
                for i, q in enumerate(pqs_raw):
                    qid = make_question_id(course_id, week_key, lec_id, i)
                    converted = convert_pq(q, qid)
                    if converted:
                        questions.append(converted)

                # Output filename: Week_1_Lecture_W1L23_....json
                out_filename = f"{week_key}_{lec_id}.json"
                out_path = course_out / out_filename

                lecture_data = {
                    'course_id': course_id,
                    'week': week_key,
                    'lecture_id': lec_id,
                    'lecture_name': lec_name,
                    'notes': notes,
                    'flashcards': flashcards_raw,
                    'questions': questions,
                }
                out_path.write_text(json.dumps(lecture_data, ensure_ascii=False))

                course_q_total += len(questions)
                course_flash_total += len(flashcards_raw)
                total_files += 1

                week_entry['lectures'].append({
                    'id': lec_id,
                    'file': out_filename,
                    'name': lec_name,
                    'qCount': len(questions),
                    'flashCount': len(flashcards_raw),
                    'hasNotes': notes is not None,
                })

                print(f"  {week_key}/{lec_id[:40]:40s}  {len(questions)}q  {len(flashcards_raw)}f  {'notes' if notes else ''}")

            structure.append(week_entry)

        # Write structure.json
        (course_out / 'structure.json').write_text(
            json.dumps(structure, ensure_ascii=False)
        )

        total_questions += course_q_total
        total_flashcards += course_flash_total

        catalog.append({
            'id': course_id,
            'subject': subject,
            'weekCount': len(weeks),
            'lectureCount': sum(len(w['lectures']) for w in structure),
            'questionCount': course_q_total,
            'flashcardCount': course_flash_total,
        })

        print(f"  → {course_q_total} questions, {course_flash_total} flashcards, {len(weeks)} weeks")

    # Write catalog.json
    (output_dir / 'catalog.json').write_text(
        json.dumps(catalog, indent=2, ensure_ascii=False)
    )

    print(f"\n=== Done ===")
    print(f"  Courses   : {len(catalog)}")
    print(f"  Lectures  : {total_files}")
    print(f"  Questions : {total_questions}")
    print(f"  Flashcards: {total_flashcards}")
    print(f"  Output    : {output_dir}/")


if __name__ == '__main__':
    main()
