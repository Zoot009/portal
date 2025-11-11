import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filename = searchParams.get('filename')
    const limit = parseInt(searchParams.get('limit') || '100')

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
    const fileContent = await readFile(filepath, 'utf-8')
    const lines = fileContent.split('\n')
    
    // Find header row
    let headerIndex = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Member Name,Member Email')) {
        headerIndex = i
        break
      }
    }

    if (headerIndex === -1) {
      return NextResponse.json(
        { error: 'Invalid CSV format: Member data header not found' },
        { status: 400 }
      )
    }

    // Parse headers
    const headers = lines[headerIndex].split(',').map(h => h.trim())
    
    // Parse data rows (limit to requested number)
    const dataLines = lines.slice(headerIndex + 1, headerIndex + 1 + limit)
    const rows = []
    
    for (const line of dataLines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith(',')) continue
      
      const values = trimmed.split(',').map(v => v.trim())
      if (values.length < headers.length) continue
      
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || '-'
      })
      
      // Skip if no member name
      if (!row['Member Name'] || row['Member Name'] === '-') continue
      
      rows.push(row)
    }

    return NextResponse.json({
      success: true,
      filename: sanitizedFilename,
      headers,
      rows,
      totalRows: rows.length,
      totalLines: lines.length,
      hasMore: lines.length > (headerIndex + 1 + limit)
    })

  } catch (error: any) {
    console.error('Error previewing file:', error)
    return NextResponse.json(
      { error: `Failed to preview file: ${error.message}` },
      { status: 500 }
    )
  }
}
