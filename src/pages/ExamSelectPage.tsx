import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, BookOpen, ChevronRight, Search, Loader2 } from 'lucide-react'
import { loadCatalog, loadExam } from '../data/examCatalog'
import type { ExamMeta } from '../data/examCatalog'
import type { ExamData } from '../types/exam'

interface Props {
  onSelect: (exam: ExamData) => void
}

export function ExamSelectPage({ onSelect }: Props) {
  const [catalog, setCatalog] = useState<ExamMeta[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  useEffect(() => {
    loadCatalog().then(c => { setCatalog(c); setLoading(false) })
  }, [])

  const filtered = catalog.filter(e =>
    e.name.toLowerCase().includes(filter.toLowerCase()) ||
    e.sectionNames.some(s => s.toLowerCase().includes(filter.toLowerCase()))
  )

  // Group by category
  const groups: Record<string, ExamMeta[]> = {}
  for (const exam of filtered) {
    let group = 'Other'
    if (exam.name.includes('GATE CSE')) group = 'GATE CSE — Original Papers'
    else if (exam.name.includes('GATE IT')) group = 'GATE IT — Original Papers'
    else if (exam.name.startsWith('GATE Overflow |')) group = 'GATE Overflow — Topic Tests'
    else if (exam.name.startsWith('GATEBOOK')) group = 'GATEBOOK 2019 — Topic Tests'
    else if (exam.name.includes('Mock GATE') || exam.name.includes('Grand Test')) group = 'Mock Tests'
    groups[group] = groups[group] || []
    groups[group].push(exam)
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
          <BookOpen className="w-4 h-4 text-foreground" />
        </div>
        <span className="font-semibold text-sm">Assessment Examination Center</span>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8 flex flex-col">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Select Examination</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? 'Loading...' : `${catalog.length} exams available`}
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by exam name or subject..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-1 px-1">
            <div className="space-y-6 pb-6">
              {Object.entries(groups).map(([groupName, exams]) => (
                <div key={groupName}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    {groupName} ({exams.length})
                  </p>
                  <div className="space-y-1.5">
                    {exams.map(exam => (
                      <Card
                        key={exam.id}
                        className="border-border hover:border-foreground/40 cursor-pointer transition-colors"
                        onClick={() => handleSelect(exam)}
                      >
                        <CardHeader className="py-3 px-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-sm font-medium truncate">{exam.name}</CardTitle>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {exam.durationMinutes} min
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {exam.totalQuestions} questions
                                </span>
                                {exam.sectionNames.map(s => (
                                  <Badge key={s} variant="outline" className="text-xs py-0 border-border text-muted-foreground">
                                    {s}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            {loadingId === exam.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                  <Separator className="mt-5" />
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-10">No exams match your search.</p>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
