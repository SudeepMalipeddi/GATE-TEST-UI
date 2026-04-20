import { useState, useEffect } from 'react'
import { Pencil, X, Check } from 'lucide-react'
import type { Question } from '../types/exam'
import { getOverride, setOverride, removeOverride, effectiveAnswer } from '../lib/answerOverrides'

interface Props {
  question: Question
  examId?: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function FixAnswerPanel({ question, examId }: Props) {
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState<string | string[]>('')
  const [hasOverride, setHasOverride] = useState(() => !!getOverride(question.id))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  useEffect(() => {
    setEditing(false)
    setHasOverride(!!getOverride(question.id))
    setSaveStatus('idle')
  }, [question.id])

  const openEditor = () => {
    setEditVal(effectiveAnswer(question.id, question.correctAnswer))
    setEditing(true)
  }

  const saveEdit = async () => {
    const isEmpty = !editVal || editVal === '' || (Array.isArray(editVal) && editVal.length === 0)
    if (isEmpty) return
    // Always write to localStorage immediately
    setOverride(question.id, editVal)
    setHasOverride(true)
    setEditing(false)

    // Also patch the JSON file if we know which exam this belongs to
    if (examId) {
      setSaveStatus('saving')
      try {
        const res = await fetch('/api/patch-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ examId, questionId: question.id, answer: editVal }),
        })
        setSaveStatus(res.ok ? 'saved' : 'error')
        if (res.ok) setTimeout(() => setSaveStatus('idle'), 2500)
      } catch {
        setSaveStatus('error')
      }
    }
  }

  const clearEdit = () => {
    removeOverride(question.id)
    setHasOverride(false)
    setEditing(false)
    setSaveStatus('idle')
  }

  const toggleMsqOption = (optId: string) => {
    setEditVal(prev => {
      const arr = Array.isArray(prev) ? [...prev] : []
      return arr.includes(optId) ? arr.filter(x => x !== optId) : [...arr, optId]
    })
  }

  return (
    <div className="border-t border-border pt-3 mt-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">
          {hasOverride
            ? <span className="text-amber-400 font-medium">Correct answer overridden</span>
            : <span>Correct answer incorrect or missing?</span>}
        </p>
        <div className="flex items-center gap-1.5">
          {saveStatus === 'saving' && (
            <span className="text-[10px] text-muted-foreground animate-pulse">Saving to file…</span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-0.5 text-[10px] text-[#22C55E]">
              <Check className="w-3 h-3" /> Saved to file
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-[10px] text-[#EF4444]">File write failed</span>
          )}
          {hasOverride && !editing && (
            <button
              onClick={clearEdit}
              title="Remove override"
              className="p-1 rounded text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={editing ? () => setEditing(false) : openEditor}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors ${
              editing
                ? 'text-amber-400 bg-amber-400/10 border-amber-400/30'
                : 'text-muted-foreground border-border hover:text-amber-400 hover:border-amber-400/40 hover:bg-amber-400/10'
            }`}
          >
            <Pencil className="w-3 h-3" />
            {editing ? 'Cancel' : 'Fix answer'}
          </button>
        </div>
      </div>

      {editing && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 space-y-3">
          <p className="text-xs font-semibold text-amber-400">Set correct answer</p>

          {question.type === 'MCQ' && (
            <div className="flex flex-wrap gap-2">
              {question.options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setEditVal(opt.id)}
                  className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                    editVal === opt.id
                      ? 'border-amber-400/60 bg-amber-400/15 text-amber-400'
                      : 'border-border hover:border-amber-400/40 hover:text-amber-400'
                  }`}
                >
                  {opt.id.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {question.type === 'MSQ' && (
            <div className="flex flex-wrap gap-2">
              {question.options.map(opt => {
                const sel = Array.isArray(editVal) && editVal.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleMsqOption(opt.id)}
                    className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                      sel
                        ? 'border-amber-400/60 bg-amber-400/15 text-amber-400'
                        : 'border-border hover:border-amber-400/40 hover:text-amber-400'
                    }`}
                  >
                    {opt.id.toUpperCase()}
                  </button>
                )
              })}
            </div>
          )}

          {question.type === 'NAT' && (
            <input
              type="text"
              value={typeof editVal === 'string' ? editVal : ''}
              onChange={e => setEditVal(e.target.value)}
              placeholder="e.g. 42 or 40:44 for range"
              className="w-full max-w-xs bg-background border border-border rounded px-3 py-1.5 text-sm outline-none focus:border-amber-400/60"
            />
          )}

          <div className="flex gap-2">
            <button
              onClick={saveEdit}
              disabled={!editVal || editVal === '' || (Array.isArray(editVal) && editVal.length === 0)}
              className="px-3 py-1.5 text-xs rounded bg-amber-400 text-black font-semibold hover:bg-amber-300 transition-colors disabled:opacity-40"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 text-xs rounded border border-border hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
