import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Search, Loader2, GraduationCap, BarChart2, BookOpen } from 'lucide-react'
import { loadCatalog } from '../data/examCatalog'
import type { ExamMeta } from '../data/examCatalog'

interface Props {
  open: boolean
  onClose: () => void
  onSelectExam: (id: string) => void
  onOpenNptel: () => void
  onOpenStats: () => void
}

export function CommandPalette({ open, onClose, onSelectExam, onOpenNptel, onOpenStats }: Props) {
  const [query, setQuery] = useState('')
  const [catalog, setCatalog] = useState<ExamMeta[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 50)
    if (loadedRef.current) return
    loadedRef.current = true
    setLoading(true)
    loadCatalog().then(c => { setCatalog(c); setLoading(false) })
  }, [open])

  const q = query.trim().toLowerCase()
  const examResults = q.length >= 1
    ? catalog.filter(e => e.name.toLowerCase().includes(q)).slice(0, 8)
    : []

  const staticItems = [
    { icon: GraduationCap, label: 'NPTEL Lectures', action: () => { onClose(); onOpenNptel() } },
    { icon: BarChart2,     label: 'Stats',           action: () => { onClose(); onOpenStats() } },
  ]

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          {loading
            ? <Loader2 className="w-4 h-4 text-muted-foreground animate-spin flex-shrink-0" />
            : <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search exams…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground font-mono">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto py-1">
          {q.length < 1 && (
            <>
              <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Navigate
              </p>
              {staticItems.map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </button>
              ))}

              {catalog.length > 0 && (
                <>
                  <div className="border-t border-border my-1" />
                  <p className="px-4 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Exams
                  </p>
                  {catalog.slice(0, 5).map(exam => (
                    <button
                      key={exam.id}
                      onClick={() => { onSelectExam(exam.id); onClose() }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-accent transition-colors"
                    >
                      <BookOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="flex-1 truncate">{exam.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{exam.totalQuestions}q</span>
                    </button>
                  ))}
                </>
              )}
            </>
          )}

          {q.length >= 1 && (
            <>
              {examResults.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No exams match "{query}"
                </p>
              )}
              {examResults.map(exam => (
                <button
                  key={exam.id}
                  onClick={() => { onSelectExam(exam.id); onClose() }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-accent transition-colors"
                >
                  <BookOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 truncate">{exam.name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{exam.totalQuestions}q</span>
                </button>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
