import mammoth from 'mammoth'
import { readFile } from 'fs/promises'

export interface ParsedDocument {
  html: string
  text: string
  paragraphs: string[]
  wordCount: number
}

/**
 * Parse DOCX file using mammoth
 * Preserves structure while filtering artifacts (headers, footers, TOC)
 */
export async function parseDocx(filePath: string): Promise<ParsedDocument> {
  try {
    const buffer = await readFile(filePath)

    // Convert DOCX to HTML (preserves structure better than raw text)
    const result = await mammoth.convertToHtml(
      { buffer },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Title'] => h1.title:fresh",
        ],
      }
    )

    const html = result.value

    // Also get plain text version
    const textResult = await mammoth.extractRawText({ buffer })
    const text = textResult.value

    // Split into paragraphs (basic approach - will refine later)
    const paragraphs = text
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0)

    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length

    return {
      html,
      text,
      paragraphs,
      wordCount,
    }
  } catch (error) {
    throw new Error(
      `Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
