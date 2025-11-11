import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'

// GET - Fetch leaderboard
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all-time'
    const limit = parseInt(searchParams.get('limit') || '50')
    
    // Get all employee points ordered by points descending
    const employeePoints = await prisma.employeePoints.findMany({
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            email: true
          }
        }
      },
      orderBy: {
        points: 'desc'
      },
      take: limit
    })

    // Add rank to each entry
    const leaderboard = employeePoints.map((ep, index) => ({
      rank: index + 1,
      employeeId: ep.employeeId,
      employeeName: ep.employee.name,
      employeeCode: ep.employee.employeeCode,
      points: ep.points,
      level: ep.level,
      rankTitle: ep.rank,
      experience: ep.experience
    }))

    // Update leaderboard records in database
    updateLeaderboardRecords(period, leaderboard).catch(err =>
      console.error('Error updating leaderboard records:', err)
    )

    return NextResponse.json({ 
      leaderboard,
      period,
      totalEmployees: employeePoints.length
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}

// Helper function to update leaderboard records
async function updateLeaderboardRecords(period: string, leaderboard: any[]) {
  try {
    for (const entry of leaderboard) {
      await prisma.leaderboard.upsert({
        where: {
          employeeId_period: {
            employeeId: entry.employeeId,
            period
          }
        },
        create: {
          employeeId: entry.employeeId,
          period,
          rank: entry.rank,
          points: entry.points
        },
        update: {
          rank: entry.rank,
          points: entry.points
        }
      })
    }
  } catch (error) {
    console.error('Error updating leaderboard records:', error)
  }
}
