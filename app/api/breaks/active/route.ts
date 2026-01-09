import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    // Validate employeeId is a valid number
    const numericEmployeeId = Number(employeeId)
    if (isNaN(numericEmployeeId) || numericEmployeeId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid employee ID format. Expected a positive number.',
        },
        { status: 400 }
      )
    }

    // Find the active break
    const activeBreak = await prisma.break.findFirst({
      where: {
        employeeId: numericEmployeeId,
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
      startTime: activeBreak.breakInTime?.toISOString(), // Ensure ISO string format
      endTime: activeBreak.breakOutTime?.toISOString() || null,
      duration: activeBreak.breakDuration,
      breakDate: activeBreak.breakDate,
      status: activeBreak.isActive ? 'ACTIVE' : 'COMPLETED',
      createdAt: activeBreak.createdAt?.toISOString(),
      serverTime: new Date().toISOString(), // Include server time for sync validation
    } : null

    return NextResponse.json(
      {
        success: true,
        data: transformedBreak,
        serverTime: new Date().toISOString(), // Also at root level
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
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
