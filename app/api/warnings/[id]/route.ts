import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/warnings/[id] - Get single warning
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const warningId = parseInt(id);

    const warning = await prisma.warning.findUnique({
      where: { id: warningId },
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
      },
    })

    if (!warning) {
      return NextResponse.json(
        {
          success: false,
          error: 'Warning not found',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: warning,
    })
  } catch (error: any) {
    console.error('Error fetching warning:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch warning',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// PATCH /api/warnings/[id] - Update warning
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const warningId = parseInt(id);
    const body = await request.json();
    const {
      employeeId,
      warningType,
      warningDate,
      warningMessage,
      severity,
      isActive,
      issuedBy,
      relatedDate,
    } = body

    const updateData: any = {}

    if (employeeId !== undefined) updateData.employeeId = parseInt(employeeId)
    if (warningType !== undefined) updateData.warningType = warningType
    if (warningDate !== undefined) updateData.warningDate = new Date(warningDate)
    if (warningMessage !== undefined) updateData.warningMessage = warningMessage
    if (severity !== undefined) updateData.severity = severity
    if (isActive !== undefined) updateData.isActive = isActive
    if (issuedBy !== undefined) updateData.issuedBy = issuedBy ? parseInt(issuedBy) : null
    if (relatedDate !== undefined) updateData.relatedDate = relatedDate ? new Date(relatedDate) : null

    const warning = await prisma.warning.update({
      where: { id: warningId },
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
      data: warning,
      message: 'Warning updated successfully',
    })
  } catch (error: any) {
    console.error('Error updating warning:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update warning',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// DELETE /api/warnings/[id] - Delete warning
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const warningId = parseInt(id);

    await prisma.warning.delete({
      where: { id: warningId },
    })

    return NextResponse.json({
      success: true,
      message: 'Warning deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting warning:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete warning',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
