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

export interface NptelManifestEntry {
  courseId: string
  file: string
  weekName: string
  lecName: string
}

export interface ExamData {
  name: string
  durationMinutes: number
  sections: Section[]
  _nptelManifest?: NptelManifestEntry[]
}

export interface ExamState {
  exam: ExamData | null
  currentSection: number
  currentQuestion: number
  answers: Record<string, string | string[]>
  statuses: Record<string, QuestionStatus>
  timeSpent: Record<string, number>   // seconds per question ID, tracked during exam
  timeRemaining: number
  phase: 'select' | 'instructions' | 'exam' | 'results' | 'review' | 'history-review' | 'practice' | 'stats' | 'nptel'
}

// ── NPTEL types ────────────────────────────────────────────────────

export interface NptelFlashcard {
  front: string
  back: string
  topic: string
  difficulty: string
}

export interface NptelLectureMeta {
  id: string
  file: string
  name: string
  qCount: number
  flashCount: number
  hasNotes: boolean
}

export interface NptelWeek {
  week: string
  humanWeek: string
  lectures: NptelLectureMeta[]
}

export interface NptelCourseMeta {
  id: string
  subject: string
  weekCount: number
  lectureCount: number
  questionCount: number
  flashcardCount: number
}

export interface NptelLectureData {
  course_id: string
  week: string
  lecture_id: string
  lecture_name: string
  notes: string | null
  flashcards: NptelFlashcard[]
  questions: Question[]
}

export interface AttemptRecord {
  examName: string
  date: string        // ISO string
  score: number       // final score after penalties, floored at 0
  maxScore: number
  correct: number
  wrong: number
  skipped: number
  totalQuestions: number
  answers?: Record<string, string | string[]>   // undefined on old records without answer data
  timeSpent?: Record<string, number>            // seconds per question, undefined on old records
}
