/**
 * Classifies an exam name into a canonical GATE CS subject bucket.
 *
 * Strategy:
 *  1. Split on "|" — for GO Classes / GATE Overflow exams the topic is
 *     usually the second segment.
 *  2. Try to match each segment (and the full name) against ordered keyword
 *     rules, most-specific first.
 *  3. Fall back to "Mixed Paper" for full GATE / UGC / ISRO papers.
 */

export const TOPICS = [
  'Theory of Computation',
  'Compiler Design',
  'Computer Networks',
  'Operating Systems',
  'Database Management Systems',
  'Computer Organization & Architecture',
  'Digital Logic',
  'Algorithms',
  'Data Structures',
  'Discrete Mathematics',
  'Linear Algebra',
  'Calculus',
  'Probability & Statistics',
  'Engineering Mathematics',
  'Programming in C',
  'General Aptitude',
  'Machine Learning',
  'Mixed Paper',
] as const

export type Topic = (typeof TOPICS)[number]

// Each rule: [keywords that trigger the topic (any match), topic]
// Ordered most-specific first so e.g. "Theory of Computation" beats "Mathematics"
const RULES: [string[], Topic][] = [
  [['theory of computation', 'automata', 'finite automata', 'regular expression',
    'context free', 'cfl', 'pda', 'toc', 'turing', 'fa, cfl', 'dcfl', 'cfg',
    'pushdown'], 'Theory of Computation'],

  [['compiler', 'parsing', 'lexical', 'syntax directed', 'code generation',
    'runtime environment'], 'Compiler Design'],

  [['computer network', 'subnetting', 'supernetting', 'tcp', 'ip routing',
    'data link', 'network layer', 'transport layer', 'socket'], 'Computer Networks'],

  [['operating system', 'process synchronization', 'deadlock', 'scheduling',
    'memory management', 'virtual memory', 'page replacement', 'semaphore',
    'mutex', 'ipc', 'cache memory', 'file system'], 'Operating Systems'],

  [['database', 'dbms', 'sql', 'relational model', 'relational algebra',
    'normalization', 'normal form', 'functional dependency', 'transaction',
    'concurrency', 'b+ tree'], 'Database Management Systems'],

  [['computer organisation', 'computer organization', 'co and architecture',
    'co & architecture', 'architecture', 'pipeline', 'instruction set',
    'risc', 'cisc', 'addressing mode', 'memory hierarchy',
    'boolean algebra, minimization'], 'Computer Organization & Architecture'],

  [['digital logic', 'boolean algebra', 'combinational circuit', 'sequential circuit',
    'k-map', 'karnaugh', 'multiplexer', 'flip flop', 'number system',
    'minimization'], 'Digital Logic'],

  [['algorithm', 'asymptotic', 'time complexity', 'sorting', 'searching',
    'dynamic programming', 'greedy', 'graph algorithm', 'a star',
    'divide and conquer', 'np'], 'Algorithms'],

  [['data structure', 'stack', 'queue', 'linked list', 'tree', 'heap',
    'hash', 'graph'], 'Data Structures'],

  [['discrete mathematics', 'discrete math', 'propositional logic', 'predicate logic',
    'first order logic', 'mathematical logic', 'set theory', 'group theory',
    'combinatorics', 'counting', 'lattice', 'poset', 'relation', 'function',
    'proof technique', 'recurrence', 'pigeonhole', 'equivalence relation',
    'graph theory'], 'Discrete Mathematics'],

  [['linear algebra', 'matrix', 'eigenvalue', 'eigenvector', 'basis',
    'linear transformation', 'projection matrix', 'orthogonal'], 'Linear Algebra'],

  [['calculus', 'differentiation', 'integration', 'limit', 'continuity',
    'taylor series', 'maxima', 'minima', 'differentiability'], 'Calculus'],

  [['probability', 'statistics', 'bayes', 'distribution', 'hypothesis',
    'expectation', 'variance', 'random variable', 'conditional probability',
    'precision recall', 'bias variance'], 'Probability & Statistics'],

  [['engineering mathematics', 'mathematics'], 'Engineering Mathematics'],

  [['programming in c', 'c programming', 'c-programming', 'pointers',
    'recursion', 'programming'], 'Programming in C'],

  [['aptitude', 'verbal', 'quantitative', 'analytical', 'spatial',
    'logical reasoning', 'english'], 'General Aptitude'],

  [['machine learning', 'neural network', 'clustering', 'pca',
    'principal component', 'lda', 'regression', 'classification'], 'Machine Learning'],
]

function matchSegment(text: string): Topic | null {
  const lower = text.toLowerCase()
  for (const [keywords, topic] of RULES) {
    if (keywords.some(kw => lower.includes(kw))) return topic
  }
  return null
}

export function classifyExamTopic(examName: string): Topic {
  const segments = examName.split('|').map(s => s.trim())

  // Try pipe-separated segments (skip first segment which is usually the series name)
  for (const seg of segments.slice(1)) {
    const hit = matchSegment(seg)
    if (hit) return hit
  }

  // Try full name
  const fullHit = matchSegment(examName)
  if (fullHit) return fullHit

  return 'Mixed Paper'
}
