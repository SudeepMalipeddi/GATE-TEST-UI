import { useState, useEffect } from 'react'
import { List, Layers } from 'lucide-react'
import type { NptelFlashcard } from '../types/exam'

interface Props {
  cards: NptelFlashcard[]
  onDone?: () => void
  onNextLecture?: (() => Promise<void>) | null
  onPrevLecture?: (() => Promise<void>) | null
}

const DIFFICULTY_COLOURS: Record<string, string> = {
  Easy:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Hard:   'bg-rose-500/15 text-rose-400 border-rose-500/30',
}

// ── List view ──────────────────────────────────────────────────────
function FlashcardList({ cards }: { cards: NptelFlashcard[] }) {
  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-4">
      {cards.map((card, i) => {
        const diffClass = DIFFICULTY_COLOURS[card.difficulty] ?? 'bg-muted text-muted-foreground border-border'
        return (
          <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Meta row */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/60 bg-muted/30">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${diffClass}`}>
                {card.difficulty}
              </span>
              <span className="text-xs text-muted-foreground border border-border px-2 py-0.5 rounded-full ml-auto">
                {card.topic}
              </span>
            </div>
            {/* Question */}
            <div className="px-4 py-3">
              <p className="text-sm font-medium leading-relaxed">{card.front}</p>
            </div>
            {/* Answer */}
            <div className="px-4 py-3 border-t border-border/60 bg-primary/5">
              <p className="text-xs font-semibold text-primary/70 uppercase tracking-wide mb-1">Answer</p>
              <p className="text-sm leading-relaxed text-foreground/90">{card.back}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function FlashcardDeck({ cards, onDone, onNextLecture, onPrevLecture }: Props) {
  const [index, setIndex]       = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [known, setKnown]       = useState<Set<number>>(new Set())
  const [review, setReview]     = useState<Set<number>>(new Set())
  const [done, setDone]         = useState(false)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [loadingNext, setLoadingNext] = useState(false)
  const [loadingPrev, setLoadingPrev] = useState(false)

  const card = cards[index]
  const total = cards.length
  const progress = Math.round(((known.size + review.size) / total) * 100)

  const advance = () => {
    setRevealed(false)
    if (index + 1 >= total) {
      setDone(true)
    } else {
      setIndex(i => i + 1)
    }
  }

  const markKnown = () => {
    setKnown(s => new Set(s).add(index))
    review.delete(index)
    setReview(new Set(review))
    advance()
  }

  const markReview = () => {
    setReview(s => new Set(s).add(index))
    known.delete(index)
    setKnown(new Set(known))
    advance()
  }

  useEffect(() => {
    if (done || viewMode === 'list') return
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        if (!revealed) setRevealed(true)
        else markKnown()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (revealed) markKnown()
        else advance()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (index > 0) { setRevealed(false); setIndex(i => i - 1) }
      } else if ((e.key === 'r' || e.key === 'R') && revealed) {
        e.preventDefault()
        markReview()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done, viewMode, revealed, index]) // eslint-disable-line react-hooks/exhaustive-deps

  const restart = () => {
    setIndex(0)
    setRevealed(false)
    setKnown(new Set())
    setReview(new Set())
    setDone(false)
  }

  // ── List view toggle ───────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card flex-shrink-0">
          <span className="text-xs text-muted-foreground">{cards.length} cards</span>
          <button
            onClick={() => setViewMode('card')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-border hover:bg-accent transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            Card mode
          </button>
        </div>
        <FlashcardList cards={cards} />
      </div>
    )
  }

  // ── Summary screen ─────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 gap-6">
        <h2 className="text-xl font-semibold">Deck complete!</h2>
        <div className="flex gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-emerald-400">{known.size}</div>
            <div className="text-sm text-muted-foreground mt-1">Got it</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-rose-400">{review.size}</div>
            <div className="text-sm text-muted-foreground mt-1">Review again</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground">{total}</div>
            <div className="text-sm text-muted-foreground mt-1">Total</div>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          {onPrevLecture && (
            <button
              disabled={loadingPrev}
              onClick={async () => { setLoadingPrev(true); await onPrevLecture(); setLoadingPrev(false) }}
              className="px-4 py-2 text-sm rounded border border-border hover:bg-accent transition-colors disabled:opacity-60"
            >
              ← {loadingPrev ? 'Loading…' : 'Prev Lecture'}
            </button>
          )}
          {review.size > 0 && (
            <button
              onClick={restart}
              className="px-4 py-2 text-sm rounded border border-border hover:bg-accent transition-colors"
            >
              Retry missed ({review.size})
            </button>
          )}
          <button
            onClick={restart}
            className="px-4 py-2 text-sm rounded border border-border hover:bg-accent transition-colors"
          >
            Restart deck
          </button>
          {onNextLecture && (
            <button
              disabled={loadingNext}
              onClick={async () => { setLoadingNext(true); await onNextLecture(); setLoadingNext(false) }}
              className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {loadingNext ? 'Loading…' : 'Next Lecture →'}
            </button>
          )}
          {onDone && (
            <button
              onClick={onDone}
              className="px-4 py-2 text-sm rounded border border-border hover:bg-accent transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Card ───────────────────────────────────────────────────────
  const diffClass = DIFFICULTY_COLOURS[card.difficulty] ?? 'bg-muted text-muted-foreground border-border'

  return (
    <div className="flex flex-col px-4 py-8 gap-4 max-w-2xl mx-auto w-full">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {index + 1} / {total}
        </span>
        <button
          onClick={() => setViewMode('list')}
          title="View all cards"
          className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
        >
          <List className="w-3.5 h-3.5" />
          List
        </button>
      </div>

      {/* Question card */}
      <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${diffClass}`}>
            {card.difficulty}
          </span>
          <span className="text-xs text-muted-foreground border border-border px-2 py-0.5 rounded-full">
            {card.topic}
          </span>
        </div>
        <p className="text-base font-medium leading-relaxed">{card.front}</p>
      </div>

      {/* Answer (revealed inline) */}
      {revealed ? (
        <div className="rounded-xl border border-primary/40 bg-card p-6">
          <p className="text-sm leading-relaxed text-foreground/90">{card.back}</p>
        </div>
      ) : (
        <button
          onClick={() => setRevealed(true)}
          className="w-full py-3 text-sm rounded-xl border border-border hover:bg-accent transition-colors font-medium"
        >
          Show Answer
        </button>
      )}

      {/* Action buttons */}
      {revealed ? (
        <div className="flex gap-3 justify-center">
          <button
            onClick={markReview}
            className="flex items-center gap-2 px-5 py-2 rounded-lg border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 transition-colors text-sm font-medium"
          >
            ✗ Review again
          </button>
          <button
            onClick={markKnown}
            className="flex items-center gap-2 px-5 py-2 rounded-lg border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-colors text-sm font-medium"
          >
            ✓ Got it
          </button>
        </div>
      ) : (
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setRevealed(false); setIndex(i => Math.max(0, i - 1)) }}
            disabled={index === 0}
            className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-40"
          >
            ← Prev
          </button>
          <button
            onClick={advance}
            disabled={index + 1 >= total}
            className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-40"
          >
            Skip →
          </button>
        </div>
      )}
    </div>
  )
}
