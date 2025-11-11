import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { awardPoints, POINT_VALUES } from '@/lib/gamification'

const prisma = new PrismaClient()

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

    // Find the active break
    const activeBreak = await prisma.break.findFirst({
      where: {
        employeeId: parseInt(employeeId),
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
    const startTime = new Date(activeBreak.breakInTime!).getTime()
    const endTime = new Date().getTime()
    const durationMinutes = Math.floor((endTime - startTime) / 60000)

    // Update the break record
    const updatedBreak = await prisma.break.update({
      where: {
        id: activeBreak.id,
      },
      data: {
        breakOutTime: new Date(),
        breakDuration: durationMinutes,
        isActive: false,
      },
    })

    // Award points for compliant break (15-60 minutes)
    if (durationMinutes >= 15 && durationMinutes <= 60) {
      awardPoints({
        employeeId: parseInt(employeeId),
        points: POINT_VALUES.BREAK_COMPLIANT,
        type: 'earned',
        description: 'Compliant break duration',
        reference: `break:${updatedBreak.id}`
      }).catch((err) => console.error('Error awarding break points:', err))
    }

    return NextResponse.json({
      success: true,
      message: 'Break ended successfully',
      data: updatedBreak,
    })
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
