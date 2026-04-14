import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, TrendingUp, Target, BookOpen, BarChart2, ArrowUpDown } from 'lucide-react'
import type { AttemptRecord } from '../types/exam'
import { classifyExamTopic, TOPICS, type Topic } from '../lib/topicClassifier'

const HISTORY_KEY = 'exam_history'

function loadHistory(): AttemptRecord[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
  } catch {
    return []
  }
}

interface TopicStats {
  topic: Topic
  attempts: number
  totalQuestions: number
  correct: number
  wrong: number
  skipped: number
  scoreEarned: number
  maxScore: number
}

type SortKey = 'topic' | 'attempts' | 'accuracy' | 'score'

function buildTopicStats(history: AttemptRecord[]): TopicStats[] {
  const map = new Map<Topic, TopicStats>()

  for (const attempt of history) {
    const topic = classifyExamTopic(attempt.examName)
    const existing = map.get(topic)
    if (existing) {
      existing.attempts += 1
      existing.totalQuestions += attempt.totalQuestions
      existing.correct += attempt.correct
      existing.wrong += attempt.wrong
      existing.skipped += attempt.skipped
      existing.scoreEarned += attempt.score
      existing.maxScore += attempt.maxScore
    } else {
      map.set(topic, {
        topic,
        attempts: 1,
        totalQuestions: attempt.totalQuestions,
        correct: attempt.correct,
        wrong: attempt.wrong,
        skipped: attempt.skipped,
        scoreEarned: attempt.score,
        maxScore: attempt.maxScore,
      })
    }
  }

  return Array.from(map.values())
}

function accuracy(s: TopicStats): number {
  const answered = s.correct + s.wrong
  return answered > 0 ? (s.correct / answered) * 100 : 0
}

function scorePercent(s: TopicStats): number {
  return s.maxScore > 0 ? (Math.max(0, s.scoreEarned) / s.maxScore) * 100 : 0
}

const ACCURACY_COLOR = (pct: number) => {
  if (pct >= 75) return 'bg-[#22C55E]'
  if (pct >= 50) return 'bg-amber-400'
  return 'bg-[#EF4444]'
}

interface Props {
  onClose: () => void
}

export function StatsPage({ onClose }: Props) {
  const history = useMemo(loadHistory, [])
  const topicStats = useMemo(() => buildTopicStats(history), [history])
  const [sortKey, setSortKey] = useState<SortKey>('attempts')
  const [sortAsc, setSortAsc] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const sorted = useMemo(() => {
    const arr = [...topicStats]
    arr.sort((a, b) => {
      let diff = 0
      if (sortKey === 'topic')    diff = a.topic.localeCompare(b.topic)
      if (sortKey === 'attempts') diff = a.attempts - b.attempts
      if (sortKey === 'accuracy') diff = accuracy(a) - accuracy(b)
      if (sortKey === 'score')    diff = scorePercent(a) - scorePercent(b)
      return sortAsc ? diff : -diff
    })

    if (showAll) {
      // Fill in topics with 0 attempts
      const covered = new Set(arr.map(s => s.topic))
      for (const topic of TOPICS) {
        if (!covered.has(topic)) {
          arr.push({ topic, attempts: 0, totalQuestions: 0, correct: 0, wrong: 0, skipped: 0, scoreEarned: 0, maxScore: 0 })
        }
      }
    }
    return arr
  }, [topicStats, sortKey, sortAsc, showAll])

  // Overall summary
  const totals = useMemo(() => topicStats.reduce((acc, s) => ({
    attempts: acc.attempts + s.attempts,
    questions: acc.questions + s.totalQuestions,
    correct: acc.correct + s.correct,
    wrong: acc.wrong + s.wrong,
    skipped: acc.skipped + s.skipped,
    scoreEarned: acc.scoreEarned + s.scoreEarned,
    maxScore: acc.maxScore + s.maxScore,
  }), { attempts: 0, questions: 0, correct: 0, wrong: 0, skipped: 0, scoreEarned: 0, maxScore: 0 }), [topicStats])

  const overallAccuracy = totals.correct + totals.wrong > 0
    ? Math.round((totals.correct / (totals.correct + totals.wrong)) * 100)
    : 0

  const overallScore = totals.maxScore > 0
    ? Math.round((Math.max(0, totals.scoreEarned) / totals.maxScore) * 100)
    : 0

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setStoredDir(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }
  const setStoredDir = setSortAsc

  if (history.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          <h1 className="text-sm font-semibold">Performance Analytics</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No attempts yet.</p>
            <p className="text-xs mt-1">Complete an exam to see your topic-wise stats.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5">
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        <h1 className="text-sm font-semibold">Performance Analytics</h1>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard icon={<BookOpen className="w-4 h-4" />} label="Exams Taken" value={String(totals.attempts)} />
            <SummaryCard icon={<Target className="w-4 h-4" />} label="Questions" value={totals.questions.toLocaleString()} />
            <SummaryCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Accuracy"
              value={`${overallAccuracy}%`}
              color={overallAccuracy >= 75 ? 'text-[#22C55E]' : overallAccuracy >= 50 ? 'text-amber-400' : 'text-[#EF4444]'}
            />
            <SummaryCard
              icon={<BarChart2 className="w-4 h-4" />}
              label="Avg Score"
              value={`${overallScore}%`}
              color={overallScore >= 75 ? 'text-[#22C55E]' : overallScore >= 50 ? 'text-amber-400' : 'text-[#EF4444]'}
            />
          </div>

          {/* Per-topic breakdown */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Topic Breakdown</h2>
              <button
                onClick={() => setShowAll(p => !p)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAll ? 'Hide untried topics' : 'Show all topics'}
              </button>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border overflow-hidden">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-4 py-2 bg-muted/50 border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <SortHeader label="Topic" sortKey="topic" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <SortHeader label="Attempts" sortKey="attempts" current={sortKey} asc={sortAsc} onSort={toggleSort} className="text-right" />
                <SortHeader label="Accuracy" sortKey="accuracy" current={sortKey} asc={sortAsc} onSort={toggleSort} className="text-right" />
                <SortHeader label="Score%" sortKey="score" current={sortKey} asc={sortAsc} onSort={toggleSort} className="text-right" />
                <span className="text-right">C / W / S</span>
              </div>

              {sorted.map((s, i) => (
                <TopicRow key={s.topic} stat={s} zebra={i % 2 === 1} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">{icon}<span className="text-[11px] uppercase tracking-wide font-semibold">{label}</span></div>
      <p className={`text-2xl font-bold ${color ?? 'text-foreground'}`}>{value}</p>
    </div>
  )
}

function SortHeader({ label, sortKey, current, asc, onSort, className }: {
  label: string
  sortKey: SortKey
  current: SortKey
  asc: boolean
  onSort: (k: SortKey) => void
  className?: string
}) {
  const active = sortKey === current
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-0.5 hover:text-foreground transition-colors ${active ? 'text-foreground' : ''} ${className ?? ''}`}
    >
      {label}
      {active
        ? <span className="ml-0.5">{asc ? '↑' : '↓'}</span>
        : <ArrowUpDown className="w-3 h-3 ml-0.5 opacity-40" />}
    </button>
  )
}

function TopicRow({ stat, zebra }: { stat: TopicStats; zebra: boolean }) {
  const acc = accuracy(stat)
  const sp = scorePercent(stat)
  const noData = stat.attempts === 0

  return (
    <div className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-4 py-3 items-center border-b border-border last:border-0 ${zebra ? 'bg-muted/20' : ''} ${noData ? 'opacity-40' : ''}`}>
      {/* Topic name + accuracy bar */}
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{stat.topic}</p>
        {!noData && (
          <div className="mt-1 h-1 rounded-full bg-muted w-full max-w-[160px]">
            <div
              className={`h-1 rounded-full transition-all ${ACCURACY_COLOR(acc)}`}
              style={{ width: `${acc}%` }}
            />
          </div>
        )}
      </div>

      {/* Attempts */}
      <span className="text-sm text-right text-muted-foreground tabular-nums">
        {noData ? '—' : stat.attempts}
      </span>

      {/* Accuracy */}
      <span className={`text-sm text-right font-semibold tabular-nums ${noData ? 'text-muted-foreground' : acc >= 75 ? 'text-[#22C55E]' : acc >= 50 ? 'text-amber-400' : 'text-[#EF4444]'}`}>
        {noData ? '—' : `${Math.round(acc)}%`}
      </span>

      {/* Score% */}
      <span className={`text-sm text-right font-semibold tabular-nums ${noData ? 'text-muted-foreground' : sp >= 75 ? 'text-[#22C55E]' : sp >= 50 ? 'text-amber-400' : 'text-[#EF4444]'}`}>
        {noData ? '—' : `${Math.round(sp)}%`}
      </span>

      {/* C / W / S */}
      <div className="text-[11px] text-right tabular-nums text-muted-foreground whitespace-nowrap">
        {noData ? '—' : (
          <>
            <span className="text-[#22C55E] font-medium">{stat.correct}</span>
            {' / '}
            <span className="text-[#EF4444] font-medium">{stat.wrong}</span>
            {' / '}
            <span>{stat.skipped}</span>
          </>
        )}
      </div>
    </div>
  )
}
