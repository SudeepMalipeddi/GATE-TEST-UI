import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, BookOpen, Zap, ClipboardList, Layers } from 'lucide-react'
import type { NptelCourseMeta, NptelWeek, NptelLectureMeta, NptelLectureData, ExamData } from '../types/exam'

interface Props {
  onBack: () => void
  onPractice: (exam: ExamData) => void
  onOpenLecture: (data: NptelLectureData, initialTab: 'notes' | 'flashcards' | 'questions') => void
}

// ── Data loading ───────────────────────────────────────────────────

async function loadCatalog(): Promise<NptelCourseMeta[]> {
  const r = await fetch('/nptel/catalog.json')
  return r.json()
}

async function loadStructure(courseId: string): Promise<NptelWeek[]> {
  const r = await fetch(`/nptel/${courseId}/structure.json`)
  return r.json()
}

async function loadLecture(courseId: string, file: string): Promise<NptelLectureData> {
  const r = await fetch(`/nptel/${courseId}/${file}`)
  return r.json()
}

// Sliding-window practice: load lectures in chunks of 3, stream forward
async function buildPracticeAllExam(
  courseId: string,
  subject: string,
  structure: NptelWeek[]
): Promise<ExamData> {
  // Collect all lecture files in order
  const allLectures: { week: NptelWeek; lec: NptelLectureMeta }[] = []
  for (const week of structure) {
    for (const lec of week.lectures) {
      allLectures.push({ week, lec })
    }
  }

  // Load first 3 lectures immediately; the rest are loaded lazily in PracticePage
  const WINDOW = 3
  const initial = allLectures.slice(0, WINDOW)
  const sections = await Promise.all(
    initial.map(async ({ week, lec }) => {
      const data = await loadLecture(courseId, lec.file)
      return {
        name: `${week.humanWeek} · ${lec.name}`,
        questions: data.questions,
        // metadata for lazy loading
        _nptelCourseId: courseId,
        _nptelFile: lec.file,
        _nptelWeekName: week.humanWeek,
        _nptelLecName: lec.name,
      }
    })
  )

  return {
    name: `NPTEL | ${subject} | All Questions`,
    durationMinutes: 0,
    sections,
    // Attach full manifest for the sliding window
    _nptelManifest: allLectures.map(({ week, lec }) => ({
      courseId,
      file: lec.file,
      weekName: week.humanWeek,
      lecName: lec.name,
    })),
  }
}

// ── Subject colour map ─────────────────────────────────────────────
const SUBJECT_COLOURS: Record<string, string> = {
  'Algorithms':            'bg-violet-500/15 text-violet-400 border-violet-500/30',
  'Computer Architecture': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'Computer Networks':     'bg-sky-500/15 text-sky-400 border-sky-500/30',
  'Databases':             'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Compiler Design':       'bg-rose-500/15 text-rose-400 border-rose-500/30',
  'C Programming':         'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'C++ Programming':       'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
}
function subjectChip(subject: string) {
  return SUBJECT_COLOURS[subject] ?? 'bg-muted text-muted-foreground border-border'
}

// ── Lecture row ────────────────────────────────────────────────────
function LectureRow({
  lec,
  courseId,
  onOpenLecture,
}: {
  lec: NptelLectureMeta
  courseId: string
  onOpenLecture: (data: NptelLectureData, tab: 'notes' | 'flashcards' | 'questions') => void
}) {
  const [loading, setLoading] = useState<'notes' | 'flashcards' | 'questions' | null>(null)

  const open = async (tab: 'notes' | 'flashcards' | 'questions') => {
    setLoading(tab)
    try {
      const data = await loadLecture(courseId, lec.file)
      onOpenLecture(data, tab)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-accent/40 transition-colors group">
      <span className="text-sm text-foreground/80 min-w-0 flex-1 truncate">{lec.name}</span>

      <div className="flex items-center gap-1 flex-shrink-0">
        {lec.hasNotes && (
          <button
            onClick={() => open('notes')}
            disabled={loading !== null}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border hover:border-sky-500/50 hover:text-sky-400 hover:bg-sky-500/10 transition-colors disabled:opacity-50"
            title="Read notes"
          >
            <BookOpen className="w-3 h-3" />
            {loading === 'notes' ? '…' : 'Notes'}
          </button>
        )}

        {lec.flashCount > 0 && (
          <button
            onClick={() => open('flashcards')}
            disabled={loading !== null}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border hover:border-violet-500/50 hover:text-violet-400 hover:bg-violet-500/10 transition-colors disabled:opacity-50"
            title={`${lec.flashCount} flashcards`}
          >
            <Zap className="w-3 h-3" />
            {loading === 'flashcards' ? '…' : `Flash (${lec.flashCount})`}
          </button>
        )}

        {lec.qCount > 0 && (
          <button
            onClick={() => open('questions')}
            disabled={loading !== null}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
            title={`${lec.qCount} practice questions`}
          >
            <ClipboardList className="w-3 h-3" />
            {loading === 'questions' ? '…' : `Practice (${lec.qCount})`}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Week accordion ─────────────────────────────────────────────────
function WeekSection({
  week,
  courseId,
  defaultOpen,
  onOpenLecture,
}: {
  week: NptelWeek
  courseId: string
  defaultOpen: boolean
  onOpenLecture: (data: NptelLectureData, tab: 'notes' | 'flashcards' | 'questions') => void
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2 bg-muted/40 hover:bg-muted/60 transition-colors text-sm font-medium"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {week.humanWeek}
        <span className="ml-auto text-xs text-muted-foreground">{week.lectures.length} lectures</span>
      </button>
      {open && (
        <div className="divide-y divide-border/50">
          {week.lectures.map(lec => (
            <LectureRow key={lec.id} lec={lec} courseId={courseId} onOpenLecture={onOpenLecture} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Course card ────────────────────────────────────────────────────
function CourseCard({
  course,
  onPractice,
  onOpenLecture,
}: {
  course: NptelCourseMeta
  onPractice: (exam: ExamData) => void
  onOpenLecture: (data: NptelLectureData, tab: 'notes' | 'flashcards' | 'questions') => void
}) {
  const [open, setOpen] = useState(false)
  const [structure, setStructure] = useState<NptelWeek[] | null>(null)
  const [loadingAll, setLoadingAll] = useState(false)
  const [loadingFlash, setLoadingFlash] = useState(false)

  const toggle = async () => {
    if (!open && !structure) {
      const s = await loadStructure(course.id)
      setStructure(s)
    }
    setOpen(o => !o)
  }

  const practiceAll = async () => {
    if (!structure) return
    setLoadingAll(true)
    try {
      const exam = await buildPracticeAllExam(course.id, course.subject, structure)
      onPractice(exam)
    } finally {
      setLoadingAll(false)
    }
  }

  const allFlashcards = async () => {
    if (!structure) return
    setLoadingFlash(true)
    try {
      // Load all flashcards for the course
      const allCards: NptelLectureData['flashcards'] = []
      for (const week of structure) {
        for (const lec of week.lectures) {
          const data = await loadLecture(course.id, lec.file)
          allCards.push(...data.flashcards)
        }
      }
      // Shuffle
      for (let i = allCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[allCards[i], allCards[j]] = [allCards[j], allCards[i]]
      }
      // Open as a flashcard-only lecture view
      const syntheticData: NptelLectureData = {
        course_id: course.id,
        week: '',
        lecture_id: '__all__',
        lecture_name: `All ${course.subject} Flashcards`,
        notes: null,
        flashcards: allCards,
        questions: [],
      }
      onOpenLecture(syntheticData, 'flashcards')
    } finally {
      setLoadingFlash(false)
    }
  }

  const chipClass = `text-xs px-2 py-0.5 rounded-full border font-medium ${subjectChip(course.subject)}`

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card">
        <button
          onClick={toggle}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          {open ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
          <span className="font-medium text-sm truncate">{course.subject}</span>
          <span className={chipClass}>{course.id}</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
          <span>{course.lectureCount} lectures</span>
          <span>·</span>
          <span>{course.questionCount.toLocaleString()} Qs</span>
          <span>·</span>
          <span>{course.flashcardCount.toLocaleString()} cards</span>
        </div>

        {open && structure && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={allFlashcards}
              disabled={loadingFlash}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-border hover:border-violet-500/50 hover:text-violet-400 hover:bg-violet-500/10 transition-colors disabled:opacity-50"
            >
              <Zap className="w-3 h-3" />
              {loadingFlash ? 'Loading…' : 'All Flashcards'}
            </button>
            <button
              onClick={practiceAll}
              disabled={loadingAll}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-border hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
            >
              <Layers className="w-3 h-3" />
              {loadingAll ? 'Loading…' : 'Practice All'}
            </button>
          </div>
        )}
      </div>

      {/* Weeks */}
      {open && structure && (
        <div className="divide-y divide-border/50 border-t border-border">
          {structure.map((week, i) => (
            <WeekSection
              key={week.week}
              week={week}
              courseId={course.id}
              defaultOpen={i === 0}
              onOpenLecture={onOpenLecture}
            />
          ))}
        </div>
      )}

      {open && !structure && (
        <div className="px-4 py-6 text-sm text-muted-foreground text-center">Loading…</div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────
export function NptelPage({ onBack, onPractice, onOpenLecture }: Props) {
  const [catalog, setCatalog] = useState<NptelCourseMeta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCatalog().then(c => { setCatalog(c); setLoading(false) })
  }, [])

  // Group by subject to merge courses with the same subject (e.g., two CN courses)
  const grouped = catalog.reduce<Record<string, NptelCourseMeta[]>>((acc, c) => {
    ;(acc[c.subject] ??= []).push(c)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>
        <div>
          <h1 className="text-lg font-semibold">NPTEL Practice</h1>
          <p className="text-xs text-muted-foreground">
            {loading ? 'Loading…' : `${catalog.length} courses · ${catalog.reduce((s, c) => s + c.questionCount, 0).toLocaleString()} questions · ${catalog.reduce((s, c) => s + c.flashcardCount, 0).toLocaleString()} flashcards`}
          </p>
        </div>
      </div>

      {/* Course list */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {loading && (
          <div className="text-center py-12 text-muted-foreground">Loading courses…</div>
        )}
        {Object.entries(grouped).map(([, courses]) =>
          courses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              onPractice={onPractice}
              onOpenLecture={onOpenLecture}
            />
          ))
        )}
      </div>
    </div>
  )
}
