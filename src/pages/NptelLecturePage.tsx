import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import type { NptelLectureData, NptelFlashcard, ExamData } from '../types/exam'
import { FlashcardDeck } from '../components/FlashcardDeck'
import { AskAI } from '../components/AskAI'

type Tab = 'notes' | 'flashcards' | 'questions'

interface Props {
  data: NptelLectureData
  initialTab: Tab
  onBack: () => void
  onPractice: (exam: ExamData) => void
  onNextLecture?: (() => Promise<void>) | null
  onPrevLecture?: (() => Promise<void>) | null
}

function buildSingleLectureExam(data: NptelLectureData): ExamData {
  return {
    name: `NPTEL | ${data.lecture_name}`,
    durationMinutes: 0,
    sections: [{ name: data.lecture_name, questions: data.questions }],
  }
}

// ── Notes tab ─────────────────────────────────────────────────────
function NotesTab({ notes, lectureId, lectureName }: { notes: string; lectureId: string; lectureName: string }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false }]]}
        components={{
          h1: ({ children }) => <h1 className="text-2xl font-bold mt-8 mb-4 text-foreground border-b border-border pb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-semibold mt-6 mb-3 text-foreground">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold mt-4 mb-2 text-foreground">{children}</h3>,
          p:  ({ children }) => <p className="text-sm leading-7 mb-4 text-foreground/90">{children}</p>,
          ul: ({ children }) => <ul className="space-y-1.5 mb-4 text-sm text-foreground/90">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-outside pl-5 space-y-1.5 mb-4 text-sm text-foreground/90">{children}</ol>,
          li: ({ children }) => {
            const arr = Array.isArray(children) ? children as React.ReactNode[] : [children]
            const isTask = arr.some(c => c !== null && typeof c === 'object' && 'props' in (c as object) && (c as { props?: { type?: string } }).props?.type === 'checkbox')
            if (isTask) return <li className="leading-relaxed list-none">{children}</li>
            return (
              <li className="leading-relaxed flex gap-2 list-none">
                <span className="text-muted-foreground/40 flex-shrink-0 select-none mt-[3px] text-xs">•</span>
                <span className="flex-1">{children}</span>
              </li>
            )
          },
          input: ({ type, checked }) => type === 'checkbox' ? (
            <span className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded-sm border text-[11px] align-middle mr-1.5 flex-shrink-0 ${checked ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400' : 'border-border bg-muted/30'}`}>
              {checked ? '✓' : ''}
            </span>
          ) : <input type={type} />,
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-')
            return isBlock
              ? <code className="block bg-muted rounded-md px-4 py-3 text-sm font-mono overflow-x-auto mb-4 text-foreground">{children}</code>
              : <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-mono text-foreground">{children}</code>
          },
          pre: ({ children }) => <pre className="mb-4">{children}</pre>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-primary/40 pl-4 italic text-muted-foreground my-4">{children}</blockquote>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          table: ({ children }) => <div className="overflow-x-auto mb-4"><table className="w-full text-sm border-collapse">{children}</table></div>,
          th: ({ children }) => <th className="border border-border px-3 py-2 bg-muted font-semibold text-left">{children}</th>,
          td: ({ children }) => <td className="border border-border px-3 py-2">{children}</td>,
          hr: () => <hr className="border-border my-6" />,
        }}
      >
        {notes}
      </ReactMarkdown>

      <div className="mt-8 border-t border-border pt-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ask AI about these notes</p>
        <AskAI notesContext={{ id: lectureId, title: lectureName, content: notes }} />
      </div>
    </div>
  )
}

// ── Flashcards tab ─────────────────────────────────────────────────
function FlashcardsTab({
  cards,
  onNextLecture,
  onPrevLecture,
}: {
  cards: NptelFlashcard[]
  onNextLecture?: (() => Promise<void>) | null
  onPrevLecture?: (() => Promise<void>) | null
}) {
  if (cards.length === 0) {
    return <div className="py-12 text-center text-muted-foreground">No flashcards for this lecture.</div>
  }
  return <FlashcardDeck cards={cards} onNextLecture={onNextLecture} onPrevLecture={onPrevLecture} />
}

// ── Questions tab ──────────────────────────────────────────────────
function QuestionsTab({ data, onPractice }: { data: NptelLectureData; onPractice: (e: ExamData) => void }) {
  if (data.questions.length === 0) {
    return <div className="py-12 text-center text-muted-foreground">No practice questions for this lecture.</div>
  }
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <p className="text-muted-foreground text-sm">{data.questions.length} practice questions</p>
      <button
        onClick={() => onPractice(buildSingleLectureExam(data))}
        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
      >
        Start Practice
      </button>
    </div>
  )
}

// ── Header prev/next ───────────────────────────────────────────────
function HeaderLectureNav({
  onPrev,
  onNext,
}: {
  onPrev?: (() => Promise<void>) | null
  onNext?: (() => Promise<void>) | null
}) {
  const [loadingPrev, setLoadingPrev] = useState(false)
  const [loadingNext, setLoadingNext] = useState(false)
  if (!onPrev && !onNext) return null
  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <button
        disabled={!onPrev || loadingPrev}
        onClick={async () => { if (!onPrev) return; setLoadingPrev(true); await onPrev(); setLoadingPrev(false) }}
        className="px-2.5 py-1 text-xs rounded border border-border hover:bg-accent transition-colors disabled:opacity-40"
        title="Previous lecture"
      >
        {loadingPrev ? '…' : '← Prev'}
      </button>
      <button
        disabled={!onNext || loadingNext}
        onClick={async () => { if (!onNext) return; setLoadingNext(true); await onNext(); setLoadingNext(false) }}
        className="px-2.5 py-1 text-xs rounded border border-border hover:bg-accent transition-colors disabled:opacity-40"
        title="Next lecture"
      >
        {loadingNext ? '…' : 'Next →'}
      </button>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────
export function NptelLecturePage({ data, initialTab, onBack, onPractice, onNextLecture, onPrevLecture }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab)

  const tabs: { id: Tab; label: string; disabled: boolean }[] = [
    { id: 'notes',      label: 'Notes',       disabled: !data.notes },
    { id: 'flashcards', label: `Flashcards (${data.flashcards.length})`, disabled: data.flashcards.length === 0 },
    { id: 'questions',  label: `Questions (${data.questions.length})`,   disabled: data.questions.length === 0 },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          ← Back
        </button>
        <h1 className="text-sm font-medium truncate flex-1 min-w-0">{data.lecture_name}</h1>
        <HeaderLectureNav onPrev={onPrevLecture} onNext={onNextLecture} />
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-card px-6 flex gap-1 flex-shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => !t.disabled && setTab(t.id)}
            disabled={t.disabled}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-primary text-foreground'
                : t.disabled
                  ? 'border-transparent text-muted-foreground/40 cursor-not-allowed'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {tab === 'notes'      && data.notes      && <NotesTab notes={data.notes} lectureId={data.lecture_name} lectureName={data.lecture_name} />}
        {tab === 'flashcards' && <FlashcardsTab cards={data.flashcards} onNextLecture={onNextLecture} onPrevLecture={onPrevLecture} />}
        {tab === 'questions'  && <QuestionsTab data={data} onPractice={onPractice} />}
      </div>
    </div>
  )
}
