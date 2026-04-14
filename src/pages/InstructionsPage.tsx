import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ExamHeader } from '../components/ExamHeader'
import { ChevronLeft, ChevronRight, Info, BookOpen } from 'lucide-react'
import type { ExamData } from '../types/exam'

interface Props {
  exam: ExamData
  onStart: () => void
  onPractice: () => void
  onBack: () => void
}

const instructions = [
  'This examination consists of multiple sections. Read all questions carefully before answering.',
  'Each question carries a specific number of marks as mentioned alongside the question.',
  'For MCQ questions, there is negative marking. Incorrect answers will deduct 1/3rd of the assigned marks.',
  'For MSQ (Multiple Select) questions, there is NO negative marking.',
  'For NAT (Numerical Answer Type) questions, there is NO negative marking. Enter the exact value.',
  'You can navigate between questions using the Question Palette on the right side panel.',
  'Click "Save & Next" to save your answer and move to the next question.',
  'Click "Mark for Review & Next" to flag a question for later review.',
  'Click "Clear Response" to clear your selected answer for the current question.',
  'The timer shows the remaining time. The exam auto-submits when time runs out.',
  'Once you click "Submit Exam", you will not be able to change your answers.',
]

const statusLegend = [
  { cls: 'status-not-visited border border-border',  label: 'Not Visited — You have not visited this question yet' },
  { cls: 'status-not-answered',                       label: 'Not Answered — You visited but did not answer' },
  { cls: 'status-answered',                           label: 'Answered — You have saved an answer' },
  { cls: 'status-review',                             label: 'Marked for Review — You want to revisit later' },
  { cls: 'status-review-answered',                    label: 'Answered & Marked — Saved answer, also marked for review' },
]

export function InstructionsPage({ exam, onStart, onPractice, onBack }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <ExamHeader exam={exam} fontSize="md" onFontSizeChange={() => {}} />

      <div className="mt-[60px] p-4 md:p-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">General Instructions</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-[58vh]">
              <div className="p-5 space-y-6">
                {/* Exam info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Exam', value: exam.name },
                    { label: 'Duration', value: `${exam.durationMinutes} min` },
                    {
                      label: 'Questions',
                      value: String(exam.sections.reduce((a, s) => a + s.questions.length, 0)),
                    },
                    { label: 'Sections', value: String(exam.sections.length) },
                  ].map(item => (
                    <div key={item.label} className="bg-muted rounded-lg p-3 border border-border">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5 break-words">{item.value}</p>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Rules */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Rules</h3>
                  <ol className="space-y-2.5">
                    {instructions.map((inst, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="flex-shrink-0 w-5 h-5 border border-border rounded-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="text-foreground/80 leading-relaxed">{inst}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <Separator />

                {/* Legend */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Question Status Legend</h3>
                  <div className="space-y-2">
                    {statusLegend.map(item => (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-sm flex-shrink-0 ${item.cls}`} />
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="border-t border-border p-4 justify-between">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground">
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onPractice} size="sm" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Practice Mode
              </Button>
              <Button onClick={onStart} size="sm" className="gap-2">
                Start Exam
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
