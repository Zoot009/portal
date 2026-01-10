import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

// GET /api/employees/[id]/history - Get employee edit history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Fetch edit history for this employee
    const history = await prisma.employeeEditHistory.findMany({
      where: {
        employeeId: parseInt(id),
      },
      orderBy: {
        editedAt: 'desc',
      },
      include: {
        editedByEmployee: {
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
      data: history,
    })
  } catch (error: any) {
    console.error('Error fetching employee history:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch employee history',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
