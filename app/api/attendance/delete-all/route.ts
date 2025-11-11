import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE() {
  try {
    // Delete all attendance records from the database
    const deletedRecords = await prisma.attendanceRecord.deleteMany({})
    
    return NextResponse.json({ 
      success: true,
      message: `Successfully deleted ${deletedRecords.count} attendance records`,
      deletedCount: deletedRecords.count
    })

  } catch (error) {
    console.error('Delete all records error:', error)
    return NextResponse.json({ 
      error: 'Internal server error while deleting records' 
    }, { status: 500 })
  }
}