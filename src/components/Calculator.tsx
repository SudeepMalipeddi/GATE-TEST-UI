import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface State {
  display: string   // what's shown
  input: string     // current number being typed
  prev: number | null
  op: string | null
  fresh: boolean    // next digit starts new number
  mem: number
}

const INIT: State = { display: '0', input: '0', prev: null, op: null, fresh: false, mem: 0 }
const DEG = Math.PI / 180

function fmt(n: number): string {
  if (!isFinite(n)) return isNaN(n) ? 'Error' : n > 0 ? 'Infinity' : '-Infinity'
  // Avoid floating-point noise like 0.30000000000000004
  const s = parseFloat(n.toPrecision(12)).toString()
  return s
}

function applyOp(a: number, b: number, op: string): number {
  switch (op) {
    case '+':  return a + b
    case '-':  return a - b
    case '×':  return a * b
    case '÷':  return a / b
    case 'xʸ': return Math.pow(a, b)
    default:   return b
  }
}

export function Calculator({ open, onOpenChange }: Props) {
  const [s, setS] = useState<State>(INIT)

  const digit = useCallback((d: string) => setS(prev => {
    if (prev.fresh) {
      const next = d === '.' ? '0.' : d
      return { ...prev, input: next, display: next, fresh: false }
    }
    if (d === '.' && prev.input.includes('.')) return prev
    if (prev.input === '0' && d !== '.') {
      return { ...prev, input: d, display: d }
    }
    const next = prev.input + d
    return { ...prev, input: next, display: next }
  }), [])

  const binOp = useCallback((op: string) => setS(prev => {
    const val = parseFloat(prev.input)
    if (prev.op && !prev.fresh) {
      const result = applyOp(prev.prev!, val, prev.op)
      const r = fmt(result)
      return { ...prev, display: r, input: r, prev: result, op, fresh: true }
    }
    return { ...prev, prev: val, op, display: prev.display, fresh: true }
  }), [])

  const equal = useCallback(() => setS(prev => {
    if (!prev.op || prev.prev === null) return prev
    const result = applyOp(prev.prev, parseFloat(prev.input), prev.op)
    const r = fmt(result)
    return { ...INIT, display: r, input: r, mem: prev.mem }
  }), [])

  const unary = useCallback((fn: (x: number) => number) => setS(prev => {
    const result = fn(parseFloat(prev.input))
    const r = fmt(result)
    return { ...prev, display: r, input: r, fresh: true }
  }), [])

  const clearAll  = useCallback(() => setS(s => ({ ...INIT, mem: s.mem })), [])
  const clearEntry = useCallback(() => setS(s => ({ ...s, input: '0', display: '0', fresh: false })), [])
  const backspace = useCallback(() => setS(s => {
    if (s.fresh || s.input.length <= 1) return { ...s, input: '0', display: '0', fresh: false }
    const next = s.input.slice(0, -1)
    return { ...s, input: next, display: next }
  }), [])
  const sign = useCallback(() => setS(s => {
    const next = s.input.startsWith('-') ? s.input.slice(1) : '-' + s.input
    return { ...s, input: next, display: next }
  }), [])
  const pct = useCallback(() => setS(s => {
    const val = parseFloat(s.input)
    const result = s.prev !== null && s.op
      ? (s.prev * val) / 100
      : val / 100
    const r = fmt(result)
    return { ...s, input: r, display: r }
  }), [])

  // Memory
  const mc = useCallback(() => setS(s => ({ ...s, mem: 0 })), [])
  const mr = useCallback(() => setS(s => {
    const r = fmt(s.mem)
    return { ...s, input: r, display: r, fresh: true }
  }), [])
  const ms = useCallback(() => setS(s => ({ ...s, mem: parseFloat(s.input) })), [])
  const mPlus = useCallback(() => setS(s => ({ ...s, mem: s.mem + parseFloat(s.input) })), [])

  const D = (label: string, action: () => void, cls = '') => (
    <button
      key={label}
      onClick={action}
      className={`h-9 rounded text-xs font-medium border border-border transition-colors hover:bg-accent active:scale-95 select-none ${cls}`}
    >
      {label}
    </button>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[340px] max-w-[95vw] p-4 gap-3">
        <DialogHeader className="pb-0">
          <DialogTitle className="text-sm">Scientific Calculator</DialogTitle>
        </DialogHeader>

        {/* Display */}
        <div className="bg-muted rounded-md px-3 py-2 text-right min-h-[52px] flex flex-col justify-between">
          {s.mem !== 0 && (
            <span className="text-[10px] text-muted-foreground text-left">M = {fmt(s.mem)}</span>
          )}
          <span className="font-mono text-xl font-semibold tracking-tight truncate">
            {s.display.length > 14 ? parseFloat(s.display).toExponential(6) : s.display}
          </span>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-4 gap-1">
          {/* Memory row */}
          {D('MC',   mc,    'text-muted-foreground')}
          {D('MR',   mr,    'text-muted-foreground')}
          {D('MS',   ms,    'text-muted-foreground')}
          {D('M+',   mPlus, 'text-muted-foreground')}

          {/* Trig row 1 */}
          {D('sin',  () => unary(x => Math.sin(x * DEG)))}
          {D('cos',  () => unary(x => Math.cos(x * DEG)))}
          {D('tan',  () => unary(x => Math.tan(x * DEG)))}
          {D('log',  () => unary(Math.log10))}

          {/* Trig row 2 */}
          {D('sin⁻¹',() => unary(x => Math.asin(x) / DEG))}
          {D('cos⁻¹',() => unary(x => Math.acos(x) / DEG))}
          {D('tan⁻¹',() => unary(x => Math.atan(x) / DEG))}
          {D('ln',   () => unary(Math.log))}

          {/* Power / const row */}
          {D('x²',   () => unary(x => x * x))}
          {D('√x',   () => unary(Math.sqrt))}
          {D('xʸ',   () => binOp('xʸ'),  'text-foreground/70')}
          {D('π',    () => setS(s => { const r = fmt(Math.PI); return { ...s, input: r, display: r, fresh: true } }))}

          {/* Clear row */}
          {D('C',    clearAll,   'text-destructive')}
          {D('CE',   clearEntry, 'text-muted-foreground')}
          {D('⌫',    backspace,  'text-muted-foreground')}
          {D('÷',    () => binOp('÷'), 'text-foreground/70')}

          {/* Digits */}
          {D('7', () => digit('7'))}
          {D('8', () => digit('8'))}
          {D('9', () => digit('9'))}
          {D('×', () => binOp('×'), 'text-foreground/70')}

          {D('4', () => digit('4'))}
          {D('5', () => digit('5'))}
          {D('6', () => digit('6'))}
          {D('-', () => binOp('-'), 'text-foreground/70')}

          {D('1', () => digit('1'))}
          {D('2', () => digit('2'))}
          {D('3', () => digit('3'))}
          {D('+', () => binOp('+'), 'text-foreground/70')}

          {D('+/-', sign, 'text-muted-foreground')}
          {D('0',  () => digit('0'))}
          {D('.',  () => digit('.'))}
          {D('=',  equal, 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary')}

          {/* Bottom row */}
          {D('%',   pct,  'text-muted-foreground col-span-2')}
          {D('1/x', () => unary(x => 1 / x), 'text-muted-foreground')}
          {D('eˣ',  () => unary(Math.exp),    'text-muted-foreground')}
        </div>
      </DialogContent>
    </Dialog>
  )
}
