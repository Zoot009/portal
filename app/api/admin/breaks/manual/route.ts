import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@clerk/nextjs/server'

const prisma = new PrismaClient()

// POST /api/admin/breaks/manual - Create a manual break entry
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get admin user info
    const adminUser = await prisma.employee.findFirst({
      where: { clerkUserId: userId },
      select: { id: true, name: true, role: true }
    })

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { employeeId, breakDate, breakInTime, breakOutTime, notes } = body

    console.log('Manual break entry request:', {
      employeeId,
      breakDate,
      breakInTime,
      breakOutTime,
      notes,
      adminId: adminUser.id
    })

    // Validate required fields
    if (!employeeId || !breakDate || !breakInTime || !breakOutTime) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: employeeId, breakDate, breakInTime, breakOutTime'
        },
        { status: 400 }
      )
    }

    // Validate employee exists
    const employee = await prisma.employee.findFirst({
      where: { id: parseInt(employeeId) },
      select: { id: true, name: true, employeeCode: true }
    })

    if (!employee) {
      return NextResponse.json(
        {
          success: false,
          error: 'Employee not found'
        },
        { status: 404 }
      )
    }

    // Combine date and times to create full datetime objects
    // Parse the date and time components separately to avoid timezone issues
    const [year, month, day] = breakDate.split('-').map(Number)
    const [inHour, inMinute] = breakInTime.split(':').map(Number)
    const [outHour, outMinute] = breakOutTime.split(':').map(Number)
    
    const breakInDateTime = new Date(year, month - 1, day, inHour, inMinute, 0)
    const breakOutDateTime = new Date(year, month - 1, day, outHour, outMinute, 0)

    // Validate times
    if (breakInDateTime >= breakOutDateTime) {
      return NextResponse.json(
        {
          success: false,
          error: 'Break end time must be after start time'
        },
        { status: 400 }
      )
    }

    // Calculate duration in minutes
    const durationMinutes = Math.floor((breakOutDateTime.getTime() - breakInDateTime.getTime()) / 60000)

    // Check for overlapping breaks on the same date
    const breakDateObj = new Date(breakDate)
    const existingBreak = await prisma.break.findFirst({
      where: {
        employeeId: parseInt(employeeId),
        breakDate: breakDateObj,
        OR: [
          {
            AND: [
              { breakInTime: { lte: breakInDateTime } },
              { breakOutTime: { gte: breakInDateTime } }
            ]
          },
          {
            AND: [
              { breakInTime: { lte: breakOutDateTime } },
              { breakOutTime: { gte: breakOutDateTime } }
            ]
          },
          {
            AND: [
              { breakInTime: { gte: breakInDateTime } },
              { breakOutTime: { lte: breakOutDateTime } }
            ]
          }
        ]
      }
    })

    if (existingBreak) {
      return NextResponse.json(
        {
          success: false,
          error: 'This time period overlaps with an existing break entry'
        },
        { status: 400 }
      )
    }

    // Create the manual break entry
    const newBreak = await prisma.break.create({
      data: {
        employeeId: parseInt(employeeId),
        breakDate: breakDateObj,
        breakInTime: breakInDateTime,
        breakOutTime: breakOutDateTime,
        breakDuration: durationMinutes,
        isActive: false,
        isManualEntry: true,
        manualEntryNotes: notes || null,
        manualEntryBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date()
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

    console.log('Manual break entry created:', newBreak.id)

    return NextResponse.json({
      success: true,
      message: `Manual break entry created for ${employee.name} (${employee.employeeCode})`,
      data: {
        id: newBreak.id,
        employeeId: newBreak.employeeId,
        employeeName: employee.name,
        employeeCode: employee.employeeCode,
        breakDate: newBreak.breakDate,
        breakInTime: newBreak.breakInTime,
        breakOutTime: newBreak.breakOutTime,
        duration: newBreak.breakDuration,
        isManualEntry: true,
        manualEntryBy: adminUser.name,
        notes: newBreak.manualEntryNotes
      }
    })

  } catch (error: any) {
    console.error('Error creating manual break entry:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create manual break entry',
        message: error.message
      },
      { status: 500 }
    )
  }
}