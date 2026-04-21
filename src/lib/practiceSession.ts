const KEY = 'practice_session'

export interface PracticeSession {
  examName: string
  currentSection: number
  currentQuestion: number
  localAnswers: Record<string, string | string[]>
  checked: Record<string, boolean>
}

export function saveSession(s: PracticeSession) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {}
}

export function loadSession(examName: string): PracticeSession | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (raw?.examName === examName) return raw as PracticeSession
    return null
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(KEY)
}
