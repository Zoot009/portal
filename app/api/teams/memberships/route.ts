import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/teams/memberships - Get team memberships
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teamId = searchParams.get('teamId')
    const employeeId = searchParams.get('employeeId')
    const teamLeaderId = searchParams.get('teamLeaderId')

    const where: any = {}

    if (teamId) {
      where.teamId = parseInt(teamId)
    }

    if (employeeId) {
      where.employeeId = parseInt(employeeId)
    }

    if (teamLeaderId) {
      where.teamLeaderId = parseInt(teamLeaderId)
    }

    const memberships = await prisma.teamMembership.findMany({
      where,
      include: {
        team: true,
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
      orderBy: {
        assignedAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: memberships,
      count: memberships.length,
    })
  } catch (error: any) {
    console.error('Error fetching team memberships:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch team memberships',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// POST /api/teams/memberships - Add team member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teamId, employeeId, teamLeaderId, role = 'MEMBER' } = body

    if (!teamId || !employeeId || !teamLeaderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Team ID, employee ID, and team leader ID are required',
        },
        { status: 400 }
      )
    }

    // Check if membership already exists
    const existing = await prisma.teamMembership.findFirst({
      where: {
        teamId: parseInt(teamId),
        employeeId: parseInt(employeeId),
        teamLeaderId: parseInt(teamLeaderId),
      },
    })

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'This employee is already a member of this team',
        },
        { status: 400 }
      )
    }

    const membership = await prisma.teamMembership.create({
      data: {
        teamId: parseInt(teamId),
        employeeId: parseInt(employeeId),
        teamLeaderId: parseInt(teamLeaderId),
        role,
      },
      include: {
        team: true,
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
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
    })

    return NextResponse.json(
      {
        success: true,
        data: membership,
        message: 'Team member added successfully',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error adding team member:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add team member',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// DELETE /api/teams/memberships - Remove team member
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { membershipId } = body

    if (!membershipId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Membership ID is required',
        },
        { status: 400 }
      )
    }

    await prisma.teamMembership.delete({
      where: {
        id: parseInt(membershipId),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Team member removed successfully',
    })
  } catch (error: any) {
    console.error('Error removing team member:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove team member',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
