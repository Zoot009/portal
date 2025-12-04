import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentEmployee } from '@/lib/auth-utils'
import { getCurrentPayCycle } from '@/lib/pay-cycle-utils'

export async function GET(request: NextRequest) {
  try {
    const currentEmployee = await getCurrentEmployee()
    
    if (!currentEmployee) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { start: cycleStart, end: cycleEnd } = getCurrentPayCycle()
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1

    // Get total points
    const totalPointsResult = await prisma.gamificationPoints.aggregate({
      where: { employeeId: currentEmployee.id },
      _sum: { points: true }
    })

    // Get current pay cycle points
    const cyclePointsResult = await prisma.gamificationPoints.aggregate({
      where: {
        employeeId: currentEmployee.id,
        earnedAt: {
          gte: cycleStart,
          lte: cycleEnd
        }
      },
      _sum: { points: true }
    })

    // Get achievements
    const achievements = await prisma.employeeAchievement.findMany({
      where: { employeeId: currentEmployee.id },
      include: {
        achievement: true
      },
      orderBy: { unlockedAt: 'desc' }
    })

    // Get recent point activities
    const recentActivities = await prisma.gamificationPoints.findMany({
      where: { employeeId: currentEmployee.id },
      orderBy: { earnedAt: 'desc' },
      take: 10
    })

    // Get current month leaderboard position
    const leaderboard = await prisma.leaderboard.findFirst({
      where: {
        employeeId: currentEmployee.id,
        period: 'MONTHLY',
        year: currentYear,
        month: currentMonth
      }
    })

    // Get overall leaderboard ranking (top 10 this month)
    const topEmployees = await prisma.leaderboard.findMany({
      where: {
        period: 'MONTHLY',
        year: currentYear,
        month: currentMonth
      },
      include: {
        employee: {
          select: {
            name: true,
            employeeCode: true
          }
        }
      },
      orderBy: { totalPoints: 'desc' },
      take: 10
    })

    // Calculate achievement stats
    const totalAchievements = await prisma.achievement.count({
      where: { isActive: true }
    })
    const unlockedAchievements = achievements.filter(a => a.isCompleted).length
    const achievementProgress = totalAchievements > 0 ? (unlockedAchievements / totalAchievements) * 100 : 0

    // Get available rewards
    const availableRewards = await prisma.reward.findMany({
      where: { 
        isActive: true,
        cost: { lte: totalPointsResult._sum.points || 0 }
      },
      orderBy: { cost: 'asc' },
      take: 5
    })

    return NextResponse.json({
      success: true,
      data: {
        points: {
          total: totalPointsResult._sum.points || 0,
          currentCycle: cyclePointsResult._sum.points || 0
        },
        achievements: {
          total: totalAchievements,
          unlocked: unlockedAchievements,
          progress: Math.round(achievementProgress),
          recent: achievements.slice(0, 5).map(a => ({
            id: a.id,
            name: a.achievement.name,
            description: a.achievement.description,
            badgeIcon: a.achievement.badgeIcon,
            badgeColor: a.achievement.badgeColor,
            pointValue: a.achievement.pointValue,
            unlockedAt: a.unlockedAt,
            isCompleted: a.isCompleted
          }))
        },
        leaderboard: {
          currentRank: leaderboard?.overallRank || null,
          totalPoints: leaderboard?.totalPoints || 0,
          attendanceRank: leaderboard?.attendanceRank || null,
          worklogRank: leaderboard?.worklogRank || null,
          topEmployees: topEmployees.map((emp, index) => ({
            rank: index + 1,
            name: emp.employee.name,
            employeeCode: emp.employee.employeeCode,
            points: emp.totalPoints,
            isMe: emp.employeeId === currentEmployee.id
          }))
        },
        recentActivities: recentActivities.map(activity => ({
          id: activity.id,
          points: activity.points,
          reason: activity.reason,
          pointType: activity.pointType,
          earnedAt: activity.earnedAt
        })),
        availableRewards: availableRewards.map(reward => ({
          id: reward.id,
          name: reward.name,
          description: reward.description,
          cost: reward.cost,
          category: reward.category,
          imageUrl: reward.imageUrl,
          canAfford: (totalPointsResult._sum.points || 0) >= reward.cost
        }))
      }
    })

  } catch (error: any) {
    console.error('Error fetching gamification data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch gamification data' },
      { status: 500 }
    )
  }
}