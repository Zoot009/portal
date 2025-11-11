import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/attendance - Get attendance records with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const employeeId = searchParams.get('employeeId')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}

    if (date) {
      where.date = new Date(date)
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    if (employeeId) {
      where.employeeId = parseInt(employeeId)
    }

    if (status && status !== 'all') {
      where.status = status
    }

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            email: true,
            department: true,
            designation: true,
          },
        },
        leaveRequest: true,
      },
      orderBy: {
        date: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: attendanceRecords,
      count: attendanceRecords.length,
    })
  } catch (error: any) {
    console.error('Error fetching attendance records:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch attendance records',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// POST /api/attendance - Create new attendance record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      employeeId,
      date,
      status,
      checkInTime,
      checkOutTime,
      lunchOutTime,
      lunchInTime,
      breakOutTime,
      breakInTime,
      totalHours,
      overtime,
      shift,
      shiftStart,
      importSource = 'manual',
    } = body

    // Validate required fields
    if (!employeeId || !date) {
      return NextResponse.json(
        {
          success: false,
          error: 'Employee ID and date are required',
        },
        { status: 400 }
      )
    }

    // Check if attendance record already exists
    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        employee_date_attendance: {
          employeeId: parseInt(employeeId),
          date: new Date(date),
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Attendance record already exists for this employee and date',
        },
        { status: 400 }
      )
    }

    const attendanceRecord = await prisma.attendanceRecord.create({
      data: {
        employeeId: parseInt(employeeId),
        date: new Date(date),
        status: status || 'ABSENT',
        checkInTime: checkInTime ? new Date(checkInTime) : null,
        checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
        lunchOutTime: lunchOutTime ? new Date(lunchOutTime) : null,
        lunchInTime: lunchInTime ? new Date(lunchInTime) : null,
        breakOutTime: breakOutTime ? new Date(breakOutTime) : null,
        breakInTime: breakInTime ? new Date(breakInTime) : null,
        totalHours: totalHours || null,
        overtime: overtime || 0,
        shift: shift || null,
        shiftStart: shiftStart || null,
        importSource,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: attendanceRecord,
        message: 'Attendance record created successfully',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating attendance record:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create attendance record',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// PUT /api/attendance - Bulk update attendance records
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { records } = body

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Records array is required and must not be empty',
        },
        { status: 400 }
      )
    }

    const results = await Promise.allSettled(
      records.map(async (record: any) => {
        const { id, ...updateData } = record

        return prisma.attendanceRecord.update({
          where: { id: parseInt(id) },
          data: {
            ...updateData,
            hasBeenEdited: true,
            updatedAt: new Date(),
          },
        })
      })
    )

    const successful = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return NextResponse.json({
      success: true,
      message: `Updated ${successful} records successfully`,
      stats: {
        total: records.length,
        successful,
        failed,
      },
    })
  } catch (error: any) {
    console.error('Error bulk updating attendance records:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to bulk update attendance records',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
