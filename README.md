# GATE Practice UI

A full-featured exam practice interface for GATE CS and ISRO preparation. Supports timed mock exams, untimed practice mode with instant feedback, post-exam review, and inline AI-powered question explanations.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Prerequisites](#prerequisites)
3. [Windows Setup](#windows-setup)
4. [Installation](#installation)
5. [Running the Development Server](#running-the-development-server)
6. [Building for Production](#building-for-production)
7. [Features](#features)
   - [Exam Mode](#exam-mode)
   - [Practice Mode](#practice-mode)
   - [Results and Review](#results-and-review)
   - [AI Explanations (Ask AI)](#ai-explanations-ask-ai)
8. [AI Provider Setup](#ai-provider-setup)
   - [Gemini (cloud, free)](#gemini-cloud-free)
   - [Ollama (local, fully offline)](#ollama-local-fully-offline)
9. [Project Structure](#project-structure)
10. [Adding Custom Exams](#adding-custom-exams)
11. [Exam Data Format](#exam-data-format)
12. [Troubleshooting](#troubleshooting)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 8 |
| Styling | Tailwind CSS v3 + shadcn/ui (Radix primitives) |
| Math rendering | KaTeX (via rehype-katex + remark-math) |
| Markdown | react-markdown + remark-gfm |
| Package manager | Bun (recommended) or Node.js + npm |
| Routing | React Router v7 |

---

## Prerequisites

### Bun (recommended)

Bun is a fast all-in-one JavaScript runtime and package manager. It is the recommended way to run this project.

```bash
curl -fsSL https://bun.sh/install | bash
```

After installation, restart your terminal or run:

```bash
source ~/.bashrc   # or ~/.zshrc depending on your shell
```

Verify the installation:

```bash
bun --version
```

### Node.js (alternative)

If you prefer Node.js, version 18 or higher is required.

```bash
node --version   # should be v18.0.0 or higher
```

---

## Windows Setup

The project runs on Windows natively (PowerShell or Git Bash) and also inside WSL2. Pick whichever you're comfortable with.

---

### Option A — Native Windows (PowerShell)

**1. Install Bun**

Open PowerShell and run:

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

Close and reopen PowerShell after installation, then verify:

```powershell
bun --version
```

Alternatively, install via winget or Scoop:

```powershell
winget install Oven-sh.Bun
# or
scoop install bun
```

**2. Install Node.js (if you prefer npm)**

Download the LTS installer from [https://nodejs.org](https://nodejs.org) and run it, or use winget:

```powershell
winget install OpenJS.NodeJS.LTS
```

**3. Install Git**

If you don't have Git:

```powershell
winget install Git.Git
```

After installing Git, open **Git Bash** (comes with the Git for Windows installer) for a Unix-like terminal experience. All commands in this README work in Git Bash without modification.

**4. Clone and install**

In PowerShell or Git Bash:

```powershell
git clone <repository-url>
cd gate-practice-ui
bun install
```

**5. Run the dev server**

```powershell
bun run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

**6. Ollama CORS (PowerShell)**

If you use the Ollama AI provider, the environment variable syntax differs from Linux/macOS.

PowerShell:

```powershell
$env:OLLAMA_ORIGINS = "http://localhost:5173"
ollama serve
```

Command Prompt:

```cmd
set OLLAMA_ORIGINS=http://localhost:5173
ollama serve
```

To make the setting permanent across terminals, add it via System Properties → Environment Variables, or use:

```powershell
[System.Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "http://localhost:5173", "User")
```

**7. Install Ollama on Windows**

Download the `.exe` installer from [https://ollama.com/download](https://ollama.com/download) and run it. After installation, `ollama` will be available in PowerShell and Command Prompt.

Pull a model:

```powershell
ollama pull gemma3:4b
```

---

### Option B — WSL2 (Windows Subsystem for Linux)

WSL2 gives you a full Linux environment on Windows. This is the recommended approach if you are comfortable with the terminal, as all Linux commands in this README work without modification.

**1. Install WSL2**

Open PowerShell as Administrator:

```powershell
wsl --install
```

This installs WSL2 with Ubuntu by default. Restart your machine when prompted.

**2. Open a WSL2 terminal**

Launch **Ubuntu** from the Start menu (or run `wsl` in PowerShell). You are now in a Linux shell — follow the standard Linux instructions in the [Prerequisites](#prerequisites) and [Installation](#installation) sections from here.

**3. Access project files**

Store the repository inside the WSL2 filesystem (e.g. `~/gate-practice-ui`) rather than under `/mnt/c/` for significantly better performance. The Windows file explorer can access WSL2 files via `\\wsl$\Ubuntu\home\<username>\`.

**4. Ollama in WSL2**

Ollama can run either natively in Windows (recommended) or inside WSL2. If running in Windows, reach it from WSL2 by replacing `localhost` with the Windows host IP. The easiest way is to run Ollama in Windows and point the app to `http://localhost:11434` — WSL2 forwards Windows localhost ports automatically on recent Windows 11 builds.

If you installed Ollama inside WSL2:

```bash
OLLAMA_ORIGINS=http://localhost:5173 ollama serve
```

---

### Windows Troubleshooting

**`bun` not found after install**

Bun adds itself to `%APPDATA%\Local\bun` and updates your PATH. If PowerShell still doesn't find it, close all PowerShell windows and reopen, or add the path manually:

```powershell
$env:PATH += ";$env:APPDATA\Local\bun"
```

**Port 5173 blocked by firewall**

Windows Defender Firewall may block Vite's dev server on first run. Click **Allow** when prompted, or add a firewall rule manually for TCP port 5173.

**Long path errors on `bun install`**

Windows has a 260-character path limit by default. Enable long paths:

```powershell
# Run as Administrator
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1
```

**Line ending issues (CRLF)**

If you clone on Windows with Git's default settings, files may get CRLF line endings which can cause issues with some scripts. Set Git to preserve LF endings for this repo:

```powershell
git config core.autocrlf false
git rm --cached -r .
git reset --hard
```

Or set it globally before cloning:

```powershell
git config --global core.autocrlf input
```

---

## Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd gate-practice-ui
bun install
```

If using npm instead of Bun:

```bash
npm install
```

This will install all dependencies listed in `package.json`, including React, Vite, Tailwind CSS, KaTeX, and all shadcn/ui Radix primitives.

---

## Running the Development Server

```bash
bun run dev
```

Or with npm:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. The dev server supports hot module replacement — changes to source files will reflect instantly without a full page reload.

### Note on Ollama CORS

If you plan to use the Ollama AI provider with the dev server, Ollama must be started with the dev server's origin in its allowed list:

```bash
OLLAMA_ORIGINS=http://localhost:5173 ollama serve
```

See the [Ollama section](#ollama-local-fully-offline) for full details.

---

## Building for Production

```bash
bun run build
```

This runs TypeScript type-checking (`tsc`) followed by the Vite production build. Output goes to the `dist/` directory.

To preview the production build locally before deploying:

```bash
bun run preview
```

The preview server runs at [http://localhost:4173](http://localhost:4173) by default.

### Deploying

The `dist/` folder is a standard static site. You can serve it with any static file host or web server:

```bash
# nginx example
cp -r dist/ /var/www/html/

# or serve locally with Python
python3 -m http.server 8080 --directory dist/

# or with npx serve
npx serve dist/
```

---

## Features

### Exam Mode

A faithful simulation of the GATE computer-based test interface.

- **Timer**: countdown from the exam's configured duration; auto-submits when time runs out
- **Sections**: tabbed navigation between exam sections (e.g., General Aptitude and Technical)
- **Question types**: MCQ (single correct), MSQ (multiple correct, no negative marking), NAT (numerical answer type)
- **Marking scheme**: configurable marks per question and penalty fraction for MCQ negative marking
- **Question palette**: right-hand sidebar showing the status of every question at a glance
- **Statuses**:
  - Gray outline — not yet visited
  - Red — visited but no answer saved
  - Honeydew (near-white) — answered
  - Powder blue — marked for review (no answer)
  - Steel blue — marked for review with an answer saved
- **Actions per question**: Save & Next, Mark for Review, Clear Response, Previous
- **Section progress bars**: answered/total count with a progress bar per section
- **Submit confirmation**: dialog showing answered / unanswered / for-review counts before final submit
- **Unload protection**: browser warning if you try to close or refresh the tab mid-exam
- **State persistence**: in-progress exam state is saved to `localStorage` so a page refresh does not lose your work
- **Font size toggle**: three sizes (S / M / L) in the header, persisted across sessions

### Practice Mode

Untimed mode for working through questions at your own pace with immediate feedback.

- No timer — work through questions in any order
- **Check Answer**: reveals whether your selection is correct or wrong immediately, with per-option color coding
- **Try Again**: resets the feedback for a question so you can reattempt it
- Palette shows your progress: correct (honeydew), wrong (red), attempted but unchecked (powder blue), untried (gray)
- **Ask AI** panel opens automatically after checking an answer
- Progress summary in the sidebar: how many questions checked, how many correct

### Results and Review

After submitting an exam you see a results summary and can review every question.

**Results page:**

- Total score and maximum marks
- Section-by-section breakdown: correct / wrong / skipped counts and marks earned
- Penalty deduction summary for MCQ negative marking

**Review page:**

- Browse all questions in read-only mode
- Each option is highlighted: correct answer (green border), your answer if wrong (red border), missed correct options for MSQ
- Outcome badge per question: Correct / Wrong / Skipped
- NAT questions show your numerical answer alongside the correct answer
- Ask AI panel available for every question

### AI Explanations (Ask AI)

An inline chat panel that explains why the correct answer is correct. Available in both Practice mode and Review mode.

Supports two AI providers — see [AI Provider Setup](#ai-provider-setup) for configuration.

**Chat features:**

- Ask follow-up questions — the full conversation history is sent with each request
- Responses rendered as rich markdown: bold, lists, code blocks, and LaTeX math
- Collapsible **Reasoning** block for thinking models (e.g., Gemma 4, DeepSeek-R1, gemini-2.5-flash)
- **Clear** button to reset the conversation for a question
- Per-question isolation — the conversation resets automatically when you navigate to a new question
- Local daily request counter for Gemini models (resets at midnight Pacific time)

---

## AI Provider Setup

Click the **Setup** button in the Ask AI panel to configure your provider. Settings are stored in `localStorage` — no account or backend is needed.

### Gemini (cloud, free)

Gemini offers a generous free tier via Google AI Studio. No credit card is required for the free tier.

**Step 1 — Get an API key**

1. Go to [https://ai.google.dev](https://ai.google.dev)
2. Sign in with a Google account
3. Click **Get API key** → **Create API key**
4. Copy the key (it looks like `AIza...`)

**Step 2 — Configure in the app**

1. Click **Setup** in the Ask AI panel
2. Select the **Gemini (cloud)** tab
3. Paste your API key into the input field
4. Click **Load** to fetch your available models from the API — this populates the model dropdown with the exact model IDs available for your key
5. Select a model from the dropdown (see table below)
6. Click **Save & Start**

**Available models and Tier 1 free limits (as of April 2025):**

> These limits are shown in the app next to each model. The in-app counter tracks your usage locally — it does not reflect usage from other devices or other applications using the same key. Google may change these limits at any time; actual remaining requests may be lower than shown.

| Model | Requests/day | Requests/min | Notes |
|---|---|---|---|
| Gemini 2.5 Flash | 10,000 | 1,000 | Best all-round choice |
| Gemini 2.5 Flash Lite | Unlimited | 4,000 | Fastest, most economical |
| Gemini 2.5 Pro | 1,000 | 150 | Most capable reasoning |
| Gemini 3 Flash (Preview) | 10,000 | 1,000 | Newer generation |
| Gemini 3.1 Flash Lite (Preview) | 150,000 | 4,000 | Highest free quota |
| Gemini 3.1 Pro (Preview) | 250 | 25 | Most capable, lowest quota |
| Gemma 4 / Gemma 3 (open weights) | 14,400 | 30 | Open weights via Gemini API |
| Gemini 2.0 Flash | Unlimited | 2,000 | **Deprecated** — shutting down June 2026 |
| Gemini 2.0 Flash Lite | Unlimited | 4,000 | **Deprecated** — shutting down June 2026 |

**Recommendation for most users:** start with **Gemini 2.5 Flash** — 10,000 requests/day is more than enough for exam prep, and it supports chain-of-thought reasoning.

---

### Ollama (local, fully offline)

Ollama lets you run open-weight models entirely on your machine. No internet required once the model is downloaded.

**Step 1 — Install Ollama**

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Verify:

```bash
ollama --version
```

**Step 2 — Pull a model**

```bash
# Recommended: a capable small model
ollama pull gemma3:4b       # ~3 GB, good quality
ollama pull llama3.2        # ~2 GB, general purpose
ollama pull qwen2.5:7b      # ~5 GB, strong reasoning

# Thinking models (show reasoning chain in the app)
ollama pull deepseek-r1:8b  # ~5 GB, chain-of-thought
ollama pull gemma4:12b      # ~8 GB, Google's latest open model
```

Run `ollama list` to see all models you have downloaded.

**Step 3 — Start Ollama with CORS enabled**

By default Ollama only accepts requests from `localhost` on the same port. The web app runs on port 5173 (dev) or 4173 (preview), so you need to tell Ollama to allow that origin.

**Option A — environment variable (one-off):**

```bash
OLLAMA_ORIGINS=http://localhost:5173 ollama serve
```

For the production preview build use port 4173:

```bash
OLLAMA_ORIGINS="http://localhost:5173,http://localhost:4173" ollama serve
```

**Option B — systemd service (persistent):**

If Ollama is running as a systemd service:

```bash
sudo systemctl edit ollama
```

Add the following under `[Service]`:

```ini
[Service]
Environment="OLLAMA_ORIGINS=http://localhost:5173"
```

Save, then restart:

```bash
sudo systemctl restart ollama
```

**Option C — allow all origins (development only, not recommended for shared machines):**

```bash
OLLAMA_ORIGINS="*" ollama serve
```

**Step 4 — Configure in the app**

1. Click **Setup** in the Ask AI panel
2. Select the **Ollama (local)** tab
3. The URL defaults to `http://localhost:11434` — change it only if you moved Ollama to a different port
4. Click **Load** — the app will query `/api/tags` and populate a dropdown with all your locally available models
5. Select a model and click **Save & Start**

**Thinking models:** Models like `deepseek-r1`, `gemma4`, and `qwen3` return a separate reasoning trace. The app shows this in a collapsible **Reasoning** block above the main response.

---

## Project Structure

```
gate-practice-ui/
├── public/
│   └── exams/
│       ├── catalog.json          # Index of all 900+ exams
│       └── *.json                # Individual exam files
├── src/
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives (Button, Input, Dialog, etc.)
│   │   ├── ActionBar.tsx         # Save / Mark Review / Clear / Prev buttons
│   │   ├── AskAI.tsx             # Inline AI chat panel (Gemini + Ollama)
│   │   ├── Calculator.tsx        # Scientific calculator overlay
│   │   ├── ExamHeader.tsx        # Fixed top bar: exam name, font size toggle
│   │   ├── Legend.tsx            # Status colour legend
│   │   ├── QuestionDisplay.tsx   # Interactive question (exam + practice mode)
│   │   ├── QuestionPalette.tsx   # Question number grid with status colours
│   │   ├── ReviewQuestionDisplay.tsx  # Read-only question with answer feedback
│   │   ├── SectionProgress.tsx   # Per-section answered/total progress bars
│   │   └── TimerBlock.tsx        # Countdown timer
│   ├── hooks/
│   │   └── useExamState.ts       # All exam state and actions (single source of truth)
│   ├── pages/
│   │   ├── ExamPage.tsx          # Timed exam interface
│   │   ├── ExamSelectPage.tsx    # Exam catalogue with year/subject grouping + upload
│   │   ├── InstructionsPage.tsx  # Pre-exam instructions
│   │   ├── PracticePage.tsx      # Untimed practice with instant feedback
│   │   ├── ResultsPage.tsx       # Score summary after submission
│   │   └── ReviewPage.tsx        # Post-exam answer review
│   ├── types/
│   │   └── exam.ts               # TypeScript interfaces for all data shapes
│   └── data/
│       └── examCatalog.ts        # Loads catalog.json and individual exam JSONs
├── bun.lock
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

### Key architectural decisions

- **Single state hook**: all exam state lives in `useExamState`. Pages receive state and callbacks as props — no prop drilling through context.
- **Phase-based routing**: the app is a single page; which UI renders is determined by `state.phase` (`select` | `instructions` | `exam` | `results` | `review` | `history-review` | `practice`).
- **Exam persistence**: `useExamState` writes the in-progress exam state to `localStorage` on every change. If the page is refreshed mid-exam, the state is restored automatically.
- **Practice mode is local-only**: answers and checked state in practice mode live in `PracticePage` component state, not in `useExamState`. Nothing is persisted.
- **Math rendering**: question HTML contains inline LaTeX delimited by `$...$` and `$$...$$`. KaTeX renders these synchronously at parse time via `rehype-katex`.

---

## Exam Data Format

Each file in `public/exams/` follows this schema:

```json
{
  "name": "GATE CSE 2024 | Set 1 | Original Paper",
  "durationMinutes": 180,
  "sections": [
    {
      "name": "General Aptitude",
      "questions": [
        {
          "id": "422841",
          "text": "<p>Question text with $LaTeX$ math and <ol>...</ol> options</p>",
          "type": "MCQ",
          "options": [
            { "id": "a", "text": "A" },
            { "id": "b", "text": "B" },
            { "id": "c", "text": "C" },
            { "id": "d", "text": "D" }
          ],
          "correctAnswer": "d",
          "marks": 1,
          "penalty": 0.3333
        }
      ]
    }
  ]
}
```

**Question types:**

| Type | `correctAnswer` | Negative marking |
|---|---|---|
| `MCQ` | Single string, e.g. `"b"` | Yes — `penalty` fraction of `marks` |
| `MSQ` | Array of strings, e.g. `["a", "c"]` | No — `penalty` is always `0` |
| `NAT` | Numerical string, e.g. `"42"` or `"3.14"` | No |

**Note on option text:** Option text in exam JSON files is always a single letter (`"A"`, `"B"`, etc.) because the actual answer choices are embedded in the question's HTML as an ordered list (`<ol style="list-style-type:upper-alpha">`). The app renders the full question HTML and shows only letter pills (A / B / C / D) as selectable buttons.

**The catalog:**

`public/exams/catalog.json` is an array of index entries:

```json
[
  {
    "id": "gate-cse-2024-set-1-original-paper",
    "name": "GATE CSE 2024 | Set 1 | Original Paper",
    "durationMinutes": 180,
    "totalQuestions": 65,
    "sectionNames": ["Aptitude", "Technical"]
  }
]
```

The `id` field corresponds to the filename without `.json`.

---

## Adding Custom Exams

There are two ways to add your own exam papers.

### Method 1 — Upload via the UI (one-off, no rebuild needed)

Click **Upload exam** in the top-right corner of the exam select page, or drag a `.json` file anywhere onto the page. The app validates the schema and shows a preview before starting. The exam runs exactly like a built-in one — timed, with full scoring and review — but is not saved to the catalog permanently.

Use this method for quick one-off tests.

### Method 2 — Add to the catalog (permanent, survives page refresh)

Place your exam file in `public/exams/` and add an entry to `public/exams/catalog.json`. The exam then appears in the year/subject tabs automatically.

**Step 1 — Create the exam file**

Name the file with a URL-safe slug, e.g. `public/exams/my-algorithms-test.json`:

```json
{
  "name": "2025 | Algorithms Practice Test",
  "durationMinutes": 60,
  "sections": [
    {
      "name": "General Aptitude",
      "questions": [
        {
          "id": "q-apt-1",
          "text": "A train travels from city A to city B at 60 km/h and returns at 40 km/h. What is the average speed for the entire journey (in km/h)?",
          "type": "NAT",
          "options": [],
          "correctAnswer": "48",
          "marks": 1,
          "penalty": 0
        },
        {
          "id": "q-apt-2",
          "text": "Choose the pair that best expresses a relationship similar to: <b>Scalpel : Surgeon</b>",
          "type": "MCQ",
          "options": [
            { "id": "a", "text": "Brush : Painter" },
            { "id": "b", "text": "Hammer : Wood" },
            { "id": "c", "text": "Needle : Thread" },
            { "id": "d", "text": "Pen : Ink" }
          ],
          "correctAnswer": "a",
          "marks": 1,
          "penalty": 0.33
        }
      ]
    },
    {
      "name": "Computer Science",
      "questions": [
        {
          "id": "q-cs-1",
          "text": "Consider the following recurrence: $$T(n) = 2T\\left(\\frac{n}{2}\\right) + n$$ By the Master Theorem, the solution is:",
          "type": "MCQ",
          "options": [
            { "id": "a", "text": "$O(n)$" },
            { "id": "b", "text": "$O(n \\log n)$" },
            { "id": "c", "text": "$O(n^2)$" },
            { "id": "d", "text": "$O(\\log n)$" }
          ],
          "correctAnswer": "b",
          "marks": 2,
          "penalty": 0.67
        },
        {
          "id": "q-cs-2",
          "text": "Which of the following data structures support $O(1)$ amortized insertion?",
          "type": "MSQ",
          "options": [
            { "id": "a", "text": "Dynamic array (e.g. ArrayList)" },
            { "id": "b", "text": "Singly linked list (insert at head)" },
            { "id": "c", "text": "Min-heap" },
            { "id": "d", "text": "Hash table with chaining (average case)" }
          ],
          "correctAnswer": ["a", "b", "d"],
          "marks": 2,
          "penalty": 0
        },
        {
          "id": "q-cs-3",
          "text": "The number of distinct binary trees with exactly 3 nodes is:",
          "type": "NAT",
          "options": [],
          "correctAnswer": "5",
          "marks": 1,
          "penalty": 0
        }
      ]
    }
  ]
}
```

> A ready-to-use sample with 12 questions covering all three types is available at `/home/sudeep/sample_exam.json` if you're running this locally.

**Step 2 — Add an entry to `catalog.json`**

Open `public/exams/catalog.json` and prepend an object to the array:

```json
{
  "id": "my-algorithms-test",
  "name": "2025 | Algorithms Practice Test",
  "durationMinutes": 60,
  "totalQuestions": 5,
  "sectionNames": ["General Aptitude", "Computer Science"]
}
```

The rules:
- `id` must match the filename exactly (without `.json`)
- `name` controls which year tab the exam appears under — include the year (`2025`, `2024`, …) for it to be grouped there; omit it and the exam lands under **Other**
- `totalQuestions` is display-only; set it to the actual count
- `sectionNames` is display-only; used only in the project structure doc

**Step 3 — Restart the dev server (or rebuild)**

If you're running `bun run dev`, the server picks up changes to the `public/` folder automatically — just refresh the page. For a production build, run `bun run build` again.

### Schema reference

```
ExamData
├── name            string       — shown in tabs and results
├── durationMinutes number       — countdown timer
└── sections        Section[]
    ├── name        string       — tab label during exam
    └── questions   Question[]
        ├── id              string          — must be unique across the whole file
        ├── text            string          — HTML allowed; use $…$ and $$…$$ for LaTeX
        ├── type            "MCQ"|"MSQ"|"NAT"
        ├── options         Option[]        — required for MCQ/MSQ; empty [] for NAT
        │   ├── id          string          — used as the answer key (e.g. "a", "b")
        │   └── text        string          — option label
        ├── correctAnswer   string          — MCQ/NAT: option id or number
        │                   string[]        — MSQ: array of option ids
        ├── marks           number          — points awarded for a correct answer
        └── penalty         number          — points deducted for wrong MCQ answer
                                              (use 0 for MSQ and NAT)
```

**Typical GATE marking schemes:**

| Marks | MCQ penalty | MSQ penalty | NAT penalty |
|---|---|---|---|
| 1 mark | 0.33 | 0 | 0 |
| 2 marks | 0.67 | 0 | 0 |

---

## Troubleshooting

### `bun: command not found`

Bun was installed but the shell has not picked up the updated `PATH`. Run:

```bash
source ~/.bashrc
# or
source ~/.zshrc
```

Or open a new terminal.

---

### White screen / module errors on first load

Dependencies may not be installed. Run:

```bash
bun install
```

Then restart the dev server.

---

### Math not rendering (shows raw `$...$`)

KaTeX CSS is loaded from a CDN in `index.html`. If you are working offline, the stylesheet will fail to load. Add the KaTeX CSS as a local dependency:

```bash
bun add katex
```

Then import it at the top of `src/main.tsx`:

```ts
import 'katex/dist/katex.min.css'
```

---

### Gemini API error: "API key not valid"

- Make sure you copied the full key starting with `AIza`
- Confirm the key is for a project that has the Gemini API enabled (check [https://ai.google.dev](https://ai.google.dev))
- If you created the key very recently, wait a minute — new keys sometimes take a moment to activate

### Gemini API error: "model not found"

The model ID in your saved settings may be out of date. Open **Setup**, click **Load** to refetch the current model list, select an available model, and save.

---

### Ollama: "Could not reach Ollama"

**Check Ollama is running:**

```bash
curl http://localhost:11434/api/tags
```

If this returns an error, Ollama is not running. Start it:

```bash
OLLAMA_ORIGINS=http://localhost:5173 ollama serve
```

**Check CORS:**

If the `curl` command works but the app still cannot connect, Ollama is running but rejecting the browser request due to CORS. Make sure you started Ollama with `OLLAMA_ORIGINS=http://localhost:5173`.

**Check the URL:**

The default URL is `http://localhost:11434`. If you changed Ollama's port via `OLLAMA_HOST`, update the URL in Setup to match.

---

### Ollama model does not appear in the dropdown

Click the **Load** button after entering the correct URL. If the model still does not appear, confirm it is installed:

```bash
ollama list
```

If it is missing, pull it:

```bash
ollama pull <model-name>
```

---

### In-progress exam lost after page refresh

Exam state is saved to `localStorage` only while `phase === 'exam'`. Practice mode state is intentionally not persisted. If the exam state was lost, check whether your browser has localStorage disabled or is clearing it on close (e.g., "clear cookies on exit" settings).
