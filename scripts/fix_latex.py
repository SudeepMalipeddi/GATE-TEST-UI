#!/usr/bin/env python3
"""
Fix LaTeX delimiter corruption in exam JSON files.

Three patterns fixed:

1.  $EXPR$)  →  $EXPR)$
    Closing $ was placed before the closing paren by the PDF extractor.
    Only applied when EXPR contains an unmatched '('.

2.  $[PREAMBLE]\begin{env}HTML\end{env}$  →  $$[PREAMBLE]\begin{env}CLEAN\end{env}$$
    Single-$ math block containing a \begin environment — promote to display
    math and strip HTML artifacts inside. Covers:
      $\begin{cases}...          ($ immediately before \begin)
      $T(n) = \begin{cases}...   (short preamble before \begin)
      $\Delta=\begin{vmatrix}... (same)

3.  \begin{env}HTML\end{env}$  →  $$\begin{env}CLEAN\end{env}$$
    Bare \begin with stray $ at the end — no opening delimiter at all.
    Skipped if the \begin already falls inside a $$ ... $$ block
    (e.g. $$f(x) = \begin{cases}...\end{cases}$$ is valid and untouched).

Usage:
    python3 fix_latex.py              # dry run (shows counts only)
    python3 fix_latex.py --apply      # write changes back to files
    python3 fix_latex.py --apply --verbose  # also print each change
"""

import json
import os
import re
import sys
import argparse

EXAM_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'exams')


# ---------------------------------------------------------------------------
# Content cleaner — strips HTML artifacts from inside a math block.
# ---------------------------------------------------------------------------
def clean_math_inner(s: str) -> str:
    s = re.sub(r'<br\s*/?>', '\n', s, flags=re.IGNORECASE)
    s = re.sub(r'<[^>]+>', '', s)
    s = s.replace('&amp;', '&')
    s = s.replace('&nbsp;', ' ')
    s = s.replace('&lt;', '<')
    s = s.replace('&gt;', '>')
    return s


# ---------------------------------------------------------------------------
# Find all [start, end) ranges covered by $$ ... $$ in `text`.
# Used to skip \begin environments already inside valid display-math blocks.
# ---------------------------------------------------------------------------
def find_dd_ranges(text: str) -> list[tuple[int, int]]:
    ranges = []
    i = 0
    while i < len(text) - 1:
        if text[i] == '$' and text[i + 1] == '$':
            start = i
            j = i + 2
            while j < len(text) - 1:
                if text[j] == '$' and text[j + 1] == '$':
                    ranges.append((start, j + 2))
                    i = j + 2
                    break
                j += 1
            else:
                i += 2
        else:
            i += 1
    return ranges


def inside_any(pos: int, ranges: list[tuple[int, int]]) -> bool:
    return any(s <= pos < e for s, e in ranges)


# ---------------------------------------------------------------------------
# Fix 1: $EXPR$)  →  $EXPR)$
# Only when EXPR contains more '(' than ')'.
# ---------------------------------------------------------------------------
_DOLLAR_PAREN_RE = re.compile(r'\$([^$\n]{1,120})\$(\))')


def fix_dollar_paren(text: str) -> tuple[str, int]:
    count = 0

    def sub(m: re.Match) -> str:
        nonlocal count
        c = m.group(1)
        if c.count('(') > c.count(')'):
            count += 1
            return f'${c})$'
        return m.group(0)

    return _DOLLAR_PAREN_RE.sub(sub, text), count


# ---------------------------------------------------------------------------
# Fix 2: $[PREAMBLE]\begin{env}...\end{env}[TRAILER]$  →  $$CLEAN$$
#
# The (?<!\$) prevents matching the second $ of an opening $$.
# [^$]{0,200} allows a short preamble before \begin, no $ inside.
# [^$\n]{0,80} allows trailing LaTeX after \end{env} (e.g. " =" in "$\begin{vmatrix}...\end{vmatrix} =$")
# (?!\$) at the end prevents matching the first $ of a closing $$.
# Also skips \begin patterns already inside a $$ ... $$ block.
# ---------------------------------------------------------------------------
_DOLLAR_BEGIN_RE = re.compile(
    r'(?<!\$)\$([^$]{0,200}\\begin\{([^}]+)\}[\s\S]*?\\end\{\2\}[^$\n]{0,80})\s*\$(?!\$)',
    re.DOTALL,
)


def fix_dollar_begin(text: str) -> tuple[str, int]:
    count = 0
    dd_ranges = find_dd_ranges(text)

    parts: list[str] = []
    last = 0

    for m in _DOLLAR_BEGIN_RE.finditer(text):
        begin_pos = m.start(1)
        if inside_any(begin_pos, dd_ranges):
            parts.append(text[last:m.end()])
            last = m.end()
            continue
        parts.append(text[last:m.start()])
        parts.append(f'$${clean_math_inner(m.group(1))}$$')
        count += 1
        last = m.end()

    parts.append(text[last:])
    return ''.join(parts), count


# ---------------------------------------------------------------------------
# Fix 3: bare \begin{env}...\end{env}$ (no opening delimiter)
#
# Only applied if the \begin is NOT already inside a $$ ... $$ block.
# (?<!\$) ensures we don't re-fire on blocks just created by fix 2.
# ---------------------------------------------------------------------------
_BARE_BEGIN_RE = re.compile(
    r'(?<!\$)(\\begin\{([^}]+)\}[\s\S]*?\\end\{\2\})\s*\${1,3}(?!\$)',
    re.DOTALL,
)


def fix_bare_begin(text: str) -> tuple[str, int]:
    count = 0
    # Compute $$ ranges on the *current* text (after fix 2 has already run)
    dd_ranges = find_dd_ranges(text)

    parts: list[str] = []
    last = 0

    for m in _BARE_BEGIN_RE.finditer(text):
        begin_pos = m.start(1)  # position of \begin
        if inside_any(begin_pos, dd_ranges):
            # Already inside $$...$$, leave it untouched
            parts.append(text[last:m.end()])
            last = m.end()
            continue
        parts.append(text[last:m.start()])
        parts.append(f'$${clean_math_inner(m.group(1))}$$')
        count += 1
        last = m.end()

    parts.append(text[last:])
    return ''.join(parts), count


# ---------------------------------------------------------------------------
# Apply all fixes to a single question text string.
# ---------------------------------------------------------------------------
def fix_text(text: str) -> tuple[str, bool, dict]:
    t, n1 = fix_dollar_paren(text)
    t, n2 = fix_dollar_begin(t)
    t, n3 = fix_bare_begin(t)
    changed = t != text
    return t, changed, {'paren': n1, 'dollar_begin': n2, 'bare_begin': n3}


# ---------------------------------------------------------------------------
# Walk all exam JSONs.
# ---------------------------------------------------------------------------
def process_exams(apply: bool, verbose: bool) -> None:
    exam_dir = os.path.realpath(EXAM_DIR)
    files = sorted(f for f in os.listdir(exam_dir)
                   if f.endswith('.json') and f != 'catalog.json')

    total = {'files': 0, 'questions': 0, 'paren': 0, 'dollar_begin': 0, 'bare_begin': 0}

    for fname in files:
        path = os.path.join(exam_dir, fname)
        with open(path, encoding='utf-8') as f:
            data = json.load(f)

        file_changed = False
        fc = {'paren': 0, 'dollar_begin': 0, 'bare_begin': 0}

        for sec in data.get('sections', []):
            for q in sec.get('questions', []):
                new_text, changed, detail = fix_text(q.get('text', ''))
                if changed:
                    if verbose:
                        print(f"\n[{fname}] Q{q['id']}")
                        print(f"  paren={detail['paren']}  "
                              f"dollar_begin={detail['dollar_begin']}  "
                              f"bare_begin={detail['bare_begin']}")
                        print(f"  BEFORE: {repr(q['text'][:300])}")
                        print(f"  AFTER:  {repr(new_text[:300])}")
                    q['text'] = new_text
                    file_changed = True
                    total['questions'] += 1
                    for k in fc:
                        fc[k] += detail[k]

        if file_changed:
            total['files'] += 1
            for k in fc:
                total[k] += fc[k]
            if not verbose:
                print(f"  {fname}: "
                      f"paren={fc['paren']} "
                      f"dollar_begin={fc['dollar_begin']} "
                      f"bare_begin={fc['bare_begin']}")
            if apply:
                with open(path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

    print()
    print('=' * 60)
    print(f"Files changed:          {total['files']}")
    print(f"Questions changed:      {total['questions']}")
    print(f"  $EXPR$) fixes:        {total['paren']}")
    print(f"  $\\begin fixes:        {total['dollar_begin']}")
    print(f"  bare \\begin fixes:    {total['bare_begin']}")
    if not apply:
        print()
        print('Dry run — no files written. Pass --apply to write changes.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('--apply', action='store_true',
                        help='Write fixes back to JSON files (default: dry run)')
    parser.add_argument('--verbose', action='store_true',
                        help='Print before/after for every changed question')
    args = parser.parse_args()
    process_exams(apply=args.apply, verbose=args.verbose)
