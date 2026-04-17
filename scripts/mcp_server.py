#!/usr/bin/env python3
"""
MCP server for GATE exam prep data.

Exposes your exam catalog and performance history as tools that Claude
can call inside claude.ai (desktop app) or any MCP-compatible client.

Tools available:
  list_topics        — all topics with exam counts
  list_exams         — exams for a topic (or all)
  search_exams       — search by keyword
  get_performance    — your accuracy/score per topic (needs perf.json)
  get_study_context  — full dump for study plan generation

Setup (Claude desktop app on Windows with WSL2):
  Add to %APPDATA%\\Claude\\claude_desktop_config.json:
  {
    "mcpServers": {
      "gate-exams": {
        "command": "wsl",
        "args": ["-e", "python3", "/home/sudeep/gate-practice-ui/scripts/mcp_server.py"]
      }
    }
  }
"""

import json
import os
import sys
from collections import defaultdict

import mcp.types as types
from mcp.server import Server
from mcp.server.stdio import stdio_server

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPTS_DIR  = os.path.dirname(os.path.abspath(__file__))
CATALOG_PATH = os.path.join(SCRIPTS_DIR, '..', 'public', 'exams', 'catalog.json')
PERF_PATH    = os.path.join(SCRIPTS_DIR, 'perf.json')

# ── Topic classifier (same logic as topicClassifier.ts) ───────────────────────
RULES = [
    (['theory of computation', 'automata', 'finite automata', 'regular expression',
      'context free', 'cfl', 'pda', 'toc', 'turing', 'dcfl', 'cfg'], 'Theory of Computation'),
    (['compiler', 'parsing', 'lexical', 'syntax directed', 'code generation'], 'Compiler Design'),
    (['computer network', 'subnetting', 'supernetting', 'tcp', 'ip routing',
      'data link', 'network layer', 'transport layer'], 'Computer Networks'),
    (['operating system', 'process synchronization', 'deadlock', 'scheduling',
      'memory management', 'virtual memory', 'semaphore', 'cache memory'], 'Operating Systems'),
    (['database', 'dbms', 'sql', 'relational model', 'relational algebra',
      'normalization', 'functional dependency', 'transaction'], 'Database Management Systems'),
    (['computer organisation', 'computer organization', 'co and architecture',
      'architecture', 'pipeline', 'boolean algebra, minimization'], 'Computer Organization & Architecture'),
    (['digital logic', 'boolean algebra', 'combinational circuit', 'k-map',
      'multiplexer', 'flip flop', 'number system'], 'Digital Logic'),
    (['algorithm', 'asymptotic', 'time complexity', 'sorting', 'dynamic programming',
      'greedy', 'graph algorithm', 'divide and conquer'], 'Algorithms'),
    (['data structure', 'stack', 'queue', 'linked list', 'tree', 'heap', 'hash', 'graph'], 'Data Structures'),
    (['discrete mathematics', 'propositional logic', 'predicate logic', 'first order logic',
      'mathematical logic', 'set theory', 'group theory', 'combinatorics',
      'lattice', 'poset', 'relation', 'function', 'proof technique'], 'Discrete Mathematics'),
    (['linear algebra', 'matrix', 'eigenvalue', 'eigenvector', 'basis',
      'linear transformation', 'projection matrix'], 'Linear Algebra'),
    (['calculus', 'differentiation', 'integration', 'limit', 'continuity',
      'taylor series', 'maxima', 'minima'], 'Calculus'),
    (['probability', 'statistics', 'bayes', 'distribution', 'hypothesis',
      'variance', 'random variable', 'conditional probability'], 'Probability & Statistics'),
    (['engineering mathematics', 'mathematics'], 'Engineering Mathematics'),
    (['programming in c', 'c programming', 'c-programming', 'pointers', 'recursion', 'programming'], 'Programming in C'),
    (['aptitude', 'verbal', 'quantitative', 'analytical', 'spatial'], 'General Aptitude'),
    (['machine learning', 'neural network', 'clustering', 'pca', 'regression'], 'Machine Learning'),
]

def classify(name: str) -> str:
    for seg in name.split('|')[1:]:
        lower = seg.strip().lower()
        for kws, topic in RULES:
            if any(kw in lower for kw in kws):
                return topic
    lower = name.lower()
    for kws, topic in RULES:
        if any(kw in lower for kw in kws):
            return topic
    return 'Mixed Paper'

# ── Load data ─────────────────────────────────────────────────────────────────
def load_catalog():
    with open(CATALOG_PATH, encoding='utf-8') as f:
        return json.load(f)

def load_perf():
    if not os.path.exists(PERF_PATH):
        return None
    with open(PERF_PATH, encoding='utf-8') as f:
        return json.load(f)

# ── Server ────────────────────────────────────────────────────────────────────
server = Server('gate-exam-prep')

@server.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name='list_topics',
            description='List all available GATE CS topics with the number of practice exams for each.',
            inputSchema={'type': 'object', 'properties': {}, 'required': []},
        ),
        types.Tool(
            name='list_exams',
            description='List practice exams, optionally filtered by topic name.',
            inputSchema={
                'type': 'object',
                'properties': {
                    'topic': {
                        'type': 'string',
                        'description': 'Topic name (e.g. "Algorithms"). Omit to list all.',
                    }
                },
                'required': [],
            },
        ),
        types.Tool(
            name='search_exams',
            description='Search exams by keyword in their name.',
            inputSchema={
                'type': 'object',
                'properties': {
                    'query': {'type': 'string', 'description': 'Search keyword'},
                },
                'required': ['query'],
            },
        ),
        types.Tool(
            name='get_performance',
            description=(
                'Get my topic-wise performance: accuracy, score%, correct/wrong/skipped counts. '
                'Returns an error if perf.json has not been exported yet.'
            ),
            inputSchema={'type': 'object', 'properties': {}, 'required': []},
        ),
        types.Tool(
            name='get_study_context',
            description=(
                'Get full context needed to create a GATE study plan: '
                'available exams per topic + my performance data.'
            ),
            inputSchema={'type': 'object', 'properties': {}, 'required': []},
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    catalog = load_catalog()

    # ── list_topics ───────────────────────────────────────────────────────────
    if name == 'list_topics':
        by_topic = defaultdict(int)
        for exam in catalog:
            by_topic[classify(exam['name'])] += 1
        lines = ['Topic                                     Exams', '-' * 50]
        for topic in sorted(by_topic):
            lines.append(f'{topic:<42} {by_topic[topic]:>5}')
        lines.append(f'\nTotal: {len(catalog)} exams across {len(by_topic)} topics')
        return [types.TextContent(type='text', text='\n'.join(lines))]

    # ── list_exams ────────────────────────────────────────────────────────────
    if name == 'list_exams':
        topic_filter = arguments.get('topic', '').strip().lower()
        results = []
        for exam in catalog:
            t = classify(exam['name'])
            if not topic_filter or topic_filter in t.lower():
                results.append(
                    f"[{t}] {exam['name']}  "
                    f"({exam['totalQuestions']}Q, {exam['durationMinutes']}min)"
                )
        if not results:
            return [types.TextContent(type='text', text=f'No exams found for topic: {topic_filter}')]
        return [types.TextContent(type='text', text='\n'.join(results))]

    # ── search_exams ──────────────────────────────────────────────────────────
    if name == 'search_exams':
        query = arguments.get('query', '').lower()
        results = [
            f"{e['name']}  ({e['totalQuestions']}Q, {e['durationMinutes']}min)"
            for e in catalog if query in e['name'].lower()
        ]
        if not results:
            return [types.TextContent(type='text', text=f'No exams matched: {query}')]
        return [types.TextContent(type='text', text='\n'.join(results))]

    # ── get_performance ───────────────────────────────────────────────────────
    if name == 'get_performance':
        perf = load_perf()
        if not perf:
            return [types.TextContent(type='text', text=(
                'perf.json not found. To export your performance data:\n'
                '1. Open your exam app in the browser\n'
                '2. Open DevTools console (F12)\n'
                '3. Run: copy(JSON.stringify({history: JSON.parse(localStorage.exam_history || "[]")}))\n'
                '4. Paste clipboard into: scripts/perf.json'
            ))]

        history = perf.get('history', [])
        by_topic = defaultdict(lambda: {'attempts': 0, 'correct': 0, 'wrong': 0,
                                         'skipped': 0, 'score': 0, 'max_score': 0})
        for attempt in history:
            t = by_topic[classify(attempt.get('examName', ''))]
            t['attempts']  += 1
            t['correct']   += attempt.get('correct', 0)
            t['wrong']     += attempt.get('wrong', 0)
            t['skipped']   += attempt.get('skipped', 0)
            t['score']     += attempt.get('score', 0)
            t['max_score'] += attempt.get('maxScore', 0)

        lines = [f'Performance summary ({len(history)} attempts total)\n']
        lines.append(f'{"Topic":<42} {"Att":>4} {"Acc":>6} {"Score%":>7}  C/W/S')
        lines.append('-' * 75)
        for topic in sorted(by_topic):
            t = by_topic[topic]
            answered = t['correct'] + t['wrong']
            acc = round(t['correct'] / answered * 100) if answered else 0
            sp  = round(max(0, t['score']) / t['max_score'] * 100) if t['max_score'] else 0
            lines.append(
                f'{topic:<42} {t["attempts"]:>4} {acc:>5}% {sp:>6}%'
                f'  {t["correct"]}/{t["wrong"]}/{t["skipped"]}'
            )
        return [types.TextContent(type='text', text='\n'.join(lines))]

    # ── get_study_context ─────────────────────────────────────────────────────
    if name == 'get_study_context':
        # Catalog grouped by topic
        by_topic = defaultdict(list)
        for exam in catalog:
            by_topic[classify(exam['name'])].append(exam)

        lines = ['=== GATE EXAM CATALOG ===\n']
        for topic in sorted(by_topic):
            exams = by_topic[topic]
            lines.append(f'## {topic} ({len(exams)} exams)')
            for e in sorted(exams, key=lambda x: x['name']):
                lines.append(f'  - {e["name"]}  [{e["totalQuestions"]}Q, {e["durationMinutes"]}min]')
            lines.append('')

        # Performance if available
        perf = load_perf()
        if perf:
            history = perf.get('history', [])
            by_t = defaultdict(lambda: {'attempts': 0, 'correct': 0, 'wrong': 0,
                                         'skipped': 0, 'score': 0, 'max_score': 0})
            for attempt in history:
                t = by_t[classify(attempt.get('examName', ''))]
                t['attempts']  += 1
                t['correct']   += attempt.get('correct', 0)
                t['wrong']     += attempt.get('wrong', 0)
                t['skipped']   += attempt.get('skipped', 0)
                t['score']     += attempt.get('score', 0)
                t['max_score'] += attempt.get('maxScore', 0)

            lines.append('=== MY PERFORMANCE ===\n')
            for topic in sorted(by_t):
                t = by_t[topic]
                answered = t['correct'] + t['wrong']
                acc = round(t['correct'] / answered * 100) if answered else 0
                sp  = round(max(0, t['score']) / t['max_score'] * 100) if t['max_score'] else 0
                lines.append(
                    f'{topic}: accuracy={acc}%, score={sp}%, '
                    f'attempts={t["attempts"]}, C/W/S={t["correct"]}/{t["wrong"]}/{t["skipped"]}'
                )
        else:
            lines.append('(No performance data — export perf.json to include it)')

        return [types.TextContent(type='text', text='\n'.join(lines))]

    return [types.TextContent(type='text', text=f'Unknown tool: {name}')]


# ── Entry point ───────────────────────────────────────────────────────────────
async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())

if __name__ == '__main__':
    import asyncio
    asyncio.run(main())
