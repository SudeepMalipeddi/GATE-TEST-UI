import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, XCircle, BookMarked, RotateCcw, ClipboardList } from 'lucide-react'
import type { ExamState } from '../types/exam'

interface Props {
  state: ExamState
  onReview: () => void
  onReset: () => void
}

export function ResultsPage({ state, onReview, onReset }: Props) {
  const { exam, answers, statuses } = state
  if (!exam) return null

  const answered    = Object.values(statuses).filter(s => s === 'answered' || s === 'review_answered').length
  const notAnswered = Object.values(statuses).filter(s => s === 'not_answered').length
  const forReview   = Object.values(statuses).filter(s => s === 'review' || s === 'review_answered').length
  const notVisited  = Object.values(statuses).filter(s => s === 'not_visited').length

  let totalScore = 0, maxScore = 0
  for (const section of exam.sections) {
    for (const q of section.questions) {
      maxScore += q.marks
      const ans = answers[q.id]
      if (!ans) continue
      if (q.type === 'MCQ') {
        if (ans === q.correctAnswer) totalScore += q.marks
        else totalScore -= q.penalty
      } else if (q.type === 'MSQ') {
        const userArr   = Array.isArray(ans) ? [...ans].sort() : []
        const correctArr = Array.isArray(q.correctAnswer) ? [...q.correctAnswer].sort() : []
        if (JSON.stringify(userArr) === JSON.stringify(correctArr)) totalScore += q.marks
      } else if (q.type === 'NAT') {
        if (String(ans).trim() === String(q.correctAnswer).trim()) totalScore += q.marks
      }
    }
  }

  const scorePercent = Math.round((Math.max(0, totalScore) / maxScore) * 100)

  const sectionStats = exam.sections.map(section => {
    let secAnswered = 0, secCorrect = 0, secScore = 0
    for (const q of section.questions) {
      const s = statuses[q.id]
      if (s === 'answered' || s === 'review_answered') secAnswered++
      const ans = answers[q.id]
      if (!ans) continue
      let correct = false
      if (q.type === 'MCQ') correct = ans === q.correctAnswer
      else if (q.type === 'MSQ') {
        const u = Array.isArray(ans) ? [...ans].sort() : []
        const c = Array.isArray(q.correctAnswer) ? [...q.correctAnswer].sort() : []
        correct = JSON.stringify(u) === JSON.stringify(c)
      } else if (q.type === 'NAT') {
        correct = String(ans).trim() === String(q.correctAnswer).trim()
      }
      if (correct) { secCorrect++; secScore += q.marks }
      else if (q.type === 'MCQ') secScore -= q.penalty
    }
    return { name: section.name, total: section.questions.length, answered: secAnswered, correct: secCorrect, score: secScore }
  })

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Score card */}
        <Card>
          <CardHeader className="border-b border-border text-center pb-4">
            <CardTitle className="text-base text-muted-foreground font-normal">{exam.name}</CardTitle>
            <div className="mt-3">
              <span className="text-5xl font-bold text-foreground">{Math.max(0, totalScore).toFixed(2)}</span>
              <span className="text-xl text-muted-foreground ml-1">/ {maxScore}</span>
              <p className="text-sm text-muted-foreground mt-1">{scorePercent}% score</p>
            </div>
          </CardHeader>

          <CardContent className="pt-5">
            <div className="grid grid-cols-4 gap-3">
              <StatCard icon={<CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />} label="Answered"    value={answered} />
              <StatCard icon={<XCircle     className="w-3.5 h-3.5 text-[#EF4444]" />} label="Unanswered"  value={notAnswered} />
              <StatCard icon={<BookMarked  className="w-3.5 h-3.5 text-[#A855F7]" />} label="For Review"  value={forReview} />
              <StatCard icon={<XCircle     className="w-3.5 h-3.5 text-muted-foreground" />} label="Not Visited" value={notVisited} />
            </div>
          </CardContent>
        </Card>

        {/* Section table */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm">Section Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-xs">Section</TableHead>
                  <TableHead className="text-xs text-center">Total</TableHead>
                  <TableHead className="text-xs text-center">Attempted</TableHead>
                  <TableHead className="text-xs text-center">Correct</TableHead>
                  <TableHead className="text-xs text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectionStats.map(sec => (
                  <TableRow key={sec.name} className="border-border">
                    <TableCell className="text-sm font-medium">{sec.name}</TableCell>
                    <TableCell className="text-sm text-center text-muted-foreground">{sec.total}</TableCell>
                    <TableCell className="text-sm text-center text-muted-foreground">{sec.answered}</TableCell>
                    <TableCell className="text-sm text-center font-medium" style={{ color: '#22C55E' }}>{sec.correct}</TableCell>
                    <TableCell className={`text-sm text-right font-semibold ${sec.score >= 0 ? '' : 'text-[#EF4444]'}`}>
                      {sec.score.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Separator />
            <div className="flex justify-between items-center px-4 py-3 text-sm font-semibold text-foreground">
              <span>Total</span>
              <span className={totalScore >= 0 ? '' : 'text-[#EF4444]'}>
                {Math.max(0, totalScore).toFixed(2)} / {maxScore}
              </span>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border p-4 flex justify-between">
            <Button variant="outline" size="sm" onClick={onReset} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Start New Exam
            </Button>
            <Button size="sm" onClick={onReview} className="gap-2">
              <ClipboardList className="w-4 h-4" />
              Review Answers
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted p-3 text-center">
      <div className="flex items-center justify-center gap-1 mb-1">{icon}</div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}
