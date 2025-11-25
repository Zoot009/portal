import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// POST - Bulk delete attendance records by date
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    const user = await currentUser()
    
    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is ADMIN
    const userRole = user.publicMetadata?.role as string
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can delete attendance records' }, { status: 403 })
    }

    const body = await request.json()
    const { date } = body

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    // Parse the date and create start and end of day
    const targetDate = new Date(date)
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Get count of records to be deleted
    const recordsToDelete = await prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        employee: {
          select: {
            name: true,
            employeeCode: true,
          },
        },
      },
    })

    const deleteCount = recordsToDelete.length

    if (deleteCount === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No records found for the selected date',
        deletedCount: 0 
      })
    }

    // Permanently delete all attendance records for the selected date
    // This will cascade delete related records (edit history, penalties, etc.)
    await prisma.attendanceRecord.deleteMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    })

    return NextResponse.json({ 
      success: true, 
      message: `Successfully deleted ${deleteCount} attendance record${deleteCount !== 1 ? 's' : ''} for ${targetDate.toLocaleDateString()}`,
      deletedCount: deleteCount,
      date: targetDate.toISOString().split('T')[0],
      records: recordsToDelete.map(r => ({
        employeeName: r.employee.name,
        employeeCode: r.employee.employeeCode,
        status: r.status,
      })),
    })
  } catch (error) {
    console.error('Error bulk deleting attendance records:', error)
    return NextResponse.json({ error: 'Failed to delete records' }, { status: 500 })
  }
}
