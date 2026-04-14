import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ExamHeader, type FontSize } from '../components/ExamHeader'
import { TimerBlock } from '../components/TimerBlock'
import { QuestionPalette } from '../components/QuestionPalette'
import { QuestionDisplay } from '../components/QuestionDisplay'
import { ActionBar } from '../components/ActionBar'
import { Legend } from '../components/Legend'
import { SectionProgress } from '../components/SectionProgress'
import { LayoutGrid, Send } from 'lucide-react'
import type { ExamState } from '../types/exam'

interface Props {
  state: ExamState
  onAnswer: (id: string, answer: string | string[]) => void
  onClear: (id: string) => void
  onMarkReview: (id: string) => void
  onSaveNext: (id: string, answer: string | string[] | undefined) => void
  onPrev: () => void
  onGoTo: (sIdx: number, qIdx: number) => void
  onSubmit: () => void
  onCancel: () => void
}

export function ExamPage({ state, onAnswer, onClear, onMarkReview, onSaveNext, onPrev, onGoTo, onSubmit, onCancel }: Props) {
  const { exam, currentSection, currentQuestion, answers, statuses, timeRemaining } = state
  const [submitOpen, setSubmitOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [localAnswer, setLocalAnswer] = useState<string | string[] | undefined>(undefined)
  const [fontSize, setFontSize] = useState<FontSize>(
    () => (localStorage.getItem('font_size') as FontSize | null) ?? 'md'
  )

  // Apply font size as a data attribute so CSS can target .question-content globally
  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize)
    localStorage.setItem('font_size', fontSize)
  }, [fontSize])

  // Warn before accidental tab close / refresh mid-exam
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  const handleFontSize = useCallback((s: FontSize) => setFontSize(s), [])

  if (!exam) return null

  const section = exam.sections[currentSection]
  const question = section?.questions[currentQuestion]
  if (!question) return null

  const totalQuestions = exam.sections.reduce((a, s) => a + s.questions.length, 0)
  const questionNumberInExam =
    exam.sections.slice(0, currentSection).reduce((a, s) => a + s.questions.length, 0) +
    currentQuestion + 1

  const savedAnswer = answers[question.id]
  const hasPrev = currentSection > 0 || currentQuestion > 0
  const hasNext =
    currentSection < exam.sections.length - 1 ||
    currentQuestion < section.questions.length - 1

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setLocalAnswer(answers[question.id])
  }, [question.id, answers])

  const handleSaveNext = () => {
    const valid = localAnswer !== undefined && localAnswer !== '' &&
      !(Array.isArray(localAnswer) && localAnswer.length === 0)
    onSaveNext(question.id, valid ? localAnswer : undefined)
  }

  const handleMarkReview = () => {
    const valid = localAnswer !== undefined && localAnswer !== '' &&
      !(Array.isArray(localAnswer) && localAnswer.length === 0)
    if (valid) onAnswer(question.id, localAnswer!)
    onMarkReview(question.id)
    if (hasNext) onSaveNext(question.id, valid ? localAnswer : undefined)
  }

  const sidebar = (
    <div className="flex flex-col h-full bg-card">
      <TimerBlock secondsRemaining={timeRemaining} />
      <SectionProgress exam={exam} statuses={statuses} />
      <QuestionPalette
        exam={exam}
        currentSection={currentSection}
        currentQuestion={currentQuestion}
        statuses={statuses}
        onSelect={onGoTo}
      />
      <Legend />
      <div className="p-3 border-t border-border">
        <Button
          variant="destructive"
          size="sm"
          className="w-full gap-2"
          onClick={() => setSubmitOpen(true)}
        >
          <Send className="w-3.5 h-3.5" />
          Submit Exam
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <ExamHeader exam={exam} fontSize={fontSize} onFontSizeChange={handleFontSize} onBack={() => setCancelOpen(true)} />

      <div className="mt-[60px] flex h-[calc(100vh-60px)]">
        {/* LEFT */}
        <div className="flex-1 overflow-auto p-4 md:mr-[260px]">
          {/* Section tabs */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {exam.sections.map((sec, i) => (
              <button
                key={sec.name}
                onClick={() => onGoTo(i, 0)}
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

          {/* Question card */}
          <Card>
            <CardContent className="p-5">
              <QuestionDisplay
                question={question}
                questionNumber={questionNumberInExam}
                totalQuestions={totalQuestions}
                answer={localAnswer}
                onAnswer={setLocalAnswer}
              />
              <ActionBar
                onPrev={onPrev}
                onClear={() => {
                  setLocalAnswer(undefined)
                  onClear(question.id)
                }}
                onMarkReview={handleMarkReview}
                onSaveNext={handleSaveNext}
                hasPrev={hasPrev}
                hasNext={hasNext}
                hasAnswer={savedAnswer !== undefined}
              />
            </CardContent>
          </Card>
        </div>

        {/* RIGHT sidebar (desktop) */}
        <aside className="hidden md:flex flex-col fixed right-0 top-[60px] w-[260px] h-[calc(100vh-60px)] border-l border-border overflow-hidden">
          {sidebar}
        </aside>
      </div>

      {/* Cancel / exit dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exit Exam?</DialogTitle>
            <DialogDescription>
              Your progress will be lost. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Stay</Button>
            <Button variant="destructive" onClick={onCancel}>Exit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit dialog */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Examination?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Review your answers before submitting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 py-2">
            {[
              { label: 'Answered', count: Object.values(statuses).filter(s => s === 'answered' || s === 'review_answered').length },
              { label: 'Not Answered', count: Object.values(statuses).filter(s => s === 'not_answered').length },
              { label: 'For Review', count: Object.values(statuses).filter(s => s === 'review' || s === 'review_answered').length },
            ].map(item => (
              <div key={item.label} className="rounded-lg border border-border p-3 text-center bg-muted">
                <p className="text-2xl font-bold text-foreground">{item.count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>Go Back</Button>
            <Button variant="destructive" onClick={onSubmit}>Confirm Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
