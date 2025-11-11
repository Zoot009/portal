import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const uploadEntry = await request.json()

    console.log('Received upload entry:', uploadEntry)

    // Save to database using Prisma
    const savedEntry = await prisma.uploadHistory.create({
      data: {
        filename: uploadEntry.filename,
        fileType: uploadEntry.fileType || 'flowace_csv',
        status: uploadEntry.status || 'COMPLETED',
        totalRecords: uploadEntry.totalRecords || 0,
        processedRecords: uploadEntry.processedRecords || 0,
        errorRecords: uploadEntry.errorRecords || 0,
        uploadedAt: new Date(uploadEntry.uploadedAt || new Date()),
        completedAt: uploadEntry.completedAt ? new Date(uploadEntry.completedAt) : null,
        batchId: uploadEntry.batchId || uploadEntry.id,
        errors: uploadEntry.errors || null,
        summary: uploadEntry.summary || null,
        uploadedBy: uploadEntry.uploadedBy || null,
      }
    })

    console.log('Successfully saved upload history to database')

    return NextResponse.json({
      success: true,
      message: 'Upload history saved successfully',
      data: savedEntry
    })

  } catch (error: any) {
    console.error('Error saving upload history:', error)
    return NextResponse.json(
      { error: 'Failed to save upload history', message: error.message },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Fetch from database using Prisma
    const history = await prisma.uploadHistory.findMany({
      orderBy: {
        uploadedAt: 'desc'
      }
    })

    console.log('Fetched upload history from database:', history?.length || 0)

    return NextResponse.json({
      success: true,
      history: history || []
    })

  } catch (error: any) {
    console.error('Error fetching upload history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch upload history', message: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Upload ID is required' },
        { status: 400 }
      )
    }

    // Delete from database using Prisma
    // Try to find by batchId first (string), then by id (number)
    let deletedEntry
    
    try {
      deletedEntry = await prisma.uploadHistory.delete({
        where: { batchId: id }
      })
    } catch {
      // If not found by batchId, try by numeric id
      const numericId = parseInt(id)
      if (!isNaN(numericId)) {
        deletedEntry = await prisma.uploadHistory.delete({
          where: { id: numericId }
        })
      }
    }

    if (!deletedEntry) {
      return NextResponse.json(
        { error: 'Upload history not found' },
        { status: 404 }
      )
    }

    console.log('Successfully deleted upload history from database:', id)

    return NextResponse.json({
      success: true,
      message: 'Upload history deleted successfully'
    })

  } catch (error: any) {
    console.error('Error deleting upload history:', error)
    return NextResponse.json(
      { error: 'Failed to delete upload history', message: error.message },
      { status: 500 }
    )
  }
}