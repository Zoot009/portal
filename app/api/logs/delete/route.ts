import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// DELETE /api/logs/delete - Delete all logs for an employee on a specific date
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, date } = body

    // Validate required fields
    if (!employeeId || !date) {
      return NextResponse.json(
        {
          success: false,
          error: 'Employee ID and date are required',
        },
        { status: 400 }
      )
    }

    // Parse the date - match the exact same format as submission-status API
    const startOfDay = new Date(date + 'T00:00:00').toISOString()
    const endOfDay = new Date(date + 'T23:59:59.999').toISOString()

    console.log('Deleting logs for:', {
      employeeId: parseInt(employeeId),
      date,
      startOfDay,
      endOfDay,
    })

    // Use transaction to delete logs and submission status
    const result = await prisma.$transaction(async (tx) => {
      // Delete all logs for this employee on this date
      const deletedLogs = await tx.log.deleteMany({
        where: {
          employeeId: parseInt(employeeId),
          logDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      })

      // Delete submission status to unlock the date
      const deletedSubmission = await tx.submissionStatus.deleteMany({
        where: {
          employeeId: parseInt(employeeId),
          submissionDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      })

      console.log('Deletion result:', {
        logsDeleted: deletedLogs.count,
        submissionDeleted: deletedSubmission.count,
      })

      return {
        logsDeleted: deletedLogs.count,
        submissionDeleted: deletedSubmission.count,
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.logsDeleted} log(s) for ${date}`,
      data: result,
    })
  } catch (error: any) {
    console.error('Error deleting logs:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete logs',
        message: error.message,
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}
