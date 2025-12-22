import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/logs/submit - Submit multiple tags for a specific date
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, date, tags } = body

    // Validate required fields
    if (!employeeId || !date || !Array.isArray(tags)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Employee ID, date, and tags array are required',
        },
        { status: 400 }
      )
    }

    // Validate date (only today or yesterday)
    // Parse date as local date without timezone conversion
    const selectedDate = new Date(date + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (selectedDate < yesterday || selectedDate > today) {
      return NextResponse.json(
        {
          success: false,
          error: 'You can only submit work logs for today or yesterday',
        },
        { status: 400 }
      )
    }

    // Check if already submitted for this date
    const existingSubmission = await prisma.submissionStatus.findUnique({
      where: {
        employee_date: {
          employeeId: parseInt(employeeId),
          submissionDate: selectedDate,
        },
      },
    })

    if (existingSubmission && existingSubmission.isLocked) {
      return NextResponse.json(
        {
          success: false,
          error: `You have already submitted work logs for ${selectedDate.toLocaleDateString()}. You cannot submit again.`,
          alreadySubmitted: true,
        },
        { status: 400 }
      )
    }

    // Note: Mandatory tag validation is handled on the frontend with a confirmation dialog
    // Users can choose to submit without filling all mandatory tags

    // Check for missing mandatory tags (with day-of-week requirement support)
    const assignments = await prisma.assignment.findMany({
      where: {
        employeeId: parseInt(employeeId),
        isMandatory: true,
      },
      include: {
        tag: true,
      },
    })

    const submittedTagIds = tags.map((t: any) => parseInt(t.tagId)).filter((id: number) => !isNaN(id))
    
    // Check which mandatory tags are required for this day of week
    const dayOfWeek = selectedDate.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
    const dayRequirements = await prisma.tagDayRequirement.findMany({
      where: {
        employeeId: parseInt(employeeId),
        dayOfWeek: dayOfWeek,
        isRequired: true,
      },
    })

    // Build a map of which tags are required today
    const requiredTodayTagIds = new Set(dayRequirements.map((req) => req.tagId))
    
    // Get all tag IDs that have ANY day requirements configured
    const allDayRequirements = await prisma.tagDayRequirement.findMany({
      where: {
        employeeId: parseInt(employeeId),
      },
      select: {
        tagId: true,
      },
      distinct: ['tagId'],
    })
    const tagsWithDaySchedule = new Set(allDayRequirements.map((req) => req.tagId))
    
    // Determine missing mandatory tags
    const missingMandatoryTags = assignments.filter((assignment) => {
      // Skip if already submitted
      if (submittedTagIds.includes(assignment.tagId)) {
        return false
      }
      
      // If this tag has a day schedule configured
      if (tagsWithDaySchedule.has(assignment.tagId)) {
        // Only require it if it's required TODAY
        return requiredTodayTagIds.has(assignment.tagId)
      } else {
        // No day schedule = always required if mandatory
        return assignment.isMandatory
      }
    })

    // Filter tags with count > 0
    const validTags = tags.filter((t: any) => t.count && parseInt(t.count) > 0)

    if (validTags.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please enter count for at least one task',
        },
        { status: 400 }
      )
    }

    let totalMinutes = 0

    // Use transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      const createdLogs = []

      // Create or update logs for each tag
      for (const tag of validTags) {
        const count = parseInt(tag.count)
        const minutes = parseInt(tag.minutes)
        totalMinutes += minutes

        const log = await tx.log.upsert({
          where: {
            employee_tag_date: {
              employeeId: parseInt(employeeId),
              tagId: parseInt(tag.tagId),
              logDate: selectedDate,
            },
          },
          update: {
            count,
            totalMinutes: minutes,
            submittedAt: new Date(),
            isManual: true,
            source: 'employee_panel',
          },
          create: {
            employeeId: parseInt(employeeId),
            tagId: parseInt(tag.tagId),
            count,
            totalMinutes: minutes,
            logDate: selectedDate,
            isManual: true,
            source: 'employee_panel',
          },
          include: {
            tag: true,
          },
        })

        createdLogs.push(log)
      }

      // Create or update submission status (lock the date)
      const submissionStatus = await tx.submissionStatus.upsert({
        where: {
          employee_date: {
            employeeId: parseInt(employeeId),
            submissionDate: selectedDate,
          },
        },
        update: {
          submissionTime: new Date(),
          totalMinutes,
          isLocked: true,
          statusMessage: 'Data submitted successfully',
        },
        create: {
          employeeId: parseInt(employeeId),
          submissionDate: selectedDate,
          submissionTime: new Date(),
          totalMinutes,
          isLocked: true,
          statusMessage: 'Data submitted successfully',
        },
      })

      return { logs: createdLogs, submissionStatus }
    })

    // Award points for tag submission (run in background)
    awardTagSubmissionPoints(parseInt(employeeId), result.logs, selectedDate, result.submissionStatus).catch((err: any) =>
      console.error('Error awarding tag submission points:', err)
    )

    // Create automatic warning if mandatory tags were missing
    if (missingMandatoryTags.length > 0) {
      const missingTagNames = missingMandatoryTags.map((a) => a.tag.tagName).join(', ')
      
      // Create warning and check for automatic penalty creation
      createWarningAndCheckPenalty(parseInt(employeeId), selectedDate, missingTagNames).catch((err: any) => {
        console.error('Error creating automatic warning:', err)
      })
    }

    return NextResponse.json({
      success: true,
      data: result.logs,
      submissionStatus: result.submissionStatus,
      message: `Successfully submitted ${validTags.length} task(s) for ${selectedDate.toLocaleDateString()}`,
      totalMinutes,
      warningIssued: missingMandatoryTags.length > 0,
    })
  } catch (error: any) {
    console.error('Error submitting logs:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit logs',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// Helper function to award points for tag submissions
async function awardTagSubmissionPoints(employeeId: number, logs: any[], submissionDate: Date, submissionStatus: any) {
  try {
    // Gamification system disabled
    // const { awardWorkLogPoints, checkAndAwardAchievements } = await import('@/lib/gamification-utils')
    
    // Award points for work log submission
    // await awardWorkLogPoints(employeeId, logs, submissionDate)
    
    // Check and award any achievements
    // await checkAndAwardAchievements(employeeId)
  } catch (error) {
    console.error('Error awarding work log points:', error)
  }
}

// Helper function to create warning and check if automatic penalty should be created
async function createWarningAndCheckPenalty(employeeId: number, relatedDate: Date, missingTagNames: string) {
  try {
    // Get penalty settings
    const settings = await prisma.penaltySettings.findFirst({
      where: { isActive: true },
    })

    if (!settings) {
      console.error('No penalty settings found')
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

    // Create the warning
    const warning = await prisma.warning.create({
      data: {
        employeeId,
        warningType: 'WORK_QUALITY',
        warningDate: new Date(),
        warningMessage: `Incomplete work submission: Did not complete mandatory task(s) - ${missingTagNames}`,
        severity: 'MEDIUM',
        issuedBy: null, // System-generated
        relatedDate,
      },
    })

    // Check if auto-create penalties is enabled
    if (!settings.autoCreate) {
      return
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
        console.log(`Penalty already exists for employee ${employeeId} in current cycle`)
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
    console.error('Error in createWarningAndCheckPenalty:', error)
    throw error
  }
}
