import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/issues/[id] - Update issue
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const issueId = parseInt(id)
    const body = await request.json()
    const { issueStatus, adminResponse } = body

    if (!issueId || isNaN(issueId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid issue ID',
        },
        { status: 400 }
      )
    }

    const updateData: any = {}

    if (issueStatus) {
      updateData.issueStatus = issueStatus
      // If status is resolved, set resolvedDate
      if (issueStatus.toLowerCase() === 'resolved') {
        updateData.resolvedDate = new Date()
      }
    }

    if (adminResponse !== undefined) {
      updateData.adminResponse = adminResponse
    }

    const issue = await prisma.issue.update({
      where: { id: issueId },
      data: updateData,
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

    return NextResponse.json({
      success: true,
      data: issue,
      message: 'Issue updated successfully',
    })
  } catch (error: any) {
    console.error('Error updating issue:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update issue',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// DELETE /api/issues/[id] - Delete issue
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const issueId = parseInt(id)

    if (!issueId || isNaN(issueId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid issue ID',
        },
        { status: 400 }
      )
    }

    await prisma.issue.delete({
      where: { id: issueId },
    })

    return NextResponse.json({
      success: true,
      message: 'Issue deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting issue:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete issue',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
