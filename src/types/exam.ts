export type QuestionStatus =
  | 'not_visited'
  | 'not_answered'
  | 'answered'
  | 'review'
  | 'review_answered'

export type QuestionType = 'MCQ' | 'MSQ' | 'NAT'

export interface Option {
  id: string
  text: string
}

export interface Question {
  id: string
  text: string
  type: QuestionType
  options: Option[]
  correctAnswer: string | string[]
  marks: number
  penalty: number
}

export interface Section {
  name: string
  questions: Question[]
}

export interface ExamData {
  name: string
  durationMinutes: number
  sections: Section[]
}

export interface ExamState {
  exam: ExamData | null
  currentSection: number
  currentQuestion: number
  answers: Record<string, string | string[]>
  statuses: Record<string, QuestionStatus>
  timeRemaining: number
  phase: 'select' | 'instructions' | 'exam' | 'results' | 'review'
}
