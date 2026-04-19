import { useState, useCallback, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ExamHeader, type FontSize } from '../components/ExamHeader'
import { QuestionPalette } from '../components/QuestionPalette'
import { ReviewQuestionDisplay } from '../components/ReviewQuestionDisplay'
import { AskAI } from '../components/AskAI'
import { LayoutGrid, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react'
import type { ExamState, Question, QuestionStatus } from '../types/exam'
import { natCorrect } from '../lib/natCorrect'

type ReviewFilter = 'all' | 'correct' | 'wrong' | 'skipped'

interface Props {
  state: ExamState
  onBack: () => void
  backLabel?: string   // defaults to 'Results'
}

// Map a question's outcome to a palette status for visual feedback
function reviewPaletteStatus(q: Question, answer: string | string[] | undefined): QuestionStatus {
  if (!answer || answer === '' || (Array.isArray(answer) && answer.length === 0)) {
    return 'not_visited'   // transparent: skipped
  }
  let correct = false
  if (q.type === 'MCQ') {
    correct = answer === q.correctAnswer
  } else if (q.type === 'MSQ') {
    const u = Array.isArray(answer) ? [...answer].sort() : []
    const c = Array.isArray(q.correctAnswer) ? [...q.correctAnswer].sort() : []
    correct = JSON.stringify(u) === JSON.stringify(c)
  } else if (q.type === 'NAT') {
    correct = natCorrect(answer, q.correctAnswer)
  }
  // answered = white fill (correct), not_answered = dark fill (wrong)
  return correct ? 'answered' : 'not_answered'
}

export function ReviewPage({ state, onBack, backLabel = 'Results' }: Props) {
  const { exam, answers } = state
  const [currentSection, setCurrentSection] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all')
  const [fontSize, setFontSize] = useState<FontSize>(
    () => (localStorage.getItem('font_size') as FontSize | null) ?? 'md'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize)
    localStorage.setItem('font_size', fontSize)
  }, [fontSize])

  const handleFontSize = useCallback((s: FontSize) => setFontSize(s), [])

  // Refs so the keydown handler always calls the latest goPrev/goNext
  const goPrevRef = useRef<() => void>(() => {})
  const goNextRef = useRef<() => void>(() => {})

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowRight') { e.preventDefault(); goNextRef.current() }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); goPrevRef.current() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!exam) return null

  const section = exam.sections[currentSection]
  const question = section?.questions[currentQuestion]
  if (!question) return null

  const totalQuestions = exam.sections.reduce((a, s) => a + s.questions.length, 0)
  const questionNumberInExam =
    exam.sections.slice(0, currentSection).reduce((a, s) => a + s.questions.length, 0) +
    currentQuestion + 1

  const goTo = (sIdx: number, qIdx: number) => {
    setCurrentSection(sIdx)
    setCurrentQuestion(qIdx)
  }

  // Flat question list for filter-aware navigation
  const flatQuestions = exam.sections.flatMap((sec, sIdx) =>
    sec.questions.map((q, qIdx) => ({ sIdx, qIdx, q }))
  )

  const getStatus = (q: Question) => reviewPaletteStatus(q, answers[q.id])

  const filteredList = flatQuestions.filter(({ q }) => {
    if (reviewFilter === 'all') return true
    const status = getStatus(q)
    if (reviewFilter === 'correct') return status === 'answered'
    if (reviewFilter === 'wrong')   return status === 'not_answered'
    return status === 'not_visited' // skipped
  })

  const filterCounts = {
    all:     flatQuestions.length,
    correct: flatQuestions.filter(({ q }) => getStatus(q) === 'answered').length,
    wrong:   flatQuestions.filter(({ q }) => getStatus(q) === 'not_answered').length,
    skipped: flatQuestions.filter(({ q }) => getStatus(q) === 'not_visited').length,
  }

  const filteredIdx = filteredList.findIndex(
    ({ sIdx, qIdx }) => sIdx === currentSection && qIdx === currentQuestion
  )

  const handleFilterChange = (f: ReviewFilter) => {
    setReviewFilter(f)
    if (f === 'all') return
    const list = flatQuestions.filter(({ q }) => {
      const s = getStatus(q)
      if (f === 'correct') return s === 'answered'
      if (f === 'wrong')   return s === 'not_answered'
      return s === 'not_visited'
    })
    if (list.length > 0) goTo(list[0].sIdx, list[0].qIdx)
  }

  const hasPrev = reviewFilter === 'all'
    ? currentSection > 0 || currentQuestion > 0
    : filteredIdx > 0

  const hasNext = reviewFilter === 'all'
    ? currentSection < exam.sections.length - 1 || currentQuestion < section.questions.length - 1
    : filteredIdx >= 0 && filteredIdx < filteredList.length - 1

  const goPrev = () => {
    if (reviewFilter !== 'all') {
      if (filteredIdx > 0) {
        const { sIdx, qIdx } = filteredList[filteredIdx - 1]
        goTo(sIdx, qIdx)
      }
    } else {
      if (currentQuestion > 0) {
        setCurrentQuestion(q => q - 1)
      } else if (currentSection > 0) {
        const prevSec = exam.sections[currentSection - 1]
        setCurrentSection(s => s - 1)
        setCurrentQuestion(prevSec.questions.length - 1)
      }
    }
  }

  const goNext = () => {
    if (reviewFilter !== 'all') {
      if (filteredIdx >= 0 && filteredIdx < filteredList.length - 1) {
        const { sIdx, qIdx } = filteredList[filteredIdx + 1]
        goTo(sIdx, qIdx)
      }
    } else {
      if (currentQuestion < section.questions.length - 1) {
        setCurrentQuestion(q => q + 1)
      } else if (currentSection < exam.sections.length - 1) {
        setCurrentSection(s => s + 1)
        setCurrentQuestion(0)
      }
    }
  }

  // Keep refs fresh every render
  goPrevRef.current = goPrev
  goNextRef.current = goNext

  // Build review-mode statuses for the palette
  const reviewStatuses: Record<string, QuestionStatus> = {}
  for (const sec of exam.sections) {
    for (const q of sec.questions) {
      reviewStatuses[q.id] = reviewPaletteStatus(q, answers[q.id])
    }
  }

  const isHistoryReview = state.phase === 'history-review'

  const sidebar = (
    <div className="flex flex-col h-full bg-card">
      {/* Review mode indicator */}
      <div className="p-3 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Review Legend
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-5 h-5 rounded border-2 border-[#F1FAEE] bg-[#F1FAEE] inline-block flex-shrink-0" />
            Correct
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-5 h-5 rounded border-2 border-[#E63946] bg-[#E63946] inline-block flex-shrink-0" />
            Wrong
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-5 h-5 rounded border-2 border-[#555] bg-transparent inline-block flex-shrink-0" />
            Skipped
          </div>
        </div>
      </div>

      <QuestionPalette
        exam={exam}
        currentSection={currentSection}
        currentQuestion={currentQuestion}
        statuses={reviewStatuses}
        onSelect={goTo}
      />

      <div className="p-3 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={onBack}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Back to {backLabel}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <ExamHeader exam={exam} fontSize={fontSize} onFontSizeChange={handleFontSize} />

      <div className="mt-[60px] flex h-[calc(100vh-60px)]">
        {/* LEFT */}
        <div className="flex-1 overflow-auto p-4 md:mr-[260px]">
          {/* Section tabs */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {exam.sections.map((sec, i) => (
              <button
                key={sec.name}
                onClick={() => goTo(i, 0)}
                className={`text-xs px-3 py-1.5 rounded border font-medium transition-colors ${
                  i === currentSection
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
                }`}
              >
                {sec.name}
              </button>
            ))}

            {/* Mobile palette toggle */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="ml-auto md:hidden gap-1.5">
                  <LayoutGrid className="w-4 h-4" />
                  Palette
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-0 bg-card border-border">
                {sidebar}
              </SheetContent>
            </Sheet>
          </div>

          {/* History mode banner */}
          {isHistoryReview && (
            <div className="mb-3 px-3 py-2 rounded-md bg-muted border border-border text-xs text-muted-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              Viewing a past attempt — answers are read-only
            </div>
          )}

          {/* Filter bar */}
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            {(['all', 'correct', 'wrong', 'skipped'] as ReviewFilter[]).map(f => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={`text-xs px-3 py-1.5 rounded border font-medium transition-colors capitalize ${
                  reviewFilter === f
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
                }`}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="ml-1.5 font-normal opacity-70">{filterCounts[f]}</span>
              </button>
            ))}
            {reviewFilter !== 'all' && filteredIdx >= 0 && (
              <span className="ml-auto text-xs text-muted-foreground">
                {filteredIdx + 1} of {filteredList.length}
              </span>
            )}
            {reviewFilter !== 'all' && filteredList.length === 0 && (
              <span className="ml-2 text-xs text-muted-foreground italic">No questions</span>
            )}
          </div>

          {/* Question card */}
          <Card>
            <CardContent className="p-5">
              <ReviewQuestionDisplay
                question={question}
                questionNumber={questionNumberInExam}
                totalQuestions={totalQuestions}
                userAnswer={answers[question.id]}
                examName={exam.name}
                timeSpentSeconds={state.timeSpent[question.id]}
              />

              <AskAI question={question} />

              {/* Navigation */}
              <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goPrev}
                  disabled={!hasPrev}
                  className="gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBack}
                  className="mx-auto gap-1.5"
                >
                  <BarChart2 className="w-4 h-4" />
                  Results
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goNext}
                  disabled={!hasNext}
                  className="gap-1.5"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT sidebar (desktop) */}
        <aside className="hidden md:flex flex-col fixed right-0 top-[60px] w-[260px] h-[calc(100vh-60px)] border-l border-border overflow-hidden">
          {sidebar}
        </aside>
      </div>
    </div>
  )
}
