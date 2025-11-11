import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/assets/assignments - Get asset assignments
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const assetId = searchParams.get('assetId')
    const employeeId = searchParams.get('employeeId')
    const status = searchParams.get('status')

    const where: any = {}

    if (assetId) {
      where.assetId = parseInt(assetId)
    }

    if (employeeId) {
      where.employeeId = parseInt(employeeId)
    }

    if (status && status !== 'all') {
      where.status = status
    }

    const assignments = await prisma.assetAssignment.findMany({
      where,
      include: {
        asset: true,
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            email: true,
            department: true,
          },
        },
      },
      orderBy: {
        assignedDate: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: assignments,
      count: assignments.length,
    })
  } catch (error: any) {
    console.error('Error fetching asset assignments:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch asset assignments',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// POST /api/assets/assignments - Create new asset assignment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      assetId,
      employeeId,
      assignedBy,
      assignedDate,
      assignmentNotes,
    } = body

    if (!assetId || !employeeId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Asset ID and employee ID are required',
        },
        { status: 400 }
      )
    }

    // Check if asset is already assigned
    const existingAssignment = await prisma.assetAssignment.findFirst({
      where: {
        assetId: parseInt(assetId),
        status: 'ACTIVE',
      },
    })

    if (existingAssignment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Asset is already assigned to another employee',
        },
        { status: 400 }
      )
    }

    // Create assignment
    const assignment = await prisma.assetAssignment.create({
      data: {
        assetId: parseInt(assetId),
        employeeId: parseInt(employeeId),
        assignedBy: assignedBy ? parseInt(assignedBy) : null,
        assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
        assignmentNotes,
        status: 'ACTIVE',
      },
      include: {
        asset: true,
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
          },
        },
      },
    })

    // Update asset status to ASSIGNED
    await prisma.asset.update({
      where: { id: parseInt(assetId) },
      data: { status: 'ASSIGNED' },
    })

    return NextResponse.json(
      {
        success: true,
        data: assignment,
        message: 'Asset assigned successfully',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating asset assignment:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create asset assignment',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// PATCH /api/assets/assignments - Return asset
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      assignmentId,
      returnedBy,
      returnDate,
      returnNotes,
      returnCondition,
    } = body

    if (!assignmentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Assignment ID is required',
        },
        { status: 400 }
      )
    }

    const assignment = await prisma.assetAssignment.findUnique({
      where: { id: parseInt(assignmentId) },
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

    // Update assignment
    const updatedAssignment = await prisma.assetAssignment.update({
      where: { id: parseInt(assignmentId) },
      data: {
        status: 'RETURNED',
        returnDate: returnDate ? new Date(returnDate) : new Date(),
        returnedBy: returnedBy ? parseInt(returnedBy) : null,
        returnNotes,
        returnCondition,
      },
    })

    // Update asset status to AVAILABLE
    await prisma.asset.update({
      where: { id: assignment.assetId },
      data: {
        status: 'AVAILABLE',
        condition: returnCondition || assignment.returnCondition || 'GOOD',
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedAssignment,
      message: 'Asset returned successfully',
    })
  } catch (error: any) {
    console.error('Error returning asset:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to return asset',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
