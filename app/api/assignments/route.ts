import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/assignments - Get tag assignments
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const employeeId = searchParams.get('employeeId')
    const tagId = searchParams.get('tagId')
    const mandatoryOnly = searchParams.get('mandatoryOnly')

    // If ID is provided, return single assignment
    if (id) {
      const assignment = await prisma.assignment.findUnique({
        where: { id: parseInt(id) },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              employeeCode: true,
              email: true,
              role: true,
            },
          },
          tag: true,
        },
      })

      if (!assignment) {
        return NextResponse.json(
          {
            success: false,
            error: 'Assignment not found',
          },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: assignment,
      })
    }

    const where: any = {}

    if (employeeId) {
      where.employeeId = parseInt(employeeId)
    }

    if (tagId) {
      where.tagId = parseInt(tagId)
    }

    if (mandatoryOnly === 'true') {
      where.isMandatory = true
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            email: true,
            role: true,
          },
        },
        tag: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const response = NextResponse.json({
      success: true,
      data: assignments,
      count: assignments.length,
    })
    
    // Cache assignments list for 2 minutes with stale-while-revalidate
    response.headers.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=30')
    return response
  } catch (error: any) {
    console.error('Error fetching assignments:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch assignments',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// POST /api/assignments - Create new assignment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, tagId, isMandatory = false } = body

    if (!employeeId || !tagId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Employee ID and tag ID are required',
        },
        { status: 400 }
      )
    }

    // Check if assignment already exists
    const existing = await prisma.assignment.findUnique({
      where: {
        employee_tag: {
          employeeId: parseInt(employeeId),
          tagId: parseInt(tagId),
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Assignment already exists for this employee and tag',
        },
        { status: 400 }
      )
    }

    const assignment = await prisma.assignment.create({
      data: {
        employeeId: parseInt(employeeId),
        tagId: parseInt(tagId),
        isMandatory,
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

    return NextResponse.json(
      {
        success: true,
        data: assignment,
        message: 'Assignment created successfully',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating assignment:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create assignment',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// PATCH /api/assignments - Update assignment
export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Assignment ID is required',
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { employeeId, tagId, isMandatory } = body

    // Build update data object dynamically
    const updateData: any = {}
    
    if (employeeId !== undefined) {
      updateData.employeeId = parseInt(employeeId)
    }
    
    if (tagId !== undefined) {
      updateData.tagId = parseInt(tagId)
    }
    
    if (isMandatory !== undefined) {
      updateData.isMandatory = isMandatory
    }

    // If updating employee or tag, check if the combination already exists
    if (employeeId && tagId) {
      const existing = await prisma.assignment.findUnique({
        where: {
          employee_tag: {
            employeeId: parseInt(employeeId),
            tagId: parseInt(tagId),
          },
        },
      })

      // Check if the existing assignment is not the one we're updating
      if (existing && existing.id !== parseInt(id)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Assignment already exists for this employee and tag combination',
          },
          { status: 400 }
        )
      }
    }

    const assignment = await prisma.assignment.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            email: true,
            role: true,
          },
        },
        tag: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: assignment,
      message: 'Assignment updated successfully',
    })
  } catch (error: any) {
    console.error('Error updating assignment:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update assignment',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// DELETE /api/assignments - Delete assignment(s)
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (id) {
      // Delete single assignment
      await prisma.assignment.delete({
        where: { id: parseInt(id) }
      })

      return NextResponse.json({
        success: true,
        message: 'Assignment deleted successfully',
      })
    }

    // Bulk delete
    const body = await request.json()
    const { ids } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID parameter or IDs array is required',
        },
        { status: 400 }
      )
    }

    await prisma.assignment.deleteMany({
      where: {
        id: {
          in: ids.map((id: string) => parseInt(id)),
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: `Deleted ${ids.length} assignments successfully`,
    })
  } catch (error: any) {
    console.error('Error deleting assignments:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete assignments',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
