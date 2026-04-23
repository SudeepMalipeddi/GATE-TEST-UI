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
    const ol = doc.querySelector('ol')
    if (!ol) return { questionHtml: doc.body.innerHTML, optionHtmls: [] }

    const optionHtmls = Array.from(ol.querySelectorAll('li')).map(li => li.innerHTML)
    ol.remove()

    // Strip hidden explanation paragraphs
    doc.querySelectorAll('[style*="display:none"], .explanation').forEach(el => el.remove())

    return { questionHtml: doc.body.innerHTML, optionHtmls }
  } catch {
    return { questionHtml: html, optionHtmls: [] }
  }
}
