import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/admin/breaks - Get all employee breaks for admin
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const editedOnly = searchParams.get('edited') === 'true'

    const whereClause: any = {}

    // Filter by date if provided
    if (date) {
      const selectedDate = new Date(date)
      selectedDate.setHours(0, 0, 0, 0)
      whereClause.breakDate = selectedDate
    }

    // Filter only edited breaks if requested
    if (editedOnly) {
      whereClause.hasBeenEdited = true
    }

    // Fetch all breaks with employee information
    const breaks = await prisma.break.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
          },
        },
        editHistory: {
          orderBy: { editedAt: 'desc' },
        },
      },
      orderBy: [
        { breakDate: 'desc' },
        { breakInTime: 'desc' },
      ],
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
      hasBeenEdited: breakSession.hasBeenEdited,
      editReason: breakSession.editReason,
      updatedAt: breakSession.updatedAt,
      editHistory: breakSession.editHistory,
      employee: breakSession.employee,
    }))

    return NextResponse.json({
      success: true,
      data: transformedBreaks,
    })
  } catch (error: any) {
    console.error('Error fetching breaks:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch breaks',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
