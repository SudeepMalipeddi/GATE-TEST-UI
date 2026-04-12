import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Bookmark, Trash2 } from 'lucide-react'

interface Props {
  onPrev: () => void
  onClear: () => void
  onMarkReview: () => void
  onSaveNext: () => void
  hasPrev: boolean
  hasNext: boolean
  hasAnswer: boolean
}

export function ActionBar({ onPrev, onClear, onMarkReview, onSaveNext, hasPrev, hasNext, hasAnswer }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-4 mt-4 border-t">
      {hasAnswer && (
        <Button variant="outline" size="sm" onClick={onClear} className="gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive">
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </Button>
      )}

      <div className="flex gap-2 ml-auto">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={!hasPrev} className="gap-1">
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <Button variant="secondary" size="sm" onClick={onMarkReview} className="gap-1.5">
          <Bookmark className="w-3.5 h-3.5" />
          Mark & Next
        </Button>

        <Button size="sm" onClick={onSaveNext} disabled={!hasNext && !hasAnswer} className="gap-1">
          Save & Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
