import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/warnings - Get warnings
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const employeeId = searchParams.get('employeeId')
    const warningType = searchParams.get('warningType')
    const isActive = searchParams.get('isActive')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}

    if (employeeId) {
      where.employeeId = parseInt(employeeId)
    }

    if (warningType) {
      where.warningType = warningType
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    if (startDate && endDate) {
      where.warningDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const warnings = await prisma.warning.findMany({
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
      },
      orderBy: {
        warningDate: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: warnings,
      count: warnings.length,
    })
  } catch (error: any) {
    console.error('Error fetching warnings:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch warnings',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// POST /api/warnings - Create new warning
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      employeeId,
      warningType,
      warningMessage,
      severity = 'LOW',
      issuedBy,
      relatedDate,
    } = body

    if (!employeeId || !warningType || !warningMessage) {
      return NextResponse.json(
        {
          success: false,
          error: 'Employee ID, warning type, and message are required',
        },
        { status: 400 }
      )
    }

    // Create date in IST timezone
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istDate = new Date(now.getTime() + istOffset);

    const warning = await prisma.warning.create({
      data: {
        employeeId: parseInt(employeeId),
        warningType,
        warningDate: istDate,
        warningMessage,
        severity,
        issuedBy: issuedBy ? parseInt(issuedBy) : null,
        relatedDate: relatedDate ? new Date(relatedDate) : null,
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

    // Check for automatic penalty creation (run in background)
    if (warningType === 'WORK_QUALITY') {
      checkAndCreateAutomaticPenalty(parseInt(employeeId)).catch((err: any) => {
        console.error('Error checking automatic penalty:', err)
      })
    }

    return NextResponse.json(
      {
        success: true,
        data: warning,
        message: 'Warning issued successfully',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating warning:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create warning',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// Helper function to check and create automatic penalty
async function checkAndCreateAutomaticPenalty(employeeId: number) {
  try {
    // Get penalty settings
    const settings = await prisma.penaltySettings.findFirst({
      where: { isActive: true },
    })

    if (!settings || !settings.autoCreate) {
      return
    }

    // Calculate current salary cycle
    const salaryDayStart = settings.salaryDayStart
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const currentDay = now.getDate()

    let cycleStartDate: Date
    let cycleEndDate: Date

    if (currentDay >= salaryDayStart) {
      cycleStartDate = new Date(currentYear, currentMonth, salaryDayStart)
      cycleEndDate = new Date(currentYear, currentMonth + 1, salaryDayStart - 1)
    } else {
      cycleStartDate = new Date(currentYear, currentMonth - 1, salaryDayStart)
      cycleEndDate = new Date(currentYear, currentMonth, salaryDayStart - 1)
    }

    // Count warnings for this employee in the current salary cycle
    const warningCount = await prisma.warning.count({
      where: {
        employeeId,
        warningType: 'WORK_QUALITY',
        warningDate: {
          gte: cycleStartDate,
          lte: cycleEndDate,
        },
        isActive: true,
      },
    })

    // Check if threshold is reached
    if (warningCount >= settings.warningThreshold) {
      // Check if penalty already exists for this cycle to avoid duplicates
      const existingPenalty = await prisma.penalty.findFirst({
        where: {
          employeeId,
          penaltyType: settings.penaltyType as any,
          penaltyDate: {
            gte: cycleStartDate,
            lte: cycleEndDate,
          },
          description: {
            contains: 'automatic penalty',
          },
        },
      })

      if (existingPenalty) {
        return
      }

      // Create automatic penalty
      const penaltyMessage = settings.penaltyMessageTemplate
        ? settings.penaltyMessageTemplate.replace('{count}', warningCount.toString())
        : `Automatic penalty: Received ${warningCount} warnings in current salary cycle for not completing mandatory tasks`

      const penalty = await prisma.penalty.create({
        data: {
          employeeId,
          penaltyType: settings.penaltyType as any,
          amount: settings.penaltyAmount,
          description: penaltyMessage,
          penaltyDate: new Date(),
          issuedBy: null, // System-generated
          notes: `Automatically generated after reaching ${settings.warningThreshold} warnings in salary cycle (${cycleStartDate.toLocaleDateString()} - ${cycleEndDate.toLocaleDateString()})`,
        },
      })

      // Create notification for the employee
      await prisma.notification.create({
        data: {
          employeeId,
          type: 'PENALTY_ISSUED',
          title: 'Automatic Penalty Issued',
          message: `You have been issued a penalty of ₹${settings.penaltyAmount} for receiving ${warningCount} warnings in the current salary cycle.`,
          priority: 'HIGH',
          relatedId: penalty.id,
          relatedType: 'penalty',
        },
      })
    }
  } catch (error) {
    console.error('Error in checkAndCreateAutomaticPenalty:', error)
  }
}
