import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deleteAll = searchParams.get('all')

    let deleteCount = 0

    if (deleteAll === 'true') {
      // Delete all Flowace records
      const result = await prisma.flowaceRecord.deleteMany({})
      deleteCount = result.count
    } else {
      return NextResponse.json(
        { error: 'Invalid delete operation' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleteCount} record(s)`,
      count: deleteCount
    })

  } catch (error: any) {
    console.error('Error deleting Flowace records:', error)
    return NextResponse.json(
      { error: `Failed to delete records: ${error.message}` },
      { status: 500 }
    )
  }
}
