import { useRef, useEffect, useState } from 'react'
import renderMathInElement from 'katex/contrib/auto-render'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, MinusCircle, Copy, Check, Bookmark, BookmarkCheck, Clock } from 'lucide-react'
import type { Question } from '../types/exam'
import { getBookmark, saveBookmark, removeBookmark } from '../lib/bookmarks'
import { natCorrect } from '../lib/natCorrect'
import { effectiveAnswer } from '../lib/answerOverrides'
import { FixAnswerPanel } from './FixAnswerPanel'
import { parseQuestionHtml } from '../lib/parseQuestionHtml'

function fmtSeconds(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

interface Props {
  question: Question
  questionNumber: number
  totalQuestions: number
  userAnswer: string | string[] | undefined
  examName?: string
  examId?: string
  timeSpentSeconds?: number
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

const cleanMathBlock = (inner: string) =>
  inner
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

function MathContent({ html, className }: { html: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Split on existing $$...$$ blocks so the \begin fixups never fire inside them.
    const ddParts = html.split(/((?<!\$)\$\$[\s\S]*?\$\$(?!\$))/)
    const fixed = ddParts.map((part, i) => {
      if (i % 2 === 1) {
        return part.replace(/\$\$([\s\S]*?)\$\$/g, (_, m) => `$$${cleanMathBlock(m)}$$`)
      }
      return part
        .replace(/(?<!\$)(\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\})\s*\${1,3}/g, (_, m) => `$$${cleanMathBlock(m)}$$`)
        .replace(/\$\s*(\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\})\s*\$/g, (_, m) => `$$${cleanMathBlock(m)}$$`)
    }).join('')
    const cleaned = fixed
      .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `\\[${cleanMathBlock(m)}\\]`)
    el.innerHTML = cleaned
    renderMathInElement(el, KATEX_OPTIONS)
  }, [html])

  return <div ref={ref} className={className} />
}

// Outcome for a single MCQ/MSQ option
type OptionOutcome = 'correct' | 'selected_correct' | 'selected_wrong' | 'missed_correct' | 'neutral'

function mcqOutcome(optId: string, userAnswer: string | string[] | undefined, correctAnswer: string | string[]): OptionOutcome {
  const correct = String(correctAnswer)
  const selected = typeof userAnswer === 'string' ? userAnswer : ''
  if (optId === correct && optId === selected) return 'selected_correct'
  if (optId === correct) return 'correct'
  if (optId === selected) return 'selected_wrong'
  return 'neutral'
}

function msqOutcome(optId: string, userAnswer: string | string[] | undefined, correctAnswer: string | string[]): OptionOutcome {
  const correctSet = new Set(Array.isArray(correctAnswer) ? correctAnswer : [String(correctAnswer)])
  const selectedSet = new Set(Array.isArray(userAnswer) ? userAnswer : [])
  const isCorrect = correctSet.has(optId)
  const isSelected = selectedSet.has(optId)
  if (isCorrect && isSelected) return 'selected_correct'
  if (isCorrect && !isSelected) return 'missed_correct'
  if (!isCorrect && isSelected) return 'selected_wrong'
  return 'neutral'
}

const OUTCOME_BORDER: Record<OptionOutcome, string> = {
  selected_correct: 'border-[#22C55E]/60 bg-[#22C55E]/5',
  correct:          'border-[#22C55E]/40 bg-[#22C55E]/5',
  missed_correct:   'border-[#22C55E]/40 bg-[#22C55E]/5',
  selected_wrong:   'border-[#EF4444]/50 bg-[#EF4444]/5',
  neutral:          'border-border opacity-50',
}

function OutcomeTag({ outcome }: { outcome: OptionOutcome }) {
  if (outcome === 'selected_correct')
    return <span className="flex items-center gap-1 text-[10px] font-semibold text-[#22C55E] whitespace-nowrap"><CheckCircle2 className="w-3 h-3" />Your answer</span>
  if (outcome === 'correct')
    return <span className="flex items-center gap-1 text-[10px] font-semibold text-[#22C55E] whitespace-nowrap"><CheckCircle2 className="w-3 h-3" />Correct</span>
  if (outcome === 'missed_correct')
    return <span className="flex items-center gap-1 text-[10px] font-semibold text-[#22C55E] whitespace-nowrap"><CheckCircle2 className="w-3 h-3" />Correct (missed)</span>
  if (outcome === 'selected_wrong')
    return <span className="flex items-center gap-1 text-[10px] font-semibold text-[#EF4444] whitespace-nowrap"><XCircle className="w-3 h-3" />Your answer</span>
  return null
}


export function ReviewQuestionDisplay({ question, questionNumber, totalQuestions, userAnswer, examName, examId, timeSpentSeconds }: Props) {
  const [copied, setCopied] = useState(false)
  const [bookmarked, setBookmarked] = useState(() => !!getBookmark(question.id))
  const [note, setNote] = useState(() => getBookmark(question.id)?.note ?? '')
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const correctAnswer = effectiveAnswer(question.id, question.correctAnswer)
  const { questionHtml, optionHtmls } = parseQuestionHtml(question.text)
  const hasOptionTexts = optionHtmls.length > 0

  useEffect(() => {
    const bm = getBookmark(question.id)
    setBookmarked(!!bm)
    setNote(bm?.note ?? '')
  }, [question.id])

  const handleCopy = () => {
    const doc = new DOMParser().parseFromString(question.text, 'text/html')
    // Replace <img src="url"> with [Image: url] before stripping tags
    doc.querySelectorAll('img[src]').forEach(img => {
      const src = img.getAttribute('src') ?? ''
      const alt = img.getAttribute('alt')?.trim() ?? ''
      img.replaceWith(alt ? `[Image: ${alt} — ${src}]` : `[Image: ${src}]`)
    })
    // Replace <a href="url">text</a> with "text (url)"
    doc.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') ?? ''
      const label = a.textContent?.trim() ?? ''
      a.replaceWith(label && label !== href ? `${label} (${href})` : href || label)
    })
    const text = doc.body.textContent ?? ''
    navigator.clipboard.writeText(text.trim()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const toggleBookmark = () => {
    if (bookmarked) {
      removeBookmark(question.id)
      setBookmarked(false)
      setNote('')
    } else {
      const preview = (new DOMParser().parseFromString(question.text, 'text/html').body.textContent ?? '').trim().slice(0, 300)
      saveBookmark({ questionId: question.id, examName: examName ?? '', questionPreview: preview, note: '', date: new Date().toISOString() })
      setBookmarked(true)
    }
  }

  const handleNoteChange = (val: string) => {
    setNote(val)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => {
      const existing = getBookmark(question.id)
      if (existing) saveBookmark({ ...existing, note: val })
    }, 400)
  }

  // Compute overall outcome for the score indicator
  const noCorrectAnswer = !correctAnswer || correctAnswer === '' || (Array.isArray(correctAnswer) && correctAnswer.length === 0)
  let outcome: 'correct' | 'wrong' | 'skipped'
  if (!userAnswer || (Array.isArray(userAnswer) && userAnswer.length === 0) || userAnswer === '') {
    outcome = 'skipped'
  } else if (noCorrectAnswer) {
    outcome = 'skipped'
  } else if (question.type === 'MCQ') {
    outcome = userAnswer === correctAnswer ? 'correct' : 'wrong'
  } else if (question.type === 'MSQ') {
    const u = Array.isArray(userAnswer) ? [...userAnswer].sort() : []
    const c = Array.isArray(correctAnswer) ? [...correctAnswer].sort() : []
    outcome = JSON.stringify(u) === JSON.stringify(c) ? 'correct' : 'wrong'
  } else {
    outcome = natCorrect(userAnswer, correctAnswer) ? 'correct' : 'wrong'
  }

  const scoreChange = outcome === 'correct'
    ? `+${question.marks}`
    : outcome === 'wrong' && question.type === 'MCQ' && question.penalty > 0
    ? `−${question.penalty}`
    : outcome === 'skipped' ? '0' : '0'

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

        {/* Outcome badge */}
        {outcome === 'correct' && (
          <Badge className="text-xs gap-1 bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30 hover:bg-[#22C55E]/15">
            <CheckCircle2 className="w-3 h-3" /> Correct · {scoreChange}
          </Badge>
        )}
        {outcome === 'wrong' && (
          <Badge className="text-xs gap-1 bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30 hover:bg-[#EF4444]/15">
            <XCircle className="w-3 h-3" /> Wrong · {scoreChange}
          </Badge>
        )}
        {outcome === 'skipped' && (
          <Badge className="text-xs gap-1 bg-muted text-muted-foreground hover:bg-muted">
            <MinusCircle className="w-3 h-3" /> Skipped · {scoreChange}
          </Badge>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground italic">
            +{question.marks} mark{question.marks > 1 ? 's' : ''}
            {question.penalty > 0 && ` | −${question.penalty} penalty`}
          </span>
          {timeSpentSeconds !== undefined && timeSpentSeconds > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {fmtSeconds(timeSpentSeconds)}
            </span>
          )}
          <button
            onClick={handleCopy}
            title="Copy question text"
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            {copied
              ? <Check className="w-3.5 h-3.5 text-[#22C55E]" />
              : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={toggleBookmark}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark this question'}
            className={`p-1 rounded hover:bg-muted transition-colors flex-shrink-0 ${bookmarked ? 'text-amber-400' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {bookmarked
              ? <BookmarkCheck className="w-3.5 h-3.5" />
              : <Bookmark className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Note editor — shown when bookmarked */}
      {bookmarked && (
        <div className="rounded-md border border-amber-400/30 bg-amber-400/5 px-3 py-2">
          <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide mb-1">Note</p>
          <textarea
            value={note}
            onChange={e => handleNoteChange(e.target.value)}
            placeholder="Add a note for this question…"
            rows={2}
            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground resize-none outline-none leading-relaxed"
          />
        </div>
      )}

      {/* Question text */}
      <MathContent
        html={questionHtml}
        className="question-content text-sm leading-relaxed text-foreground"
      />

      {/* Review answer area */}
      <div className="border-t border-border pt-4 mt-2">
        <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Answer Review</p>

        {(question.type === 'MCQ' || question.type === 'MSQ') && (
          <div className={hasOptionTexts ? 'flex flex-col gap-2' : 'flex flex-wrap gap-2'}>
            {question.options.map((opt, i) => {
              const oc = question.type === 'MCQ'
                ? mcqOutcome(opt.id, userAnswer, correctAnswer)
                : msqOutcome(opt.id, userAnswer, correctAnswer)
              return (
                <div
                  key={opt.id}
                  className={`flex items-start gap-3 px-4 py-2.5 rounded-lg border ${OUTCOME_BORDER[oc]}`}
                >
                  <span className="text-sm font-semibold flex-shrink-0 w-5">{opt.id.toUpperCase()}.</span>
                  {hasOptionTexts && optionHtmls[i]
                    ? <MathContent html={optionHtmls[i]} className="question-content text-sm leading-relaxed flex-1" />
                    : opt.text && opt.text !== opt.id.toUpperCase()
                      ? <span className="text-sm flex-1">{opt.text}</span>
                      : null}
                  <OutcomeTag outcome={oc} />
                </div>
              )
            })}
          </div>
        )}

        {question.type === 'NAT' && (
          <div className="space-y-3 max-w-sm">
            <div className={`rounded-lg border p-3 ${
              userAnswer && userAnswer !== ''
                ? natCorrect(userAnswer, correctAnswer)
                  ? 'border-[#22C55E]/50 bg-[#22C55E]/5'
                  : 'border-[#EF4444]/50 bg-[#EF4444]/5'
                : 'border-border bg-muted'
            }`}>
              <p className="text-xs text-muted-foreground mb-1">Your answer</p>
              <p className="text-sm font-semibold text-foreground">
                {userAnswer && userAnswer !== '' ? String(userAnswer) : <span className="italic text-muted-foreground">Not answered</span>}
              </p>
            </div>
            <div className="rounded-lg border border-[#22C55E]/50 bg-[#22C55E]/5 p-3">
              <p className="text-xs text-muted-foreground mb-1">Correct answer</p>
              <p className="text-sm font-semibold text-[#22C55E]">{String(correctAnswer)}</p>
            </div>
          </div>
        )}

        <FixAnswerPanel question={question} examId={examId} />
      </div>
    </div>
  )
}
