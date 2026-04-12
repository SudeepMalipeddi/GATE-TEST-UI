import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ExamHeader } from '../components/ExamHeader'
import { ChevronRight, Info } from 'lucide-react'
import type { ExamData } from '../types/exam'

interface Props {
  exam: ExamData
  onStart: () => void
}

const instructions = [
  'This examination consists of multiple sections. Read all questions carefully before answering.',
  'Each question carries a specific number of marks as mentioned alongside the question.',
  'For MCQ questions, there is negative marking. Incorrect answers will deduct 1/3rd of the marks assigned to that question.',
  'For MSQ (Multiple Select) questions, there is NO negative marking. Partial credit may be awarded.',
  'For NAT (Numerical Answer Type) questions, there is NO negative marking. Enter the exact numerical value.',
  'You can navigate between questions using the Question Palette on the right side panel.',
  'Click "Save & Next" to save your answer and move to the next question.',
  'Click "Mark for Review & Next" to flag a question and move to the next question. You can revisit it later.',
  'Click "Clear Response" to clear your selected answer for the current question.',
  'The timer on the right panel shows the remaining time. The exam will auto-submit when time runs out.',
  'Once you click "Submit Exam", you will not be able to change your answers.',
  'Ensure your internet connection is stable throughout the examination.',
]

const statusLegend = [
  { color: 'bg-white border border-slate-300', label: 'Not Visited — You have not visited this question yet' },
  { color: 'bg-red-50 border border-red-400', label: 'Not Answered — You visited but did not answer' },
  { color: 'bg-green-500', label: 'Answered — You have saved an answer' },
  { color: 'bg-violet-500', label: 'Marked for Review — You want to review later' },
  { color: 'bg-violet-700', label: 'Answered & Marked — Saved answer, also marked for review' },
]

export function InstructionsPage({ exam, onStart }: Props) {
  return (
    <div className="min-h-screen bg-slate-50">
      <ExamHeader exam={exam} />

      <div className="mt-[60px] p-4 md:p-6 max-w-4xl mx-auto">
        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">General Instructions</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Please read the following instructions carefully before starting the examination.
            </p>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-[55vh]">
              <div className="p-5 space-y-5">
                {/* Exam info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Exam', value: exam.name },
                    { label: 'Duration', value: `${exam.durationMinutes} minutes` },
                    {
                      label: 'Total Questions',
                      value: String(exam.sections.reduce((a, s) => a + s.questions.length, 0)),
                    },
                    { label: 'Sections', value: String(exam.sections.length) },
                  ].map(item => (
                    <div key={item.label} className="bg-slate-50 rounded-lg p-3 border">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{item.value}</p>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Instructions list */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Examination Rules</h3>
                  <ol className="space-y-2">
                    {instructions.map((inst, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="flex-shrink-0 w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </span>
                        <span className="text-slate-600 leading-relaxed">{inst}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <Separator />

                {/* Status legend */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Question Status Legend</h3>
                  <div className="space-y-2">
                    {statusLegend.map(item => (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded flex-shrink-0 ${item.color}`} />
                        <span className="text-xs text-slate-600">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="border-t p-4 bg-slate-50">
            <div className="flex items-center justify-between w-full">
              <p className="text-xs text-muted-foreground">
                By clicking Start, you agree to abide by the examination rules.
              </p>
              <Button onClick={onStart} className="gap-2">
                I Understand, Start Exam
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
