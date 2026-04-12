import { sampleExam } from './sampleExam'
import type { ExamData } from '../types/exam'

export interface ExamMeta {
  id: string
  name: string
  subject: string
  durationMinutes: number
  totalQuestions: number
  available: boolean
  data?: ExamData
}

export const examCatalog: ExamMeta[] = [
  {
    id: 'gate-cse-2024-mock',
    name: 'GATE CSE 2024 — Mock Test',
    subject: 'Computer Science',
    durationMinutes: 180,
    totalQuestions: 13,
    available: true,
    data: sampleExam,
  },
  {
    id: 'gate-cse-2023',
    name: 'GATE CSE 2023',
    subject: 'Computer Science',
    durationMinutes: 180,
    totalQuestions: 65,
    available: false,
  },
  {
    id: 'gate-ece-2024-mock',
    name: 'GATE ECE 2024 — Mock Test',
    subject: 'Electronics & Communication',
    durationMinutes: 180,
    totalQuestions: 65,
    available: false,
  },
  {
    id: 'gate-ds-2024-mock',
    name: 'GATE DS&AI 2024 — Mock Test',
    subject: 'Data Science & AI',
    durationMinutes: 180,
    totalQuestions: 65,
    available: false,
  },
]
