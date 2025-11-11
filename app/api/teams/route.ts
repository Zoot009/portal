import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/teams - Get all teams
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const isActive = searchParams.get('isActive')

    const where: any = {}

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    const teams = await prisma.team.findMany({
      where,
      include: {
        memberships: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                employeeCode: true,
                department: true,
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
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({
      success: true,
      data: teams,
      count: teams.length,
    })
  } catch (error: any) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch teams',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// POST /api/teams - Create new team
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Team name is required',
        },
        { status: 400 }
      )
    }

    // Check if team name already exists
    const existing = await prisma.team.findUnique({
      where: { name },
    })

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Team name already exists',
        },
        { status: 400 }
      )
    }

    const team = await prisma.team.create({
      data: {
        name,
        description,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: team,
        message: 'Team created successfully',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating team:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create team',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
