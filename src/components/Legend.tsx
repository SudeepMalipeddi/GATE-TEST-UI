const items = [
  { label: 'Not Visited', className: 'bg-white border-slate-300' },
  { label: 'Not Answered', className: 'bg-red-50 border-red-400' },
  { label: 'Answered', className: 'bg-green-500 border-green-600' },
  { label: 'Marked for Review', className: 'bg-violet-500 border-violet-600' },
  { label: 'Answered & Marked', className: 'bg-violet-700 border-violet-800' },
]

export function Legend() {
  return (
    <div className="p-3 border-t bg-slate-50">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Legend</p>
      <div className="space-y-1.5">
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded border flex-shrink-0 ${item.className}`} />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
