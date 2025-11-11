import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/penalties - Get penalties
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const employeeId = searchParams.get('employeeId')
    const penaltyType = searchParams.get('penaltyType')
    const isPaid = searchParams.get('isPaid')

    const where: any = {}

    if (employeeId) {
      where.employeeId = parseInt(employeeId)
    }

    if (penaltyType) {
      where.penaltyType = penaltyType
    }

    if (isPaid !== null) {
      where.isPaid = isPaid === 'true'
    }

    const penalties = await prisma.penalty.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            email: true,
            department: true,
          },
        },
        attendanceRecord: true,
      },
      orderBy: {
        penaltyDate: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: penalties,
      count: penalties.length,
    })
  } catch (error: any) {
    console.error('Error fetching penalties:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch penalties',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// POST /api/penalties - Create new penalty
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      employeeId,
      attendanceId,
      penaltyType,
      amount,
      description,
      penaltyDate,
      issuedBy,
      notes,
    } = body

    if (!employeeId || !penaltyType || !description) {
      return NextResponse.json(
        {
          success: false,
          error: 'Employee ID, penalty type, and description are required',
        },
        { status: 400 }
      )
    }

    const penalty = await prisma.penalty.create({
      data: {
        employeeId: parseInt(employeeId),
        attendanceId: attendanceId ? parseInt(attendanceId) : null,
        penaltyType,
        amount: amount ? parseFloat(amount) : null,
        description,
        penaltyDate: penaltyDate ? new Date(penaltyDate) : new Date(),
        issuedBy: issuedBy ? parseInt(issuedBy) : null,
        notes,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: penalty,
        message: 'Penalty created successfully',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating penalty:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create penalty',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
