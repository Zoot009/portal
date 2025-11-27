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
    const { recordId } = body

    // Validate required fields
    if (!recordId) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      )
    }

    // Fetch the record to be deleted (for logging purposes)
    const recordToDelete = await prisma.attendanceRecord.findUnique({
      where: { id: parseInt(recordId) },
      include: {
        employee: {
          select: {
            name: true,
            employeeCode: true
          }
        }
      }
    })

    if (!recordToDelete) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      )
    }

    // Delete the attendance record
    await prisma.attendanceRecord.delete({
      where: { id: parseInt(recordId) }
    })

    console.log(`Attendance record ${recordId} deleted by ${user.name} (${user.role})`)
    
    return NextResponse.json({
      success: true,
      message: `Attendance record for ${recordToDelete.employee?.name} on ${recordToDelete.date.toLocaleDateString()} has been deleted successfully`
    })

  } catch (error: any) {
    console.error('Error deleting attendance record:', error)
    
    // Handle specific Prisma errors
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Attendance record not found or already deleted' },
        { status: 404 }
      )
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete record due to existing dependencies' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: `Failed to delete attendance record: ${error.message}` },
      { status: 500 }
    )
  }
}

// GET method to check if a record can be deleted
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.employee.findFirst({
      where: { clerkUserId: userId },
      select: { role: true }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { canDelete: false, reason: 'Only administrators can delete attendance records' }
      )
    }

    const { searchParams } = new URL(request.url)
    const recordId = searchParams.get('recordId')

    if (!recordId) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      )
    }

    const record = await prisma.attendanceRecord.findUnique({
      where: { id: parseInt(recordId) },
      include: {
        penalties: true,
        employee: {
          select: {
            name: true,
            employeeCode: true
          }
        }
      }
    })

    if (!record) {
      return NextResponse.json(
        { canDelete: false, reason: 'Record not found' }
      )
    }

    // Check if there are any dependencies
    const hasPenalties = record.penalties && record.penalties.length > 0

    return NextResponse.json({
      canDelete: true,
      record: {
        employeeName: record.employee?.name,
        employeeCode: record.employee?.employeeCode,
        date: record.date,
        status: record.status
      },
      warnings: hasPenalties ? ['This record has associated penalties that will also be affected'] : []
    })

  } catch (error: any) {
    console.error('Error checking delete permission:', error)
    return NextResponse.json(
      { error: `Failed to check delete permission: ${error.message}` },
      { status: 500 }
    )
  }
}
