import { useState, useEffect, useCallback, useRef } from 'react'
import type { ExamState, ExamData, QuestionStatus, AttemptRecord } from '../types/exam'

const STORAGE_KEY = 'exam_state'
const HISTORY_KEY = 'exam_history'

function saveAttemptToHistory(s: ExamState) {
  if (!s.exam) return
  let score = 0, maxScore = 0, correct = 0, wrong = 0, skipped = 0
  for (const section of s.exam.sections) {
    for (const q of section.questions) {
      maxScore += q.marks
      const ans = s.answers[q.id]
      const isEmpty = !ans || ans === '' || (Array.isArray(ans) && ans.length === 0)
      if (isEmpty) { skipped++; continue }
      let isCorrect = false
      if (q.type === 'MCQ') isCorrect = ans === q.correctAnswer
      else if (q.type === 'MSQ') {
        const u = Array.isArray(ans) ? [...ans].sort() : []
        const c = Array.isArray(q.correctAnswer) ? [...q.correctAnswer].sort() : []
        isCorrect = JSON.stringify(u) === JSON.stringify(c)
      } else {
        isCorrect = String(ans).trim() === String(q.correctAnswer).trim()
      }
      if (isCorrect) { correct++; score += q.marks }
      else { wrong++; if (q.type === 'MCQ') score -= q.penalty }
    }
  }
  const totalQuestions = s.exam.sections.reduce((a, sec) => a + sec.questions.length, 0)
  const record: AttemptRecord = {
    examName: s.exam.name,
    date: new Date().toISOString(),
    score: Math.max(0, score),
    maxScore,
    correct,
    wrong,
    skipped,
    totalQuestions,
    answers: s.answers,
    timeSpent: s.timeSpent,
  }
  try {
    const existing: AttemptRecord[] = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
    existing.unshift(record)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(existing.slice(0, 50)))
  } catch { /* ignore */ }
}

function initStatuses(exam: ExamData): Record<string, QuestionStatus> {
  const statuses: Record<string, QuestionStatus> = {}
  for (const section of exam.sections) {
    for (const q of section.questions) {
      statuses[q.id] = 'not_visited'
    }
  }
  return statuses
}

const selectState: ExamState = {
  exam: null,
  currentSection: 0,
  currentQuestion: 0,
  answers: {},
  statuses: {},
  timeSpent: {},
  timeRemaining: 0,
  phase: 'select',
}

export function useExamState() {
  const stateRef = useRef<ExamState>(selectState)
  // Tracks when the current question was first displayed — used to compute time-on-question
  const questionEnteredAt = useRef<number>(Date.now())

  const [state, setState] = useState<ExamState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ExamState
        if (parsed.phase === 'exam') return { ...parsed, timeSpent: parsed.timeSpent ?? {} }
      } catch {
        // fall through
      }
    }
    return selectState
  })

  // Helper: consume elapsed seconds since last navigation, reset the clock
  const consumeElapsed = () => {
    const now = Date.now()
    const elapsed = Math.floor((now - questionEnteredAt.current) / 1000)
    questionEnteredAt.current = now
    return elapsed
  }

  // Keep ref in sync for use in callbacks with empty deps
  useEffect(() => { stateRef.current = state }, [state])

  // Persist during exam
  useEffect(() => {
    if (state.phase !== 'exam') return
    const id = setInterval(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }, 30_000)
    return () => clearInterval(id)
  }, [state])

  // Timer countdown
  useEffect(() => {
    if (state.phase !== 'exam' || state.timeRemaining <= 0) return
    const id = setInterval(() => {
      setState(s => {
        const next = s.timeRemaining - 1
        if (next <= 0) return { ...s, timeRemaining: 0, phase: 'results' }
        return { ...s, timeRemaining: next }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [state.phase, state.timeRemaining])

  const selectExam = useCallback((exam: ExamData) => {
    setState({
      exam,
      currentSection: 0,
      currentQuestion: 0,
      answers: {},
      statuses: initStatuses(exam),
      timeSpent: {},
      timeRemaining: exam.durationMinutes * 60,
      phase: 'instructions',
    })
  }, [])

  const startExam = useCallback(() => {
    questionEnteredAt.current = Date.now()
    setState(s => ({ ...s, phase: 'exam' }))
  }, [])

  const saveAnswer = useCallback((questionId: string, answer: string | string[]) => {
    setState(s => {
      const cur = s.statuses[questionId]
      // If already marked for review, keep it review_answered instead of dropping the flag
      const next = (cur === 'review' || cur === 'review_answered') ? 'review_answered' : 'answered'
      return {
        ...s,
        answers: { ...s.answers, [questionId]: answer },
        statuses: { ...s.statuses, [questionId]: next },
      }
    })
  }, [])

  const clearAnswer = useCallback((questionId: string) => {
    setState(s => {
      const answers = { ...s.answers }
      delete answers[questionId]
      return { ...s, answers, statuses: { ...s.statuses, [questionId]: 'not_answered' } }
    })
  }, [])

  const markForReview = useCallback((questionId: string) => {
    setState(s => {
      const hasAnswer = questionId in s.answers
      return {
        ...s,
        statuses: {
          ...s.statuses,
          [questionId]: hasAnswer ? 'review_answered' : 'review',
        },
      }
    })
  }, [])

  const goToQuestion = useCallback((sectionIdx: number, questionIdx: number) => {
    const elapsed = consumeElapsed()
    setState(s => {
      const q = s.exam?.sections[sectionIdx]?.questions[questionIdx]
      if (!q) return s
      const prevQId = s.exam?.sections[s.currentSection]?.questions[s.currentQuestion]?.id
      const statuses = { ...s.statuses }
      if (statuses[q.id] === 'not_visited') statuses[q.id] = 'not_answered'
      const timeSpent = { ...s.timeSpent }
      if (prevQId) timeSpent[prevQId] = (timeSpent[prevQId] ?? 0) + elapsed
      return { ...s, currentSection: sectionIdx, currentQuestion: questionIdx, statuses, timeSpent }
    })
  }, [])

  const nextQuestion = useCallback(() => {
    const elapsed = consumeElapsed()
    setState(s => {
      if (!s.exam) return s
      const section = s.exam.sections[s.currentSection]
      const prevQId = section.questions[s.currentQuestion]?.id
      const timeSpent = { ...s.timeSpent }
      if (prevQId) timeSpent[prevQId] = (timeSpent[prevQId] ?? 0) + elapsed
      if (s.currentQuestion < section.questions.length - 1) {
        const nextQ = section.questions[s.currentQuestion + 1]
        const statuses = { ...s.statuses }
        if (statuses[nextQ.id] === 'not_visited') statuses[nextQ.id] = 'not_answered'
        return { ...s, currentQuestion: s.currentQuestion + 1, statuses, timeSpent }
      }
      if (s.currentSection < s.exam.sections.length - 1) {
        const nextSec = s.exam.sections[s.currentSection + 1]
        const firstQ = nextSec.questions[0]
        const statuses = { ...s.statuses }
        if (statuses[firstQ.id] === 'not_visited') statuses[firstQ.id] = 'not_answered'
        return { ...s, currentSection: s.currentSection + 1, currentQuestion: 0, statuses, timeSpent }
      }
      return { ...s, timeSpent }
    })
  }, [])

  const prevQuestion = useCallback(() => {
    const elapsed = consumeElapsed()
    setState(s => {
      if (!s.exam) return s
      const prevQId = s.exam.sections[s.currentSection]?.questions[s.currentQuestion]?.id
      const timeSpent = { ...s.timeSpent }
      if (prevQId) timeSpent[prevQId] = (timeSpent[prevQId] ?? 0) + elapsed
      if (s.currentQuestion > 0) return { ...s, currentQuestion: s.currentQuestion - 1, timeSpent }
      if (s.currentSection > 0) {
        const prevSec = s.exam.sections[s.currentSection - 1]
        return {
          ...s,
          currentSection: s.currentSection - 1,
          currentQuestion: prevSec.questions.length - 1,
          timeSpent,
        }
      }
      return { ...s, timeSpent }
    })
  }, [])

  const submitExam = useCallback(() => {
    const elapsed = consumeElapsed()
    const s = stateRef.current
    const curQId = s.exam?.sections[s.currentSection]?.questions[s.currentQuestion]?.id
    const finalTimeSpent = { ...s.timeSpent }
    if (curQId) finalTimeSpent[curQId] = (finalTimeSpent[curQId] ?? 0) + elapsed
    saveAttemptToHistory({ ...s, timeSpent: finalTimeSpent })
    setState(prev => ({ ...prev, phase: 'results' }))
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const enterPractice = useCallback(() => {
    setState(s => ({
      ...s,
      phase: 'practice',
      currentSection: 0,
      currentQuestion: 0,
      answers: {},
      statuses: s.exam ? initStatuses(s.exam) : {},
    }))
  }, [])

  const openBookmark = useCallback((exam: ExamData, sectionIdx: number, questionIdx: number) => {
    setState({
      exam,
      currentSection: sectionIdx,
      currentQuestion: questionIdx,
      answers: {},
      statuses: initStatuses(exam),
      timeSpent: {},
      timeRemaining: 0,
      phase: 'practice',
    })
  }, [])

  const exitPractice = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setState(selectState)
  }, [])

  const enterReview = useCallback(() => {
    setState(s => ({ ...s, phase: 'review', currentSection: 0, currentQuestion: 0 }))
  }, [])

  const backToResults = useCallback(() => {
    setState(s => ({ ...s, phase: 'results' }))
  }, [])

  const resetExam = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setState(selectState)
  }, [])

  const reviewHistoryAttempt = useCallback((exam: ExamData, answers: Record<string, string | string[]>, timeSpent?: Record<string, number>) => {
    setState({
      exam,
      currentSection: 0,
      currentQuestion: 0,
      answers,
      statuses: initStatuses(exam),
      timeSpent: timeSpent ?? {},
      timeRemaining: 0,
      phase: 'history-review',
    })
  }, [])

  return {
    state,
    selectExam,
    startExam,
    saveAnswer,
    clearAnswer,
    markForReview,
    openBookmark,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    submitExam,
    enterReview,
    backToResults,
    enterPractice,
    exitPractice,
    resetExam,
    reviewHistoryAttempt,
  }
}
