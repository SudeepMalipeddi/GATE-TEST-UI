import { useExamState } from './hooks/useExamState'
import { LoginPage } from './pages/LoginPage'
import { InstructionsPage } from './pages/InstructionsPage'
import { ExamPage } from './pages/ExamPage'
import { ResultsPage } from './pages/ResultsPage'

export default function App() {
  const {
    state,
    login,
    startExam,
    saveAnswer,
    clearAnswer,
    markForReview,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    submitExam,
    resetExam,
  } = useExamState()

  const handleSaveNext = (id: string, answer: string | string[] | undefined) => {
    if (answer !== undefined && answer !== '' && !(Array.isArray(answer) && answer.length === 0)) {
      saveAnswer(id, answer)
    }
    nextQuestion()
  }

  if (state.phase === 'login') {
    return <LoginPage onLogin={login} />
  }

  if (state.phase === 'instructions' && state.exam) {
    return <InstructionsPage exam={state.exam} onStart={startExam} />
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
    return <ResultsPage state={state} onReset={resetExam} />
  }

  return null
}
