import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filename = searchParams.get('filename')

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      )
    }

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '')
    
    // Construct file path
    const uploadsDir = join(process.cwd(), 'uploads', 'flowace')
    const filepath = join(uploadsDir, sanitizedFilename)

    // Check if file exists
    if (!existsSync(filepath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Read file
    const fileBuffer = await readFile(filepath)
    
    // Return file as download
    return new NextResponse(fileBuffer.toString('utf-8'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${sanitizedFilename}"`,
      },
    })

  } catch (error: any) {
    console.error('Error downloading file:', error)
    return NextResponse.json(
      { error: `Failed to download file: ${error.message}` },
      { status: 500 }
    )
  }
}
