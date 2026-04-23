import React, { useState, useEffect } from 'react'
import { useExamState } from './hooks/useExamState'
import { ExamSelectPage } from './pages/ExamSelectPage'
import { InstructionsPage } from './pages/InstructionsPage'
import { ExamPage } from './pages/ExamPage'
import { ResultsPage } from './pages/ResultsPage'
import { ReviewPage } from './pages/ReviewPage'
import { PracticePage } from './pages/PracticePage'
import { StatsPage } from './pages/StatsPage'
import { NptelPage } from './pages/NptelPage'
import { NptelLecturePage } from './pages/NptelLecturePage'
import type { NptelLectureData, ExamData } from './types/exam'
import { CommandPalette } from './components/CommandPalette'
import { loadExam } from './data/examCatalog'

export default function App() {
  const {
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
    enterReview,
    backToResults,
    enterPractice,
    exitPractice,
    resetExam,
    reviewHistoryAttempt,
    openBookmark,
    openStats,
    closeStats,
    openNptel,
    closeNptel,
  } = useExamState()

  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handlePaletteSelectExam = async (id: string) => {
    const exam = await loadExam(id)
    selectExam(exam)
  }

  // NPTEL lecture overlay state (sits on top of NptelPage)
  const [nptelLecture, setNptelLecture] = useState<{
    data: NptelLectureData
    tab: 'notes' | 'flashcards' | 'questions'
    onNextLecture: (() => Promise<void>) | null
    onPrevLecture: (() => Promise<void>) | null
  } | null>(null)

  const handleSaveNext = (id: string, answer: string | string[] | undefined) => {
    if (answer !== undefined && answer !== '' && !(Array.isArray(answer) && answer.length === 0)) {
      saveAnswer(id, answer)
    }
    nextQuestion()
  }

  const handleNptelPractice = (exam: ExamData) => {
    enterPractice(exam)
  }

  let content: React.ReactNode = null

  if (state.phase === 'select') {
    content = (
      <ExamSelectPage
        onSelect={selectExam}
        onReviewAttempt={reviewHistoryAttempt}
        onOpenBookmark={openBookmark}
        onOpenStats={openStats}
        onOpenNptel={openNptel}
      />
    )
  } else if (state.phase === 'stats') {
    content = <StatsPage onClose={closeStats} />
  } else if (state.phase === 'nptel') {
    content = nptelLecture ? (
      <NptelLecturePage
        data={nptelLecture.data}
        initialTab={nptelLecture.tab}
        onBack={() => setNptelLecture(null)}
        onPractice={handleNptelPractice}
        onNextLecture={nptelLecture.onNextLecture}
        onPrevLecture={nptelLecture.onPrevLecture}
      />
    ) : (
      <NptelPage
        onBack={closeNptel}
        onPractice={handleNptelPractice}
        onOpenLecture={(data, tab, onNext, onPrev) => setNptelLecture({ data, tab, onNextLecture: onNext ?? null, onPrevLecture: onPrev ?? null })}
      />
    )
  } else if (state.phase === 'instructions' && state.exam) {
    content = <InstructionsPage exam={state.exam} onStart={startExam} onPractice={() => enterPractice()} onBack={resetExam} />
  } else if (state.phase === 'exam' && state.exam) {
    content = (
      <ExamPage
        state={state}
        onAnswer={saveAnswer}
        onClear={clearAnswer}
        onMarkReview={markForReview}
        onSaveNext={handleSaveNext}
        onPrev={prevQuestion}
        onGoTo={goToQuestion}
        onSubmit={submitExam}
        onCancel={resetExam}
      />
    )
  } else if (state.phase === 'results' && state.exam) {
    content = <ResultsPage state={state} onReview={enterReview} onReset={resetExam} />
  } else if ((state.phase === 'review' || state.phase === 'history-review') && state.exam) {
    content = (
      <ReviewPage
        state={state}
        onBack={state.phase === 'history-review' ? resetExam : backToResults}
        backLabel={state.phase === 'history-review' ? 'Exams' : 'Results'}
      />
    )
  } else if (state.phase === 'practice' && state.exam) {
    content = <PracticePage state={state} onExit={state.exam.name.startsWith('NPTEL') ? () => { exitPractice(); openNptel() } : exitPractice} />
  }

  return (
    <>
      {content}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelectExam={handlePaletteSelectExam}
        onOpenNptel={() => { openNptel(); setPaletteOpen(false) }}
        onOpenStats={() => { openStats(); setPaletteOpen(false) }}
      />
    </>
  )
}
