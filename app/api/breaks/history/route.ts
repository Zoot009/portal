import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/breaks/history - Get break history for an employee
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const employeeId = searchParams.get('employeeId')
    const date = searchParams.get('date')

    if (!employeeId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Employee ID is required',
        },
        { status: 400 }
      )
    }

    let breakDate: Date | undefined
    if (date) {
      breakDate = new Date(date)
      breakDate.setHours(0, 0, 0, 0)
    }

    // Fetch break history
    const breaks = await prisma.break.findMany({
      where: {
        employeeId: parseInt(employeeId),
        ...(breakDate && { breakDate }),
      },
      orderBy: {
        breakInTime: 'desc',
      },
    })

    // Transform data to match frontend expectations
    const transformedBreaks = breaks.map((breakSession) => ({
      id: breakSession.id,
      employeeId: breakSession.employeeId,
      startTime: breakSession.breakInTime,
      endTime: breakSession.breakOutTime,
      duration: breakSession.breakDuration,
      breakDate: breakSession.breakDate,
      status: breakSession.isActive ? 'ACTIVE' : 'COMPLETED',
      createdAt: breakSession.createdAt,
    }))

    return NextResponse.json({
      success: true,
      data: transformedBreaks,
    })
  } catch (error: any) {
    console.error('Error fetching break history:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch break history',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
