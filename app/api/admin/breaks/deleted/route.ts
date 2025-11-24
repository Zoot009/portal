import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/admin/breaks/deleted - Get all deleted break records
export async function GET(request: NextRequest) {
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

    // Fetch all deleted break records
    const deletedRecords = await prisma.deletedBreakRecord.findMany({
      orderBy: {
        deletedAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: deletedRecords,
    })
  } catch (error: any) {
    console.error('Error fetching deleted breaks:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch deleted breaks',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
