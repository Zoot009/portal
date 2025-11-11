import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/employee/unviewed-penalties - Check if employee has unviewed penalties or warnings
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

    const empId = parseInt(employeeId)

    // Check for unviewed penalties
    const unviewedPenalties = await prisma.penalty.findMany({
      where: {
        employeeId: empId,
        viewedByEmployee: false,
      },
      select: {
        id: true,
        penaltyType: true,
        description: true,
        penaltyDate: true,
        amount: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Check for unviewed warnings
    const unviewedWarnings = await prisma.warning.findMany({
      where: {
        employeeId: empId,
        viewedByEmployee: false,
      },
      select: {
        id: true,
        warningType: true,
        warningMessage: true,
        warningDate: true,
        severity: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const hasUnviewed = unviewedPenalties.length > 0 || unviewedWarnings.length > 0

    return NextResponse.json({
      success: true,
      hasUnviewed,
      data: {
        penalties: unviewedPenalties,
        warnings: unviewedWarnings,
        penaltyCount: unviewedPenalties.length,
        warningCount: unviewedWarnings.length,
      },
    })
  } catch (error: any) {
    console.error('Error fetching unviewed penalties/warnings:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch unviewed items',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// POST /api/employee/unviewed-penalties - Mark penalties/warnings as viewed
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, type } = body

    if (!employeeId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Employee ID is required',
        },
        { status: 400 }
      )
    }

    const empId = parseInt(employeeId)
    const now = new Date()

    // Mark all as viewed
    if (type === 'penalties' || type === 'both' || !type) {
      await prisma.penalty.updateMany({
        where: {
          employeeId: empId,
          viewedByEmployee: false,
        },
        data: {
          viewedByEmployee: true,
          viewedAt: now,
        },
      })
    }

    if (type === 'warnings' || type === 'both' || !type) {
      await prisma.warning.updateMany({
        where: {
          employeeId: empId,
          viewedByEmployee: false,
        },
        data: {
          viewedByEmployee: true,
          viewedAt: now,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Items marked as viewed successfully',
    })
  } catch (error: any) {
    console.error('Error marking items as viewed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to mark items as viewed',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
