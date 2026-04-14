import { useRef, useEffect } from 'react'
import renderMathInElement from 'katex/contrib/auto-render'
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

const KATEX_OPTIONS = {
  delimiters: [
    { left: '$$', right: '$$', display: true },
    { left: '$',  right: '$',  display: false },
    { left: '\\[', right: '\\]', display: true },
    { left: '\\(', right: '\\)', display: false },
  ],
  throwOnError: false,
}

// Sets innerHTML then immediately runs KaTeX — synchronous, no async race.
// Bypasses React's reconciliation so KaTeX's rendered HTML is never overwritten.
function MathContent({ html, className }: { html: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // HTML inside $$...$$ and \[...\] blocks must be cleaned before KaTeX sees it:
    // - <br> tags split text nodes so delimiters are never matched
    // - &amp; encodes LaTeX & (column separator in arrays)
    // - &nbsp; adds spurious whitespace
    const cleanMathBlock = (inner: string) =>
      inner
        .replace(/<br\s*\/?>/gi, '\n')  // <br> → newline (harmless in math)
        .replace(/<[^>]+>/g, '')        // remove any remaining HTML tags
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')

    // Split on existing $$...$$ blocks so the \begin fixups never fire inside them.
    // Even-indexed parts are outside $$...$$; odd-indexed parts ARE $$...$$ blocks.
    const ddParts = html.split(/((?<!\$)\$\$[\s\S]*?\$\$(?!\$))/)
    const fixed = ddParts.map((part, i) => {
      if (i % 2 === 1) {
        // Already a valid $$...$$ block — only clean HTML artifacts inside it
        return part.replace(/\$\$([\s\S]*?)\$\$/g, (_, m) => `$$${cleanMathBlock(m)}$$`)
      }
      // Outside $$...$$ — apply fixups for broken \begin patterns
      return part
        // \begin{env}...\end{env} with no opening delimiter, followed by 1–3 stray $
        .replace(/(?<!\$)(\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\})\s*\${1,3}/g, (_, m) => `$$${cleanMathBlock(m)}$$`)
        // $\begin{env}...\end{env}$ — $ adjacent to \begin (promote to display)
        .replace(/\$\s*(\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\})\s*\$/g, (_, m) => `$$${cleanMathBlock(m)}$$`)
    }).join('')
    const cleaned = fixed
      .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `\\[${cleanMathBlock(m)}\\]`)

    el.innerHTML = cleaned
    renderMathInElement(el, KATEX_OPTIONS)
  }, [html])

  return <div ref={ref} className={className} />
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
      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs font-semibold">
          Q.{questionNumber} of {totalQuestions}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {typeLabel[question.type]}
        </Badge>
        <span className="ml-auto text-xs text-muted-foreground italic">
          +{question.marks} mark{question.marks > 1 ? 's' : ''}
          {question.penalty > 0 && ` | −${question.penalty} penalty`}
        </span>
      </div>

      {/* Question text */}
      <MathContent
        html={question.text}
        className="question-content text-sm leading-relaxed text-foreground"
      />

      {/* Answer area */}
      <div className="border-t border-border pt-4 mt-2">
        <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Your Answer
        </p>

        {question.type === 'MCQ' && (
          <RadioGroup value={mcqAnswer} onValueChange={onAnswer}>
            <div className="flex flex-wrap gap-2">
              {question.options.map(opt => (
                <label
                  key={opt.id}
                  htmlFor={`opt-${opt.id}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:border-foreground/40 cursor-pointer transition-colors has-[[data-state=checked]]:border-foreground has-[[data-state=checked]]:bg-accent"
                >
                  <RadioGroupItem value={opt.id} id={`opt-${opt.id}`} className="flex-shrink-0" />
                  <span className="text-sm font-semibold">{opt.id.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </RadioGroup>
        )}

        {question.type === 'MSQ' && (
          <div className="flex flex-wrap gap-2">
            {question.options.map(opt => (
              <label
                key={opt.id}
                htmlFor={`msq-${opt.id}`}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                  msqAnswers.includes(opt.id)
                    ? 'border-foreground bg-accent'
                    : 'border-border hover:border-foreground/40'
                }`}
              >
                <Checkbox
                  id={`msq-${opt.id}`}
                  checked={msqAnswers.includes(opt.id)}
                  onCheckedChange={() => toggleMsq(opt.id)}
                  className="flex-shrink-0"
                />
                <span className="text-sm font-semibold">{opt.id.toUpperCase()}</span>
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
