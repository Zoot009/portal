import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/issues - Get issues
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const employeeId = searchParams.get('employeeId')
    const issueStatus = searchParams.get('status')
    const category = searchParams.get('category')

    const where: any = {}

    if (employeeId) {
      where.employeeId = parseInt(employeeId)
    }

    if (issueStatus && issueStatus !== 'all') {
      where.issueStatus = issueStatus
    }

    if (category) {
      where.issueCategory = category
    }

    const issues = await prisma.issue.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            email: true,
          },
        },
      },
      orderBy: {
        raisedDate: 'desc',
      },
    })

    // Calculate days elapsed for each issue
    const issuesWithDays = issues.map(issue => {
      const raised = new Date(issue.raisedDate)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - raised.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      return {
        ...issue,
        daysElapsed: diffDays
      }
    })

    return NextResponse.json({
      success: true,
      data: issuesWithDays,
      count: issuesWithDays.length,
    })
  } catch (error: any) {
    console.error('Error fetching issues:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch issues',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// POST /api/issues - Create new issue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, issueCategory, issueDescription, escalatedBy, escalatedByName } = body

    if (!employeeId || !issueCategory || !issueDescription) {
      return NextResponse.json(
        {
          success: false,
          error: 'Employee ID, category, and description are required',
        },
        { status: 400 }
      )
    }

    const issue = await prisma.issue.create({
      data: {
        employeeId: parseInt(employeeId),
        issueCategory,
        issueDescription,
        issueStatus: 'pending',
        escalatedBy: escalatedBy ? parseInt(escalatedBy) : null,
        escalatedByName,
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

    return NextResponse.json(
      {
        success: true,
        data: issue,
        message: 'Issue submitted successfully',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating issue:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create issue',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
