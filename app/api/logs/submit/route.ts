import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { awardPoints, POINT_VALUES } from '@/lib/gamification'

const prisma = new PrismaClient()

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

    // Get employee's assigned tags to check mandatory ones
    const assignments = await prisma.assignment.findMany({
      where: {
        employeeId: parseInt(employeeId),
      },
      include: {
        tag: true,
      },
    })

    // Check if all mandatory tags are submitted with count > 0
    const mandatoryTags = assignments.filter(a => a.isMandatory)
    const submittedTagIds = tags
      .filter((t: any) => t.count && parseInt(t.count) > 0)
      .map((t: any) => parseInt(t.tagId))

    const missingMandatoryTags = mandatoryTags.filter(
      mt => !submittedTagIds.includes(mt.tagId)
    )

    if (missingMandatoryTags.length > 0) {
      const missingTagNames = missingMandatoryTags.map(mt => mt.tag.tagName).join(', ')
      return NextResponse.json(
        {
          success: false,
          error: `Mandatory tags must be completed: ${missingTagNames}`,
          missingMandatoryTags: missingMandatoryTags.map(mt => ({
            id: mt.tagId,
            name: mt.tag.tagName,
          })),
        },
        { status: 400 }
      )
    }

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

    return NextResponse.json({
      success: true,
      data: result.logs,
      submissionStatus: result.submissionStatus,
      message: `Successfully submitted ${validTags.length} task(s) for ${selectedDate.toLocaleDateString()}`,
      totalMinutes,
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
    // Award base points for submitting tags
    await awardPoints({
      employeeId,
      points: POINT_VALUES.TAG_SUBMITTED,
      type: 'earned',
      description: 'Tags submitted',
      reference: `submission:${submissionStatus.id}`
    })

    // Check if submitted on time (before deadline - assuming 11:59 PM of the day)
    const submissionTime = new Date(submissionStatus.submissionTime)
    const deadlineDate = new Date(submissionDate)
    deadlineDate.setHours(23, 59, 59, 999)

    if (submissionTime <= deadlineDate) {
      await awardPoints({
        employeeId,
        points: POINT_VALUES.TAG_ON_TIME,
        type: 'bonus',
        description: 'On-time submission bonus',
        reference: `submission:${submissionStatus.id}`
      })
    }
  } catch (error) {
    console.error('Error awarding tag submission points:', error)
  }
}
