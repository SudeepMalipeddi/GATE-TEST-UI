import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { BookOpen, Search, Loader2 } from 'lucide-react'
import { loadCatalog, loadExam } from '../data/examCatalog'
import type { ExamMeta } from '../data/examCatalog'
import type { ExamData } from '../types/exam'

interface Props {
  onSelect: (exam: ExamData) => void
}

// Year tabs shown — matching the original app's structure.
// 2020+ years are separate tabs; everything older is "Other".
const YEAR_TABS = ['2025', '2024', '2023', '2022', '2021', '2020', 'DA', 'Other'] as const
type YearTab = typeof YEAR_TABS[number]

function getYearTab(name: string): YearTab {
  // DA (Data Science & AI)
  if (/\bDA\b/.test(name)) return 'DA'
  // Extract 4-digit year
  const match = name.match(/20(\d{2})/)
  if (match) {
    const year = 2000 + parseInt(match[1])
    if (year >= 2020) return String(year) as YearTab
  }
  return 'Other'
}

export function ExamSelectPage({ onSelect }: Props) {
  const [catalog, setCatalog] = useState<ExamMeta[]>([])
  const [activeTab, setActiveTab] = useState<YearTab>('Other')
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  useEffect(() => {
    loadCatalog().then(c => {
      setCatalog(c)
      setLoading(false)
      // Auto-select first tab that has content
      for (const tab of YEAR_TABS) {
        if (c.some(e => getYearTab(e.name) === tab)) {
          setActiveTab(tab)
          break
        }
      }
    })
  }, [])

  // Tabs that actually have exams
  const populatedTabs = YEAR_TABS.filter(tab => catalog.some(e => getYearTab(e.name) === tab))

  // Exams for current tab, filtered by search
  const tabExams = catalog.filter(e => getYearTab(e.name) === activeTab)
  const filtered = filter.trim()
    ? tabExams.filter(e => e.name.toLowerCase().includes(filter.toLowerCase()))
    : tabExams

  const handleSelect = async (meta: ExamMeta) => {
    setLoadingId(meta.id)
    try {
      const exam = await loadExam(meta.id)
      onSelect(exam)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-md border border-border flex items-center justify-center">
          <BookOpen className="w-4 h-4" />
        </div>
        <span className="font-semibold text-sm">Assessment Examination Center</span>
      </header>

      {/* Year tabs — matches original layout */}
      <div className="border-b border-border px-4 flex items-center gap-1 overflow-x-auto">
        {loading
          ? YEAR_TABS.map(tab => (
              <button
                key={tab}
                disabled
                className="px-4 py-3 text-xs font-medium text-muted-foreground/40 border-b-2 border-transparent whitespace-nowrap"
              >
                {tab}
              </button>
            ))
          : populatedTabs.map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setFilter('') }}
                className={`px-4 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
                <span className="ml-1.5 text-muted-foreground font-normal">
                  ({catalog.filter(e => getYearTab(e.name) === tab).length})
                </span>
              </button>
            ))}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col px-6 py-5 max-w-5xl mx-auto w-full">
        {/* Search within tab */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={`Search in ${activeTab}...`}
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              {filtered.length} exam{filtered.length !== 1 ? 's' : ''}
              {filter && ` matching "${filter}"`}
            </p>
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pb-6">
                {filtered.map(exam => (
                  <button
                    key={exam.id}
                    onClick={() => handleSelect(exam)}
                    disabled={loadingId === exam.id}
                    className="text-left px-3 py-2.5 rounded border border-border hover:border-foreground/40 hover:bg-accent transition-colors text-sm font-medium flex items-center justify-between gap-2 disabled:opacity-60"
                  >
                    <span className="truncate">{exam.name}</span>
                    {loadingId === exam.id && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="col-span-full text-sm text-muted-foreground text-center py-10">
                    No exams match your search.
                  </p>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  )
}
