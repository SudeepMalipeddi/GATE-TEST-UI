import { useState } from 'react'
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

  // NPTEL lecture overlay state (sits on top of NptelPage)
  const [nptelLecture, setNptelLecture] = useState<{
    data: NptelLectureData
    tab: 'notes' | 'flashcards' | 'questions'
  } | null>(null)

  const handleSaveNext = (id: string, answer: string | string[] | undefined) => {
    if (answer !== undefined && answer !== '' && !(Array.isArray(answer) && answer.length === 0)) {
      saveAnswer(id, answer)
    }
    nextQuestion()
  }

  const handleNptelPractice = (exam: ExamData) => {
    setNptelLecture(null)
    enterPractice(exam)
  }

  if (state.phase === 'select') {
    return (
      <ExamSelectPage
        onSelect={selectExam}
        onReviewAttempt={reviewHistoryAttempt}
        onOpenBookmark={openBookmark}
        onOpenStats={openStats}
        onOpenNptel={openNptel}
      />
    )
  }

  if (state.phase === 'stats') {
    return <StatsPage onClose={closeStats} />
  }

  if (state.phase === 'nptel') {
    if (nptelLecture) {
      return (
        <NptelLecturePage
          data={nptelLecture.data}
          initialTab={nptelLecture.tab}
          onBack={() => setNptelLecture(null)}
          onPractice={handleNptelPractice}
        />
      )
    }
    return (
      <NptelPage
        onBack={closeNptel}
        onPractice={handleNptelPractice}
        onOpenLecture={(data, tab) => setNptelLecture({ data, tab })}
      />
    )
  }

  if (state.phase === 'instructions' && state.exam) {
    return <InstructionsPage exam={state.exam} onStart={startExam} onPractice={enterPractice} onBack={resetExam} />
  }

  if (state.phase === 'exam' && state.exam) {
    return (
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
  }

  if (state.phase === 'results' && state.exam) {
    return <ResultsPage state={state} onReview={enterReview} onReset={resetExam} />
  }

  if ((state.phase === 'review' || state.phase === 'history-review') && state.exam) {
    return (
      <ReviewPage
        state={state}
        onBack={state.phase === 'history-review' ? resetExam : backToResults}
        backLabel={state.phase === 'history-review' ? 'Exams' : 'Results'}
      />
    )
  }

  if (state.phase === 'practice' && state.exam) {
    return <PracticePage state={state} onExit={state.exam.name.startsWith('NPTEL') ? () => { exitPractice(); openNptel() } : exitPractice} />
  }

  return null
}
