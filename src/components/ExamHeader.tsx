import type { ExamData } from '../types/exam'

interface Props {
  exam: ExamData
}

export function ExamHeader({ exam }: Props) {
  return (
    <header className="fixed top-0 inset-x-0 h-[60px] bg-card border-b border-border z-50 flex items-center px-4 gap-4">
      <div className="w-8 h-8 rounded-md border border-border flex items-center justify-center flex-shrink-0">
        <span className="text-foreground font-bold text-xs">AEC</span>
      </div>
      <span className="font-semibold text-sm text-foreground truncate">
        {exam.name}
      </span>
    </header>
  )
}
