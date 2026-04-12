import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function Calculator({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[420px] max-w-[95vw] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="text-sm">Scientific Calculator</DialogTitle>
        </DialogHeader>
        <iframe
          src="https://www.tcsion.com/OnlineAssessment/ScientificCalculator/Calculator.html#nogo"
          title="Scientific Calculator"
          className="w-full border-0"
          style={{ height: '360px' }}
          sandbox="allow-scripts allow-same-origin"
        />
      </DialogContent>
    </Dialog>
  )
}
