import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST /api/breaks/start - Start a new break session
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

    // Check if there's already an active break
    const activeBreak = await prisma.break.findFirst({
      where: {
        employeeId: parseInt(employeeId),
        isActive: true,
      },
    })

    if (activeBreak) {
      return NextResponse.json(
        {
          success: false,
          error: 'You already have an active break session',
        },
        { status: 400 }
      )
    }

    // Create new break session
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const newBreak = await prisma.break.create({
      data: {
        employeeId: parseInt(employeeId),
        breakDate: today,
        breakInTime: new Date(),
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Break started successfully',
      data: newBreak,
    })
  } catch (error: any) {
    console.error('Error starting break:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start break',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
