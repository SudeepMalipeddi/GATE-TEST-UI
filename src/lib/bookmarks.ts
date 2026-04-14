export interface Bookmark {
  questionId: string
  examName: string
  questionPreview: string   // stripped HTML, first 120 chars
  note: string
  date: string              // ISO
}

const KEY = 'question_bookmarks'

function load(): Bookmark[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

function persist(bookmarks: Bookmark[]) {
  localStorage.setItem(KEY, JSON.stringify(bookmarks))
}

export function getBookmarks(): Bookmark[] {
  return load()
}

export function getBookmark(questionId: string): Bookmark | undefined {
  return load().find(b => b.questionId === questionId)
}

export function saveBookmark(bookmark: Bookmark): void {
  const all = load()
  const idx = all.findIndex(b => b.questionId === bookmark.questionId)
  if (idx >= 0) all[idx] = bookmark
  else all.unshift(bookmark)
  persist(all)
}

export function removeBookmark(questionId: string): void {
  persist(load().filter(b => b.questionId !== questionId))
}

export function clearBookmarks(): void {
  localStorage.removeItem(KEY)
}
