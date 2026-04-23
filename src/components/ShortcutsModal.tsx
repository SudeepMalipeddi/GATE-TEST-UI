import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export interface ShortcutItem {
  key: string
  desc: string
}

export interface ShortcutCategory {
  category: string
  items: ShortcutItem[]
}

interface Props {
  open: boolean
  onClose: () => void
  shortcuts: ShortcutCategory[]
}

export function ShortcutsModal({ open, onClose, shortcuts }: Props) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {shortcuts.map(({ category, items }) => (
            <div key={category}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {category}
              </p>
              <div className="space-y-2">
                {items.map(({ key, desc }) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <span className="text-xs text-muted-foreground">{desc}</span>
                    <kbd className="flex-shrink-0 px-2 py-0.5 rounded border border-border bg-muted text-foreground font-mono text-[10px] whitespace-nowrap">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
