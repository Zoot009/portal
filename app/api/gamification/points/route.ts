import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'

// GET - Fetch employee points and transactions
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

    // Allow employees to view only their own data, admins can view any
    const targetEmployeeId = employeeId && employee.role === 'ADMIN' 
      ? parseInt(employeeId) 
      : employee.id

    // Get or create employee points
    let employeePoints = await prisma.employeePoints.findUnique({
      where: { employeeId: targetEmployeeId },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            email: true
          }
        }
      }
    })

    if (!employeePoints) {
      // Create initial points record
      employeePoints = await prisma.employeePoints.create({
        data: {
          employeeId: targetEmployeeId,
          points: 0,
          coins: 0,
          lifetimePoints: 0,
          lifetimeCoins: 0,
          level: 1,
          experience: 0,
          rank: 'Beginner'
        },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              employeeCode: true,
              email: true
            }
          }
        }
      })
    }

    // Get recent transactions
    const transactions = await prisma.pointTransaction.findMany({
      where: { employeeId: targetEmployeeId },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    // Get recent coin transactions
    const coinTransactions = await prisma.coinTransaction.findMany({
      where: { employeeId: targetEmployeeId },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    // Calculate leaderboard rank
    const allEmployeePoints = await prisma.employeePoints.findMany({
      orderBy: { points: 'desc' }
    })
    const globalRank = allEmployeePoints.findIndex(ep => ep.employeeId === targetEmployeeId) + 1
    const totalEmployees = allEmployeePoints.length

    return NextResponse.json({
      employeePoints,
      transactions,
      coinTransactions,
      globalRank,
      totalEmployees
    })
  } catch (error) {
    console.error('Error fetching employee points:', error)
    return NextResponse.json({ error: 'Failed to fetch employee points' }, { status: 500 })
  }
}

// POST - Award points to employee
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { employeeId, points, type, description, reference } = body

    if (!employeeId || !points || !type || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get or create employee points
    let employeePoints = await prisma.employeePoints.findUnique({
      where: { employeeId }
    })

    if (!employeePoints) {
      employeePoints = await prisma.employeePoints.create({
        data: {
          employeeId,
          points: 0,
          coins: 0,
          lifetimePoints: 0,
          lifetimeCoins: 0,
          level: 1,
          experience: 0,
          rank: 'Beginner'
        }
      })
    }

    // Update points and experience
    const newPoints = Math.max(0, employeePoints.points + points)
    const newExperience = employeePoints.experience + Math.abs(points)
    
    // Calculate level (100 XP per level)
    const experiencePerLevel = 100
    const newLevel = Math.floor(newExperience / experiencePerLevel) + 1
    
    // Calculate rank based on level
    let newRank = 'Beginner'
    if (newLevel >= 20) newRank = 'Legend'
    else if (newLevel >= 15) newRank = 'Diamond'
    else if (newLevel >= 10) newRank = 'Gold'
    else if (newLevel >= 5) newRank = 'Silver'
    else if (newLevel >= 3) newRank = 'Bronze'

    // Update employee points
    const updatedPoints = await prisma.employeePoints.update({
      where: { employeeId },
      data: {
        points: newPoints,
        experience: newExperience,
        level: newLevel,
        rank: newRank
      }
    })

    // Create transaction record
    const transaction = await prisma.pointTransaction.create({
      data: {
        employeeId,
        points,
        type,
        description,
        reference: reference || null
      }
    })

    // Check for new achievements
    await checkAndUnlockAchievements(employeeId, updatedPoints)

    return NextResponse.json({ 
      success: true, 
      employeePoints: updatedPoints,
      transaction 
    })
  } catch (error) {
    console.error('Error awarding points:', error)
    return NextResponse.json({ error: 'Failed to award points' }, { status: 500 })
  }
}

// Helper function to check and unlock achievements
async function checkAndUnlockAchievements(employeeId: number, employeePoints: any) {
  try {
    // Get all active achievements
    const achievements = await prisma.achievement.findMany({
      where: { isActive: true }
    })

    // Get employee's current achievements
    const currentAchievements = await prisma.employeeAchievement.findMany({
      where: { employeeId }
    })
    const unlockedIds = new Set(currentAchievements.map(a => a.achievementId))

    // Check each achievement
    for (const achievement of achievements) {
      if (unlockedIds.has(achievement.id)) continue

      const criteria = achievement.criteria as any
      let shouldUnlock = false

      // Check different criteria types
      if (criteria.type === 'points' && employeePoints.points >= criteria.threshold) {
        shouldUnlock = true
      } else if (criteria.type === 'level' && employeePoints.level >= criteria.threshold) {
        shouldUnlock = true
      }

      if (shouldUnlock) {
        // Unlock achievement
        await prisma.employeeAchievement.create({
          data: {
            employeeId,
            achievementId: achievement.id,
            progress: 100
          }
        })

        // Award achievement points
        await prisma.employeePoints.update({
          where: { employeeId },
          data: {
            points: { increment: achievement.points }
          }
        })

        // Create transaction
        await prisma.pointTransaction.create({
          data: {
            employeeId,
            points: achievement.points,
            type: 'earned',
            description: `Achievement unlocked: ${achievement.name}`,
            reference: `achievement:${achievement.id}`
          }
        })
      }
    }
  } catch (error) {
    console.error('Error checking achievements:', error)
  }
}
