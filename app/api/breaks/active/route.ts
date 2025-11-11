import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/breaks/active - Get the active break session for an employee
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const employeeId = searchParams.get('employeeId')

    if (!employeeId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Employee ID is required',
        },
        { status: 400 }
      )
    }

    // Find the active break
    const activeBreak = await prisma.break.findFirst({
      where: {
        employeeId: parseInt(employeeId),
        isActive: true,
      },
      orderBy: {
        breakInTime: 'desc',
      },
    })

    // Transform data to match frontend expectations
    const transformedBreak = activeBreak ? {
      id: activeBreak.id,
      employeeId: activeBreak.employeeId,
      startTime: activeBreak.breakInTime,
      endTime: activeBreak.breakOutTime,
      duration: activeBreak.breakDuration,
      breakDate: activeBreak.breakDate,
      status: activeBreak.isActive ? 'ACTIVE' : 'COMPLETED',
      createdAt: activeBreak.createdAt,
    } : null

    return NextResponse.json({
      success: true,
      data: transformedBreak,
    })
  } catch (error: any) {
    console.error('Error fetching active break:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch active break',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
