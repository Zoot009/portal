import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET single break record
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const breakId = parseInt(id)
    if (isNaN(breakId)) {
      return NextResponse.json({ error: 'Invalid break ID' }, { status: 400 })
    }

    const breakRecord = await prisma.break.findUnique({
      where: { id: breakId },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
          },
        },
        editHistory: {
          orderBy: { editedAt: 'desc' },
        },
      },
    })

    if (!breakRecord) {
      return NextResponse.json({ error: 'Break record not found' }, { status: 404 })
    }

    return NextResponse.json({ breakRecord })
  } catch (error) {
    console.error('Error fetching break record:', error)
    return NextResponse.json({ error: 'Failed to fetch break record' }, { status: 500 })
  }
}

// PATCH - Edit break record
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user
    const currentUser = await prisma.employee.findFirst({
      where: { clerkUserId: userId },
    })

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const breakId = parseInt(id)
    if (isNaN(breakId)) {
      return NextResponse.json({ error: 'Invalid break ID' }, { status: 400 })
    }

    const body = await request.json()
    const { breakInTime, breakOutTime, editReason } = body

    // Validate edit reason is provided
    if (!editReason || editReason.trim() === '') {
      return NextResponse.json(
        { error: 'Edit reason is required' },
        { status: 400 }
      )
    }

    // Fetch existing break record
    const existingBreak = await prisma.break.findUnique({
      where: { id: breakId },
    })

    if (!existingBreak) {
      return NextResponse.json({ error: 'Break record not found' }, { status: 404 })
    }

    // Prepare changes array
    const changes: Array<{
      fieldChanged: string
      oldValue: string | null
      newValue: string | null
    }> = []

    // Track changes
    if (breakInTime && breakInTime !== existingBreak.breakInTime?.toISOString()) {
      changes.push({
        fieldChanged: 'breakInTime',
        oldValue: existingBreak.breakInTime?.toISOString() || null,
        newValue: breakInTime,
      })
    }

    if (breakOutTime && breakOutTime !== existingBreak.breakOutTime?.toISOString()) {
      changes.push({
        fieldChanged: 'breakOutTime',
        oldValue: existingBreak.breakOutTime?.toISOString() || null,
        newValue: breakOutTime,
      })
    }

    // Calculate new duration if both times are provided
    let newDuration = existingBreak.breakDuration
    if (breakInTime && breakOutTime) {
      const inTime = new Date(breakInTime)
      const outTime = new Date(breakOutTime)
      
      // Validate times
      if (outTime <= inTime) {
        return NextResponse.json(
          { error: 'Break end time must be after break start time' },
          { status: 400 }
        )
      }

      // Calculate duration in minutes
      newDuration = Math.round((outTime.getTime() - inTime.getTime()) / (1000 * 60))

      // Track duration change if it's different
      if (newDuration !== existingBreak.breakDuration) {
        changes.push({
          fieldChanged: 'breakDuration',
          oldValue: existingBreak.breakDuration.toString(),
          newValue: newDuration.toString(),
        })
      }
    }

    if (changes.length === 0) {
      return NextResponse.json(
        { error: 'No changes detected' },
        { status: 400 }
      )
    }

    // Update break record
    const updatedBreak = await prisma.break.update({
      where: { id: breakId },
      data: {
        breakInTime: breakInTime ? new Date(breakInTime) : existingBreak.breakInTime,
        breakOutTime: breakOutTime ? new Date(breakOutTime) : existingBreak.breakOutTime,
        breakDuration: newDuration,
        hasBeenEdited: true,
        editReason: editReason.trim(),
      },
    })

    // Create edit history entries
    await Promise.all(
      changes.map((change) =>
        prisma.breakEditHistory.create({
          data: {
            breakId: breakId,
            fieldChanged: change.fieldChanged,
            oldValue: change.oldValue,
            newValue: change.newValue,
            changeReason: editReason.trim(),
            editedBy: currentUser.name,
            editedByRole: currentUser.role,
          },
        })
      )
    )

    return NextResponse.json({
      message: 'Break record updated successfully',
      breakRecord: updatedBreak,
    })
  } catch (error) {
    console.error('Error updating break record:', error)
    return NextResponse.json(
      { error: 'Failed to update break record' },
      { status: 500 }
    )
  }
}

// DELETE - Delete break record with reason tracking
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user
    const currentUser = await prisma.employee.findFirst({
      where: { clerkUserId: userId },
    })

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const breakId = parseInt(id)
    if (isNaN(breakId)) {
      return NextResponse.json({ error: 'Invalid break ID' }, { status: 400 })
    }

    const body = await request.json()
    const { deleteReason } = body

    // Validate delete reason is provided
    if (!deleteReason || deleteReason.trim() === '') {
      return NextResponse.json(
        { error: 'Delete reason is required' },
        { status: 400 }
      )
    }

    // Fetch existing break record
    const existingBreak = await prisma.break.findUnique({
      where: { id: breakId },
      include: {
        employee: {
          select: {
            name: true,
            employeeCode: true,
          },
        },
      },
    })

    if (!existingBreak) {
      return NextResponse.json({ error: 'Break record not found' }, { status: 404 })
    }

    // Create a deletion history entry
    await prisma.deletedBreakRecord.create({
      data: {
        employeeId: existingBreak.employeeId,
        employeeName: existingBreak.employee.name,
        employeeCode: existingBreak.employee.employeeCode,
        breakDate: existingBreak.breakDate,
        breakInTime: existingBreak.breakInTime,
        breakOutTime: existingBreak.breakOutTime,
        breakDuration: existingBreak.breakDuration,
        deleteReason: deleteReason.trim(),
        deletedBy: currentUser.name,
        deletedByRole: currentUser.role,
        originalBreakId: breakId,
      },
    })

    // Delete the break record
    await prisma.break.delete({
      where: { id: breakId },
    })

    return NextResponse.json({
      message: 'Break record deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting break record:', error)
    return NextResponse.json(
      { error: 'Failed to delete break record' },
      { status: 500 }
    )
  }
}
