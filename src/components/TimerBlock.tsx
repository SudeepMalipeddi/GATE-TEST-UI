import { Clock } from 'lucide-react'

interface Props {
  secondsRemaining: number
}

export function TimerBlock({ secondsRemaining }: Props) {
  const h = Math.floor(secondsRemaining / 3600)
  const m = Math.floor((secondsRemaining % 3600) / 60)
  const s = secondsRemaining % 60

  const pad = (n: number) => String(n).padStart(2, '0')
  const timeStr = `${pad(h)}:${pad(m)}:${pad(s)}`

  const isLow = secondsRemaining < 300 // < 5 min

  return (
    <div className={`flex items-center gap-3 p-3 ${isLow ? 'bg-red-600' : 'bg-primary'} text-white`}>
      <Clock className="w-5 h-5 opacity-80 flex-shrink-0" />
      <div>
        <p className="text-xs opacity-75 leading-none mb-0.5">Time Remaining</p>
        <p className={`text-xl font-mono font-bold tabular-nums leading-none ${isLow ? 'animate-pulse' : ''}`}>
          {timeStr}
        </p>
      </div>
    </div>
  )
}
