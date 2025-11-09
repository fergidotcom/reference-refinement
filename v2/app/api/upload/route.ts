import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/db'
import { parseDocx } from '@/lib/analyzer/docx-parser'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const authorName = formData.get('authorName') as string

    if (!file || !title || !authorName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate file type
    const fileType = file.name.split('.').pop()?.toLowerCase()
    if (!['docx', 'pdf', 'txt'].includes(fileType || '')) {
      return NextResponse.json(
        { error: 'Invalid file type. Must be DOCX, PDF, or TXT' },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${timestamp}_${sanitizedFilename}`
    const filePath = join(uploadsDir, filename)

    // Save file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Parse document (for now, only DOCX supported fully)
    let parsedData = null
    if (fileType === 'docx') {
      try {
        parsedData = await parseDocx(filePath)
      } catch (error) {
        console.error('DOCX parsing error:', error)
        // Continue anyway - we'll parse later if needed
      }
    }

    // Create manuscript record in database
    const manuscript = await prisma.manuscript.create({
      data: {
        title,
        authorName,
        filePath: `/uploads/${filename}`,
        fileType: fileType || 'unknown',
        status: 'uploaded',
        ridSchemeType: 'sequential', // Default - will be detected/configured later
        ridNextAvailable: 1,
      },
    })

    return NextResponse.json({
      manuscriptId: manuscript.id,
      filename,
      wordCount: parsedData?.wordCount || 0,
      paragraphs: parsedData?.paragraphs.length || 0,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

// Increase body size limit
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '500mb',
    },
  },
}
