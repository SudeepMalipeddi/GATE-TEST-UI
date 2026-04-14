import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  INIT, fmt,
  applyDigit, applyExpKey, applyBinOp, applyEqual, applyUnary,
  applyClearAll, applyBackspace, applySign, applyPct,
  applyParenOpen, applyParenClose,
  applyMC, applyMR, applyMS, applyMPlus, applyMMinus,
  applyConstant, factorial,
  toRad, fromRad,
  type CS,
} from '../lib/calculatorLogic'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function Calculator({ open, onOpenChange }: Props) {
  const [s, setS] = useState<CS>(INIT)
  const up = (fn: (s: CS) => CS) => setS(fn)

  const digit      = (d: string)                        => up(s => applyDigit(s, d))
  const expKey     = ()                                  => up(applyExpKey)
  const binOp      = (op: string, sym: string)          => up(s => applyBinOp(s, op, sym))
  const equal      = ()                                  => up(applyEqual)
  const unary      = (fn: (x: number) => number, lbl: string) => up(s => applyUnary(s, fn, lbl))
  const clearAll   = ()                                  => up(applyClearAll)
  const backspace  = ()                                  => up(applyBackspace)
  const sign       = ()                                  => up(applySign)
  const pct        = ()                                  => up(applyPct)
  const parenOpen  = ()                                  => up(applyParenOpen)
  const parenClose = ()                                  => up(applyParenClose)
  const mc         = ()                                  => up(applyMC)
  const mr         = ()                                  => up(applyMR)
  const ms         = ()                                  => up(applyMS)
  const mPlus      = ()                                  => up(applyMPlus)
  const mMinus     = ()                                  => up(applyMMinus)
  const constBtn   = (val: number, lbl: string)         => up(s => applyConstant(s, val, lbl))

  const curDisplay = s.cur.length > 18 ? parseFloat(s.cur).toExponential(10) : s.cur

  const base = 'flex items-center justify-center rounded text-[11px] font-medium border border-border transition-colors hover:bg-accent active:scale-95 select-none cursor-pointer h-8'
  const num  = base + ' bg-muted'
  const sci  = base + ' bg-background'
  const op   = base + ' text-muted-foreground bg-background'
  const red  = base + ' bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/30'
  const grn  = base + ' bg-green-600 text-white hover:bg-green-700 border-green-700'

  const B = (label: string, onClick: () => void, cls = sci, cs = 1, rs = 1) => (
    <button
      onClick={onClick}
      className={cls}
      style={{
        ...(cs > 1 ? { gridColumn: `span ${cs}` } : {}),
        ...(rs > 1 ? { gridRow:    `span ${rs}` } : {}),
      }}
    >
      {label}
    </button>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[660px] max-w-[99vw] p-4 gap-3">
        <DialogHeader className="pb-0">
          <DialogTitle className="text-sm">Scientific Calculator</DialogTitle>
        </DialogHeader>

        {/* ── Dual display ── */}
        <div className="rounded-md border border-border overflow-hidden bg-muted">
          <div className="px-3 pt-1.5 pb-1 border-b border-border min-h-[22px] text-right">
            <span className="text-[11px] font-mono text-muted-foreground block truncate">
              {s.top || '\u00a0'}
            </span>
          </div>
          <div className="px-3 py-2 flex items-end justify-between gap-2">
            {s.mem !== 0
              ? <span className="text-[10px] text-blue-400 flex-shrink-0">M={fmt(s.mem)}</span>
              : <span />}
            <span className="font-mono text-xl font-semibold tracking-tight truncate">
              {curDisplay}
            </span>
          </div>
        </div>

        {/* ── Top controls: mod | Deg/Rad | Memory ── */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => binOp('mod', 'mod')} className={sci + ' px-3'}>mod</button>

          <div className="flex items-center gap-3 px-3 h-8 border border-border rounded text-[11px] text-muted-foreground">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="calc-mode" checked={s.mode === 'deg'}
                onChange={() => up(s => ({ ...s, mode: 'deg' }))}
                className="w-3 h-3 accent-blue-500" />
              Deg
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="calc-mode" checked={s.mode === 'rad'}
                onChange={() => up(s => ({ ...s, mode: 'rad' }))}
                className="w-3 h-3 accent-blue-500" />
              Rad
            </label>
          </div>

          <div className="flex gap-1 ml-auto">
            {([['MC', mc], ['MR', mr], ['MS', ms], ['M+', mPlus], ['M-', mMinus]] as const).map(
              ([lbl, fn]) => (
                <button key={lbl} onClick={fn as () => void} className={op + ' px-2.5'}>{lbl}</button>
              )
            )}
          </div>
        </div>

        {/* ── Main 11-column keypad ── */}
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: 'repeat(11, 1fr)', gridTemplateRows: 'repeat(5, 2rem)' }}
        >
          {/* Row 1 */}
          {B('sinh',   () => unary(x => Math.sinh(x), 'sinh'))}
          {B('cosh',   () => unary(x => Math.cosh(x), 'cosh'))}
          {B('tanh',   () => unary(x => Math.tanh(x), 'tanh'))}
          {B('Exp',    expKey)}
          {B('(',      parenOpen)}
          {B(')',      parenClose)}
          {B('←',      backspace,  red, 2)}
          {B('C',      clearAll,   red)}
          {B('+/-',    sign,       red)}
          {B('√',      () => unary(Math.sqrt, '√'))}

          {/* Row 2 */}
          {B('sinh⁻¹', () => unary(x => Math.asinh(x), 'sinh⁻¹'))}
          {B('cosh⁻¹', () => unary(x => Math.acosh(x), 'cosh⁻¹'))}
          {B('tanh⁻¹', () => unary(x => Math.atanh(x), 'tanh⁻¹'))}
          {B('log₂x',  () => unary(x => Math.log2(x), 'log₂'))}
          {B('ln',     () => unary(Math.log, 'ln'))}
          {B('log',    () => unary(Math.log10, 'log'))}
          {B('7',      () => digit('7'), num)}
          {B('8',      () => digit('8'), num)}
          {B('9',      () => digit('9'), num)}
          {B('/',      () => binOp('/', '/'), op)}
          {B('%',      pct, op)}

          {/* Row 3 */}
          {B('π',      () => constBtn(Math.PI, 'π'))}
          {B('e',      () => constBtn(Math.E, 'e'))}
          {B('n!',     () => unary(factorial, 'n!'))}
          {B('logᵧx',  () => binOp('logY', 'logᵧ'))}
          {B('eˣ',     () => unary(Math.exp, 'eˣ'))}
          {B('10ˣ',    () => unary(x => Math.pow(10, x), '10ˣ'))}
          {B('4',      () => digit('4'), num)}
          {B('5',      () => digit('5'), num)}
          {B('6',      () => digit('6'), num)}
          {B('×',      () => binOp('*', '×'), op)}
          {B('1/x',    () => unary(x => 1 / x, '1/'), op)}

          {/* Row 4 */}
          {B('sin',    () => unary(x => Math.sin(toRad(x, s.mode)), 'sin'))}
          {B('cos',    () => unary(x => Math.cos(toRad(x, s.mode)), 'cos'))}
          {B('tan',    () => unary(x => Math.tan(toRad(x, s.mode)), 'tan'))}
          {B('xʸ',     () => binOp('pow', '^'))}
          {B('x³',     () => unary(x => x * x * x, 'x³'))}
          {B('x²',     () => unary(x => x * x, 'x²'))}
          {B('1',      () => digit('1'), num)}
          {B('2',      () => digit('2'), num)}
          {B('3',      () => digit('3'), num)}
          {B('−',      () => binOp('-', '−'), op)}
          {B('=',      equal, grn, 1, 2)}

          {/* Row 5 */}
          {B('sin⁻¹',  () => unary(x => fromRad(Math.asin(x), s.mode), 'sin⁻¹'))}
          {B('cos⁻¹',  () => unary(x => fromRad(Math.acos(x), s.mode), 'cos⁻¹'))}
          {B('tan⁻¹',  () => unary(x => fromRad(Math.atan(x), s.mode), 'tan⁻¹'))}
          {B('ʸ√x',    () => binOp('rootY', 'ʸ√'))}
          {B('³√',     () => unary(x => Math.cbrt(x), '³√'))}
          {B('|x|',    () => unary(Math.abs, '|x|'))}
          {B('0',      () => digit('0'), num, 2)}
          {B('.',      () => digit('.'), num)}
          {B('+',      () => binOp('+', '+'), op)}
        </div>
      </DialogContent>
    </Dialog>
  )
}
