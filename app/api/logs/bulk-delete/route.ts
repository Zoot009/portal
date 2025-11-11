import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// DELETE /api/logs/bulk-delete - Delete all logs for a specific employee on a specific date
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, logDate } = body

    if (!employeeId || !logDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Employee ID and log date are required',
        },
        { status: 400 }
      )
    }

    // Create date range for the entire day (start of day to end of day)
    const startOfDay = new Date(logDate + 'T00:00:00').toISOString()
    const endOfDay = new Date(logDate + 'T23:59:59.999').toISOString()

    // Perform bulk delete in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // First, find all logs to get their exact dates
      const logsToDelete = await tx.log.findMany({
        where: {
          employeeId: parseInt(employeeId),
          logDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        select: {
          id: true,
          logDate: true,
        },
      })

      // Delete all logs for this employee on this date (using date range)
      const deleteResult = await tx.log.deleteMany({
        where: {
          employeeId: parseInt(employeeId),
          logDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      })

      // Delete the submission status using the exact date if we found logs
      if (logsToDelete.length > 0) {
        const exactDate = logsToDelete[0].logDate
        await tx.submissionStatus.deleteMany({
          where: {
            employeeId: parseInt(employeeId),
            submissionDate: exactDate,
          },
        })
      }

      return deleteResult
    })

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.count} log(s)`,
      deletedCount: result.count,
    })
  } catch (error: any) {
    console.error('Error bulk deleting logs:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete logs',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
