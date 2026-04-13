# GATE Practice UI

A modern exam practice interface for GATE CS preparation. Supports timed mock exams, practice mode with instant feedback, and AI-powered question explanations.

## Tech Stack

- **Vite** + **React 19** + **TypeScript**
- **Tailwind CSS v3** + **shadcn/ui**
- **KaTeX** for LaTeX math rendering
- **Bun** as package manager

## Prerequisites

- [Bun](https://bun.sh) — `curl -fsSL https://bun.sh/install | bash`
- Node.js 18+ (if not using Bun)

## Getting Started

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build for Production

```bash
bun run build       # outputs to dist/
bun run preview     # preview the production build locally
```

## Features

### Exam Mode
- Timed exam with auto-submit when time runs out
- Question palette showing status at a glance
- Section progress bars
- MCQ, MSQ, and NAT question types
- Mark for review, clear response
- Submission confirmation with answered/unanswered counts

### Practice Mode
- Untimed — work through questions at your own pace
- **Check Answer** reveals correct/wrong feedback immediately
- **Try Again** resets any question for re-attempt
- Palette shows correct (white) / wrong (red) / attempted (blue) / untried (gray)

### Results & Review
- Score breakdown with section-wise stats
- **Review Answers** — browse all questions with correct answer highlighted per option
- Penalty calculation for MCQ negative marking

### AI Explanations (Ask AI)
Available in both practice mode and review mode. Supports two providers:

#### Gemini (cloud, free)
1. Get a free API key from [ai.google.dev](https://ai.google.dev) — no credit card required
2. Click **Setup** in the Ask AI panel and select **Gemini**
3. Paste your API key and save

#### Ollama (local, fully offline)
1. Install [Ollama](https://ollama.com) and pull a model:
   ```bash
   ollama pull llama3.2
   ```
2. Start Ollama with CORS enabled for the dev server:
   ```bash
   OLLAMA_ORIGINS=http://localhost:5173 ollama serve
   ```
   Or if running as a systemd service:
   ```bash
   sudo systemctl edit ollama
   # Add under [Service]:
   # Environment="OLLAMA_ORIGINS=http://localhost:5173"
   sudo systemctl restart ollama
   ```
3. Click **Setup** in the Ask AI panel, select **Ollama**, enter your model name (e.g. `llama3.2`)

API keys and settings are stored in your browser's localStorage — no account or backend needed.

## Project Structure

```
src/
├── components/
│   ├── ui/               # shadcn/ui primitives
│   ├── AskAI.tsx         # AI explanation panel (Gemini + Ollama)
│   ├── Calculator.tsx    # Scientific calculator
│   ├── ExamHeader.tsx    # Fixed top bar with font size toggle
│   ├── Legend.tsx        # Status colour legend
│   ├── QuestionDisplay.tsx       # Interactive question (exam mode)
│   ├── QuestionPalette.tsx       # Question number grid
│   ├── ReviewQuestionDisplay.tsx # Read-only question with answer feedback
│   ├── SectionProgress.tsx       # Per-section answered/total bars
│   └── TimerBlock.tsx    # Countdown timer
├── hooks/
│   └── useExamState.ts   # All exam state + actions
├── pages/
│   ├── ExamPage.tsx       # Timed exam interface
│   ├── ExamSelectPage.tsx # Exam catalogue with year/subject grouping
│   ├── InstructionsPage.tsx
│   ├── PracticePage.tsx   # Untimed practice with instant feedback
│   ├── ResultsPage.tsx    # Score summary
│   └── ReviewPage.tsx     # Post-exam answer review
├── types/
│   └── exam.ts            # TypeScript interfaces
└── data/
    └── examCatalog.ts     # Loads catalog.json + individual exam JSONs

public/
└── exams/
    ├── catalog.json       # Index of all 900+ exams
    └── *.json             # Individual exam files
```

## Exam Data Format

Each exam JSON in `public/exams/` follows this structure:

```json
{
  "name": "GATE CSE 2024 SET-1",
  "durationMinutes": 180,
  "sections": [
    {
      "name": "General Aptitude",
      "questions": [
        {
          "id": "1",
          "text": "<p>Question text with $LaTeX$ math...</p>",
          "type": "MCQ",
          "options": [
            { "id": "a", "text": "A" },
            { "id": "b", "text": "B" }
          ],
          "correctAnswer": "b",
          "marks": 1,
          "penalty": 0.333
        }
      ]
    }
  ]
}
```

Question types: `MCQ` (single choice), `MSQ` (multiple select), `NAT` (numerical).
