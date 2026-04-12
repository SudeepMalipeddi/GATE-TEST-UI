import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ExamHeader } from '../components/ExamHeader'
import { TimerBlock } from '../components/TimerBlock'
import { QuestionPalette } from '../components/QuestionPalette'
import { QuestionDisplay } from '../components/QuestionDisplay'
import { ActionBar } from '../components/ActionBar'
import { Legend } from '../components/Legend'
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
}

export function ExamPage({ state, onAnswer, onClear, onMarkReview, onSaveNext, onPrev, onGoTo, onSubmit }: Props) {
  const { exam, currentSection, currentQuestion, answers, statuses, timeRemaining } = state
  const [submitOpen, setSubmitOpen] = useState(false)
  const [localAnswer, setLocalAnswer] = useState<string | string[] | undefined>(undefined)

  if (!exam) return null

  const section = exam.sections[currentSection]
  const question = section?.questions[currentQuestion]

  if (!question) return null

  const totalQuestions = exam.sections.reduce((a, s) => a + s.questions.length, 0)
  const questionNumberInExam =
    exam.sections.slice(0, currentSection).reduce((a, s) => a + s.questions.length, 0) +
    currentQuestion +
    1

  const savedAnswer = answers[question.id]
  const hasPrev = currentSection > 0 || currentQuestion > 0
  const hasNext =
    currentSection < exam.sections.length - 1 ||
    currentQuestion < section.questions.length - 1

  // Sync local answer when navigating
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setLocalAnswer(answers[question.id])
  }, [question.id, answers])

  const handleSaveNext = () => {
    if (localAnswer !== undefined && localAnswer !== '' &&
        !(Array.isArray(localAnswer) && localAnswer.length === 0)) {
      onSaveNext(question.id, localAnswer)
    } else {
      onSaveNext(question.id, undefined)
    }
  }

  const handleMarkReview = () => {
    if (localAnswer !== undefined && localAnswer !== '' &&
        !(Array.isArray(localAnswer) && localAnswer.length === 0)) {
      onAnswer(question.id, localAnswer)
    }
    onMarkReview(question.id)
    if (hasNext) {
      onSaveNext(question.id, localAnswer)
    }
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      <TimerBlock secondsRemaining={timeRemaining} />
      <Separator />
      <QuestionPalette
        exam={exam}
        currentSection={currentSection}
        currentQuestion={currentQuestion}
        statuses={statuses}
        onSelect={onGoTo}
      />
      <Legend />
      <div className="p-3 border-t">
        <Button
          variant="destructive"
          className="w-full gap-2"
          onClick={() => setSubmitOpen(true)}
        >
          <Send className="w-4 h-4" />
          Submit Exam
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <ExamHeader exam={exam} />

      <div className="mt-[60px] flex h-[calc(100vh-60px)]">
        {/* LEFT: question area */}
        <div className="flex-1 overflow-auto p-4 md:mr-[260px]">
          {/* Section indicator */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {exam.sections.map((sec, i) => (
              <button
                key={sec.name}
                onClick={() => onGoTo(i, 0)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  i === currentSection
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-primary hover:text-primary'
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
              <SheetContent side="right" className="w-[280px] p-0">
                {sidebar}
              </SheetContent>
            </Sheet>
          </div>

          {/* Question card */}
          <Card className="shadow-sm">
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

        {/* RIGHT: sidebar (desktop) */}
        <aside className="hidden md:flex flex-col fixed right-0 top-[60px] w-[260px] h-[calc(100vh-60px)] border-l bg-white overflow-hidden">
          {sidebar}
        </aside>
      </div>

      {/* Submit confirmation dialog */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Examination?</DialogTitle>
            <DialogDescription>
              You are about to submit your exam. This action cannot be undone. Please review your
              answers in the palette before submitting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 py-2">
            {[
              {
                label: 'Answered',
                count: Object.values(statuses).filter(s => s === 'answered' || s === 'review_answered').length,
                color: 'bg-green-50 text-green-700',
              },
              {
                label: 'Not Answered',
                count: Object.values(statuses).filter(s => s === 'not_answered').length,
                color: 'bg-red-50 text-red-700',
              },
              {
                label: 'For Review',
                count: Object.values(statuses).filter(s => s === 'review' || s === 'review_answered').length,
                color: 'bg-violet-50 text-violet-700',
              },
            ].map(item => (
              <div key={item.label} className={`rounded-lg p-3 text-center ${item.color}`}>
                <p className="text-2xl font-bold">{item.count}</p>
                <p className="text-xs mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>
              Go Back
            </Button>
            <Button variant="destructive" onClick={onSubmit}>
              Confirm Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
