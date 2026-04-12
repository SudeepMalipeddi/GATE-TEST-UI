import { Clock } from 'lucide-react'

interface Props {
  secondsRemaining: number
}

export function TimerBlock({ secondsRemaining }: Props) {
  const h = Math.floor(secondsRemaining / 3600)
  const m = Math.floor((secondsRemaining % 3600) / 60)
  const s = secondsRemaining % 60
  const pad = (n: number) => String(n).padStart(2, '0')

  const isLow = secondsRemaining < 300

  return (
    <div className="flex items-center gap-3 p-4 border-b border-border">
      <Clock className={`w-4 h-4 flex-shrink-0 ${isLow ? 'text-red-500' : 'text-muted-foreground'}`} />
      <div>
        <p className="text-xs text-muted-foreground leading-none mb-1">Time Remaining</p>
        <p className={`text-xl font-mono font-bold tabular-nums leading-none ${isLow ? 'text-red-500 animate-pulse' : 'text-foreground'}`}>
          {pad(h)}:{pad(m)}:{pad(s)}
        </p>
      </div>
    </div>
  )
}
