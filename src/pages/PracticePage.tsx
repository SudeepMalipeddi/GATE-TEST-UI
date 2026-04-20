import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ExamHeader, type FontSize } from '../components/ExamHeader'
import { QuestionPalette } from '../components/QuestionPalette'
import { QuestionDisplay } from '../components/QuestionDisplay'
import { ReviewQuestionDisplay } from '../components/ReviewQuestionDisplay'
import { AskAI } from '../components/AskAI'
import { FixAnswerPanel } from '../components/FixAnswerPanel'
import { LayoutGrid, ChevronLeft, ChevronRight, LogOut, RotateCcw, CheckCircle2 } from 'lucide-react'
import type { ExamState, Question, QuestionStatus, Section } from '../types/exam'
import { natCorrect } from '../lib/natCorrect'
import { effectiveAnswer } from '../lib/answerOverrides'
import { loadSession, saveSession, clearSession } from '../lib/practiceSession'

interface Props {
  state: ExamState
  onExit: () => void
}

function isCorrect(q: Question, answer: string | string[] | undefined): boolean {
  if (!answer || answer === '' || (Array.isArray(answer) && answer.length === 0)) return false
  const correct = effectiveAnswer(q.id, q.correctAnswer)
  if (q.type === 'MCQ') return answer === correct
  if (q.type === 'MSQ') {
    const u = Array.isArray(answer) ? [...answer].sort() : []
    const c = Array.isArray(correct) ? [...correct].sort() : []
    return JSON.stringify(u) === JSON.stringify(c)
  }
  return natCorrect(answer, correct)
}

export function PracticePage({ state, onExit }: Props) {
  const { exam } = state
  const isNptel = !!exam?._nptelManifest
  // Load saved session once on mount (ignore for NPTEL since sections are dynamic)
  const savedSession = useMemo(() => (exam && !isNptel ? loadSession(exam.name) : null), []) // eslint-disable-line react-hooks/exhaustive-deps

  const [currentSection, setCurrentSection] = useState(() => savedSession?.currentSection ?? state.currentSection)
  const [currentQuestion, setCurrentQuestion] = useState(() => savedSession?.currentQuestion ?? state.currentQuestion)
  const [localAnswers, setLocalAnswers] = useState<Record<string, string | string[]>>(() => savedSession?.localAnswers ?? {})
  const [checked, setChecked] = useState<Record<string, boolean>>(() => savedSession?.checked ?? {})
  const [resumed, setResumed] = useState(() => !!savedSession)
  const [fontSize, setFontSize] = useState<FontSize>(
    () => (localStorage.getItem('font_size') as FontSize | null) ?? 'md'
  )

  // ── NPTEL sliding window ───────────────────────────────────────────
  const [sections, setSections] = useState<Section[]>(() => exam?.sections ?? [])
  const loadedCount = useRef(exam?.sections.length ?? 0)
  const isLoadingRef = useRef(false)
  const [loadingNext, setLoadingNext] = useState(false)
  const manifest = exam?._nptelManifest

  useEffect(() => {
    if (!manifest || !exam) return
    if (currentSection < sections.length - 1) return   // not at the last loaded section
    if (loadedCount.current >= manifest.length) return  // all manifest entries consumed
    if (isLoadingRef.current) return

    isLoadingRef.current = true
    setLoadingNext(true)

    let nextIdx = loadedCount.current
    const doLoad = async () => {
      while (nextIdx < manifest.length) {
        const entry = manifest[nextIdx]
        const res = await fetch(`/nptel/${entry.courseId}/${entry.file}`)
        const data = await res.json()
        nextIdx++
        if (data.questions && data.questions.length > 0) {
          setSections(prev => [
            ...prev,
            { name: `${entry.weekName} · ${entry.lecName}`, questions: data.questions },
          ])
          loadedCount.current = nextIdx
          break
        }
      }
      if (nextIdx >= manifest.length) loadedCount.current = nextIdx
      isLoadingRef.current = false
      setLoadingNext(false)
    }
    doLoad()
  }, [currentSection, sections.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Compose a displayExam so all sub-components see the live sections list
  const displayExam = useMemo(
    () => (exam ? { ...exam, sections } : null),
    [exam, sections]
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize)
    localStorage.setItem('font_size', fontSize)
  }, [fontSize])

  const handleFontSize = useCallback((s: FontSize) => setFontSize(s), [])

  // ── Persist practice session ──────────────────────────────────────
  useEffect(() => {
    if (!exam || isNptel) return
    saveSession({ examName: exam.name, currentSection, currentQuestion, localAnswers, checked })
  }, [currentSection, currentQuestion, localAnswers, checked]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleExit = () => { clearSession(); onExit() }
  const startFresh = () => {
    clearSession()
    setLocalAnswers({})
    setChecked({})
    setCurrentSection(0)
    setCurrentQuestion(0)
    setResumed(false)
  }

  // ── NAT auto-focus ────────────────────────────────────────────────
  useEffect(() => {
    if (!displayExam) return
    const q = sections[currentSection]?.questions[currentQuestion]
    if (q?.type === 'NAT' && !(checked[q.id] ?? false)) {
      const input = document.querySelector('#nat-input') as HTMLInputElement | null
      input?.focus()
    }
  }, [currentSection, currentQuestion]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const sec = sections[currentSection]
      const q = sec?.questions[currentQuestion]
      if (!q) return
      const qChecked = checked[q.id] ?? false
      if (qChecked) return

      const key = e.key.toLowerCase()

      if (q.type === 'MCQ') {
        const opt = q.options.find(o => o.id.toLowerCase() === key)
        if (opt) {
          e.preventDefault()
          setLocalAnswers(prev => ({ ...prev, [q.id]: opt.id }))
        }
      } else if (q.type === 'MSQ') {
        const opt = q.options.find(o => o.id.toLowerCase() === key)
        if (opt) {
          e.preventDefault()
          setLocalAnswers(prev => {
            const cur = Array.isArray(prev[q.id]) ? (prev[q.id] as string[]) : []
            const next = cur.includes(opt.id) ? cur.filter(x => x !== opt.id) : [...cur, opt.id]
            return { ...prev, [q.id]: next }
          })
        }
      }

      if (e.key === 'Enter') {
        const ans = localAnswers[q.id]
        const hasAns = ans !== undefined && ans !== '' && !(Array.isArray(ans) && ans.length === 0)
        if (hasAns) {
          e.preventDefault()
          setChecked(prev => ({ ...prev, [q.id]: true }))
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentSection, currentQuestion, sections, checked, localAnswers])

  if (!displayExam) return null

  const section = sections[currentSection]
  const question = section?.questions[currentQuestion]
  if (!question) return null

  const totalQuestions = sections.reduce((a, s) => a + s.questions.length, 0)
  const questionNumberInExam =
    sections.slice(0, currentSection).reduce((a, s) => a + s.questions.length, 0) +
    currentQuestion + 1

  const hasPrev = currentSection > 0 || currentQuestion > 0
  const hasNext =
    currentSection < sections.length - 1 ||
    currentQuestion < section.questions.length - 1 ||
    (manifest !== undefined && loadedCount.current < manifest.length)

  const localAnswer = localAnswers[question.id]
  const isChecked = checked[question.id] ?? false

  const goTo = (sIdx: number, qIdx: number) => {
    setCurrentSection(sIdx)
    setCurrentQuestion(qIdx)
  }

  const goPrev = () => {
    if (currentQuestion > 0) setCurrentQuestion(q => q - 1)
    else if (currentSection > 0) {
      const prevSec = sections[currentSection - 1]
      setCurrentSection(s => s - 1)
      setCurrentQuestion(prevSec.questions.length - 1)
    }
  }

  const goNext = () => {
    if (currentQuestion < section.questions.length - 1) setCurrentQuestion(q => q + 1)
    else if (currentSection < sections.length - 1) {
      setCurrentSection(s => s + 1)
      setCurrentQuestion(0)
    }
    // If we're at the very last loaded question and more are incoming, stay put — the
    // effect will append a new section and hasNext will become true on re-render.
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
  const correctCount = sections.flatMap(s => s.questions).filter(q =>
    checked[q.id] && isCorrect(q, localAnswers[q.id])
  ).length

  // Build palette statuses
  const practiceStatuses: Record<string, QuestionStatus> = {}
  for (const sec of sections) {
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
        {loadingNext && (
          <p className="text-[10px] text-muted-foreground mt-2 text-center animate-pulse">Loading next lecture…</p>
        )}
        {manifest && (
          <p className="text-[10px] text-muted-foreground mt-1 text-center">
            {loadedCount.current} / {manifest.length} lectures loaded
          </p>
        )}
      </div>

      <QuestionPalette
        exam={displayExam}
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
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleExit}>
          <LogOut className="w-3.5 h-3.5" />
          Exit Practice
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <ExamHeader exam={displayExam} fontSize={fontSize} onFontSizeChange={handleFontSize} />

      <div className="mt-[60px] flex h-[calc(100vh-60px)]">
        {/* LEFT */}
        <div className="flex-1 overflow-auto p-4 md:mr-[260px]">
          {/* Resume banner */}
          {resumed && (
            <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-md bg-muted border border-border text-xs text-muted-foreground">
              <span>Resumed previous session · {checkedCount} checked</span>
              <button onClick={startFresh} className="ml-auto hover:text-foreground transition-colors">Start fresh</button>
            </div>
          )}

          {/* Section tabs */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {sections.map((sec, i) => (
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
                    examName={displayExam.name}
                    examId={displayExam._examId}
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

                <Button variant="outline" size="sm" onClick={goNext} disabled={!hasNext || loadingNext} className="gap-1.5">
                  {loadingNext ? 'Loading…' : <><span>Next</span> <ChevronRight className="w-4 h-4" /></>}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Fix answer — always accessible, outside the question card */}
          {!isChecked && <FixAnswerPanel question={question} examId={displayExam._examId} />}
        </div>

        {/* RIGHT sidebar (desktop) */}
        <aside className="hidden md:flex flex-col fixed right-0 top-[60px] w-[260px] h-[calc(100vh-60px)] border-l border-border overflow-hidden">
          {sidebar}
        </aside>
      </div>
    </div>
  )
}
