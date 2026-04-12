import { cn } from '@/lib/utils'
import type { ExamData, QuestionStatus } from '../types/exam'

// Only the palette buttons use color — everything else is B&W
const statusClass: Record<QuestionStatus, string> = {
  not_visited:     'status-not-visited text-muted-foreground',
  not_answered:    'status-not-answered text-foreground',   // dark fill → light text
  answered:        'status-answered text-background',       // light fill → dark text
  review:          'status-review text-foreground',         // transparent → light text
  review_answered: 'status-review-answered text-background', // light fill → dark text
}

interface Props {
  exam: ExamData
  currentSection: number
  currentQuestion: number
  statuses: Record<string, QuestionStatus>
  onSelect: (sectionIdx: number, questionIdx: number) => void
}

export function QuestionPalette({ exam, currentSection, currentQuestion, statuses, onSelect }: Props) {
  return (
    <div className="flex-1 overflow-y-auto">
      {exam.sections.map((section, sIdx) => (
        <div key={section.name} className="p-3 border-b border-border last:border-b-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
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
                    'w-8 h-8 text-xs font-bold rounded transition-all',
                    statusClass[status],
                    isCurrent && 'ring-2 ring-offset-1 ring-offset-card ring-foreground',
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
