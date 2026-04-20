import type { ExamData } from '../types/exam'

export interface ExamMeta {
  id: string
  name: string
  durationMinutes: number
  totalQuestions: number
  sectionNames: string[]
}

export async function loadCatalog(): Promise<ExamMeta[]> {
  const res = await fetch('/exams/catalog.json')
  return res.json()
}

export async function loadExam(id: string): Promise<ExamData> {
  const res = await fetch(`/exams/${id}.json`)
  const data = await res.json()
  return { ...data, _examId: id }
}
