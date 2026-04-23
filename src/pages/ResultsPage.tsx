import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, XCircle, BookMarked, RotateCcw, ClipboardList, Clock } from 'lucide-react'
import type { ExamState } from '../types/exam'
import { natCorrect } from '../lib/natCorrect'

function fmtSeconds(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

interface Props {
  state: ExamState
  onReview: () => void
  onReset: () => void
}

export function ResultsPage({ state, onReview, onReset }: Props) {
  const { exam, answers, statuses, timeSpent } = state
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
        if (natCorrect(ans, q.correctAnswer)) totalScore += q.marks
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
        correct = natCorrect(ans, q.correctAnswer)
      }
      if (correct) { secCorrect++; secScore += q.marks }
      else if (q.type === 'MCQ') secScore -= q.penalty
    }
    return { name: section.name, total: section.questions.length, answered: secAnswered, correct: secCorrect, score: secScore }
  })

  // Time analysis
  const allQsTime = exam.sections.flatMap((sec, sIdx) =>
    sec.questions.map((q, qIdx) => ({
      q,
      sectionName: sec.name,
      qNum: exam.sections.slice(0, sIdx).reduce((a, s) => a + s.questions.length, 0) + qIdx + 1,
      secs: timeSpent[q.id] ?? 0,
    }))
  )
  const totalTimeUsed = allQsTime.reduce((a, x) => a + x.secs, 0)
  const slowest = [...allQsTime].filter(x => x.secs > 0).sort((a, b) => b.secs - a.secs).slice(0, 5)
  const sectionTimes = exam.sections.map(sec => ({
    name: sec.name,
    secs: sec.questions.reduce((a, q) => a + (timeSpent[q.id] ?? 0), 0),
  }))

  // Question outcome grid
  const maxTime = Math.max(...allQsTime.map(x => x.secs), 1)
  const questionGrid = allQsTime.map(({ q, qNum, secs, sectionName }) => {
    const ans = answers[q.id]
    let outcome: 'correct' | 'wrong' | 'skipped'
    if (!ans || ans === '' || (Array.isArray(ans) && ans.length === 0)) {
      outcome = 'skipped'
    } else if (q.type === 'MCQ') {
      outcome = ans === q.correctAnswer ? 'correct' : 'wrong'
    } else if (q.type === 'MSQ') {
      const u = Array.isArray(ans) ? [...ans].sort() : []
      const c = Array.isArray(q.correctAnswer) ? [...q.correctAnswer].sort() : []
      outcome = JSON.stringify(u) === JSON.stringify(c) ? 'correct' : 'wrong'
    } else {
      outcome = natCorrect(ans, q.correctAnswer) ? 'correct' : 'wrong'
    }
    return { qNum, secs, sectionName, outcome }
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

        {/* Question overview heatmap */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm">Question Overview</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-1.5">
              {questionGrid.map(({ qNum, outcome, secs }) => {
                const alpha = totalTimeUsed > 0 ? Math.max(0.3, secs / maxTime) : 1
                const rgb = outcome === 'correct' ? '34,197,94' : outcome === 'wrong' ? '239,68,68' : '100,100,100'
                return (
                  <div
                    key={qNum}
                    title={`Q.${qNum} · ${outcome}${secs > 0 ? ` · ${fmtSeconds(secs)}` : ''}`}
                    style={{ backgroundColor: `rgba(${rgb},${alpha})` }}
                    className="w-4 h-4 rounded-sm cursor-default"
                  />
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-3">
              {[
                { rgb: '34,197,94',   label: 'Correct' },
                { rgb: '239,68,68',   label: 'Wrong'   },
                { rgb: '100,100,100', label: 'Skipped' },
              ].map(({ rgb, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0 inline-block"
                    style={{ backgroundColor: `rgba(${rgb},0.9)` }}
                  />
                  {label}
                </span>
              ))}
              {totalTimeUsed > 0 && (
                <span className="ml-auto text-xs text-muted-foreground opacity-50">darker = more time</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Time analysis — only shown when tracking data exists */}
        {totalTimeUsed > 0 && (
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Time Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Total + section breakdown */}
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>Total time tracked</span>
                  <span className="font-semibold text-foreground">{fmtSeconds(totalTimeUsed)}</span>
                </div>
                {exam.sections.length > 1 && sectionTimes.map(({ name, secs }) => secs > 0 && (
                  <div key={name} className="flex justify-between text-xs text-muted-foreground py-0.5">
                    <span className="truncate mr-4">{name}</span>
                    <span>{fmtSeconds(secs)}</span>
                  </div>
                ))}
              </div>

              {/* Slowest questions */}
              {slowest.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Most time spent
                    </p>
                    <div className="space-y-1">
                      {slowest.map(({ qNum, sectionName, secs }) => (
                        <div key={qNum} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Q.{qNum}
                            {exam.sections.length > 1 && (
                              <span className="ml-1 opacity-60">· {sectionName}</span>
                            )}
                          </span>
                          <span className="font-medium text-foreground tabular-nums">{fmtSeconds(secs)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
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
