import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helper function to calculate current salary cycle dates
function getCurrentSalaryCycle(salaryDayStart: number) {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const currentDay = now.getDate()

  let cycleStartDate: Date
  let cycleEndDate: Date

  if (currentDay >= salaryDayStart) {
    // We're in the current cycle
    cycleStartDate = new Date(currentYear, currentMonth, salaryDayStart)
    cycleEndDate = new Date(currentYear, currentMonth + 1, salaryDayStart - 1)
  } else {
    // We're before the start day, so we're in the previous month's cycle
    cycleStartDate = new Date(currentYear, currentMonth - 1, salaryDayStart)
    cycleEndDate = new Date(currentYear, currentMonth, salaryDayStart - 1)
  }

  return { cycleStartDate, cycleEndDate }
}

// GET /api/admin/penalty-settings - Get penalty settings and current cycle stats
export async function GET(request: NextRequest) {
  try {
    // Get or create default settings
    let settings = await prisma.penaltySettings.findFirst({
      where: { isActive: true },
    })

    if (!settings) {
      settings = await prisma.penaltySettings.create({
        data: {
          warningThreshold: 3,
          penaltyAmount: 500,
          penaltyType: 'POLICY_VIOLATION',
          autoCreate: true,
          salaryDayStart: 6,
          warningMessageTemplate: 'Warning: Incomplete work submission - did not complete mandatory task(s)',
          penaltyMessageTemplate: 'Penalty issued for repeated failure to complete mandatory tasks ({count} warnings in current cycle)',
        },
      })
    }

    // Calculate current salary cycle
    const { cycleStartDate, cycleEndDate } = getCurrentSalaryCycle(settings.salaryDayStart)

    // Get employees with warnings in current cycle
    const employeesWithWarnings = await prisma.warning.groupBy({
      by: ['employeeId'],
      where: {
        warningType: 'WORK_QUALITY',
        warningDate: {
          gte: cycleStartDate,
          lte: cycleEndDate,
        },
        isActive: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    })

    // Get employee details for those with warnings
    const employeeIds = employeesWithWarnings.map((w) => w.employeeId)
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
      },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        email: true,
        department: true,
      },
    })

    // Combine data
    const employeeStats = employeesWithWarnings.map((warning) => {
      const employee = employees.find((e) => e.id === warning.employeeId)
      return {
        employee,
        warningCount: warning._count.id,
        isAtRisk: warning._count.id >= settings!.warningThreshold - 1,
        willGetPenalty: warning._count.id >= settings!.warningThreshold,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        settings,
        currentCycle: {
          startDate: cycleStartDate,
          endDate: cycleEndDate,
        },
        stats: {
          totalEmployeesWithWarnings: employeeStats.length,
          employeesAtRisk: employeeStats.filter((e) => e.isAtRisk).length,
          employeesOverThreshold: employeeStats.filter((e) => e.willGetPenalty).length,
        },
        employees: employeeStats,
      },
    })
  } catch (error: any) {
    console.error('Error fetching penalty settings:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch penalty settings',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// POST /api/admin/penalty-settings - Update penalty settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      warningThreshold,
      penaltyAmount,
      penaltyType,
      autoCreate,
      warningMessageTemplate,
      penaltyMessageTemplate,
      salaryDayStart,
    } = body

    // Validation
    if (warningThreshold && (warningThreshold < 1 || warningThreshold > 10)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Warning threshold must be between 1 and 10',
        },
        { status: 400 }
      )
    }

    if (penaltyAmount && penaltyAmount < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Penalty amount must be non-negative',
        },
        { status: 400 }
      )
    }

    if (salaryDayStart && (salaryDayStart < 1 || salaryDayStart > 28)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Salary day start must be between 1 and 28',
        },
        { status: 400 }
      )
    }

    // Find existing settings
    let settings = await prisma.penaltySettings.findFirst({
      where: { isActive: true },
    })

    if (settings) {
      // Update existing
      settings = await prisma.penaltySettings.update({
        where: { id: settings.id },
        data: {
          ...(warningThreshold !== undefined && { warningThreshold }),
          ...(penaltyAmount !== undefined && { penaltyAmount }),
          ...(penaltyType && { penaltyType }),
          ...(autoCreate !== undefined && { autoCreate }),
          ...(warningMessageTemplate && { warningMessageTemplate }),
          ...(penaltyMessageTemplate && { penaltyMessageTemplate }),
          ...(salaryDayStart !== undefined && { salaryDayStart }),
        },
      })
    } else {
      // Create new
      settings = await prisma.penaltySettings.create({
        data: {
          warningThreshold: warningThreshold || 3,
          penaltyAmount: penaltyAmount || 500,
          penaltyType: penaltyType || 'POLICY_VIOLATION',
          autoCreate: autoCreate !== undefined ? autoCreate : true,
          warningMessageTemplate,
          penaltyMessageTemplate,
          salaryDayStart: salaryDayStart || 6,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: settings,
      message: 'Penalty settings updated successfully',
    })
  } catch (error: any) {
    console.error('Error updating penalty settings:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update penalty settings',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
