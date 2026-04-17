const OVERRIDES_KEY = 'answer_overrides'

type OverrideMap = Record<string, string | string[]>

function load(): OverrideMap {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function getOverride(questionId: string): string | string[] | null {
  const map = load()
  return map[questionId] ?? null
}

export function setOverride(questionId: string, answer: string | string[]) {
  const map = load()
  map[questionId] = answer
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(map))
}

export function removeOverride(questionId: string) {
  const map = load()
  delete map[questionId]
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(map))
}

/** Returns the effective correct answer: override > original */
export function effectiveAnswer(questionId: string, original: string | string[]): string | string[] {
  return getOverride(questionId) ?? original
}
