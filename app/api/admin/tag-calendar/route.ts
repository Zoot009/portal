import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/tag-calendar - Get tag day requirements for an employee
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const tagId = searchParams.get('tagId')

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    const where: any = {
      employeeId: parseInt(employeeId),
    }

    if (tagId) {
      where.tagId = parseInt(tagId)
    }

    const requirements = await prisma.tagDayRequirement.findMany({
      where,
      include: {
        assignment: {
          include: {
            tag: true,
            employee: {
              select: {
                id: true,
                name: true,
                employeeCode: true,
              },
            },
          },
        },
      },
      orderBy: {
        dayOfWeek: 'asc',
      },
    })

    const response = NextResponse.json({
      success: true,
      data: requirements,
    })
    
    // Cache tag calendar data for 3 minutes
    response.headers.set('Cache-Control', 'public, max-age=180, stale-while-revalidate=60')
    return response
  } catch (error: any) {
    console.error('Error fetching tag calendar:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tag calendar',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// POST /api/admin/tag-calendar - Create or update tag day requirements
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, tagId, daysOfWeek, isRequired, notes, createdBy } = body

    // Validate required fields
    if (!employeeId || !tagId || !Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Employee ID, Tag ID, and days of week array are required',
        },
        { status: 400 }
      )
    }

    // First, get the assignment ID
    const assignment = await prisma.assignment.findUnique({
      where: {
        employee_tag: {
          employeeId: parseInt(employeeId),
          tagId: parseInt(tagId),
        },
      },
    })

    if (!assignment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tag assignment not found for this employee',
        },
        { status: 404 }
      )
    }

    // Create or update requirements for each day
    const results = await Promise.all(
      daysOfWeek.map((dayOfWeek: number) =>
        prisma.tagDayRequirement.upsert({
          where: {
            employee_tag_day_requirement: {
              employeeId: parseInt(employeeId),
              tagId: parseInt(tagId),
              dayOfWeek: parseInt(dayOfWeek.toString()),
            },
          },
          update: {
            isRequired: isRequired !== undefined ? isRequired : true,
            notes: notes || null,
          },
          create: {
            assignmentId: assignment.id,
            employeeId: parseInt(employeeId),
            tagId: parseInt(tagId),
            dayOfWeek: parseInt(dayOfWeek.toString()),
            isRequired: isRequired !== undefined ? isRequired : true,
            notes: notes || null,
            createdBy: createdBy ? parseInt(createdBy) : null,
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      data: results,
      message: `Successfully ${isRequired === false ? 'removed' : 'added'} tag requirement for ${daysOfWeek.length} day(s)`,
    })
  } catch (error: any) {
    console.error('Error creating tag calendar:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create tag calendar',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/tag-calendar - Delete tag day requirements
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const tagId = searchParams.get('tagId')
    const dayOfWeek = searchParams.get('dayOfWeek')

    if (!employeeId || !tagId || !dayOfWeek) {
      return NextResponse.json(
        {
          success: false,
          error: 'Employee ID, Tag ID, and day of week are required',
        },
        { status: 400 }
      )
    }

    await prisma.tagDayRequirement.delete({
      where: {
        employee_tag_day_requirement: {
          employeeId: parseInt(employeeId),
          tagId: parseInt(tagId),
          dayOfWeek: parseInt(dayOfWeek),
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Tag day requirement deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting tag calendar:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete tag calendar',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
