import type { ExamData, QuestionStatus } from '../types/exam'

interface Props {
  exam: ExamData
  statuses: Record<string, QuestionStatus>
}

export function SectionProgress({ exam, statuses }: Props) {
  return (
    <div className="px-3 py-2.5 border-b border-border space-y-2">
      {exam.sections.map(section => {
        const total = section.questions.length
        const answered = section.questions.filter(q =>
          statuses[q.id] === 'answered' || statuses[q.id] === 'review_answered'
        ).length
        const pct = total > 0 ? (answered / total) * 100 : 0

        return (
          <div key={section.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-muted-foreground truncate max-w-[160px]" title={section.name}>
                {section.name}
              </span>
              <span className="text-[11px] font-semibold text-foreground tabular-nums ml-2 flex-shrink-0">
                {answered}/{total}
              </span>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, background: '#F1FAEE' }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
