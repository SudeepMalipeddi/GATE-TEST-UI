import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Clock, BookOpen, Lock, ChevronRight } from 'lucide-react'
import { examCatalog } from '../data/examCatalog'
import type { ExamData } from '../types/exam'

interface Props {
  onSelect: (exam: ExamData) => void
}

export function ExamSelectPage({ onSelect }: Props) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-md border border-border flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-foreground" />
        </div>
        <span className="font-semibold text-sm tracking-wide">Assessment Examination Center</span>
      </header>

      {/* Body */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Select Examination</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose an exam below to proceed to instructions.</p>
        </div>

        <Separator className="mb-6" />

        <div className="space-y-3">
          {examCatalog.map(exam => (
            <Card
              key={exam.id}
              className={`border transition-colors ${
                exam.available
                  ? 'border-border hover:border-foreground/40 cursor-pointer'
                  : 'border-border opacity-40 cursor-not-allowed'
              }`}
              onClick={() => {
                if (exam.available && exam.data) onSelect(exam.data)
              }}
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold truncate">{exam.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{exam.subject}</p>
                  </div>
                  {exam.available ? (
                    <Badge variant="outline" className="text-xs border-foreground/30 text-foreground flex-shrink-0">
                      Available
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
                      <Lock className="w-3 h-3" />
                      <span className="text-xs">Locked</span>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="px-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {exam.durationMinutes} min
                    </span>
                    <span>{exam.totalQuestions} questions</span>
                  </div>
                  {exam.available && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8">
          <Button
            variant="default"
            className="w-full"
            onClick={() => {
              const first = examCatalog.find(e => e.available && e.data)
              if (first?.data) onSelect(first.data)
            }}
          >
            Start Available Exam
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}
