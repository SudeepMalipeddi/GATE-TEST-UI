#!/usr/bin/env python3
"""
Export exam catalog + localStorage performance data as Claude-friendly context.

Usage:
    # Step 1: export your performance data from the browser console:
    #   copy(JSON.stringify({history: JSON.parse(localStorage.exam_history || '[]')}))
    # Then paste it into a file called perf.json in this directory.

    python3 scripts/export_context.py              # catalog only
    python3 scripts/export_context.py perf.json    # catalog + your performance
"""

import json
import os
import sys
from collections import defaultdict

CATALOG_PATH = os.path.join(os.path.dirname(__file__), '..', 'public', 'exams', 'catalog.json')

# Topic classifier (mirrors topicClassifier.ts)
RULES = [
    (['theory of computation', 'automata', 'finite automata', 'regular expression',
      'context free', 'cfl', 'pda', 'toc', 'turing', 'dcfl', 'cfg', 'pushdown'], 'Theory of Computation'),
    (['compiler', 'parsing', 'lexical', 'syntax directed', 'code generation'], 'Compiler Design'),
    (['computer network', 'subnetting', 'supernetting', 'tcp', 'ip routing',
      'data link', 'network layer', 'transport layer'], 'Computer Networks'),
    (['operating system', 'process synchronization', 'deadlock', 'scheduling',
      'memory management', 'virtual memory', 'semaphore', 'cache memory'], 'Operating Systems'),
    (['database', 'dbms', 'sql', 'relational model', 'relational algebra',
      'normalization', 'normal form', 'functional dependency', 'transaction'], 'Database Management Systems'),
    (['computer organisation', 'computer organization', 'co and architecture',
      'co & architecture', 'architecture', 'pipeline', 'boolean algebra, minimization'], 'Computer Organization & Architecture'),
    (['digital logic', 'boolean algebra', 'combinational circuit', 'k-map',
      'karnaugh', 'multiplexer', 'flip flop', 'number system'], 'Digital Logic'),
    (['algorithm', 'asymptotic', 'time complexity', 'sorting', 'dynamic programming',
      'greedy', 'graph algorithm', 'a star', 'divide and conquer'], 'Algorithms'),
    (['data structure', 'stack', 'queue', 'linked list', 'tree', 'heap', 'hash', 'graph'], 'Data Structures'),
    (['discrete mathematics', 'propositional logic', 'predicate logic', 'first order logic',
      'mathematical logic', 'set theory', 'group theory', 'combinatorics', 'counting',
      'lattice', 'poset', 'relation', 'function', 'proof technique', 'equivalence relation'], 'Discrete Mathematics'),
    (['linear algebra', 'matrix', 'eigenvalue', 'eigenvector', 'basis',
      'linear transformation', 'projection matrix', 'orthogonal'], 'Linear Algebra'),
    (['calculus', 'differentiation', 'integration', 'limit', 'continuity',
      'taylor series', 'maxima', 'minima', 'differentiability'], 'Calculus'),
    (['probability', 'statistics', 'bayes', 'distribution', 'hypothesis',
      'expectation', 'variance', 'random variable', 'conditional probability'], 'Probability & Statistics'),
    (['engineering mathematics', 'mathematics'], 'Engineering Mathematics'),
    (['programming in c', 'c programming', 'c-programming', 'pointers', 'recursion', 'programming'], 'Programming in C'),
    (['aptitude', 'verbal', 'quantitative', 'analytical', 'spatial'], 'General Aptitude'),
    (['machine learning', 'neural network', 'clustering', 'pca', 'regression'], 'Machine Learning'),
]

def classify(name: str) -> str:
    segments = name.split('|')
    for seg in segments[1:]:
        lower = seg.strip().lower()
        for keywords, topic in RULES:
            if any(kw in lower for kw in keywords):
                return topic
    lower = name.lower()
    for keywords, topic in RULES:
        if any(kw in lower for kw in keywords):
            return topic
    return 'Mixed Paper'


def load_catalog():
    with open(CATALOG_PATH, encoding='utf-8') as f:
        return json.load(f)


def build_catalog_summary(catalog):
    by_topic = defaultdict(list)
    for exam in catalog:
        topic = classify(exam['name'])
        by_topic[topic].append(exam)

    lines = []
    lines.append("=== AVAILABLE EXAMS BY TOPIC ===")
    lines.append(f"Total exams: {len(catalog)}\n")

    for topic in sorted(by_topic):
        exams = by_topic[topic]
        lines.append(f"## {topic} ({len(exams)} exams)")
        for e in sorted(exams, key=lambda x: x['name']):
            lines.append(f"  - {e['name']}  [{e['totalQuestions']}Q, {e['durationMinutes']}min]")
        lines.append("")

    return '\n'.join(lines)


def build_performance_summary(perf_data):
    history = perf_data.get('history', [])
    if not history:
        return "No attempt history found."

    by_topic = defaultdict(lambda: {'attempts': 0, 'correct': 0, 'wrong': 0,
                                     'skipped': 0, 'score': 0, 'max_score': 0})

    for attempt in history:
        topic = classify(attempt.get('examName', ''))
        t = by_topic[topic]
        t['attempts'] += 1
        t['correct']   += attempt.get('correct', 0)
        t['wrong']     += attempt.get('wrong', 0)
        t['skipped']   += attempt.get('skipped', 0)
        t['score']     += attempt.get('score', 0)
        t['max_score'] += attempt.get('maxScore', 0)

    lines = []
    lines.append("=== MY PERFORMANCE BY TOPIC ===")
    lines.append(f"Total attempts: {len(history)}\n")

    # Overall
    total_correct = sum(t['correct'] for t in by_topic.values())
    total_answered = total_correct + sum(t['wrong'] for t in by_topic.values())
    overall_acc = round(total_correct / total_answered * 100) if total_answered else 0
    lines.append(f"Overall accuracy: {overall_acc}%\n")

    lines.append(f"{'Topic':<40} {'Attempts':>8} {'Accuracy':>9} {'Score%':>7}  Breakdown")
    lines.append('-' * 80)

    for topic in sorted(by_topic):
        t = by_topic[topic]
        answered = t['correct'] + t['wrong']
        acc = round(t['correct'] / answered * 100) if answered else 0
        sp  = round(max(0, t['score']) / t['max_score'] * 100) if t['max_score'] else 0
        breakdown = f"C:{t['correct']} W:{t['wrong']} S:{t['skipped']}"
        lines.append(f"{topic:<40} {t['attempts']:>8} {acc:>8}% {sp:>6}%  {breakdown}")

    lines.append("")

    # Recent attempts (last 10)
    lines.append("=== RECENT ATTEMPTS (last 10) ===")
    for attempt in history[-10:]:
        date = attempt.get('date', '')[:10]
        name = attempt.get('examName', '')
        score = attempt.get('score', 0)
        maxs  = attempt.get('maxScore', 0)
        pct   = round(score / maxs * 100) if maxs else 0
        lines.append(f"  {date}  {name[:55]:<55}  {score}/{maxs} ({pct}%)")

    return '\n'.join(lines)


def main():
    catalog = load_catalog()
    catalog_text = build_catalog_summary(catalog)

    perf_text = None
    if len(sys.argv) > 1:
        perf_file = sys.argv[1]
        with open(perf_file, encoding='utf-8') as f:
            perf_data = json.load(f)
        perf_text = build_performance_summary(perf_data)

    out_path = os.path.join(os.path.dirname(__file__), 'claude_context.txt')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(catalog_text)
        if perf_text:
            f.write('\n\n')
            f.write(perf_text)
        f.write('\n\n=== PROMPT SUGGESTION ===\n')
        f.write(
            "I am preparing for GATE CSE 2026. Based on the exam catalog and my performance data above,\n"
            "create a detailed week-by-week study plan that:\n"
            "1. Prioritizes topics where my accuracy is lowest\n"
            "2. Covers all core GATE CS subjects before the exam\n"
            "3. Includes specific exams from the catalog to attempt each week\n"
            "4. Balances topic-wise practice with full mock tests\n"
            "5. Leaves the final 4 weeks for revision and full-length mocks\n"
        )

    print(f"Written to: {out_path}")
    print(f"Catalog: {len(catalog)} exams across topics")
    if perf_text:
        print(f"Performance: {len(perf_data.get('history', []))} attempts included")
    print()
    print("HOW TO INCLUDE YOUR PERFORMANCE DATA:")
    print("  1. Open your exam app in the browser")
    print("  2. Open DevTools console (F12)")
    print("  3. Run: copy(JSON.stringify({history: JSON.parse(localStorage.exam_history || '[]')}))")
    print("  4. Paste into a file called perf.json")
    print("  5. Re-run: python3 scripts/export_context.py perf.json")


if __name__ == '__main__':
    main()
