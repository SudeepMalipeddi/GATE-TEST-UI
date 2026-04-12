import { cn } from '@/lib/utils'
import type { ExamData, QuestionStatus } from '../types/exam'

const statusStyles: Record<QuestionStatus, string> = {
  not_visited: 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50',
  not_answered: 'bg-red-50 border-red-400 text-red-700 hover:bg-red-100',
  answered: 'bg-green-500 border-green-600 text-white hover:bg-green-600',
  review: 'bg-violet-500 border-violet-600 text-white hover:bg-violet-600',
  review_answered: 'bg-violet-700 border-violet-800 text-white hover:bg-violet-800',
}

interface Props {
  exam: ExamData
  currentSection: number
  currentQuestion: number
  statuses: Record<string, QuestionStatus>
  onSelect: (sectionIdx: number, questionIdx: number) => void
}

export function QuestionPalette({
  exam,
  currentSection,
  currentQuestion,
  statuses,
  onSelect,
}: Props) {
  return (
    <div className="flex-1 overflow-y-auto">
      {exam.sections.map((section, sIdx) => (
        <div key={section.name} className="p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {section.name}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {section.questions.map((q, qIdx) => {
              const status = statuses[q.id] ?? 'not_visited'
              const isCurrent = sIdx === currentSection && qIdx === currentQuestion
              return (
                <button
                  key={q.id}
                  onClick={() => onSelect(sIdx, qIdx)}
                  className={cn(
                    'w-8 h-8 text-xs font-bold border rounded transition-colors',
                    statusStyles[status],
                    isCurrent && 'ring-2 ring-offset-1 ring-primary',
                  )}
                >
                  {qIdx + 1}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
