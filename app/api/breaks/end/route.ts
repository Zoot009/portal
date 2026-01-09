import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/breaks/end - End the active break session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId } = body

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
    })

    if (!activeBreak) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active break session found',
        },
        { status: 400 }
      )
    }

    // Calculate duration in minutes
    const now = new Date()
    const startTime = new Date(activeBreak.breakInTime!).getTime()
    const endTime = now.getTime()
    const durationMinutes = Math.max(0, Math.floor((endTime - startTime) / 60000))

    // Update the break record
    const updatedBreak = await prisma.break.update({
      where: {
        id: activeBreak.id,
      },
      data: {
        breakOutTime: now,
        breakDuration: durationMinutes,
        isActive: false,
      },
    })

    // Gamification features have been disabled
    // Points for compliant breaks are no longer awarded

    return NextResponse.json(
      {
        success: true,
        message: 'Break ended successfully',
        data: {
          ...updatedBreak,
          breakInTime: updatedBreak.breakInTime?.toISOString(),
          breakOutTime: updatedBreak.breakOutTime?.toISOString(),
          createdAt: updatedBreak.createdAt?.toISOString(),
        },
        serverTime: now.toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    )
  } catch (error: any) {
    console.error('Error ending break:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to end break',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
