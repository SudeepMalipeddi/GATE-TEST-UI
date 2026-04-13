import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Send, Trash2, Key } from 'lucide-react'
import type { Question } from '../types/exam'

interface Props {
  question: Question
}

interface Message {
  role: 'user' | 'model'
  text: string
}

const STORAGE_KEY = 'gemini_api_key'
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildSystemContext(question: Question): string {
  const questionText = stripHtml(question.text)
  const correct = Array.isArray(question.correctAnswer)
    ? question.correctAnswer.join(', ')
    : String(question.correctAnswer)

  return `You are a concise GATE CS exam tutor. A student is reviewing an exam question and wants help understanding it.

Question:
${questionText}

Correct answer: ${correct}

Explain clearly why the answer is correct. For follow-up questions, answer them directly. Keep explanations brief and precise. Do not use markdown formatting — respond in plain text.`
}

export function AskAI({ question }: Props) {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(STORAGE_KEY) ?? '')
  const [keyInput, setKeyInput] = useState('')
  const [showKeySetup, setShowKeySetup] = useState(!localStorage.getItem(STORAGE_KEY))
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Reset conversation when question changes
  useEffect(() => {
    setMessages([])
    setError(null)
  }, [question.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const saveKey = () => {
    const trimmed = keyInput.trim()
    if (!trimmed) return
    localStorage.setItem(STORAGE_KEY, trimmed)
    setApiKey(trimmed)
    setShowKeySetup(false)
    setKeyInput('')
  }

  const ask = async () => {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    setError(null)

    const userMsg: Message = { role: 'user', text: q }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setLoading(true)

    try {
      // Build contents array: system context as first user turn, then conversation
      const contents = [
        { role: 'user', parts: [{ text: buildSystemContext(question) }] },
        { role: 'model', parts: [{ text: 'Understood. I am ready to help explain this question.' }] },
        ...nextMessages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }],
        })),
      ]

      const res = await fetch(`${API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = data?.error?.message ?? `API error ${res.status}`
        // Invalid key hint
        if (res.status === 400 || res.status === 403) {
          setError(`${msg} — check your API key.`)
        } else {
          setError(msg)
        }
        setMessages(prev => prev.slice(0, -1)) // remove optimistic user msg
        setInput(q)
        return
      }

      const data = await res.json()
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response received.'
      setMessages(prev => [...prev, { role: 'model', text: reply }])
    } catch (e) {
      setError('Network error. Check your connection.')
      setMessages(prev => prev.slice(0, -1))
      setInput(q)
    } finally {
      setLoading(false)
    }
  }

  if (showKeySetup) {
    return (
      <div className="border border-border rounded-lg p-4 bg-muted/40 space-y-3">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Set up AI assistance</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Get a free Gemini API key at{' '}
          <a href="https://ai.google.dev" target="_blank" rel="noreferrer"
            className="underline underline-offset-2 hover:text-foreground">
            ai.google.dev
          </a>{' '}
          — no credit card required. Your key is stored locally in this browser.
        </p>
        <div className="flex gap-2">
          <Input
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveKey()}
            placeholder="Paste your Gemini API key..."
            className="text-sm font-mono"
            type="password"
          />
          <Button size="sm" onClick={saveKey} disabled={!keyInput.trim()}>
            Save
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ask AI</p>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setError(null) }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-accent transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          )}
          <button
            onClick={() => setShowKeySetup(true)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-accent transition-colors"
          >
            <Key className="w-3 h-3" />
            Key
          </button>
        </div>
      </div>

      {/* Messages */}
      {messages.length > 0 && (
        <div className="max-h-64 overflow-y-auto p-3 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              <span className={`inline-block text-xs px-3 py-2 rounded-lg max-w-[90%] text-left whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-foreground border border-border'
              }`}>
                {m.text}
              </span>
            </div>
          ))}
          {loading && (
            <div className="text-left">
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-muted text-muted-foreground border border-border">
                <Loader2 className="w-3 h-3 animate-spin" />
                Thinking...
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {error && (
        <p className="text-xs text-[#EF4444] px-3 py-2 bg-[#EF4444]/5 border-t border-border">{error}</p>
      )}

      {/* Input */}
      <div className="flex gap-2 p-2 border-t border-border">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && ask()}
          placeholder={messages.length === 0 ? 'Why is this the correct answer?' : 'Ask a follow-up...'}
          className="text-sm"
          disabled={loading}
        />
        <Button size="sm" onClick={ask} disabled={!input.trim() || loading} className="flex-shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}
