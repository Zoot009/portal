import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/teams/[id] - Get single team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const team = await prisma.team.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        memberships: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                employeeCode: true,
                email: true,
                department: true,
                designation: true,
                role: true,
              },
            },
            teamLeader: {
              select: {
                id: true,
                name: true,
                employeeCode: true,
              },
            },
          },
        },
        _count: {
          select: {
            memberships: true,
          },
        },
      },
    })

    if (!team) {
      return NextResponse.json(
        {
          success: false,
          error: 'Team not found',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: team,
    })
  } catch (error: any) {
    console.error('Error fetching team:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch team',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// PATCH /api/teams/[id] - Update team
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json()
    const { name, description, isActive } = body

    const team = await prisma.team.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json({
      success: true,
      data: team,
      message: 'Team updated successfully',
    })
  } catch (error: any) {
    console.error('Error updating team:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update team',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// DELETE /api/teams/[id] - Delete team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.team.delete({
      where: {
        id: parseInt(id),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Team deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting team:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete team',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
