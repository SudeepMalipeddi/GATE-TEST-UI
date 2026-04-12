import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import type { Question } from '../types/exam'

interface Props {
  question: Question
  questionNumber: number
  totalQuestions: number
  answer: string | string[] | undefined
  onAnswer: (answer: string | string[]) => void
}

const typeLabel: Record<Question['type'], string> = {
  MCQ: 'Multiple Choice',
  MSQ: 'Multiple Select',
  NAT: 'Numerical Answer',
}

const typeBadgeColor: Record<Question['type'], string> = {
  MCQ: 'bg-orange-100 text-orange-700 border-orange-200',
  MSQ: 'bg-blue-100 text-blue-700 border-blue-200',
  NAT: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

export function QuestionDisplay({ question, questionNumber, totalQuestions, answer, onAnswer }: Props) {
  const mcqAnswer = typeof answer === 'string' ? answer : ''
  const msqAnswers = Array.isArray(answer) ? answer : []
  const natAnswer = typeof answer === 'string' ? answer : ''

  const toggleMsq = (optId: string) => {
    if (msqAnswers.includes(optId)) {
      onAnswer(msqAnswers.filter(a => a !== optId))
    } else {
      onAnswer([...msqAnswers, optId])
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Question meta */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs font-semibold">
          Q.{questionNumber} of {totalQuestions}
        </Badge>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${typeBadgeColor[question.type]}`}>
          {typeLabel[question.type]}
        </span>
        <span className="ml-auto text-xs text-muted-foreground italic">
          +{question.marks} mark{question.marks > 1 ? 's' : ''}
          {question.penalty > 0 && ` | −${question.penalty} penalty`}
        </span>
      </div>

      {/* Question text */}
      <div
        className="question-content text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: question.text }}
      />

      {/* Answer area */}
      <div className="border-t pt-4 mt-2">
        <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Your Answer
        </p>

        {question.type === 'MCQ' && (
          <RadioGroup value={mcqAnswer} onValueChange={onAnswer}>
            <div className="space-y-2">
              {question.options.map(opt => (
                <label
                  key={opt.id}
                  htmlFor={`opt-${opt.id}`}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-slate-50 cursor-pointer transition-colors has-[[data-state=checked]]:bg-primary/5 has-[[data-state=checked]]:border-primary"
                >
                  <RadioGroupItem value={opt.id} id={`opt-${opt.id}`} className="mt-0.5 flex-shrink-0" />
                  <div className="flex gap-2 text-sm">
                    <span className="font-semibold text-muted-foreground w-4">{opt.id}.</span>
                    <span dangerouslySetInnerHTML={{ __html: opt.text }} />
                  </div>
                </label>
              ))}
            </div>
          </RadioGroup>
        )}

        {question.type === 'MSQ' && (
          <div className="space-y-2">
            {question.options.map(opt => (
              <label
                key={opt.id}
                htmlFor={`msq-${opt.id}`}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <Checkbox
                  id={`msq-${opt.id}`}
                  checked={msqAnswers.includes(opt.id)}
                  onCheckedChange={() => toggleMsq(opt.id)}
                  className="mt-0.5 flex-shrink-0"
                />
                <div className="flex gap-2 text-sm">
                  <span className="font-semibold text-muted-foreground w-4">{opt.id}.</span>
                  <span dangerouslySetInnerHTML={{ __html: opt.text }} />
                </div>
              </label>
            ))}
          </div>
        )}

        {question.type === 'NAT' && (
          <div className="max-w-xs">
            <Label htmlFor="nat-input" className="text-xs text-muted-foreground mb-1 block">
              Enter numerical answer
            </Label>
            <Input
              id="nat-input"
              type="number"
              placeholder="Type your answer..."
              value={natAnswer}
              onChange={e => onAnswer(e.target.value)}
              className="text-sm"
            />
          </div>
        )}
      </div>
    </div>
  )
}
