import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { ExamData } from '../types/exam'

interface Props {
  exam: ExamData
}

export function ExamHeader({ exam }: Props) {
  const initials = exam.candidateName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()

  return (
    <header className="fixed top-0 inset-x-0 h-[60px] bg-primary z-50 flex items-center px-4 gap-4 shadow-md">
      {/* Logo */}
      <div className="bg-white rounded-lg p-1.5 flex-shrink-0">
        <div className="w-10 h-8 bg-primary rounded flex items-center justify-center">
          <span className="text-white font-bold text-xs">AEC</span>
        </div>
      </div>

      {/* Exam name */}
      <span className="text-yellow-300 font-bold text-base truncate flex-1">
        {exam.name}
      </span>

      {/* Candidate info */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-white text-xs font-medium">{exam.candidateName}</p>
          <p className="text-blue-200 text-xs">{exam.candidateId}</p>
        </div>
        <Avatar className="w-9 h-9 border-2 border-white/30">
          <AvatarFallback className="bg-blue-700 text-white text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
