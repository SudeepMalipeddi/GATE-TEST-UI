import { useState } from 'react'
import { Calculator } from './Calculator'
import { Calculator as CalculatorIcon, ALargeSmall } from 'lucide-react'
import type { ExamData } from '../types/exam'

export type FontSize = 'sm' | 'md' | 'lg'

interface Props {
  exam: ExamData
  fontSize: FontSize
  onFontSizeChange: (s: FontSize) => void
}

const SIZES: FontSize[] = ['sm', 'md', 'lg']
const SIZE_LABEL: Record<FontSize, string> = { sm: 'A', md: 'A', lg: 'A' }
const SIZE_CLASS: Record<FontSize, string> = {
  sm: 'text-[11px]',
  md: 'text-[13px]',
  lg: 'text-[16px]',
}

export function ExamHeader({ exam, fontSize, onFontSizeChange }: Props) {
  const [calcOpen, setCalcOpen] = useState(false)

  const cycleFont = () => {
    const next = SIZES[(SIZES.indexOf(fontSize) + 1) % SIZES.length]
    onFontSizeChange(next)
  }

  return (
    <>
      <header className="fixed top-0 inset-x-0 h-[60px] bg-card border-b border-border z-50 flex items-center px-4 gap-4">
        <div className="w-8 h-8 rounded-md border border-border flex items-center justify-center flex-shrink-0">
          <span className="text-foreground font-bold text-xs">AEC</span>
        </div>

        <span className="font-semibold text-sm text-foreground truncate flex-1" title={exam.name}>
          {exam.name}
        </span>

        {/* Font size toggle */}
        <button
          onClick={cycleFont}
          title={`Font size: ${fontSize} — click to cycle`}
          className="flex items-center gap-1.5 px-2 py-1 rounded border border-border hover:bg-accent transition-colors"
          aria-label="Cycle font size"
        >
          <ALargeSmall className="w-4 h-4 text-muted-foreground" />
          <span className={`font-semibold text-foreground leading-none select-none ${SIZE_CLASS[fontSize]}`}>
            {SIZE_LABEL[fontSize]}
          </span>
        </button>

        {/* Calculator */}
        <button
          onClick={() => setCalcOpen(true)}
          title="Open calculator"
          className="flex items-center gap-1.5 px-2 py-1 rounded border border-border hover:bg-accent transition-colors"
          aria-label="Open calculator"
        >
          <CalculatorIcon className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground hidden sm:inline">Calc</span>
        </button>
      </header>

      <Calculator open={calcOpen} onOpenChange={setCalcOpen} />
    </>
  )
}
