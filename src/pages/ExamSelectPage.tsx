import { useState, useEffect, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { BookOpen, Search, Loader2, ChevronDown, ChevronRight, CheckCircle2, XCircle, MinusCircle, Trash2, RotateCcw, ClipboardList, Bookmark, X, Upload, FileJson, AlertCircle, BarChart2, GraduationCap } from 'lucide-react'
import { loadCatalog, loadExam } from '../data/examCatalog'
import type { ExamMeta } from '../data/examCatalog'
import type { ExamData, AttemptRecord } from '../types/exam'
import { getBookmarks, removeBookmark, saveBookmark } from '../lib/bookmarks'
import type { Bookmark as BookmarkType } from '../lib/bookmarks'

// ── Schema validation ────────────────────────────────────────────────────────

function validateExam(raw: unknown): ExamData {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('Root must be a JSON object')
  const obj = raw as Record<string, unknown>

  if (typeof obj.name !== 'string' || !obj.name.trim())
    throw new Error('"name" must be a non-empty string')
  if (typeof obj.durationMinutes !== 'number' || obj.durationMinutes <= 0)
    throw new Error('"durationMinutes" must be a positive number')
  if (!Array.isArray(obj.sections) || obj.sections.length === 0)
    throw new Error('"sections" must be a non-empty array')

  const seenIds = new Set<string>()

  const sections = (obj.sections as unknown[]).map((sec, si) => {
    if (!sec || typeof sec !== 'object' || Array.isArray(sec))
      throw new Error(`sections[${si}] must be an object`)
    const s = sec as Record<string, unknown>
    if (typeof s.name !== 'string' || !s.name.trim())
      throw new Error(`sections[${si}].name must be a non-empty string`)
    if (!Array.isArray(s.questions) || s.questions.length === 0)
      throw new Error(`sections[${si}].questions must be a non-empty array`)

    const questions = (s.questions as unknown[]).map((q, qi) => {
      const loc = `sections[${si}].questions[${qi}]`
      if (!q || typeof q !== 'object' || Array.isArray(q))
        throw new Error(`${loc} must be an object`)
      const qo = q as Record<string, unknown>

      if (typeof qo.id !== 'string' || !qo.id.trim())
        throw new Error(`${loc}.id must be a non-empty string`)
      if (seenIds.has(qo.id as string))
        throw new Error(`Duplicate question id "${qo.id}"`)
      seenIds.add(qo.id as string)

      if (typeof qo.text !== 'string' || !qo.text.trim())
        throw new Error(`${loc}.text must be a non-empty string`)
      if (!['MCQ', 'MSQ', 'NAT'].includes(qo.type as string))
        throw new Error(`${loc}.type must be "MCQ", "MSQ", or "NAT" (got "${qo.type}")`)
      if (typeof qo.marks !== 'number')
        throw new Error(`${loc}.marks must be a number`)
      if (typeof qo.penalty !== 'number')
        throw new Error(`${loc}.penalty must be a number`)

      if (qo.type === 'MSQ') {
        if (!Array.isArray(qo.correctAnswer) || (qo.correctAnswer as unknown[]).some(v => typeof v !== 'string'))
          throw new Error(`${loc}.correctAnswer must be a string[] for MSQ`)
      } else {
        if (typeof qo.correctAnswer !== 'string')
          throw new Error(`${loc}.correctAnswer must be a string for MCQ/NAT`)
      }

      if (qo.type !== 'NAT') {
        if (!Array.isArray(qo.options) || qo.options.length === 0)
          throw new Error(`${loc}.options must be a non-empty array for MCQ/MSQ`)
        ;(qo.options as unknown[]).forEach((opt, oi) => {
          if (!opt || typeof opt !== 'object')
            throw new Error(`${loc}.options[${oi}] must be an object with "id" and "text"`)
          const o = opt as Record<string, unknown>
          if (typeof o.id !== 'string') throw new Error(`${loc}.options[${oi}].id must be a string`)
          if (typeof o.text !== 'string') throw new Error(`${loc}.options[${oi}].text must be a string`)
        })
      }

      return qo as unknown as ExamData['sections'][number]['questions'][number]
    })

    return { name: s.name as string, questions }
  })

  return { name: obj.name as string, durationMinutes: obj.durationMinutes as number, sections }
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const W = 72, H = 22, pad = 3
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - 2 * pad)
    const y = H - pad - ((v - min) / range) * (H - 2 * pad)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const lastVal = values[values.length - 1]
  const color = lastVal >= 60 ? '#22C55E' : lastVal >= 40 ? '#F59E0B' : '#EF4444'
  return (
    <svg width={W} height={H} className="flex-shrink-0" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

const HISTORY_KEY = 'exam_history'

function loadHistory(): AttemptRecord[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

interface Props {
  onSelect: (exam: ExamData) => void
  onReviewAttempt: (exam: ExamData, answers: Record<string, string | string[]>, timeSpent?: Record<string, number>) => void
  onOpenBookmark: (exam: ExamData, sectionIdx: number, questionIdx: number) => void
  onOpenStats: () => void
  onOpenNptel: () => void
}

const YEAR_TABS = ['2026', '2025', '2024', '2023', '2022', '2021', '2020', 'DA', 'Other'] as const
type YearTab = typeof YEAR_TABS[number]
type ActiveTab = YearTab | 'Recent' | 'Bookmarks'

function getYearTab(name: string): YearTab {
  if (/\bDA\b/.test(name)) return 'DA'
  const match = name.match(/20(\d{2})/)
  if (match) {
    const year = 2000 + parseInt(match[1])
    if (year >= 2020) return String(year) as YearTab
  }
  return 'Other'
}

// Normalize minor spelling variants so they group together
const SUBJECT_ALIASES: Record<string, string> = {
  'Mix Subjects':                           'Mixed Subjects',
  'MOCK GATE':                              'Mock GATE',
  'Data Structure and Algorithms':          'Data Structures',
  'Data Structures and Algorithms':         'Data Structures',
  'CO and Architecture':                    'Computer Organization',
  'Computer Organization and Architecture': 'Computer Organization',
  'Engineering Mathematics':                'Mathematics',
  'Linear Algebra':                         'Mathematics',
  'C Programming Subject Wise Test':        'C Programming',
  'C-Programming':                          'C Programming',
  'Operating System':                       'Operating Systems',
  'DBMS Subject Wise Test':                 'Databases',
  'DBMS':                                   'Databases',
}

function normalizeSubject(s: string): string {
  const t = s.trim().replace(/\s+\d+$/, '') // strip trailing numbers e.g. "Quantitative Aptitude 1"
  return SUBJECT_ALIASES[t] ?? t
}

function getSubject(name: string): string {
  // "Algorithms GATE2020: Previous GATE (1)" → "Algorithms"
  const legacyMatch = name.match(/^(.+?)\s+GATE\d{4}:/)
  if (legacyMatch) return normalizeSubject(legacyMatch[1])

  // "GATE CSE 2025 SET-1" / "GATE CSE 2023 | Original Paper" → "Full Paper"
  if (/^GATE\s+CSE\s+\d{4}/.test(name)) return 'Full Paper'

  if (/IIITH PGEE/i.test(name)) return 'IIITH PGEE'
  if (/NIELIT/i.test(name))     return 'NIELIT'

  const parts = name.split('|').map(p => p.trim())
  if (parts.length < 2) return 'Other'

  const second = parts[1]

  // "X | ALL INDIA MOCK TEST N" → "Mock GATE"
  if (/ALL INDIA MOCK/i.test(second)) return 'Mock GATE'

  // "X | Original Paper" → "Full Paper"
  if (/Original Paper/i.test(second)) return 'Full Paper'

  // "X | MOCK GATE …" → "Mock GATE"
  if (/^MOCK GATE/i.test(second)) return 'Mock GATE'

  // "X | Weekly Quiz N | Topic" → group all together
  if (/^Weekly Quiz/i.test(second)) return 'Weekly Quizzes'

  return normalizeSubject(second)
}

export function ExamSelectPage({ onSelect, onReviewAttempt, onOpenBookmark, onOpenStats, onOpenNptel }: Props) {
  const [catalog, setCatalog] = useState<ExamMeta[]>([])
  const [history, setHistory] = useState<AttemptRecord[]>(loadHistory)
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>(() => getBookmarks())
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const saved = localStorage.getItem('exam_select_tab') as ActiveTab | null
    if (saved) return saved
    return loadHistory().length > 0 ? 'Recent' : 'Other'
  })
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [reviewingIdx, setReviewingIdx] = useState<number | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [editingNote, setEditingNote] = useState<string | null>(null) // questionId being edited
  const [noteValues, setNoteValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(getBookmarks().map(b => [b.questionId, b.note]))
  )
  const [openingBookmark, setOpeningBookmark] = useState<string | null>(null)
  const [uploadPreview, setUploadPreview] = useState<ExamData | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollPositions = useRef<Partial<Record<string, number>>>({})

  const processFile = (file: File) => {
    if (!file.name.endsWith('.json')) {
      setUploadError('Only .json files are supported.')
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const raw = JSON.parse(e.target?.result as string)
        const exam = validateExam(raw)
        setUploadPreview(exam)
        setUploadError(null)
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Invalid JSON file')
        setUploadPreview(null)
      }
    }
    reader.readAsText(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleUploadConfirm = () => {
    if (uploadPreview) {
      setUploadPreview(null)
      onSelect(uploadPreview)
    }
  }

  useEffect(() => {
    localStorage.setItem('exam_select_tab', activeTab)
  }, [activeTab])

  useEffect(() => {
    loadCatalog().then(c => {
      setCatalog(c)
      setLoading(false)
      // Only auto-select a year tab if not already on Recent
      setActiveTab(prev => {
        // Keep any tab that still has data after the catalog loads
        if (prev === 'Recent' || prev === 'Bookmarks') return prev
        if (YEAR_TABS.includes(prev as YearTab) && c.some(e => getYearTab(e.name) === prev)) return prev
        // Saved tab no longer valid — fall back to first available year tab
        for (const tab of YEAR_TABS) {
          if (c.some(e => getYearTab(e.name) === tab)) return tab
        }
        return 'Other'
      })
    })
  }, [])

  // Reset collapsed state when switching tabs
  const switchTab = (tab: ActiveTab) => {
    if (scrollRef.current) scrollPositions.current[activeTab] = scrollRef.current.scrollTop
    if (tab === 'Bookmarks') refreshBookmarks()
    setActiveTab(tab)
    setFilter('')
    setCollapsed(new Set())
  }

  // Restore scroll position after tab change
  useEffect(() => {
    const t = setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollPositions.current[activeTab] ?? 0
    }, 0)
    return () => clearTimeout(t)
  }, [activeTab])

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY)
    setHistory([])
    setActiveTab(prev => {
      if (prev !== 'Recent') return prev
      for (const tab of YEAR_TABS) {
        if (catalog.some(e => getYearTab(e.name) === tab)) return tab
      }
      return 'Other'
    })
  }

  const deleteAttempt = (index: number) => {
    setHistory(prev => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length === 0) {
        localStorage.removeItem(HISTORY_KEY)
        // Switch away from Recent since it's now empty
        setActiveTab(cur => {
          if (cur !== 'Recent') return cur
          for (const tab of YEAR_TABS) {
            if (catalog.some(e => getYearTab(e.name) === tab)) return tab
          }
          return 'Other'
        })
      } else {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      }
      return next
    })
  }

  const populatedTabs: ActiveTab[] = [
    ...(history.length > 0 ? (['Recent'] as ActiveTab[]) : []),
    ...(bookmarks.length > 0 ? (['Bookmarks'] as ActiveTab[]) : []),
    ...YEAR_TABS.filter(tab => catalog.some(e => getYearTab(e.name) === tab)),
  ]

  const refreshBookmarks = () => {
    const fresh = getBookmarks()
    setBookmarks(fresh)
    setNoteValues(Object.fromEntries(fresh.map(b => [b.questionId, b.note])))
  }

  const deleteBookmark = (questionId: string) => {
    removeBookmark(questionId)
    refreshBookmarks()
    if (bookmarks.length === 1) {
      // last bookmark removed, switch tab
      setActiveTab(catalog.length > 0 ? (getYearTab(catalog[0].name) ?? 'Other') : 'Other')
    }
  }

  const saveNote = (questionId: string, note: string) => {
    const bm = bookmarks.find(b => b.questionId === questionId)
    if (bm) saveBookmark({ ...bm, note })
    refreshBookmarks()
  }

  const attemptedNames = new Set(history.map(h => h.examName))

  // Global search: activates when filter has 2+ chars, searches all tabs
  const globalGroups = useMemo(() => {
    const q = filter.trim()
    if (q.length < 2) return null
    const lower = q.toLowerCase()
    const matched = catalog.filter(e => e.name.toLowerCase().includes(lower))
    const byYear = new Map<YearTab, ExamMeta[]>()
    for (const exam of matched) {
      const year = getYearTab(exam.name)
      const arr = byYear.get(year) ?? []
      arr.push(exam)
      byYear.set(year, arr)
    }
    return YEAR_TABS.filter(tab => byYear.has(tab)).map(tab => ({ year: tab, exams: byYear.get(tab)! }))
  }, [catalog, filter])

  const tabExams = catalog
    .filter(e => getYearTab(e.name) === activeTab)
    .sort((a, b) => a.name.localeCompare(b.name))

  const filtered = filter.trim()
    ? tabExams.filter(e => e.name.toLowerCase().includes(filter.toLowerCase()))
    : tabExams

  // Group by subject
  const groups: { subject: string; exams: ExamMeta[] }[] = []
  for (const exam of filtered) {
    const subject = getSubject(exam.name)
    const existing = groups.find(g => g.subject === subject)
    if (existing) existing.exams.push(exam)
    else groups.push({ subject, exams: [exam] })
  }
  groups.sort((a, b) => {
    // "Full Paper" first, then alphabetical
    if (a.subject === 'Full Paper') return -1
    if (b.subject === 'Full Paper') return 1
    return a.subject.localeCompare(b.subject)
  })

  const toggleCollapse = (subject: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(subject)) next.delete(subject)
      else next.add(subject)
      return next
    })
  }

  const handleSelect = async (meta: ExamMeta) => {
    setLoadingId(meta.id)
    try {
      const exam = await loadExam(meta.id)
      onSelect(exam)
    } finally {
      setLoadingId(null)
    }
  }

  const handleReviewAttempt = async (attempt: AttemptRecord, idx: number) => {
    if (!attempt.answers) return
    const meta = catalog.find(e => e.name === attempt.examName)
    if (!meta) return
    setReviewingIdx(idx)
    try {
      const exam = await loadExam(meta.id)
      onReviewAttempt(exam, attempt.answers, attempt.timeSpent)
    } finally {
      setReviewingIdx(null)
    }
  }

  const handleOpenBookmark = async (questionId: string, examName: string) => {
    const meta = catalog.find(e => e.name === examName)
    if (!meta) return
    setOpeningBookmark(questionId)
    try {
      const exam = await loadExam(meta.id)
      let sIdx = 0, qIdx = 0
      outer: for (let si = 0; si < exam.sections.length; si++) {
        for (let qi = 0; qi < exam.sections[si].questions.length; qi++) {
          if (exam.sections[si].questions[qi].id === questionId) {
            sIdx = si; qIdx = qi; break outer
          }
        }
      }
      onOpenBookmark(exam, sIdx, qIdx)
    } finally {
      setOpeningBookmark(null)
    }
  }

  const totalQuestions = uploadPreview
    ? uploadPreview.sections.reduce((a, s) => a + s.questions.length, 0)
    : 0

  return (
    <div
      className="min-h-screen bg-background flex flex-col relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 border-2 border-dashed border-foreground/30 pointer-events-none">
          <FileJson className="w-10 h-10 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">Drop your exam JSON file here</p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Upload preview dialog */}
      <Dialog open={!!uploadPreview} onOpenChange={open => { if (!open) setUploadPreview(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Ready to start</DialogTitle>
          </DialogHeader>
          {uploadPreview && (
            <div className="space-y-3 py-1">
              <p className="text-sm font-medium leading-snug">{uploadPreview.name}</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Duration', value: `${uploadPreview.durationMinutes} min` },
                  { label: 'Sections', value: String(uploadPreview.sections.length) },
                  { label: 'Questions', value: String(totalQuestions) },
                ].map(item => (
                  <div key={item.label} className="rounded-md bg-muted border border-border p-2.5 text-center">
                    <p className="text-base font-bold text-foreground">{item.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                {uploadPreview.sections.map(sec => (
                  <div key={sec.name} className="flex justify-between text-xs text-muted-foreground">
                    <span>{sec.name}</span>
                    <span>{sec.questions.length} questions</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setUploadPreview(null)}>Cancel</Button>
            <Button size="sm" onClick={handleUploadConfirm}>Start Exam</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload error dialog */}
      <Dialog open={!!uploadError} onOpenChange={open => { if (!open) setUploadError(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#EF4444]" />
              Invalid exam file
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground leading-relaxed font-mono bg-muted rounded-md px-3 py-2 break-all">
            {uploadError}
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setUploadError(null)}>Dismiss</Button>
            <Button size="sm" onClick={() => { setUploadError(null); fileInputRef.current?.click() }}>Try another file</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-md border border-border flex items-center justify-center">
          <BookOpen className="w-4 h-4" />
        </div>
        <span className="font-semibold text-sm">Assessment Examination Center</span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={onOpenNptel}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            NPTEL
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={onOpenStats}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Stats
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload exam
          </Button>
        </div>
      </header>

      {/* Year tabs */}
      <div className="border-b border-border px-4 flex items-center gap-1 overflow-x-auto">
        {loading
          ? YEAR_TABS.map(tab => (
              <button key={tab} disabled
                className="px-4 py-3 text-xs font-medium text-muted-foreground/40 border-b-2 border-transparent whitespace-nowrap">
                {tab}
              </button>
            ))
          : populatedTabs.map(tab => (
              <button key={tab} onClick={() => switchTab(tab)}
                className={`px-4 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}>
                {tab}
                <span className="ml-1.5 text-muted-foreground font-normal">
                  ({tab === 'Recent'
                    ? history.length
                    : tab === 'Bookmarks'
                    ? bookmarks.length
                    : catalog.filter(e => getYearTab(e.name) === tab).length})
                </span>
              </button>
            ))}
      </div>

      {/* Persistent search bar */}
      <div className="border-b border-border px-6 py-2.5 flex items-center gap-3">
        <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <input
          placeholder="Search all exams…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {filter && (
          <button onClick={() => setFilter('')} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col px-6 py-5 max-w-5xl mx-auto w-full overflow-hidden">

        {globalGroups !== null ? (
          /* ── Global search results ── */
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-3 pb-6">
              <p className="text-xs text-muted-foreground">
                {globalGroups.reduce((n: number, g: { year: YearTab; exams: ExamMeta[] }) => n + g.exams.length, 0)} results across {globalGroups.length} year{globalGroups.length !== 1 ? 's' : ''}
              </p>
              {globalGroups.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-10">No exams match "{filter}"</p>
              )}
              {globalGroups.map(({ year, exams }: { year: YearTab; exams: ExamMeta[] }) => (
                <div key={year} className="border border-border rounded-md overflow-hidden">
                  <div className="px-3 py-2 bg-muted flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{year}</span>
                    <span className="text-xs text-muted-foreground">{exams.length}</span>
                  </div>
                  <div className="flex flex-col divide-y divide-border">
                    {exams.map((exam: ExamMeta) => {
                      const attempted = attemptedNames.has(exam.name)
                      return (
                        <button
                          key={exam.id}
                          onClick={() => handleSelect(exam)}
                          disabled={loadingId === exam.id}
                          className={`text-left px-4 py-2.5 hover:bg-accent transition-colors text-sm flex items-center justify-between gap-2 disabled:opacity-60 ${attempted ? 'text-[#22C55E]' : ''}`}
                        >
                          <span>{exam.name}</span>
                          {loadingId === exam.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground flex-shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

        ) : activeTab === 'Recent' ? (
          /* ── Recent attempts view ── */
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-muted-foreground">{history.length} attempt{history.length !== 1 ? 's' : ''}</p>
              <Button variant="ghost" size="sm" onClick={clearHistory} className="gap-1.5 text-muted-foreground hover:text-foreground h-7 text-xs">
                <Trash2 className="w-3.5 h-3.5" /> Clear History
              </Button>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div className="flex flex-col gap-3 pb-6">
                {history.map((attempt, i) => {
                  const pct = attempt.maxScore > 0 ? Math.round((attempt.score / attempt.maxScore) * 100) : 0
                  const meta = catalog.find(e => e.name === attempt.examName)
                  // Sparkline: all attempts for this exam, oldest→newest, as score %
                  const sameExam = [...history]
                    .filter(h => h.examName === attempt.examName && h.maxScore > 0)
                    .reverse()
                    .map(h => Math.round((h.score / h.maxScore) * 100))
                  return (
                    <div key={i} className="border border-border rounded-md p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">{attempt.examName}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(attempt.date)}</span>
                          <button
                            onClick={() => deleteAttempt(i)}
                            title="Remove this attempt"
                            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-[#EF4444]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-base font-bold">{attempt.score.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground">/ {attempt.maxScore}</span>
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${pct >= 60 ? 'bg-[#22C55E]/15 text-[#22C55E]' : pct >= 40 ? 'bg-amber-400/15 text-amber-400' : 'bg-[#EF4444]/15 text-[#EF4444]'}`}>
                          {pct}%
                        </span>
                        {sameExam.length >= 2 && <Sparkline values={sameExam} />}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#22C55E]" />{attempt.correct} correct</span>
                        <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-[#EF4444]" />{attempt.wrong} wrong</span>
                        <span className="flex items-center gap-1"><MinusCircle className="w-3 h-3" />{attempt.skipped} skipped</span>
                        <div className="ml-auto flex items-center gap-3">
                          {attempt.answers && meta && (
                            <button
                              onClick={() => handleReviewAttempt(attempt, i)}
                              disabled={reviewingIdx === i || loadingId === meta?.id}
                              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                            >
                              {reviewingIdx === i
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <ClipboardList className="w-3 h-3" />}
                              Review
                            </button>
                          )}
                          {meta && (
                            <button
                              onClick={() => handleSelect(meta)}
                              disabled={loadingId === meta.id || reviewingIdx === i}
                              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                            >
                              {loadingId === meta.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <RotateCcw className="w-3 h-3" />}
                              Retake
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>

        ) : activeTab === 'Bookmarks' ? (
          /* ── Bookmarks view ── */
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-muted-foreground">{bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''}</p>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div className="flex flex-col gap-3 pb-6">
                {bookmarks.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-10">No bookmarks yet. Bookmark questions during review.</p>
                )}
                {bookmarks.map(bm => (
                  <div key={bm.questionId} className="border border-amber-400/20 rounded-md p-4 space-y-3">
                    {/* Header: exam name + date + delete */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Bookmark className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{bm.examName || 'Unknown exam'}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(bm.date)}</span>
                        <button
                          onClick={() => deleteBookmark(bm.questionId)}
                          title="Remove bookmark"
                          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-[#EF4444]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Question preview */}
                    <p className="text-sm text-foreground leading-relaxed">{bm.questionPreview}</p>

                    {/* Note editor */}
                    {editingNote === bm.questionId ? (
                      <div className="space-y-1.5">
                        <textarea
                          autoFocus
                          rows={2}
                          value={noteValues[bm.questionId] ?? bm.note}
                          onChange={e => setNoteValues(prev => ({ ...prev, [bm.questionId]: e.target.value }))}
                          className="w-full text-xs bg-muted rounded border border-border px-2 py-1.5 outline-none resize-none text-foreground placeholder:text-muted-foreground"
                          placeholder="Add a note…"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => { saveNote(bm.questionId, noteValues[bm.questionId] ?? ''); setEditingNote(null) }}
                            className="text-xs text-[#22C55E] hover:underline"
                          >Save</button>
                          <button onClick={() => setEditingNote(null)} className="text-xs text-muted-foreground hover:underline">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingNote(bm.questionId)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
                      >
                        {bm.note
                          ? <span className="italic text-amber-400/80">"{bm.note}"</span>
                          : <span className="opacity-50">+ add note</span>}
                      </button>
                    )}

                    {/* Open button */}
                    {bm.examName && catalog.some(e => e.name === bm.examName) && (
                      <div className="pt-1 border-t border-border">
                        <button
                          onClick={() => handleOpenBookmark(bm.questionId, bm.examName)}
                          disabled={openingBookmark === bm.questionId}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                        >
                          {openingBookmark === bm.questionId
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <ClipboardList className="w-3 h-3" />}
                          Open in Practice Mode
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* ── Normal exam list view ── */
          <>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  {filtered.length} exam{filtered.length !== 1 ? 's' : ''}
                  {' · '}{groups.length} subject{groups.length !== 1 ? 's' : ''}
                </p>

                <div ref={scrollRef} className="flex-1 overflow-y-auto">
                  <div className="flex flex-col gap-3 pb-6">
                    {groups.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-10">
                        No exams match your search.
                      </p>
                    )}

                    {groups.map(({ subject, exams }) => {
                      const isOpen = !collapsed.has(subject)
                      return (
                        <div key={subject} className="border border-border rounded-md overflow-hidden">
                          <button
                            onClick={() => toggleCollapse(subject)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-muted hover:bg-accent transition-colors text-left"
                          >
                            <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                              {subject}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{exams.length}</span>
                              {isOpen
                                ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                              }
                            </div>
                          </button>

                          {isOpen && (
                            <div className="flex flex-col divide-y divide-border">
                              {exams.map(exam => {
                                const attempted = attemptedNames.has(exam.name)
                                return (
                                  <button
                                    key={exam.id}
                                    onClick={() => handleSelect(exam)}
                                    disabled={loadingId === exam.id}
                                    className={`text-left px-4 py-2.5 hover:bg-accent transition-colors text-sm flex items-center justify-between gap-2 disabled:opacity-60 ${
                                      attempted ? 'text-[#22C55E]' : ''
                                    }`}
                                  >
                                    <span>{exam.name}</span>
                                    {loadingId === exam.id && (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground flex-shrink-0" />
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
