import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/attendance/[id] - Get single attendance record
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const attendanceRecord = await prisma.attendanceRecord.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            email: true,
            department: true,
            designation: true,
          },
        },
        leaveRequest: true,
        penalties: true,
        editHistory: {
          orderBy: {
            editedAt: 'desc',
          },
        },
      },
    })

    if (!attendanceRecord) {
      return NextResponse.json(
        {
          success: false,
          error: 'Attendance record not found',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: attendanceRecord,
    })
  } catch (error: any) {
    console.error('Error fetching attendance record:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch attendance record',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// PATCH /api/attendance/[id] - Update single attendance record
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json()
    const { editedBy, editedByName, changeReason, ...updateData } = body

    // Get the current record to track changes
    const currentRecord = await prisma.attendanceRecord.findUnique({
      where: { id: parseInt(id) },
    })

    if (!currentRecord) {
      return NextResponse.json(
        {
          success: false,
          error: 'Attendance record not found',
        },
        { status: 404 }
      )
    }

    // Update the attendance record
    const updatedRecord = await prisma.attendanceRecord.update({
      where: { id: parseInt(id) },
      data: {
        ...updateData,
        hasBeenEdited: true,
      },
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
    })

    // Create edit history entries for changed fields
    if (editedBy) {
      const changedFields = Object.keys(updateData).filter(
        (key) => currentRecord[key as keyof typeof currentRecord] !== updateData[key]
      )

      await Promise.all(
        changedFields.map((field) =>
          prisma.attendanceEditHistory.create({
            data: {
              attendanceId: parseInt(id),
              editedBy: parseInt(editedBy),
              editedByName: editedByName || 'Admin',
              editedByRole: 'ADMIN',
              fieldChanged: field,
              oldValue: String(currentRecord[field as keyof typeof currentRecord] || ''),
              newValue: String(updateData[field] || ''),
              changeReason: changeReason || 'Manual edit',
            },
          })
        )
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedRecord,
      message: 'Attendance record updated successfully',
    })
  } catch (error: any) {
    console.error('Error updating attendance record:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update attendance record',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// DELETE /api/attendance/[id] - Delete attendance record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.attendanceRecord.delete({
      where: {
        id: parseInt(id),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Attendance record deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting attendance record:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete attendance record',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
