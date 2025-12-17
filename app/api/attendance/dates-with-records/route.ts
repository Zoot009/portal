import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

export async function GET() {
  try {
    // Check authentication
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    // Get the authenticated user's role
    const user = await prisma.employee.findFirst({
      where: { clerkUserId: userId },
      select: { role: true }
    })

    // Only allow ADMIN to view attendance dates
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Only administrators can view attendance dates' },
        { status: 403 }
      )
    }

    // Get count of records for each date
    const datesWithCounts = await prisma.attendanceRecord.groupBy({
      by: ['date'],
      _count: {
        id: true
      },
      orderBy: {
        date: 'desc'
      }
    })

    const formattedDates = datesWithCounts.map(item => ({
      date: item.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      count: item._count.id
    }))

    return NextResponse.json({
      success: true,
      dates: formattedDates
    })

  } catch (error) {
    console.error('Get attendance dates error:', error)
    return NextResponse.json({ 
      error: 'Internal server error while fetching attendance dates' 
    }, { status: 500 })
  }
}