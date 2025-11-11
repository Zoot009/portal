import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/penalties/[id] - Get single penalty
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const penaltyId = parseInt(id);

    const penalty = await prisma.penalty.findUnique({
      where: { id: penaltyId },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            email: true,
            department: true,
          },
        },
        attendanceRecord: true,
      },
    })

    if (!penalty) {
      return NextResponse.json(
        {
          success: false,
          error: 'Penalty not found',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: penalty,
    })
  } catch (error: any) {
    console.error('Error fetching penalty:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch penalty',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// PATCH /api/penalties/[id] - Update penalty
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const penaltyId = parseInt(id);
    const body = await request.json();
    const {
      employeeId,
      attendanceId,
      penaltyType,
      amount,
      description,
      penaltyDate,
      issuedBy,
      notes,
      isPaid,
    } = body

    const updateData: any = {}

    if (employeeId !== undefined) updateData.employeeId = parseInt(employeeId)
    if (attendanceId !== undefined) updateData.attendanceId = attendanceId ? parseInt(attendanceId) : null
    if (penaltyType !== undefined) updateData.penaltyType = penaltyType
    if (amount !== undefined) updateData.amount = amount ? parseFloat(amount) : null
    if (description !== undefined) updateData.description = description
    if (penaltyDate !== undefined) updateData.penaltyDate = new Date(penaltyDate)
    if (issuedBy !== undefined) updateData.issuedBy = issuedBy ? parseInt(issuedBy) : null
    if (notes !== undefined) updateData.notes = notes
    if (isPaid !== undefined) updateData.isPaid = isPaid

    const penalty = await prisma.penalty.update({
      where: { id: penaltyId },
      data: updateData,
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

    return NextResponse.json({
      success: true,
      data: penalty,
      message: 'Penalty updated successfully',
    })
  } catch (error: any) {
    console.error('Error updating penalty:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update penalty',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// DELETE /api/penalties/[id] - Delete penalty
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const penaltyId = parseInt(id);

    await prisma.penalty.delete({
      where: { id: penaltyId },
    })

    return NextResponse.json({
      success: true,
      message: 'Penalty deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting penalty:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete penalty',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
