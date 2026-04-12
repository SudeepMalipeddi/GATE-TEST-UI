const items = [
  { label: 'Not Visited',      cls: 'status-not-visited' },
  { label: 'Not Answered',     cls: 'status-not-answered' },
  { label: 'Answered',         cls: 'status-answered' },
  { label: 'Marked for Review',cls: 'status-review' },
  { label: 'Answered & Marked',cls: 'status-review-answered' },
]

export function Legend() {
  return (
    <div className="p-3 border-t border-border">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Legend</p>
      <div className="space-y-1.5">
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-sm flex-shrink-0 ${item.cls}`} />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
