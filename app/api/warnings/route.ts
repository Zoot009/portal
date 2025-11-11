import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/warnings - Get warnings
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const employeeId = searchParams.get('employeeId')
    const warningType = searchParams.get('warningType')
    const isActive = searchParams.get('isActive')

    const where: any = {}

    if (employeeId) {
      where.employeeId = parseInt(employeeId)
    }

    if (warningType) {
      where.warningType = warningType
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    const warnings = await prisma.warning.findMany({
      where,
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
      orderBy: {
        warningDate: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: warnings,
      count: warnings.length,
    })
  } catch (error: any) {
    console.error('Error fetching warnings:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch warnings',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// POST /api/warnings - Create new warning
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      employeeId,
      warningType,
      warningMessage,
      severity = 'LOW',
      issuedBy,
      relatedDate,
    } = body

    if (!employeeId || !warningType || !warningMessage) {
      return NextResponse.json(
        {
          success: false,
          error: 'Employee ID, warning type, and message are required',
        },
        { status: 400 }
      )
    }

    const warning = await prisma.warning.create({
      data: {
        employeeId: parseInt(employeeId),
        warningType,
        warningDate: new Date(),
        warningMessage,
        severity,
        issuedBy: issuedBy ? parseInt(issuedBy) : null,
        relatedDate: relatedDate ? new Date(relatedDate) : null,
      },
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

    return NextResponse.json(
      {
        success: true,
        data: warning,
        message: 'Warning issued successfully',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating warning:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create warning',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
