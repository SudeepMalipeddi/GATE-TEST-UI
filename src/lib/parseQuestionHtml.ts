/**
 * NPTEL question HTML embeds the option list directly in the question text as:
 *   <ol style="list-style-type:upper-alpha"><li>…</li>…</ol>
 * The options[] array contains only letter labels (id:"a", text:"A").
 *
 * This utility splits the two apart so:
 *  - questionHtml  → clean question text without the option list
 *  - optionHtmls   → array of innerHTML strings, one per <li>
 *
 * When optionHtmls is empty the caller falls back to the original question.text
 * and the letter-only options array (non-NPTEL questions, or NAT).
 *
 * Data encoding bug: some questions contain backtick code spans with unencoded
 * angle brackets, e.g. `#include <string>`. The browser's HTML parser silently
 * strips unknown tags like <string>, leaving `#include ` with nothing inside.
 * Fix: convert all `...` spans to <code> elements with angle brackets escaped
 * BEFORE handing the HTML to DOMParser.
 */
function fixBackticks(html: string): string {
  return html.replace(/`([^`\n]+)`/g, (_, code) =>
    `<code>${code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>`
  )
}

export function parseQuestionHtml(html: string): {
  questionHtml: string
  optionHtmls: string[]
} {
  try {
    const doc = new DOMParser().parseFromString(fixBackticks(html), 'text/html')
    // Prefer the NPTEL-style upper-alpha list; fall back to the first ol only
    // if no upper-alpha list exists. This prevents grabbing a numbered list
    // in the question body when the actual options ol comes later.
    const ol = doc.querySelector('ol[style*="upper-alpha"]') ?? doc.querySelector('ol[style*="upper-Alpha"]') ?? null
    if (!ol) return { questionHtml: doc.body.innerHTML, optionHtmls: [] }

    // Raw <li> contents scoped to the matching ol in the original HTML so we
    // don't accidentally pick up <li> elements from other lists in the question body.
    const olSourceMatch = html.match(/<ol[^>]*upper-[aA]lpha[^>]*>([\s\S]*?)<\/ol>/i)
    const rawLiContents = [...(olSourceMatch?.[0] ?? html).matchAll(/<li>([\s\S]*?)<\/li>/gi)].map(m => m[1])

    const optionHtmls = Array.from(ol.querySelectorAll('li')).map((li, i) => {
      if (li.textContent?.trim()) return li.innerHTML
      // Content was silently eaten — escape and use raw source
      const raw = rawLiContents[i] ?? ''
      return raw.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    })

    ol.remove()

    // Strip hidden explanation paragraphs
    doc.querySelectorAll('[style*="display:none"], .explanation').forEach(el => el.remove())

    return { questionHtml: doc.body.innerHTML, optionHtmls }
  } catch {
    return { questionHtml: html, optionHtmls: [] }
  }
}
