import type { ExamData } from '../types/exam'

interface Props {
  exam: ExamData
}

export function ExamHeader({ exam }: Props) {
  return (
    <header className="fixed top-0 inset-x-0 h-[60px] bg-primary z-50 flex items-center px-4 gap-4 shadow-md">
      {/* Logo */}
      <div className="bg-white rounded-lg p-1.5 flex-shrink-0">
        <div className="w-10 h-8 bg-primary rounded flex items-center justify-center">
          <span className="text-white font-bold text-xs">AEC</span>
        </div>
      </div>

      {/* Exam name */}
      <span className="text-yellow-300 font-bold text-base truncate">
        {exam.name}
      </span>
    </header>
  )
}
