import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import type { Plugin } from 'vite'

// Dev-only middleware: patches correctAnswer in a public exam JSON file
const examPatchPlugin: Plugin = {
  name: 'exam-patch',
  configureServer(server) {
    server.middlewares.use('/api/patch-answer', (req, res) => {
      if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
      let body = ''
      req.on('data', (chunk: Buffer) => { body += chunk.toString() })
      req.on('end', () => {
        try {
          const { examId, questionId, answer } = JSON.parse(body) as {
            examId: string
            questionId: string
            answer: string | string[]
          }
          const filePath = path.resolve(__dirname, `public/exams/${examId}.json`)
          if (!fs.existsSync(filePath)) {
            res.statusCode = 404
            res.end(JSON.stringify({ error: 'Exam file not found' }))
            return
          }
          const exam = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
          let found = false
          for (const section of exam.sections) {
            for (const q of section.questions) {
              if (q.id === questionId) {
                q.correctAnswer = answer
                found = true
                break
              }
            }
            if (found) break
          }
          if (!found) {
            res.statusCode = 404
            res.end(JSON.stringify({ error: 'Question not found in exam' }))
            return
          }
          fs.writeFileSync(filePath, JSON.stringify(exam))
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true }))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(e) }))
        }
      })
    })
  },
}

export default defineConfig({
  plugins: [react(), examPatchPlugin],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
