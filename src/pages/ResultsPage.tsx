import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle2, XCircle, BookMarked, RotateCcw, Trophy } from 'lucide-react'
import type { ExamState } from '../types/exam'

interface Props {
  state: ExamState
  onReset: () => void
}

export function ResultsPage({ state, onReset }: Props) {
  const { exam, answers, statuses } = state
  if (!exam) return null

  const totalQuestions = exam.sections.reduce((a, s) => a + s.questions.length, 0)
  const answered = Object.values(statuses).filter(s => s === 'answered' || s === 'review_answered').length
  const notAnswered = Object.values(statuses).filter(s => s === 'not_answered').length
  const forReview = Object.values(statuses).filter(s => s === 'review' || s === 'review_answered').length
  const notVisited = Object.values(statuses).filter(s => s === 'not_visited').length

  // Calculate score
  let totalScore = 0
  let maxScore = 0
  for (const section of exam.sections) {
    for (const q of section.questions) {
      maxScore += q.marks
      const ans = answers[q.id]
      if (!ans) continue
      if (q.type === 'MCQ') {
        if (ans === q.correctAnswer) totalScore += q.marks
        else totalScore -= q.penalty
      } else if (q.type === 'MSQ') {
        const userArr = Array.isArray(ans) ? ans.sort() : []
        const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer.sort() : []
        if (JSON.stringify(userArr) === JSON.stringify(correctArr)) totalScore += q.marks
      } else if (q.type === 'NAT') {
        if (String(ans).trim() === String(q.correctAnswer).trim()) totalScore += q.marks
      }
    }
  }

  const scorePercent = Math.round((Math.max(0, totalScore) / maxScore) * 100)

  // Section-wise breakdown
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
        const userArr = Array.isArray(ans) ? ans.sort() : []
        const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer.sort() : []
        correct = JSON.stringify(userArr) === JSON.stringify(correctArr)
      } else if (q.type === 'NAT') {
        correct = String(ans).trim() === String(q.correctAnswer).trim()
      }
      if (correct) { secCorrect++; secScore += q.marks }
      else if (q.type === 'MCQ') secScore -= q.penalty
    }
    return { name: section.name, total: section.questions.length, answered: secAnswered, correct: secCorrect, score: secScore }
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Score hero */}
        <Card className="shadow-md border-0 ring-1 ring-slate-200 overflow-hidden">
          <div className="bg-primary p-6 text-white text-center">
            <Trophy className="w-10 h-10 mx-auto mb-2 opacity-90" />
            <h1 className="text-2xl font-bold">Exam Completed</h1>
            <p className="text-blue-200 text-sm mt-1">{exam.name}</p>
            <div className="mt-4">
              <span className="text-5xl font-bold">{Math.max(0, totalScore).toFixed(2)}</span>
              <span className="text-blue-200 text-lg ml-1">/ {maxScore}</span>
              <p className="text-blue-100 text-sm mt-1">{scorePercent}% score</p>
            </div>
          </div>

          <CardContent className="pt-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={<CheckCircle2 className="w-4 h-4 text-green-600" />} label="Answered" value={answered} color="bg-green-50 text-green-700" />
              <StatCard icon={<XCircle className="w-4 h-4 text-red-500" />} label="Not Answered" value={notAnswered} color="bg-red-50 text-red-700" />
              <StatCard icon={<BookMarked className="w-4 h-4 text-violet-600" />} label="For Review" value={forReview} color="bg-violet-50 text-violet-700" />
              <StatCard icon={<XCircle className="w-4 h-4 text-slate-400" />} label="Not Visited" value={notVisited} color="bg-slate-50 text-slate-600" />
            </div>
          </CardContent>
        </Card>

        {/* Section-wise table */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-base">Section-wise Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs">Section</TableHead>
                  <TableHead className="text-xs text-center">Total Qs</TableHead>
                  <TableHead className="text-xs text-center">Attempted</TableHead>
                  <TableHead className="text-xs text-center">Correct</TableHead>
                  <TableHead className="text-xs text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectionStats.map(sec => (
                  <TableRow key={sec.name}>
                    <TableCell className="text-sm font-medium">{sec.name}</TableCell>
                    <TableCell className="text-sm text-center">{sec.total}</TableCell>
                    <TableCell className="text-sm text-center">{sec.answered}</TableCell>
                    <TableCell className="text-sm text-center text-green-700 font-medium">{sec.correct}</TableCell>
                    <TableCell className={`text-sm text-right font-semibold ${sec.score >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {sec.score.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-slate-50 font-bold">
                  <TableCell className="text-sm">Total</TableCell>
                  <TableCell className="text-sm text-center">{totalQuestions}</TableCell>
                  <TableCell className="text-sm text-center">{answered}</TableCell>
                  <TableCell className="text-sm text-center text-green-700">
                    {sectionStats.reduce((a, s) => a + s.correct, 0)}
                  </TableCell>
                  <TableCell className={`text-sm text-right ${totalScore >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {Math.max(0, totalScore).toFixed(2)} / {maxScore}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="border-t p-4 justify-end">
            <Button variant="outline" onClick={onReset} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Start New Exam
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className={`rounded-lg p-3 ${color}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
