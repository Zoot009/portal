import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/logs - Get logs with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const employeeId = searchParams.get('employeeId')
    const tagId = searchParams.get('tagId')
    const logDate = searchParams.get('logDate')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}

    if (employeeId) {
      where.employeeId = parseInt(employeeId)
    }

    if (tagId) {
      where.tagId = parseInt(tagId)
    }

    if (logDate) {
      where.logDate = new Date(logDate)
    }

    if (startDate && endDate) {
      where.logDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const logs = await prisma.log.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
          },
        },
        tag: true,
      },
      orderBy: {
        logDate: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: logs,
      count: logs.length,
    })
  } catch (error: any) {
    console.error('Error fetching logs:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch logs',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// POST /api/logs - Create or update log
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, tagId, count, totalMinutes, logDate, isManual = true, source = 'manual' } = body

    if (!employeeId || !tagId || !logDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Employee ID, tag ID, and log date are required',
        },
        { status: 400 }
      )
    }

    // Upsert the log
    const log = await prisma.log.upsert({
      where: {
        employee_tag_date: {
          employeeId: parseInt(employeeId),
          tagId: parseInt(tagId),
          logDate: new Date(logDate),
        },
      },
      update: {
        count: count || 0,
        totalMinutes: totalMinutes || 0,
        submittedAt: new Date(),
      },
      create: {
        employeeId: parseInt(employeeId),
        tagId: parseInt(tagId),
        count: count || 0,
        totalMinutes: totalMinutes || 0,
        logDate: new Date(logDate),
        isManual,
        source,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
          },
        },
        tag: true,
      },
    })

    // Update submission status
    await prisma.submissionStatus.upsert({
      where: {
        employee_date: {
          employeeId: parseInt(employeeId),
          submissionDate: new Date(logDate),
        },
      },
      update: {
        submissionTime: new Date(),
        totalMinutes: {
          increment: totalMinutes || 0,
        },
      },
      create: {
        employeeId: parseInt(employeeId),
        submissionDate: new Date(logDate),
        totalMinutes: totalMinutes || 0,
        isLocked: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: log,
      message: 'Log saved successfully',
    })
  } catch (error: any) {
    console.error('Error creating log:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create log',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
