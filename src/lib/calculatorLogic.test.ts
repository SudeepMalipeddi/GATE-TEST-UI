import { describe, test, expect } from 'bun:test'
import {
  INIT, fmt, factorial, binEval, toRad, fromRad,
  applyDigit, applyExpKey, applyBinOp, applyEqual, applyUnary,
  applyClearAll, applyBackspace, applySign, applyPct,
  applyParenOpen, applyParenClose,
  applyMC, applyMR, applyMS, applyMPlus, applyMMinus,
  applyConstant,
  type CS,
} from './calculatorLogic'

// ── helpers ─────────────────────────────────────────────────────────────

/** Type a multi-digit number like '123' or '3.14' */
function typeNum(s: CS, n: string): CS {
  return n.split('').reduce((acc, ch) => applyDigit(acc, ch), s)
}

/** Shorthand: type number, press binOp, type number, press = */
function calc(a: string, op: string, b: string): CS {
  let s = typeNum(INIT, a)
  s = applyBinOp(s, op, op)
  s = typeNum(s, b)
  return applyEqual(s)
}

const close = (a: string, b: number, tol = 1e-9) =>
  expect(Math.abs(parseFloat(a) - b)).toBeLessThan(tol)

// ── fmt ─────────────────────────────────────────────────────────────────

describe('fmt', () => {
  test('formats integers cleanly',            () => expect(fmt(5)).toBe('5'))
  test('formats decimals',                    () => expect(fmt(1.5)).toBe('1.5'))
  test('suppresses floating-point noise',     () => expect(fmt(0.1 + 0.2)).toBe('0.3'))
  test('NaN → Error',                         () => expect(fmt(NaN)).toBe('Error'))
  test('+Infinity → Infinity',               () => expect(fmt(Infinity)).toBe('Infinity'))
  test('-Infinity → -Infinity',              () => expect(fmt(-Infinity)).toBe('-Infinity'))
  test('zero',                                () => expect(fmt(0)).toBe('0'))
  test('negative',                            () => expect(fmt(-42)).toBe('-42'))
})

// ── factorial ───────────────────────────────────────────────────────────

describe('factorial', () => {
  test('0! = 1',           () => expect(factorial(0)).toBe(1))
  test('1! = 1',           () => expect(factorial(1)).toBe(1))
  test('5! = 120',         () => expect(factorial(5)).toBe(120))
  test('10! = 3628800',    () => expect(factorial(10)).toBe(3628800))
  test('negative → NaN',   () => expect(factorial(-1)).toBeNaN())
  test('float → NaN',      () => expect(factorial(1.5)).toBeNaN())
  test('n > 170 → Inf',    () => expect(factorial(171)).toBe(Infinity))
})

// ── binEval ──────────────────────────────────────────────────────────────

describe('binEval', () => {
  test('addition',             () => expect(binEval(2, 3, '+')).toBe(5))
  test('subtraction',          () => expect(binEval(10, 4, '-')).toBe(6))
  test('multiplication',       () => expect(binEval(6, 7, '*')).toBe(42))
  test('division',             () => expect(binEval(15, 3, '/')).toBe(5))
  test('division by zero',     () => expect(binEval(1, 0, '/')).toBeNaN())
  test('modulo',               () => expect(binEval(10, 3, 'mod')).toBe(1))
  test('modulo exact',         () => expect(binEval(9, 3, 'mod')).toBe(0))
  test('power',                () => expect(binEval(2, 8, 'pow')).toBe(256))
  test('power fractional',     () => expect(binEval(4, 0.5, 'pow')).toBe(2))
  test('logY: log₂(8) = 3',   () => close(fmt(binEval(8, 2, 'logY')), 3))
  test('logY: log₁₀(100) = 2',() => close(fmt(binEval(100, 10, 'logY')), 2))
  test('rootY: cube root 27',  () => close(fmt(binEval(27, 3, 'rootY')), 3))
  test('rootY: 4th root 16',   () => close(fmt(binEval(16, 4, 'rootY')), 2))
})

// ── angle conversion ─────────────────────────────────────────────────────

describe('angle helpers', () => {
  test('toRad: 180° = π',     () => close(toRad(180, 'deg').toString(), Math.PI))
  test('toRad: rad passthru', () => expect(toRad(Math.PI, 'rad')).toBe(Math.PI))
  test('fromRad: π = 180°',   () => close(fromRad(Math.PI, 'deg').toString(), 180))
  test('fromRad: rad passthru',() => expect(fromRad(1, 'rad')).toBe(1))
})

// ── basic arithmetic sequences ───────────────────────────────────────────

describe('arithmetic', () => {
  test('2 + 3 = 5',    () => expect(calc('2', '+', '3').cur).toBe('5'))
  test('10 - 4 = 6',   () => expect(calc('10', '-', '4').cur).toBe('6'))
  test('6 × 7 = 42',   () => expect(calc('6', '*', '7').cur).toBe('42'))
  test('15 / 3 = 5',   () => expect(calc('15', '/', '3').cur).toBe('5'))
  test('0.1 + 0.2 = 0.3', () => expect(calc('0.1', '+', '0.2').cur).toBe('0.3'))
  test('1 / 3',        () => close(calc('1', '/', '3').cur, 1 / 3))

  test('chained ops: 2+3×4 = 20 (left-to-right, no precedence)', () => {
    let s = typeNum(INIT, '2')
    s = applyBinOp(s, '+', '+')   // evaluates nothing yet, prev=2
    s = typeNum(s, '3')
    s = applyBinOp(s, '*', '×')   // evaluates 2+3=5, prev=5
    s = typeNum(s, '4')
    s = applyEqual(s)             // evaluates 5×4=20
    expect(s.cur).toBe('20')
  })

  test('repeated equals reuses prev op', () => {
    let s = typeNum(INIT, '5')
    s = applyBinOp(s, '+', '+')
    s = typeNum(s, '3')
    s = applyEqual(s)
    expect(s.cur).toBe('8')
  })

  test('negative result',  () => expect(calc('3', '-', '10').cur).toBe('-7'))
  test('large numbers',    () => expect(calc('999999', '*', '999999').cur).toBe('999998000001'))
})

// ── digit input ───────────────────────────────────────────────────────────

describe('digit input', () => {
  test('fresh state shows single digit',    () => expect(applyDigit(INIT, '5').cur).toBe('5'))
  test('leading zero replaced',             () => expect(applyDigit(INIT, '0').cur).toBe('0'))
  test('multi-digit number',                () => expect(typeNum(INIT, '123').cur).toBe('123'))
  test('decimal input',                     () => expect(typeNum(INIT, '3.14').cur).toBe('3.14'))
  test('duplicate dot ignored',             () => {
    let s = typeNum(INIT, '3.')
    s = applyDigit(s, '.')
    expect(s.cur).toBe('3.')
  })
  test('fresh=true: next digit replaces',  () => {
    const s: CS = { ...INIT, cur: '42', fresh: true }
    expect(applyDigit(s, '7').cur).toBe('7')
  })
})

// ── Exp (scientific notation) ─────────────────────────────────────────────

describe('Exp key', () => {
  test('appends E to current',  () => {
    const s = typeNum(INIT, '1')
    expect(applyExpKey(s).cur).toBe('1E')
  })
  test('can type exponent after E', () => {
    let s = typeNum(INIT, '1')
    s = applyExpKey(s)
    s = applyDigit(s, '3')
    expect(s.cur).toBe('1E3')
  })
  test('second Exp press ignored', () => {
    let s = typeNum(INIT, '1')
    s = applyExpKey(s)
    s = applyExpKey(s)
    expect(s.cur).toBe('1E')
  })
})

// ── sign and percent ──────────────────────────────────────────────────────

describe('sign (+/-)', () => {
  test('positive → negative',   () => expect(applySign(typeNum(INIT, '5')).cur).toBe('-5'))
  test('negative → positive',   () => {
    const s: CS = { ...INIT, cur: '-5' }
    expect(applySign(s).cur).toBe('5')
  })
  test('zero stays zero-ish',   () => expect(applySign(INIT).cur).toBe('-0'))
})

describe('percent', () => {
  test('standalone: 50% = 0.5',  () => expect(applyPct(typeNum(INIT, '50')).cur).toBe('0.5'))
  test('of prev: 200 + 50% = 100 (50% of 200)', () => {
    let s = typeNum(INIT, '200')
    s = applyBinOp(s, '+', '+')
    s = typeNum(s, '50')
    s = applyPct(s)
    expect(s.cur).toBe('100')
  })
})

// ── backspace and clear ───────────────────────────────────────────────────

describe('backspace', () => {
  test('removes last digit',      () => expect(applyBackspace(typeNum(INIT, '123')).cur).toBe('12'))
  test('single digit → 0',       () => expect(applyBackspace(typeNum(INIT, '5')).cur).toBe('0'))
  test('fresh state → 0',         () => {
    const s: CS = { ...INIT, cur: '42', fresh: true }
    expect(applyBackspace(s).cur).toBe('0')
  })
  test('clears Error display',    () => {
    const s: CS = { ...INIT, cur: 'Error' }
    expect(applyBackspace(s).cur).toBe('0')
  })
})

describe('clear all', () => {
  test('resets display to 0',     () => expect(applyClearAll(typeNum(INIT, '999')).cur).toBe('0'))
  test('preserves memory',        () => {
    const s: CS = { ...INIT, mem: 42 }
    expect(applyClearAll(s).mem).toBe(42)
  })
  test('preserves angle mode',    () => {
    const s: CS = { ...INIT, mode: 'rad' }
    expect(applyClearAll(s).mode).toBe('rad')
  })
  test('clears pending op',       () => {
    let s = typeNum(INIT, '5')
    s = applyBinOp(s, '+', '+')
    s = applyClearAll(s)
    expect(s.op).toBeNull()
    expect(s.prev).toBeNull()
  })
})

// ── unary functions ───────────────────────────────────────────────────────

describe('unary functions', () => {
  const unary = (n: string, fn: (x: number) => number) =>
    applyUnary(typeNum(INIT, n), fn, 'fn').cur

  test('√4 = 2',                () => expect(unary('4', Math.sqrt)).toBe('2'))
  test('√2',                    () => close(unary('2', Math.sqrt), Math.SQRT2))
  test('x² of 3 = 9',           () => expect(unary('3', x => x * x)).toBe('9'))
  test('x³ of 2 = 8',           () => expect(unary('2', x => x * x * x)).toBe('8'))
  test('log(100) = 2',          () => expect(unary('100', Math.log10)).toBe('2'))
  test('ln(e) = 1',             () => close(unary(String(Math.E), Math.log), 1))
  test('log₂(8) = 3',           () => close(unary('8', Math.log2), 3))
  test('eˣ(0) = 1',             () => expect(unary('0', Math.exp)).toBe('1'))
  test('10ˣ(2) = 100',          () => expect(unary('2', x => Math.pow(10, x))).toBe('100'))
  test('1/x of 4 = 0.25',       () => expect(unary('4', x => 1 / x)).toBe('0.25'))
  test('|x| of -7 = 7',         () => expect(unary('-7', Math.abs)).toBe('7'))
  test('³√(27) = 3',            () => close(unary('27', Math.cbrt), 3))
  test('n! of 5 = 120',         () => expect(unary('5', factorial)).toBe('120'))
  test('log of negative → Error', () => expect(unary('-1', Math.log10)).toBe('Error'))
  test('√ of negative → Error',  () => expect(unary('-1', Math.sqrt)).toBe('Error'))
})

// ── trig (degree mode) ────────────────────────────────────────────────────

describe('trig (degrees)', () => {
  const trig = (deg: string, fn: (x: number) => number) =>
    applyUnary(typeNum(INIT, deg), x => fn(toRad(x, 'deg')), 'fn').cur

  test('sin(0°) = 0',    () => close(trig('0',  Math.sin), 0))
  test('sin(30°) = 0.5', () => close(trig('30', Math.sin), 0.5))
  test('sin(90°) = 1',   () => close(trig('90', Math.sin), 1))
  test('cos(0°) = 1',    () => close(trig('0',  Math.cos), 1))
  test('cos(60°) = 0.5', () => close(trig('60', Math.cos), 0.5))
  test('cos(90°) ≈ 0',   () => close(trig('90', Math.cos), 0))
  test('tan(45°) = 1',   () => close(trig('45', Math.tan), 1))
})

describe('inverse trig (degrees)', () => {
  const invTrig = (val: string, fn: (x: number) => number) =>
    applyUnary(typeNum(INIT, val), x => fromRad(fn(x), 'deg'), 'fn').cur

  test('sin⁻¹(0.5) = 30°',  () => close(invTrig('0.5', Math.asin), 30))
  test('cos⁻¹(1) = 0°',     () => close(invTrig('1',   Math.acos), 0))
  test('cos⁻¹(0.5) = 60°',  () => close(invTrig('0.5', Math.acos), 60))
  test('tan⁻¹(1) = 45°',    () => close(invTrig('1',   Math.atan), 45))
})

// ── trig (radian mode) ────────────────────────────────────────────────────

describe('trig (radians)', () => {
  const trigR = (rad: string, fn: (x: number) => number) =>
    applyUnary(typeNum(INIT, rad), x => fn(toRad(x, 'rad')), 'fn').cur

  test('sin(π) ≈ 0',    () => close(trigR(String(Math.PI), Math.sin), 0))
  test('cos(0) = 1',    () => close(trigR('0', Math.cos), 1))
})

// ── hyperbolic functions ──────────────────────────────────────────────────

describe('hyperbolic', () => {
  const h = (n: string, fn: (x: number) => number) =>
    applyUnary(typeNum(INIT, n), fn, 'fn').cur

  test('sinh(0) = 0',     () => close(h('0', Math.sinh), 0))
  test('cosh(0) = 1',     () => close(h('0', Math.cosh), 1))
  test('tanh(0) = 0',     () => close(h('0', Math.tanh), 0))
  test('sinh⁻¹(0) = 0',  () => close(h('0', Math.asinh), 0))
  test('cosh⁻¹(1) = 0',  () => close(h('1', Math.acosh), 0))
  test('tanh⁻¹(0) = 0',  () => close(h('0', Math.atanh), 0))
})

// ── two-operand scientific functions ─────────────────────────────────────

describe('two-operand functions', () => {
  test('2 ^ 8 = 256', () => {
    let s = typeNum(INIT, '2')
    s = applyBinOp(s, 'pow', '^')
    s = typeNum(s, '8')
    s = applyEqual(s)
    expect(s.cur).toBe('256')
  })

  test('3 ^ 3 = 27', () => {
    let s = typeNum(INIT, '3')
    s = applyBinOp(s, 'pow', '^')
    s = typeNum(s, '3')
    s = applyEqual(s)
    expect(s.cur).toBe('27')
  })

  test('10 mod 3 = 1', () => {
    let s = typeNum(INIT, '10')
    s = applyBinOp(s, 'mod', 'mod')
    s = typeNum(s, '3')
    s = applyEqual(s)
    expect(s.cur).toBe('1')
  })

  test('9 mod 3 = 0', () => {
    let s = typeNum(INIT, '9')
    s = applyBinOp(s, 'mod', 'mod')
    s = typeNum(s, '3')
    s = applyEqual(s)
    expect(s.cur).toBe('0')
  })

  test('log base 2 of 8 = 3 (logY)', () => {
    let s = typeNum(INIT, '8')
    s = applyBinOp(s, 'logY', 'logᵧ')
    s = typeNum(s, '2')
    s = applyEqual(s)
    close(s.cur, 3)
  })

  test('log base 10 of 1000 = 3 (logY)', () => {
    let s = typeNum(INIT, '1000')
    s = applyBinOp(s, 'logY', 'logᵧ')
    s = typeNum(s, '10')
    s = applyEqual(s)
    close(s.cur, 3)
  })

  test('cube root via rootY: 27 rootY 3 = 3', () => {
    let s = typeNum(INIT, '27')
    s = applyBinOp(s, 'rootY', 'ʸ√')
    s = typeNum(s, '3')
    s = applyEqual(s)
    close(s.cur, 3)
  })

  test('4th root via rootY: 81 rootY 4 = 3', () => {
    let s = typeNum(INIT, '81')
    s = applyBinOp(s, 'rootY', 'ʸ√')
    s = typeNum(s, '4')
    s = applyEqual(s)
    close(s.cur, 3)
  })
})

// ── constants ─────────────────────────────────────────────────────────────

describe('constants', () => {
  test('π ≈ 3.14159…', () => close(applyConstant(INIT, Math.PI, 'π').cur, Math.PI, 1e-12))
  test('e ≈ 2.71828…', () => close(applyConstant(INIT, Math.E,  'e').cur, Math.E,  1e-12))
})

// ── memory operations ─────────────────────────────────────────────────────

describe('memory', () => {
  test('MS stores, MR recalls', () => {
    let s = typeNum(INIT, '42')
    s = applyMS(s)
    s = applyClearAll(s)
    expect(s.cur).toBe('0')
    s = applyMR(s)
    expect(s.cur).toBe('42')
  })

  test('MC clears memory', () => {
    let s = applyMS(typeNum(INIT, '99'))
    s = applyMC(s)
    expect(s.mem).toBe(0)
  })

  test('M+ adds to memory', () => {
    let s = applyMS(typeNum(INIT, '10'))
    s = { ...applyClearAll(s), mem: s.mem }
    s = typeNum(s, '5')
    s = applyMPlus(s)
    expect(s.mem).toBe(15)
  })

  test('M- subtracts from memory', () => {
    let s = applyMS(typeNum(INIT, '10'))
    s = { ...applyClearAll(s), mem: s.mem }
    s = typeNum(s, '3')
    s = applyMMinus(s)
    expect(s.mem).toBe(7)
  })

  test('MR into computation: 7 + MR(3) = 10', () => {
    // Store 3 in memory
    let s = applyMS(typeNum(INIT, '3'))
    s = applyClearAll(s)
    // 7 + MR = 10
    s = typeNum(s, '7')
    s = applyBinOp(s, '+', '+')
    s = applyMR(s)
    s = applyEqual(s)
    expect(s.cur).toBe('10')
  })
})

// ── parentheses ───────────────────────────────────────────────────────────

describe('parentheses', () => {
  test('(3) = 3 (trivial)', () => {
    let s = applyParenOpen(INIT)
    s = typeNum(s, '3')
    s = applyParenClose(s)
    expect(s.cur).toBe('3')
  })

  test('2 × (3 + 4) = 14', () => {
    let s = typeNum(INIT, '2')
    s = applyBinOp(s, '*', '×')
    s = applyParenOpen(s)
    s = typeNum(s, '3')
    s = applyBinOp(s, '+', '+')
    s = typeNum(s, '4')
    s = applyParenClose(s)
    s = applyEqual(s)
    expect(s.cur).toBe('14')
  })

  test('(2 + 3) × 4 = 20', () => {
    let s = applyParenOpen(INIT)
    s = typeNum(s, '2')
    s = applyBinOp(s, '+', '+')
    s = typeNum(s, '3')
    s = applyParenClose(s)        // inner = 5
    s = applyBinOp(s, '*', '×')
    s = typeNum(s, '4')
    s = applyEqual(s)
    expect(s.cur).toBe('20')
  })

  test('unmatched ) is ignored', () => {
    const s = applyParenClose(INIT)
    expect(s.cur).toBe('0')      // unchanged
  })

  test('stack depth increases on open', () => {
    let s = applyParenOpen(INIT)
    s = applyParenOpen(s)
    expect(s.stack.length).toBe(2)
    s = applyParenClose(s)
    expect(s.stack.length).toBe(1)
  })
})

// ── edge cases ────────────────────────────────────────────────────────────

describe('edge cases', () => {
  test('division by zero shows Error', () => {
    let s = typeNum(INIT, '1')
    s = applyBinOp(s, '/', '/')
    s = typeNum(s, '0')
    s = applyEqual(s)
    expect(s.cur).toBe('Error')
  })

  test('log of 0 shows -Infinity', () => {
    const s = applyUnary(typeNum(INIT, '0'), Math.log10, 'log')
    expect(s.cur).toBe('-Infinity')
  })

  test('log of negative shows Error', () => {
    const s = applyUnary(typeNum(INIT, '-1'), Math.log10, 'log')
    expect(s.cur).toBe('Error')
  })

  test('asin of 2 shows Error (out of domain)', () => {
    const s = applyUnary(typeNum(INIT, '2'), Math.asin, 'sin⁻¹')
    expect(s.cur).toBe('Error')
  })

  test('0^0 = 1', () => {
    let s = typeNum(INIT, '0')
    s = applyBinOp(s, 'pow', '^')
    s = typeNum(s, '0')
    s = applyEqual(s)
    expect(s.cur).toBe('1')
  })

  test('pressing = with no op keeps current value', () => {
    const s = applyEqual(typeNum(INIT, '42'))
    expect(s.cur).toBe('42')
  })

  test('clear after error resets to 0', () => {
    let s = typeNum(INIT, '1')
    s = applyBinOp(s, '/', '/')
    s = typeNum(s, '0')
    s = applyEqual(s)
    expect(s.cur).toBe('Error')
    s = applyClearAll(s)
    expect(s.cur).toBe('0')
  })
})
