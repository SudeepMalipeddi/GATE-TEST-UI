import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ExamHeader, type FontSize } from '../components/ExamHeader'
import { QuestionPalette } from '../components/QuestionPalette'
import { QuestionDisplay } from '../components/QuestionDisplay'
import { ReviewQuestionDisplay } from '../components/ReviewQuestionDisplay'
import { AskAI } from '../components/AskAI'
import { LayoutGrid, ChevronLeft, ChevronRight, LogOut, RotateCcw, CheckCircle2 } from 'lucide-react'
import type { ExamState, Question, QuestionStatus } from '../types/exam'
import { natCorrect } from '../lib/natCorrect'

interface Props {
  state: ExamState
  onExit: () => void
}

function isCorrect(q: Question, answer: string | string[] | undefined): boolean {
  if (!answer || answer === '' || (Array.isArray(answer) && answer.length === 0)) return false
  if (q.type === 'MCQ') return answer === q.correctAnswer
  if (q.type === 'MSQ') {
    const u = Array.isArray(answer) ? [...answer].sort() : []
    const c = Array.isArray(q.correctAnswer) ? [...q.correctAnswer].sort() : []
    return JSON.stringify(u) === JSON.stringify(c)
  }
  return natCorrect(answer, q.correctAnswer)
}

export function PracticePage({ state, onExit }: Props) {
  const { exam } = state
  const [currentSection, setCurrentSection] = useState(state.currentSection)
  const [currentQuestion, setCurrentQuestion] = useState(state.currentQuestion)
  const [localAnswers, setLocalAnswers] = useState<Record<string, string | string[]>>({})
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [fontSize, setFontSize] = useState<FontSize>(
    () => (localStorage.getItem('font_size') as FontSize | null) ?? 'md'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize)
    localStorage.setItem('font_size', fontSize)
  }, [fontSize])

  const handleFontSize = useCallback((s: FontSize) => setFontSize(s), [])

  if (!exam) return null

  const section = exam.sections[currentSection]
  const question = section?.questions[currentQuestion]
  if (!question) return null

  const totalQuestions = exam.sections.reduce((a, s) => a + s.questions.length, 0)
  const questionNumberInExam =
    exam.sections.slice(0, currentSection).reduce((a, s) => a + s.questions.length, 0) +
    currentQuestion + 1

  const hasPrev = currentSection > 0 || currentQuestion > 0
  const hasNext =
    currentSection < exam.sections.length - 1 ||
    currentQuestion < section.questions.length - 1

  const localAnswer = localAnswers[question.id]
  const isChecked = checked[question.id] ?? false

  const goTo = (sIdx: number, qIdx: number) => {
    setCurrentSection(sIdx)
    setCurrentQuestion(qIdx)
  }

  const goPrev = () => {
    if (currentQuestion > 0) setCurrentQuestion(q => q - 1)
    else if (currentSection > 0) {
      const prevSec = exam.sections[currentSection - 1]
      setCurrentSection(s => s - 1)
      setCurrentQuestion(prevSec.questions.length - 1)
    }
  }

  const goNext = () => {
    if (currentQuestion < section.questions.length - 1) setCurrentQuestion(q => q + 1)
    else if (currentSection < exam.sections.length - 1) {
      setCurrentSection(s => s + 1)
      setCurrentQuestion(0)
    }
  }

  const handleCheck = () => {
    setChecked(prev => ({ ...prev, [question.id]: true }))
  }

  const handleTryAgain = () => {
    setChecked(prev => { const n = { ...prev }; delete n[question.id]; return n })
    setLocalAnswers(prev => { const n = { ...prev }; delete n[question.id]; return n })
  }

  // Stats
  const checkedCount = Object.values(checked).filter(Boolean).length
  const correctCount = exam.sections.flatMap(s => s.questions).filter(q =>
    checked[q.id] && isCorrect(q, localAnswers[q.id])
  ).length

  // Build palette statuses
  const practiceStatuses: Record<string, QuestionStatus> = {}
  for (const sec of exam.sections) {
    for (const q of sec.questions) {
      const ans = localAnswers[q.id]
      const hasAns = ans !== undefined && ans !== '' && !(Array.isArray(ans) && ans.length === 0)
      if (checked[q.id]) {
        practiceStatuses[q.id] = isCorrect(q, ans) ? 'answered' : 'not_answered'
      } else if (hasAns) {
        practiceStatuses[q.id] = 'review'
      } else {
        practiceStatuses[q.id] = 'not_visited'
      }
    }
  }

  const sidebar = (
    <div className="flex flex-col h-full bg-card">
      {/* Progress summary */}
      <div className="p-3 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Practice Mode</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-border bg-muted p-2 text-center">
            <p className="text-base font-bold text-foreground">{checkedCount}<span className="text-xs font-normal text-muted-foreground"> / {totalQuestions}</span></p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Checked</p>
          </div>
          <div className="rounded-md border border-border bg-muted p-2 text-center">
            <p className="text-base font-bold text-foreground">{correctCount}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Correct</p>
          </div>
        </div>
      </div>

      <QuestionPalette
        exam={exam}
        currentSection={currentSection}
        currentQuestion={currentQuestion}
        statuses={practiceStatuses}
        onSelect={goTo}
      />

      {/* Practice legend */}
      <div className="p-3 border-t border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Legend</p>
        <div className="space-y-1.5">
          {[
            { cls: 'status-answered',     label: 'Correct' },
            { cls: 'status-not-answered', label: 'Wrong' },
            { cls: 'status-review',       label: 'Attempted' },
            { cls: 'status-not-visited',  label: 'Not tried' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-sm flex-shrink-0 ${item.cls}`} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 border-t border-border">
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={onExit}>
          <LogOut className="w-3.5 h-3.5" />
          Exit Practice
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

          {/* Question card */}
          <Card>
            <CardContent className="p-5 space-y-4">
              {isChecked ? (
                <>
                  <ReviewQuestionDisplay
                    question={question}
                    questionNumber={questionNumberInExam}
                    totalQuestions={totalQuestions}
                    userAnswer={localAnswer}
                    examName={exam.name}
                  />
                  <AskAI question={question} />
                </>
              ) : (
                <QuestionDisplay
                  question={question}
                  questionNumber={questionNumberInExam}
                  totalQuestions={totalQuestions}
                  answer={localAnswer}
                  onAnswer={ans => setLocalAnswers(prev => ({ ...prev, [question.id]: ans }))}
                />
              )}

              {/* Navigation row */}
              <div className="flex items-center gap-2 pt-4 border-t border-border">
                <Button variant="outline" size="sm" onClick={goPrev} disabled={!hasPrev} className="gap-1.5">
                  <ChevronLeft className="w-4 h-4" /> Previous
                </Button>

                <div className="mx-auto flex gap-2">
                  {isChecked ? (
                    <Button variant="outline" size="sm" onClick={handleTryAgain} className="gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5" /> Try Again
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleCheck}
                      disabled={!localAnswer || localAnswer === '' || (Array.isArray(localAnswer) && localAnswer.length === 0)}
                      className="gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Check Answer
                    </Button>
                  )}
                </div>

                <Button variant="outline" size="sm" onClick={goNext} disabled={!hasNext} className="gap-1.5">
                  Next <ChevronRight className="w-4 h-4" />
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
