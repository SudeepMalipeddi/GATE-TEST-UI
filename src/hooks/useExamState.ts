import { useState, useEffect, useCallback } from 'react'
import type { ExamState, ExamData, QuestionStatus } from '../types/exam'

const STORAGE_KEY = 'exam_state'

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
  timeRemaining: 0,
  phase: 'select',
}

export function useExamState() {
  const [state, setState] = useState<ExamState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ExamState
        if (parsed.phase === 'exam') return parsed
      } catch {
        // fall through
      }
    }
    return selectState
  })

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
      timeRemaining: exam.durationMinutes * 60,
      phase: 'instructions',
    })
  }, [])

  const startExam = useCallback(() => {
    setState(s => ({ ...s, phase: 'exam' }))
  }, [])

  const saveAnswer = useCallback((questionId: string, answer: string | string[]) => {
    setState(s => ({
      ...s,
      answers: { ...s.answers, [questionId]: answer },
      statuses: { ...s.statuses, [questionId]: 'answered' },
    }))
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
    setState(s => {
      const q = s.exam?.sections[sectionIdx]?.questions[questionIdx]
      if (!q) return s
      const statuses = { ...s.statuses }
      if (statuses[q.id] === 'not_visited') statuses[q.id] = 'not_answered'
      return { ...s, currentSection: sectionIdx, currentQuestion: questionIdx, statuses }
    })
  }, [])

  const nextQuestion = useCallback(() => {
    setState(s => {
      if (!s.exam) return s
      const section = s.exam.sections[s.currentSection]
      if (s.currentQuestion < section.questions.length - 1) {
        const nextQ = section.questions[s.currentQuestion + 1]
        const statuses = { ...s.statuses }
        if (statuses[nextQ.id] === 'not_visited') statuses[nextQ.id] = 'not_answered'
        return { ...s, currentQuestion: s.currentQuestion + 1, statuses }
      }
      if (s.currentSection < s.exam.sections.length - 1) {
        const nextSec = s.exam.sections[s.currentSection + 1]
        const firstQ = nextSec.questions[0]
        const statuses = { ...s.statuses }
        if (statuses[firstQ.id] === 'not_visited') statuses[firstQ.id] = 'not_answered'
        return { ...s, currentSection: s.currentSection + 1, currentQuestion: 0, statuses }
      }
      return s
    })
  }, [])

  const prevQuestion = useCallback(() => {
    setState(s => {
      if (!s.exam) return s
      if (s.currentQuestion > 0) return { ...s, currentQuestion: s.currentQuestion - 1 }
      if (s.currentSection > 0) {
        const prevSec = s.exam.sections[s.currentSection - 1]
        return {
          ...s,
          currentSection: s.currentSection - 1,
          currentQuestion: prevSec.questions.length - 1,
        }
      }
      return s
    })
  }, [])

  const submitExam = useCallback(() => {
    setState(s => ({ ...s, phase: 'results' }))
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const resetExam = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setState(selectState)
  }, [])

  return {
    state,
    selectExam,
    startExam,
    saveAnswer,
    clearAnswer,
    markForReview,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    submitExam,
    resetExam,
  }
}
