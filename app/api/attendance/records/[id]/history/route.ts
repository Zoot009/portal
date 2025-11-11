import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const recordId = parseInt(resolvedParams.id)
    
    if (isNaN(recordId)) {
      return NextResponse.json({ error: 'Invalid record ID' }, { status: 400 })
    }

    // Fetch the attendance record with edit history
    const record = await prisma.attendanceRecord.findUnique({
      where: { id: recordId },
      include: {
        employee: true,
        editHistory: {
          orderBy: { editedAt: 'desc' }
        }
      }
    })

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    // Format the response
    const formattedRecord = {
      id: record.id,
      employeeCode: record.employee?.employeeCode || '',
      employeeName: record.employee?.name || '',
      date: record.date.toISOString().split('T')[0],
      status: record.status,
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime,
      breakInTime: record.breakInTime,
      breakOutTime: record.breakOutTime,
      totalHours: record.totalHours,
      overtime: record.overtime,
      hasBeenEdited: record.hasBeenEdited,
      editHistory: record.editHistory || []
    }

    return NextResponse.json({ record: formattedRecord })

  } catch (error) {
    console.error('Error fetching record history:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}