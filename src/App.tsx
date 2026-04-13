import { useExamState } from './hooks/useExamState'
import { ExamSelectPage } from './pages/ExamSelectPage'
import { InstructionsPage } from './pages/InstructionsPage'
import { ExamPage } from './pages/ExamPage'
import { ResultsPage } from './pages/ResultsPage'
import { ReviewPage } from './pages/ReviewPage'
import { PracticePage } from './pages/PracticePage'

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
  } = useExamState()

  const handleSaveNext = (id: string, answer: string | string[] | undefined) => {
    if (answer !== undefined && answer !== '' && !(Array.isArray(answer) && answer.length === 0)) {
      saveAnswer(id, answer)
    }
    nextQuestion()
  }

  if (state.phase === 'select') {
    return <ExamSelectPage onSelect={selectExam} />
  }

  if (state.phase === 'instructions' && state.exam) {
    return <InstructionsPage exam={state.exam} onStart={startExam} onPractice={enterPractice} />
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
      />
    )
  }

  if (state.phase === 'results' && state.exam) {
    return <ResultsPage state={state} onReview={enterReview} onReset={resetExam} />
  }

  if (state.phase === 'review' && state.exam) {
    return <ReviewPage state={state} onBack={backToResults} />
  }

  if (state.phase === 'practice' && state.exam) {
    return <PracticePage state={state} onExit={exitPractice} />
  }

  return null
}
