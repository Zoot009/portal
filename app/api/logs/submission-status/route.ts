import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/logs/submission-status - Check submission status for employees
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const employeeId = searchParams.get('employeeId')
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Check if we have either single date or date range
    if (!date && !(startDate && endDate)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either date or both startDate and endDate are required',
        },
        { status: 400 }
      )
    }

    // If employeeId is provided, return single employee status (backward compatibility)
    if (employeeId) {
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
    }

    // Determine date range for query
    let queryStartDate: Date
    let queryEndDate: Date
    
    if (startDate && endDate) {
      // Cycle mode: use provided date range
      queryStartDate = new Date(startDate)
      queryEndDate = new Date(endDate)
    } else {
      // Single date mode
      queryStartDate = new Date(date!)
      queryEndDate = new Date(date!)
    }
    
    // Get all active employees who have at least one tag assignment
    const allEmployees = await prisma.employee.findMany({
      where: {
        isActive: true,
        assignments: {
          some: {}, // Has at least one assignment
        },
      },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        department: true,
        designation: true,
        role: true,
        assignments: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Get all logs for the date range
    const logsForDateRange = await prisma.log.findMany({
      where: {
        logDate: {
          gte: queryStartDate,
          lte: queryEndDate,
        },
      },
      include: {
        tag: {
          select: {
            id: true,
            tagName: true,
            timeMinutes: true,
          },
        },
      },
    })

    // Get submission status for the date range
    const submissionStatuses = await prisma.submissionStatus.findMany({
      where: {
        submissionDate: {
          gte: queryStartDate,
          lte: queryEndDate,
        },
      },
      orderBy: {
        submissionTime: 'desc',
      },
    })

    // Create a map for quick lookup (get most recent submission per employee)
    const submissionStatusMap = new Map<number, typeof submissionStatuses[0]>()
    submissionStatuses.forEach(status => {
      const existing = submissionStatusMap.get(status.employeeId)
      if (!existing || new Date(status.submissionTime) > new Date(existing.submissionTime)) {
        submissionStatusMap.set(status.employeeId, status)
      }
    })

    // Group logs by employee
    const logsByEmployee = new Map<number, typeof logsForDateRange>()
    logsForDateRange.forEach(log => {
      const existingLogs = logsByEmployee.get(log.employeeId) || []
      logsByEmployee.set(log.employeeId, [...existingLogs, log])
    })

    // Combine data
    const employeeSubmissionStatus = allEmployees.map(employee => {
      const logs = logsByEmployee.get(employee.id) || []
      const submissionStatus = submissionStatusMap.get(employee.id)
      const hasSubmitted = logs.length > 0 || submissionStatus !== undefined
      
      const totalMinutes = logs.reduce((sum, log) => sum + log.totalMinutes, 0)
      const totalTags = logs.length
      const totalAssignedTags = employee.assignments.length
      
      // Get submitted tag IDs
      const submittedTagIds = new Set(logs.map(log => log.tagId))
      
      // Find missing tags (assigned but not submitted)
      const missingTags = employee.assignments
        .filter(assignment => !submittedTagIds.has(assignment.tagId))
        .map(assignment => ({
          id: assignment.tag.id,
          tagName: assignment.tag.tagName,
          timeMinutes: assignment.tag.timeMinutes,
          isMandatory: assignment.isMandatory,
        }))
      
      // Check if any mandatory tags are missing
      const missingMandatoryTags = missingTags.filter(tag => tag.isMandatory)
      const hasMissingMandatoryTags = missingMandatoryTags.length > 0
      
      return {
        employee: {
          id: employee.id,
          name: employee.name,
          employeeCode: employee.employeeCode,
          department: employee.department,
          designation: employee.designation,
          role: employee.role,
        },
        hasSubmitted,
        submittedAt: submissionStatus?.submissionTime,
        totalMinutes,
        totalTags,
        totalAssignedTags,
        logs: logs.map(log => ({
          id: log.id,
          tagName: log.tag.tagName,
          count: log.count,
          totalMinutes: log.totalMinutes,
        })),
        missingTags,
        missingMandatoryTags,
        hasMissingMandatoryTags,
      }
    })

    // Separate submitted and not submitted
    const submitted = employeeSubmissionStatus.filter(e => e.hasSubmitted)
    const notSubmitted = employeeSubmissionStatus.filter(e => !e.hasSubmitted)
    const missingMandatory = employeeSubmissionStatus.filter(e => e.hasMissingMandatoryTags)

    return NextResponse.json({
      success: true,
      data: {
        dateRange: startDate && endDate ? { startDate, endDate } : null,
        date: startDate && endDate ? null : queryStartDate,
        total: allEmployees.length,
        submitted: submitted.length,
        notSubmitted: notSubmitted.length,
        missingMandatory: missingMandatory.length,
        submittedPercentage: allEmployees.length > 0 
          ? ((submitted.length / allEmployees.length) * 100).toFixed(1)
          : '0',
        employees: employeeSubmissionStatus,
        submittedEmployees: submitted,
        notSubmittedEmployees: notSubmitted,
        missingMandatoryEmployees: missingMandatory,
      },
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
