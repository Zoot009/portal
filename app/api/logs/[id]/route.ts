import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// DELETE /api/logs/[id] - Delete a single log entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const logId = parseInt(id)

    if (isNaN(logId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid log ID',
        },
        { status: 400 }
      )
    }

    // Get the log to check if it exists and get employee/date info
    const log = await prisma.log.findUnique({
      where: { id: logId },
    })

    if (!log) {
      return NextResponse.json(
        {
          success: false,
          error: 'Log not found',
        },
        { status: 404 }
      )
    }

    // Delete the log
    await prisma.log.delete({
      where: { id: logId },
    })

    // Check if there are any more logs for this employee on this date
    const remainingLogs = await prisma.log.findMany({
      where: {
        employeeId: log.employeeId,
        logDate: log.logDate,
      },
    })

    // If no more logs exist for this date, delete the submission status
    if (remainingLogs.length === 0) {
      await prisma.submissionStatus.deleteMany({
        where: {
          employeeId: log.employeeId,
          submissionDate: log.logDate,
        },
      })
    } else {
      // Update the submission status with new total minutes
      const totalMinutes = remainingLogs.reduce((sum, l) => sum + l.totalMinutes, 0)
      await prisma.submissionStatus.updateMany({
        where: {
          employeeId: log.employeeId,
          submissionDate: log.logDate,
        },
        data: {
          totalMinutes,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Log deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting log:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete log',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
