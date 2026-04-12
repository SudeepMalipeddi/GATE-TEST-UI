import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { BookOpen, Search, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { loadCatalog, loadExam } from '../data/examCatalog'
import type { ExamMeta } from '../data/examCatalog'
import type { ExamData } from '../types/exam'

interface Props {
  onSelect: (exam: ExamData) => void
}

const YEAR_TABS = ['2026', '2025', '2024', '2023', '2022', '2021', '2020', 'DA', 'Other'] as const
type YearTab = typeof YEAR_TABS[number]

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

  // "X | Weekly Quiz N | Topic" → use the topic (parts[2])
  if (/^Weekly Quiz/i.test(second) && parts[2]) {
    // Topic might be "Propositional Logic" or "Relational Model | DBMS" — take the first segment
    return normalizeSubject(parts[2].split('|')[0])
  }

  return normalizeSubject(second)
}

export function ExamSelectPage({ onSelect }: Props) {
  const [catalog, setCatalog] = useState<ExamMeta[]>([])
  const [activeTab, setActiveTab] = useState<YearTab>('Other')
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadCatalog().then(c => {
      setCatalog(c)
      setLoading(false)
      for (const tab of YEAR_TABS) {
        if (c.some(e => getYearTab(e.name) === tab)) {
          setActiveTab(tab)
          break
        }
      }
    })
  }, [])

  // Reset collapsed state when switching tabs
  const switchTab = (tab: YearTab) => {
    setActiveTab(tab)
    setFilter('')
    setCollapsed(new Set())
  }

  const populatedTabs = YEAR_TABS.filter(tab => catalog.some(e => getYearTab(e.name) === tab))

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-md border border-border flex items-center justify-center">
          <BookOpen className="w-4 h-4" />
        </div>
        <span className="font-semibold text-sm">Assessment Examination Center</span>
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
                  ({catalog.filter(e => getYearTab(e.name) === tab).length})
                </span>
              </button>
            ))}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col px-6 py-5 max-w-5xl mx-auto w-full">
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
              {' · '}{groups.length} subject{groups.length !== 1 ? 's' : ''}
            </p>

            <ScrollArea className="flex-1">
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
                      {/* Subject header */}
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

                      {/* Exam list */}
                      {isOpen && (
                        <div className="flex flex-col divide-y divide-border">
                          {exams.map(exam => (
                            <button
                              key={exam.id}
                              onClick={() => handleSelect(exam)}
                              disabled={loadingId === exam.id}
                              className="text-left px-4 py-2.5 hover:bg-accent transition-colors text-sm flex items-center justify-between gap-2 disabled:opacity-60"
                            >
                              <span>{exam.name}</span>
                              {loadingId === exam.id && (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground flex-shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  )
}
