// Pure calculator logic — no React, no side effects.
// Calculator.tsx imports these and wraps them in setState calls.

export type AngleMode = 'deg' | 'rad'

export interface Frame {
  prev: number | null
  op:   string | null
  sym:  string | null
  top:  string
}

export interface CS {
  cur:   string        // bottom display — current number being entered
  top:   string        // top display — expression context
  prev:  number | null
  op:    string | null
  sym:   string | null // display symbol for pending op
  fresh: boolean       // next digit replaces current
  mem:   number
  mode:  AngleMode
  stack: Frame[]       // parenthesis stack
}

export const INIT: CS = {
  cur: '0', top: '', prev: null, op: null, sym: null,
  fresh: false, mem: 0, mode: 'deg', stack: [],
}

// ── Pure helpers ────────────────────────────────────────────────────────

export function fmt(n: number): string {
  if (isNaN(n))      return 'Error'
  if (!isFinite(n))  return n > 0 ? 'Infinity' : '-Infinity'
  return parseFloat(n.toPrecision(14)).toString()
}

export function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN
  if (n > 170) return Infinity
  let r = 1
  for (let i = 2; i <= n; i++) r *= i
  return r
}

export function binEval(a: number, b: number, op: string): number {
  switch (op) {
    case '+':     return a + b
    case '-':     return a - b
    case '*':     return a * b
    case '/':     return b === 0 ? NaN : a / b
    case 'mod':   return a % b
    case 'pow':   return Math.pow(a, b)
    case 'logY':  return Math.log(a) / Math.log(b)  // log base b of a
    case 'rootY': return Math.pow(a, 1 / b)           // b-th root of a
    default:      return b
  }
}

export function toRad(x: number, m: AngleMode): number {
  return m === 'deg' ? x * Math.PI / 180 : x
}

export function fromRad(x: number, m: AngleMode): number {
  return m === 'deg' ? x * 180 / Math.PI : x
}

// ── State transitions (all pure: CS → CS) ───────────────────────────────

export function applyDigit(s: CS, d: string): CS {
  if (s.fresh) return { ...s, cur: d === '.' ? '0.' : d, fresh: false }
  if (d === '.' && (s.cur.includes('.') || s.cur.includes('E'))) return s
  if (s.cur === '0' && d !== '.') return { ...s, cur: d }
  return { ...s, cur: s.cur + d }
}

export function applyExpKey(s: CS): CS {
  if (s.cur.includes('E')) return s
  const base = s.fresh ? '0' : s.cur
  return { ...s, cur: base + 'E', fresh: false }
}

export function applyBinOp(s: CS, op: string, sym: string): CS {
  const val = parseFloat(s.cur)
  if (s.op !== null && !s.fresh) {
    const res = binEval(s.prev!, val, s.op)
    const r   = fmt(res)
    return { ...s, cur: r, top: r + ' ' + sym + ' ', prev: res, op, sym, fresh: true }
  }
  return { ...s, prev: val, op, sym, top: s.cur + ' ' + sym + ' ', fresh: true }
}

export function applyEqual(s: CS): CS {
  if (s.op === null || s.prev === null) return { ...s, top: s.cur + ' =', fresh: true }
  const res = binEval(s.prev, parseFloat(s.cur), s.op)
  const r   = fmt(res)
  return { ...s, cur: r, top: s.top + s.cur + ' =', prev: null, op: null, sym: null, fresh: true }
}

export function applyUnary(s: CS, fn: (x: number) => number, label: string): CS {
  const res = fn(parseFloat(s.cur))
  const r   = fmt(res)
  return { ...s, cur: r, top: label + '(' + s.cur + ') =', fresh: true }
}

export function applyClearAll(s: CS): CS {
  return { ...INIT, mem: s.mem, mode: s.mode }
}

export function applyBackspace(s: CS): CS {
  if (s.fresh) return { ...s, cur: '0', fresh: false }
  if (s.cur === 'Error' || s.cur === 'Infinity' || s.cur === '-Infinity') return { ...s, cur: '0' }
  const next = s.cur.length <= 1 ? '0' : s.cur.slice(0, -1)
  return { ...s, cur: next }
}

export function applySign(s: CS): CS {
  const cur = s.cur.startsWith('-') ? s.cur.slice(1) : '-' + s.cur
  return { ...s, cur }
}

export function applyPct(s: CS): CS {
  const val = parseFloat(s.cur)
  const res = s.prev !== null && s.op ? (s.prev * val) / 100 : val / 100
  return { ...s, cur: fmt(res), fresh: true }
}

export function applyParenOpen(s: CS): CS {
  return {
    ...s,
    stack: [...s.stack, { prev: s.prev, op: s.op, sym: s.sym, top: s.top }],
    prev: null, op: null, sym: null,
    top: s.top + '(',
    cur: '0', fresh: false,
  }
}

export function applyParenClose(s: CS): CS {
  if (s.stack.length === 0) return s
  const inner = s.op !== null && s.prev !== null
    ? binEval(s.prev, parseFloat(s.cur), s.op)
    : parseFloat(s.cur)
  const r     = fmt(inner)
  const frame = s.stack[s.stack.length - 1]
  return {
    ...s,
    stack: s.stack.slice(0, -1),
    prev:  frame.prev,
    op:    frame.op,
    sym:   frame.sym,
    top:   frame.top + '(' + s.cur + ')',
    cur:   r,
    fresh: true,
  }
}

export function applyMC(s: CS):     CS { return { ...s, mem: 0 } }
export function applyMR(s: CS):     CS { return { ...s, cur: fmt(s.mem), fresh: true } }
export function applyMS(s: CS):     CS { return { ...s, mem: parseFloat(s.cur) } }
export function applyMPlus(s: CS):  CS { return { ...s, mem: s.mem + parseFloat(s.cur) } }
export function applyMMinus(s: CS): CS { return { ...s, mem: s.mem - parseFloat(s.cur) } }

export function applyConstant(s: CS, val: number, label: string): CS {
  return { ...s, cur: fmt(val), top: label, fresh: true }
}
