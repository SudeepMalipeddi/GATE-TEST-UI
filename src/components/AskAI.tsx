import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Send, Trash2, Settings, ChevronDown, ChevronRight, Brain, RefreshCw } from 'lucide-react'
import type { Question } from '../types/exam'

interface Props {
  question: Question
}

interface Message {
  role: 'user' | 'assistant'
  text: string
  thinking?: string
}

type Provider = 'gemini' | 'ollama'

// ── localStorage keys ──────────────────────────────────────────────
const KEY_PROVIDER     = 'ai_provider'
const KEY_GEMINI_KEY   = 'gemini_api_key'
const KEY_GEMINI_MODEL = 'gemini_model'
const KEY_OLLAMA_MODEL = 'ollama_model'
const KEY_OLLAMA_URL   = 'ollama_url'

const DEFAULT_OLLAMA_URL  = 'http://localhost:11434'
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'

// ── Gemini model catalogue with Tier 1 limits ─────────────────────
// Limits sourced from Google AI Studio Tier 1 as of April 2025.
// Deprecated = Google has announced shutdown; migrate away soon.
// RPD null = no daily request cap at this tier.
interface GeminiModel {
  id: string
  label: string
  rpd: number | null  // requests per day (null = unlimited)
  rpm: number         // requests per minute
  deprecated?: boolean
}

// Stable models (recommended for production)
// Preview models are newer but may have more restrictive limits
const GEMINI_MODELS: GeminiModel[] = [
  // ── Stable ──────────────────────────────────────────────────────
  { id: 'gemini-2.5-flash',      label: 'Gemini 2.5 Flash',           rpd: 10_000, rpm: 1000 },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite',      rpd: null,   rpm: 4000 },
  { id: 'gemini-2.5-pro',        label: 'Gemini 2.5 Pro',             rpd: 1_000,  rpm: 150  },
  // ── Preview (newer, production-ready) ───────────────────────────
  { id: 'gemini-3-flash-preview',         label: 'Gemini 3 Flash (Preview)',         rpd: 10_000, rpm: 1000 },
  { id: 'gemini-3.1-flash-lite-preview',  label: 'Gemini 3.1 Flash Lite (Preview)',  rpd: 150_000, rpm: 4000 },
  { id: 'gemini-3.1-pro-preview',         label: 'Gemini 3.1 Pro (Preview)',         rpd: 250,    rpm: 25   },
  // ── Gemma (open weights via Gemini API — IDs fetched at runtime) ─
  // Limit info only; actual model IDs are fetched via ListModels
  { id: 'gemma-4',               label: 'Gemma 4 (any)',              rpd: 14_400, rpm: 30   },
  { id: 'gemma-3',               label: 'Gemma 3 (any)',              rpd: 14_400, rpm: 30   },
  // ── Deprecated (will shut down June 2026) ───────────────────────
  { id: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash',           rpd: null,   rpm: 2000, deprecated: true },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite',      rpd: null,   rpm: 4000, deprecated: true },
]

// Look up limit info for a fetched model ID
function modelMeta(id: string): GeminiModel | undefined {
  // Exact match first
  const exact = GEMINI_MODELS.find(m => m.id === id)
  if (exact) return exact
  // Prefix match for Gemma family buckets
  if (id.startsWith('gemma-4')) return GEMINI_MODELS.find(m => m.id === 'gemma-4')
  if (id.startsWith('gemma-3')) return GEMINI_MODELS.find(m => m.id === 'gemma-3')
  return undefined
}

function formatRpd(rpd: number | null): string {
  if (rpd === null) return 'Unlimited'
  return rpd.toLocaleString()
}

// ── Local request counter (per model, resets at UTC midnight) ──────
function usageKey(modelId: string) { return `gemini_usage_${modelId}` }

function getTodayUsage(modelId: string): number {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const raw = localStorage.getItem(usageKey(modelId))
    if (!raw) return 0
    const parsed = JSON.parse(raw) as { date: string; used: number }
    return parsed.date === today ? parsed.used : 0
  } catch { return 0 }
}

function incrementUsage(modelId: string) {
  const today = new Date().toISOString().slice(0, 10)
  const used  = getTodayUsage(modelId) + 1
  localStorage.setItem(usageKey(modelId), JSON.stringify({ date: today, used }))
}

// ── helpers ────────────────────────────────────────────────────────
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

Explain clearly why the answer is correct. For follow-up questions, answer them directly. Keep explanations brief and precise.

Formatting rules:
- Use markdown for structure (bold, lists, code blocks)
- Use LaTeX for ALL math and symbols: $x$ for inline, $$x$$ for display
- For arrows use $\\rightarrow$ (never → or -> or ==>)
- For other symbols: $\\leq$, $\\geq$, $\\neq$, $\\Rightarrow$, $\\times$, $\\log$, etc.
- Never mix Unicode math symbols with LaTeX in the same response`
}

// ── API calls ──────────────────────────────────────────────────────
async function callGemini(
  apiKey: string,
  modelId: string,
  systemContext: string,
  messages: Message[],
): Promise<{ text: string; thinking?: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`
  const contents = [
    { role: 'user',  parts: [{ text: systemContext }] },
    { role: 'model', parts: [{ text: 'Understood. I am ready to help explain this question.' }] },
    ...messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] })),
  ]
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const msg = data?.error?.message ?? `API error ${res.status}`
    throw new Error(res.status === 400 || res.status === 403 ? `${msg} — check your API key.` : msg)
  }
  const data = await res.json()
  return { text: data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response received.' }
}

async function callOllama(
  baseUrl: string,
  model: string,
  systemContext: string,
  messages: Message[],
): Promise<{ text: string; thinking?: string }> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/chat`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: 'system', content: systemContext },
        ...messages.map(m => ({ role: m.role, content: m.text })),
      ],
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error ?? `Ollama error ${res.status}`)
  }
  const data = await res.json()
  const msg = data?.message ?? {}
  return {
    text: msg.content ?? 'No response received.',
    thinking: msg.thinking || undefined,
  }
}

async function fetchGeminiModels(apiKey: string): Promise<string[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  )
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const msg = data?.error?.message ?? `API error ${res.status}`
    throw new Error(res.status === 403 ? `${msg} — check your API key.` : msg)
  }
  const data = await res.json()
  return ((data?.models ?? []) as { name: string; supportedGenerationMethods?: string[] }[])
    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
    .map(m => m.name.replace('models/', ''))
    .sort()
}

async function fetchOllamaModels(baseUrl: string): Promise<string[]> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tags`)
  if (!res.ok) return []
  const data = await res.json()
  return ((data?.models ?? []) as { name: string }[]).map(m => m.name).sort()
}

// ── Thinking block ─────────────────────────────────────────────────
function ThinkingBlock({ thinking }: { thinking: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-2 border border-border rounded-md overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/60 hover:bg-muted transition-colors text-muted-foreground text-xs"
      >
        <Brain className="w-3 h-3 flex-shrink-0" />
        <span className="font-medium">Reasoning</span>
        {open ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
      </button>
      {open && (
        <div className="px-3 py-2 text-muted-foreground leading-relaxed bg-muted/20 text-base">
          <MdMessage text={thinking} />
        </div>
      )}
    </div>
  )
}

// ── Markdown message renderer ──────────────────────────────────────
function MdMessage({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p:    ({ children }) => <p className="text-base mb-1 last:mb-0">{children}</p>,
        ul:   ({ children }) => <ul className="text-base list-disc list-inside space-y-0.5 mb-1">{children}</ul>,
        ol:   ({ children }) => <ol className="text-base list-decimal list-inside space-y-0.5 mb-1">{children}</ol>,
        li:   ({ children }) => <li className="text-base leading-relaxed">{children}</li>,
        code: ({ children, className }) =>
          className
            ? <code className="block bg-background/60 rounded px-2 py-1 text-[11px] font-mono overflow-x-auto my-1">{children}</code>
            : <code className="bg-background/60 rounded px-1 text-[11px] font-mono">{children}</code>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
      }}
    >
      {text}
    </ReactMarkdown>
  )
}

// ── Shared select style ────────────────────────────────────────────
const selectCls = 'w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring'

// ── Setup screen ───────────────────────────────────────────────────
function Setup({ onDone }: { onDone: () => void }) {
  const [tab, setTab] = useState<Provider>(
    () => (localStorage.getItem(KEY_PROVIDER) as Provider | null) ?? 'gemini'
  )

  // Gemini state
  const [geminiKey,      setGeminiKey]      = useState(localStorage.getItem(KEY_GEMINI_KEY)   ?? '')
  const [geminiModel,    setGeminiModel]    = useState(localStorage.getItem(KEY_GEMINI_MODEL) ?? DEFAULT_GEMINI_MODEL)
  const [geminiModels,   setGeminiModels]   = useState<string[]>([])
  const [loadingGemini,  setLoadingGemini]  = useState(false)
  const [loadGeminiErr,  setLoadGeminiErr]  = useState<string | null>(null)

  // Ollama state
  const [ollamaUrl,      setOllamaUrl]      = useState(localStorage.getItem(KEY_OLLAMA_URL)   ?? DEFAULT_OLLAMA_URL)
  const [ollamaModel,    setOllamaModel]    = useState(localStorage.getItem(KEY_OLLAMA_MODEL) ?? '')
  const [ollamaModels,   setOllamaModels]   = useState<string[]>([])
  const [loadingOllama,  setLoadingOllama]  = useState(false)
  const [loadOllamaErr,  setLoadOllamaErr]  = useState<string | null>(null)

  const selectedGeminiMeta = modelMeta(geminiModel)
  const todayUsed = getTodayUsage(geminiModel)

  const loadGeminiModels = useCallback(async () => {
    const key = geminiKey.trim()
    if (!key) return
    setLoadingGemini(true)
    setLoadGeminiErr(null)
    try {
      const models = await fetchGeminiModels(key)
      if (models.length === 0) {
        setLoadGeminiErr('No models found for this key.')
      } else {
        setGeminiModels(models)
        if (!geminiModel || !models.includes(geminiModel)) setGeminiModel(models[0])
      }
    } catch (e) {
      setLoadGeminiErr(e instanceof Error ? e.message : 'Failed to load models.')
    } finally {
      setLoadingGemini(false)
    }
  }, [geminiKey, geminiModel])

  const loadOllamaModels = useCallback(async () => {
    setLoadingOllama(true)
    setLoadOllamaErr(null)
    try {
      const models = await fetchOllamaModels(ollamaUrl.trim() || DEFAULT_OLLAMA_URL)
      if (models.length === 0) {
        setLoadOllamaErr('No models found. Is Ollama running?')
      } else {
        setOllamaModels(models)
        if (!ollamaModel || !models.includes(ollamaModel)) setOllamaModel(models[0])
      }
    } catch {
      setLoadOllamaErr('Could not reach Ollama. Check the URL and CORS setting.')
    } finally {
      setLoadingOllama(false)
    }
  }, [ollamaUrl, ollamaModel])

  const canSave = tab === 'gemini' ? geminiKey.trim().length > 0 : ollamaModel.trim().length > 0

  const save = () => {
    localStorage.setItem(KEY_PROVIDER, tab)
    if (tab === 'gemini') {
      localStorage.setItem(KEY_GEMINI_KEY,   geminiKey.trim())
      localStorage.setItem(KEY_GEMINI_MODEL, geminiModel)
    } else {
      localStorage.setItem(KEY_OLLAMA_MODEL, ollamaModel.trim())
      localStorage.setItem(KEY_OLLAMA_URL,   ollamaUrl.trim() || DEFAULT_OLLAMA_URL)
    }
    onDone()
  }

  return (
    <div className="border border-border rounded-lg p-4 bg-muted/40 space-y-4">
      <p className="text-sm font-semibold text-foreground">Set up AI assistance</p>

      {/* Provider tabs */}
      <div className="flex rounded-md border border-border overflow-hidden text-xs font-medium">
        {(['gemini', 'ollama'] as Provider[]).map(p => (
          <button key={p} onClick={() => setTab(p)}
            className={`flex-1 py-1.5 transition-colors ${
              tab === p ? 'bg-foreground text-background' : 'bg-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {p === 'gemini' ? 'Gemini (cloud)' : 'Ollama (local)'}
          </button>
        ))}
      </div>

      {tab === 'gemini' ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Get a free API key at{' '}
            <a href="https://aistudio.google.com" target="_blank" rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground">
              aistudio.google.com
            </a>{' '}— no credit card required.
          </p>

          {/* Key + Load button */}
          <div className="flex gap-2">
            <Input
              value={geminiKey}
              onChange={e => { setGeminiKey(e.target.value); setGeminiModels([]) }}
              onKeyDown={e => e.key === 'Enter' && canSave && save()}
              placeholder="Paste your Gemini API key..."
              type="password"
              className="text-sm font-mono flex-1"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={loadGeminiModels}
              disabled={loadingGemini || !geminiKey.trim()}
              className="flex-shrink-0 gap-1"
            >
              {loadingGemini
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <RefreshCw className="w-3 h-3" />}
              Load
            </Button>
          </div>

          {loadGeminiErr && (
            <p className="text-[11px] text-[#EF4444]">{loadGeminiErr}</p>
          )}

          {/* Model picker */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">
              Model
              {geminiModels.length === 0 && (
                <span className="ml-1 font-normal text-muted-foreground/60">
                  — paste key and click Load for your full model list
                </span>
              )}
            </label>

            {geminiModels.length > 0 ? (
              // Dynamic list fetched from API — grouped by family
              <select
                value={geminiModel}
                onChange={e => setGeminiModel(e.target.value)}
                className={selectCls}
              >
                {(['gemini-3', 'gemini-2.5', 'gemini-2', 'gemma'] as const).map(prefix => {
                  const group = geminiModels.filter(id => id.startsWith(prefix))
                  if (group.length === 0) return null
                  const label =
                    prefix === 'gemma'     ? 'Gemma — open weights' :
                    prefix === 'gemini-3'  ? 'Gemini 3' :
                    prefix === 'gemini-2.5'? 'Gemini 2.5' :
                                             'Gemini 2.0 (deprecated)'
                  return (
                    <optgroup key={prefix} label={label}>
                      {group.map(id => {
                        const meta = modelMeta(id)
                        const info = meta
                          ? ` — ${formatRpd(meta.rpd)}/day · ${meta.rpm.toLocaleString()}/min`
                          : ''
                        return (
                          <option key={id} value={id}>{id}{info}</option>
                        )
                      })}
                    </optgroup>
                  )
                })}
                {/* Any remaining models not covered by the prefix groups */}
                {(() => {
                  const covered = ['gemini-3', 'gemini-2.5', 'gemini-2', 'gemma']
                  const rest = geminiModels.filter(id => !covered.some(p => id.startsWith(p)))
                  if (rest.length === 0) return null
                  return (
                    <optgroup label="Other">
                      {rest.map(id => <option key={id} value={id}>{id}</option>)}
                    </optgroup>
                  )
                })()}
              </select>
            ) : (
              // Fallback: hardcoded list while not yet loaded
              <select
                value={geminiModel}
                onChange={e => setGeminiModel(e.target.value)}
                className={selectCls}
              >
                <optgroup label="Gemini — Stable / Preview">
                  {GEMINI_MODELS.filter(m => !m.deprecated && !m.id.startsWith('gemma')).map(m => (
                    <option key={m.id} value={m.id}>
                      {m.label} — {formatRpd(m.rpd)}/day · {m.rpm.toLocaleString()}/min
                    </option>
                  ))}
                </optgroup>
                <optgroup label="⚠ Deprecated (shutting down June 2026)">
                  {GEMINI_MODELS.filter(m => m.deprecated).map(m => (
                    <option key={m.id} value={m.id}>
                      {m.label} — {formatRpd(m.rpd)}/day · {m.rpm.toLocaleString()}/min
                    </option>
                  ))}
                </optgroup>
              </select>
            )}

            {/* Deprecation warning */}
            {selectedGeminiMeta?.deprecated && (
              <p className="text-[11px] text-amber-500 rounded bg-amber-500/10 px-2 py-1.5">
                ⚠ This model is deprecated and will be shut down in June 2026.
                Consider switching to <strong>Gemini 2.5 Flash</strong> or a Gemini 3 model.
              </p>
            )}

            {/* Usage counter */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                Today (local count): <span className="font-semibold text-foreground">{todayUsed}</span>
                {selectedGeminiMeta && selectedGeminiMeta.rpd !== null && (
                  <> / {formatRpd(selectedGeminiMeta.rpd)} known limit</>
                )}
                {selectedGeminiMeta?.rpd === null && (
                  <span className="text-muted-foreground/60"> (no daily cap)</span>
                )}
              </span>
              <span className="text-muted-foreground/60">resets at midnight Pacific</span>
            </div>

            {/* Disclaimer */}
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed rounded bg-muted/60 px-2 py-1.5">
              ⚠ This counter is local to this browser only — it does not reflect usage from other
              devices or other apps using the same key. Limits shown are based on Google AI Studio
              Tier 1 as of April 2025. Google can change these at any time, so your actual
              remaining requests may be lower than shown.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Start Ollama with CORS enabled:{' '}
            <code className="bg-muted px-1 rounded text-[11px]">
              OLLAMA_ORIGINS=http://localhost:5173 ollama serve
            </code>
          </p>

          {/* URL + fetch */}
          <div className="flex gap-2">
            <Input
              value={ollamaUrl}
              onChange={e => { setOllamaUrl(e.target.value); setOllamaModels([]) }}
              placeholder={`Ollama URL (default: ${DEFAULT_OLLAMA_URL})`}
              className="text-sm font-mono flex-1"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={loadOllamaModels}
              disabled={loadingOllama}
              className="flex-shrink-0 gap-1"
            >
              {loadingOllama
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <RefreshCw className="w-3 h-3" />}
              Load
            </Button>
          </div>

          {loadOllamaErr && (
            <p className="text-[11px] text-[#EF4444]">{loadOllamaErr}</p>
          )}

          {/* Model dropdown (populated) or text fallback */}
          {ollamaModels.length > 0 ? (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Model</label>
              <select
                value={ollamaModel}
                onChange={e => setOllamaModel(e.target.value)}
                className={selectCls}
              >
                {ollamaModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          ) : (
            <Input
              value={ollamaModel}
              onChange={e => setOllamaModel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canSave && save()}
              placeholder="Model name — or click Load to fetch from Ollama"
              className="text-sm font-mono"
            />
          )}
        </div>
      )}

      <Button size="sm" onClick={save} disabled={!canSave} className="w-full">
        Save & Start
      </Button>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────
function isConfigured(): boolean {
  const provider = localStorage.getItem(KEY_PROVIDER) as Provider | null
  if (!provider) return false
  if (provider === 'gemini') return !!localStorage.getItem(KEY_GEMINI_KEY)
  return !!localStorage.getItem(KEY_OLLAMA_MODEL)
}

export function AskAI({ question }: Props) {
  const [showSetup, setShowSetup] = useState(!isConfigured())
  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  // Re-render trigger so header usage count updates after each request
  const [usageTick, setUsageTick] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMessages([]); setError(null) }, [question.id])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const providerLabel = () => {
    const p = localStorage.getItem(KEY_PROVIDER) as Provider | null
    if (p === 'ollama') {
      return `Ollama · ${localStorage.getItem(KEY_OLLAMA_MODEL) ?? ''}`
    }
    const modelId = localStorage.getItem(KEY_GEMINI_MODEL) ?? DEFAULT_GEMINI_MODEL
    const meta    = GEMINI_MODELS.find(m => m.id === modelId)
    const used    = getTodayUsage(modelId)
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    usageTick // subscribe to tick so this re-evaluates
    const limitStr = meta?.rpd != null ? `${used}/${formatRpd(meta.rpd)} today` : `${used} today`
    return `${meta?.label ?? modelId} · ${limitStr}`
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
      const provider    = (localStorage.getItem(KEY_PROVIDER) as Provider | null) ?? 'gemini'
      const systemContext = buildSystemContext(question)
      let result: { text: string; thinking?: string }

      if (provider === 'gemini') {
        const apiKey  = localStorage.getItem(KEY_GEMINI_KEY)   ?? ''
        const modelId = localStorage.getItem(KEY_GEMINI_MODEL) ?? DEFAULT_GEMINI_MODEL
        result = await callGemini(apiKey, modelId, systemContext, nextMessages)
        incrementUsage(modelId)
        setUsageTick(t => t + 1)
      } else {
        result = await callOllama(
          localStorage.getItem(KEY_OLLAMA_URL)   ?? DEFAULT_OLLAMA_URL,
          localStorage.getItem(KEY_OLLAMA_MODEL) ?? '',
          systemContext,
          nextMessages,
        )
      }

      setMessages(prev => [...prev, { role: 'assistant', text: result.text, thinking: result.thinking }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setMessages(prev => prev.slice(0, -1))
      setInput(q)
    } finally {
      setLoading(false)
    }
  }

  if (showSetup) return <Setup onDone={() => setShowSetup(false)} />

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Ask AI
          <span className="ml-1.5 normal-case font-normal text-muted-foreground/60">· {providerLabel()}</span>
        </p>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setError(null) }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-accent transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          )}
          <button
            onClick={() => setShowSetup(true)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-accent transition-colors"
          >
            <Settings className="w-3 h-3" /> Setup
          </button>
        </div>
      </div>

      {/* Messages */}
      {messages.length > 0 && (
        <div className="p-3 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              {m.role === 'assistant' && m.thinking && (
                <ThinkingBlock thinking={m.thinking} />
              )}
              <span className={`inline-block px-3 py-2 rounded-lg max-w-[95%] text-left ${
                m.role === 'user'
                  ? 'text-sm bg-foreground text-background'
                  : 'text-base bg-muted text-foreground border border-border'
              }`}>
                {m.role === 'assistant' ? <MdMessage text={m.text} /> : m.text}
              </span>
            </div>
          ))}
          {loading && (
            <div className="text-left">
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-muted text-muted-foreground border border-border">
                <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
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
