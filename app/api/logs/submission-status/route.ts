import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/logs/submission-status - Check if employee has submitted for a specific date
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const employeeId = searchParams.get('employeeId')
    const date = searchParams.get('date')

    if (!employeeId || !date) {
      return NextResponse.json(
        {
          success: false,
          error: 'Employee ID and date are required',
        },
        { status: 400 }
      )
    }

    // Parse date and create range for the entire day
    const startOfDay = new Date(date + 'T00:00:00').toISOString()
    const endOfDay = new Date(date + 'T23:59:59.999').toISOString()

    // Get logs for this date using date range
    const logs = await prisma.log.findMany({
      where: {
        employeeId: parseInt(employeeId),
        logDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        tag: true,
      },
    })

    // Check submission status using date range
    const submissionStatus = await prisma.submissionStatus.findFirst({
      where: {
        employeeId: parseInt(employeeId),
        submissionDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    })

    // Only consider it submitted if there are actual logs AND submission status exists
    const isSubmitted = logs.length > 0 && !!submissionStatus && submissionStatus.isLocked

    // Clean up orphaned submission status (status exists but no logs)
    if (submissionStatus && logs.length === 0) {
      await prisma.submissionStatus.delete({
        where: {
          id: submissionStatus.id,
        },
      })
    }

    return NextResponse.json({
      success: true,
      isSubmitted,
      submissionStatus,
      logs,
      hasData: logs.length > 0,
    })
  } catch (error: any) {
    console.error('Error checking submission status:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check submission status',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
