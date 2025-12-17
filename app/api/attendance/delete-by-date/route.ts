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
      select: { role: true, name: true, id: true }
    })

    // Only allow ADMIN to delete attendance records
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Only administrators can delete attendance records' },
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

    // First, count how many records will be deleted
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
            employeeCode: true
          }
        }
      }
    })

    if (recordsToDelete.length === 0) {
      return NextResponse.json(
        { error: 'No attendance records found for the specified date' },
        { status: 404 }
      )
    }

    // Log the deletion attempt
    console.log(`Admin ${user.name} (ID: ${user.id}) is deleting ${recordsToDelete.length} attendance records for date ${date}`)
    
    // Delete all attendance records for the specified date
    const result = await prisma.attendanceRecord.deleteMany({
      where: {
        date: {
          gte: targetDate,
          lte: endDate
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.count} attendance records for date ${date}`,
      deletedCount: result.count,
      deletedRecords: recordsToDelete.map(record => ({
        employeeName: record.employee.name,
        employeeCode: record.employee.employeeCode,
        status: record.status
      }))
    })

  } catch (error) {
    console.error('Delete by date error:', error)
    return NextResponse.json({ 
      error: 'Internal server error while deleting records by date' 
    }, { status: 500 })
  }
}