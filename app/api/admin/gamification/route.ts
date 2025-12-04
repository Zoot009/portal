import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getCurrentPayCycle } from '@/lib/pay-cycle-utils'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.employee.findUnique({
      where: { clerkUserId: userId },
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { start: cycleStart, end: cycleEnd } = getCurrentPayCycle()
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1

    // Overall stats
    const totalEmployees = await prisma.employee.count({
      where: { isActive: true }
    })

    // Points distributed this cycle
    const cyclePoints = await prisma.gamificationPoints.aggregate({
      where: {
        earnedAt: {
          gte: cycleStart,
          lte: cycleEnd
        }
      },
      _sum: { points: true },
      _count: true
    })

    // Achievement statistics
    const achievementStats = await prisma.employeeAchievement.groupBy({
      by: ['achievementId'],
      where: {
        isCompleted: true,
        unlockedAt: {
          gte: cycleStart,
          lte: cycleEnd
        }
      },
      _count: { employeeId: true }
    })

    // Top performers this month
    const topPerformers = await prisma.leaderboard.findMany({
      where: {
        period: 'MONTHLY',
        year: currentYear,
        month: currentMonth
      },
      include: {
        employee: {
          select: {
            name: true,
            employeeCode: true,
            department: true
          }
        }
      },
      orderBy: { totalPoints: 'desc' },
      take: 10
    })

    // Recent activities across all employees
    const recentActivities = await prisma.gamificationPoints.findMany({
      include: {
        employee: {
          select: {
            name: true,
            employeeCode: true
          }
        }
      },
      orderBy: { earnedAt: 'desc' },
      take: 15
    })

    // Point distribution by type
    const pointsByType = await prisma.gamificationPoints.groupBy({
      by: ['pointType'],
      where: {
        earnedAt: {
          gte: cycleStart,
          lte: cycleEnd
        }
      },
      _sum: { points: true },
      _count: true
    })

    // Active achievements
    const activeAchievements = await prisma.achievement.findMany({
      where: { isActive: true },
      include: {
        employeeAchievements: {
          where: { isCompleted: true },
          select: { employeeId: true }
        }
      }
    })

    // Reward redemptions
    const rewardRedemptions = await prisma.rewardRedemption.findMany({
      where: {
        redeemedAt: {
          gte: cycleStart,
          lte: cycleEnd
        }
      },
      include: {
        employee: {
          select: {
            name: true,
            employeeCode: true
          }
        },
        reward: {
          select: {
            name: true,
            category: true
          }
        }
      },
      orderBy: { redeemedAt: 'desc' }
    })

    // Employee engagement (employees who earned points this cycle)
    const activeEmployees = await prisma.gamificationPoints.groupBy({
      by: ['employeeId'],
      where: {
        earnedAt: {
          gte: cycleStart,
          lte: cycleEnd
        }
      },
      _count: true
    })

    const engagementRate = totalEmployees > 0 ? (activeEmployees.length / totalEmployees) * 100 : 0

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalEmployees,
          activeEmployees: activeEmployees.length,
          engagementRate: Math.round(engagementRate),
          totalPointsDistributed: cyclePoints._sum.points || 0,
          totalActivities: cyclePoints._count || 0
        },
        topPerformers: topPerformers.map((emp, index) => ({
          rank: index + 1,
          employeeId: emp.employeeId,
          name: emp.employee.name,
          employeeCode: emp.employee.employeeCode,
          department: emp.employee.department,
          totalPoints: emp.totalPoints,
          attendancePoints: emp.attendancePoints,
          worklogPoints: emp.worklogPoints,
          achievementPoints: emp.achievementPoints,
          attendanceRate: emp.attendanceRate,
          avgWorkHours: emp.avgWorkHours
        })),
        pointDistribution: pointsByType.map(pt => ({
          type: pt.pointType,
          totalPoints: pt._sum.points || 0,
          count: pt._count
        })),
        achievements: activeAchievements.map(achievement => ({
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          pointValue: achievement.pointValue,
          category: achievement.category,
          unlockedBy: achievement.employeeAchievements.length,
          unlockRate: totalEmployees > 0 ? (achievement.employeeAchievements.length / totalEmployees) * 100 : 0
        })),
        recentActivities: recentActivities.map(activity => ({
          id: activity.id,
          employeeName: activity.employee.name,
          employeeCode: activity.employee.employeeCode,
          points: activity.points,
          reason: activity.reason,
          pointType: activity.pointType,
          earnedAt: activity.earnedAt
        })),
        rewardRedemptions: rewardRedemptions.map(redemption => ({
          id: redemption.id,
          employeeName: redemption.employee.name,
          employeeCode: redemption.employee.employeeCode,
          rewardName: redemption.reward.name,
          rewardCategory: redemption.reward.category,
          pointsUsed: redemption.pointsUsed,
          status: redemption.status,
          redeemedAt: redemption.redeemedAt
        }))
      }
    })

  } catch (error: any) {
    console.error('Error fetching admin gamification data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch gamification data' },
      { status: 500 }
    )
  }
}