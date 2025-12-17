import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    // Get the authenticated user's role
    const user = await prisma.employee.findFirst({
      where: { clerkUserId: userId },
      select: { role: true }
    })

    // Only allow ADMIN to preview attendance records
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Only administrators can preview attendance records' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { date } = body

    // Validate required fields
    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      )
    }

    // Parse the date and set it to the beginning of the day
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)
    
    // Set end of day for the same date
    const endDate = new Date(targetDate)
    endDate.setHours(23, 59, 59, 999)

    // Get all records that will be deleted for preview
    const recordsToDelete = await prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: targetDate,
          lte: endDate
        }
      },
      include: {
        employee: {
          select: {
            name: true,
            employeeCode: true,
            department: true,
            designation: true
          }
        }
      },
      orderBy: [
        {
          employee: {
            employeeCode: 'asc'
          }
        }
      ]
    })

    if (recordsToDelete.length === 0) {
      return NextResponse.json(
        { error: 'No attendance records found for the specified date' },
        { status: 404 }
      )
    }

    // Helper function to format time exactly like the main attendance page
    const formatTime = (timeValue: Date | string | null | undefined): string | null => {
      if (!timeValue || timeValue === '-') return null
      try {
        const date = new Date(timeValue)
        if (isNaN(date.getTime())) return null
        
        // Use UTC hours and minutes to match the main table format
        const hours = date.getUTCHours().toString().padStart(2, '0')
        const minutes = date.getUTCMinutes().toString().padStart(2, '0')
        return `${hours}:${minutes}`
      } catch (error) {
        return null
      }
    }

    // Format records for preview
    const previewRecords = recordsToDelete.map(record => ({
      id: record.id,
      employeeName: record.employee.name,
      employeeCode: record.employee.employeeCode,
      department: record.employee.department || 'N/A',
      designation: record.employee.designation || 'N/A',
      status: record.status,
      checkInTime: formatTime(record.checkInTime),
      checkOutTime: formatTime(record.checkOutTime),
      breakInTime: formatTime(record.breakInTime),
      breakOutTime: formatTime(record.breakOutTime),
      totalHours: record.totalHours || 0,
      overtime: record.overtime || 0,
      hasBeenEdited: record.hasBeenEdited,
      importSource: record.importSource || 'manual'
    }))

    return NextResponse.json({
      success: true,
      date: date,
      totalRecords: recordsToDelete.length,
      records: previewRecords,
      summary: {
        present: recordsToDelete.filter(r => r.status === 'PRESENT').length,
        absent: recordsToDelete.filter(r => r.status === 'ABSENT').length,
        late: recordsToDelete.filter(r => r.status === 'LATE').length,
        halfDay: recordsToDelete.filter(r => r.status === 'HALF_DAY').length,
        edited: recordsToDelete.filter(r => r.hasBeenEdited).length
      }
    })

  } catch (error) {
    console.error('Preview records error:', error)
    return NextResponse.json({ 
      error: 'Internal server error while previewing records' 
    }, { status: 500 })
  }
}