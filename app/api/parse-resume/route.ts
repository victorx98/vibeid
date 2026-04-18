import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) {
      return Response.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = file.name.toLowerCase()
    let text = ''

    if (fileName.endsWith('.pdf')) {
      const { extractText } = await import('unpdf')
      const { text: pdfPages, totalPages } = await extractText(new Uint8Array(buffer))
      text = Array.isArray(pdfPages) ? pdfPages.join('\n') : String(pdfPages)
      console.log(`Parsed PDF: ${totalPages} pages, ${text.length} chars`)
    } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else {
      return Response.json({ error: 'Unsupported file format' }, { status: 400 })
    }

    const trimmed = text.trim()
    if (!trimmed || trimmed.length < 10) {
      return Response.json({ error: '无法从文件中提取文本内容，请确保文件包含可选择的文字' }, { status: 400 })
    }

    return Response.json({ text: trimmed, pageCount: 1 })
  } catch (error) {
    console.error('Parse error:', error)
    return Response.json({ error: 'Failed to parse resume', detail: String(error) }, { status: 500 })
  }
}
