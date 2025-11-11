import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'

// GET - Fetch achievements and employee's progress
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    
    // Get employee from Clerk ID
    const employee = await prisma.employee.findUnique({
      where: { clerkUserId: user.id }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Admins can view all, employees can only view their own
    const isAdmin = employee.role === 'ADMIN'

    if (isAdmin && !employeeId) {
      // Admin viewing all achievements (for management)
      const achievements = await prisma.achievement.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          employeeAchievements: {
            select: {
              employeeId: true,
              unlockedAt: true
            }
          }
        }
      })

      const achievementsWithStats = achievements.map(achievement => ({
        ...achievement,
        unlockedCount: achievement.employeeAchievements.length,
        employeeAchievements: undefined
      }))

      return NextResponse.json({ achievements: achievementsWithStats })
    }

    // Employee or admin viewing specific employee's achievements
    const targetEmployeeId = employeeId && isAdmin 
      ? parseInt(employeeId) 
      : employee.id

    // Get all achievements
    const achievements = await prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: { category: 'asc' }
    })

    // Get employee's unlocked achievements
    const employeeAchievements = await prisma.employeeAchievement.findMany({
      where: { employeeId: targetEmployeeId },
      include: {
        achievement: true
      }
    })

    const unlockedIds = new Set(employeeAchievements.map(ea => ea.achievementId))

    // Calculate progress for each achievement
    const achievementsWithProgress = await Promise.all(
      achievements.map(async achievement => {
        const unlocked = unlockedIds.has(achievement.id)
        const employeeAchievement = employeeAchievements.find(ea => ea.achievementId === achievement.id)
        
        let progress = 0
        if (unlocked) {
          progress = 100
        } else {
          // Calculate progress based on criteria
          progress = await calculateAchievementProgress(targetEmployeeId, achievement)
        }

        return {
          ...achievement,
          unlocked,
          unlockedAt: employeeAchievement?.unlockedAt || null,
          progress
        }
      })
    )

    return NextResponse.json({ 
      achievements: achievementsWithProgress,
      unlockedCount: employeeAchievements.length,
      totalCount: achievements.length
    })
  } catch (error) {
    console.error('Error fetching achievements:', error)
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 })
  }
}

// POST - Create new achievement (Admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const employee = await prisma.employee.findUnique({
      where: { clerkUserId: user.id }
    })

    if (!employee || employee.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, icon, points, category, criteria } = body

    if (!name || !description || !points || !category || !criteria) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const achievement = await prisma.achievement.create({
      data: {
        name,
        description,
        icon: icon || '🏆',
        points,
        category,
        criteria: typeof criteria === 'string' ? JSON.parse(criteria) : criteria
      }
    })

    return NextResponse.json({ success: true, achievement })
  } catch (error) {
    console.error('Error creating achievement:', error)
    return NextResponse.json({ error: 'Failed to create achievement' }, { status: 500 })
  }
}

// PUT - Update achievement (Admin only)
export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const employee = await prisma.employee.findUnique({
      where: { clerkUserId: user.id }
    })

    if (!employee || employee.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Achievement ID required' }, { status: 400 })
    }

    if (updateData.criteria && typeof updateData.criteria === 'string') {
      updateData.criteria = JSON.parse(updateData.criteria)
    }

    const achievement = await prisma.achievement.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ success: true, achievement })
  } catch (error) {
    console.error('Error updating achievement:', error)
    return NextResponse.json({ error: 'Failed to update achievement' }, { status: 500 })
  }
}

// DELETE - Delete achievement (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const employee = await prisma.employee.findUnique({
      where: { clerkUserId: user.id }
    })

    if (!employee || employee.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Achievement ID required' }, { status: 400 })
    }

    await prisma.achievement.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting achievement:', error)
    return NextResponse.json({ error: 'Failed to delete achievement' }, { status: 500 })
  }
}

// Helper function to calculate achievement progress
async function calculateAchievementProgress(employeeId: number, achievement: any): Promise<number> {
  try {
    const criteria = achievement.criteria as any

    switch (criteria.type) {
      case 'attendance_streak': {
        // Get consecutive attendance days
        const records = await prisma.attendanceRecord.findMany({
          where: {
            employeeId,
            status: 'PRESENT'
          },
          orderBy: { date: 'desc' },
          take: criteria.threshold
        })
        
        let streak = 0
        let lastDate = new Date()
        for (const record of records) {
          const daysDiff = Math.floor((lastDate.getTime() - new Date(record.date).getTime()) / (1000 * 60 * 60 * 24))
          if (daysDiff <= 1) {
            streak++
            lastDate = new Date(record.date)
          } else {
            break
          }
        }
        return Math.min(100, (streak / criteria.threshold) * 100)
      }

      case 'productivity_streak': {
        // Get consecutive high productivity days
        const records = await prisma.flowaceRecord.findMany({
          where: {
            employeeId,
            productivityPercentage: { gte: criteria.minProductivity || 80 }
          },
          orderBy: { date: 'desc' },
          take: criteria.threshold
        })
        return Math.min(100, (records.length / criteria.threshold) * 100)
      }

      case 'tags_submitted': {
        // Count total tags submitted
        const count = await prisma.submissionStatus.count({
          where: {
            employeeId
          }
        })
        return Math.min(100, (count / criteria.threshold) * 100)
      }

      case 'breaks_compliant': {
        // Check break compliance
        const breaks = await prisma.break.findMany({
          where: {
            employeeId,
            isActive: false,
            breakOutTime: { not: null }
          },
          take: criteria.threshold
        })
        
        const compliantBreaks = breaks.filter(b => {
          if (!b.breakInTime || !b.breakOutTime) return false
          const duration = (new Date(b.breakOutTime).getTime() - new Date(b.breakInTime).getTime()) / 60000
          return duration >= 15 && duration <= 60 // 15-60 minute breaks
        })
        
        return Math.min(100, (compliantBreaks.length / criteria.threshold) * 100)
      }

      case 'points':
      case 'level': {
        const employeePoints = await prisma.employeePoints.findUnique({
          where: { employeeId }
        })
        if (!employeePoints) return 0
        
        const current = criteria.type === 'points' ? employeePoints.points : employeePoints.level
        return Math.min(100, (current / criteria.threshold) * 100)
      }

      default:
        return 0
    }
  } catch (error) {
    console.error('Error calculating progress:', error)
    return 0
  }
}
