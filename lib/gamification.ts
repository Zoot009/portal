import { prisma } from './prisma'

export interface AwardPointsParams {
  employeeId: number
  points: number
  type: 'earned' | 'spent' | 'bonus' | 'penalty'
  description: string
  reference?: string
}

export interface AwardCoinsParams {
  employeeId: number
  coins: number
  type: 'earned' | 'spent' | 'converted' | 'bonus' | 'achievement'
  description: string
  reference?: string
}

/**
 * Award or deduct coins from an employee
 */
export async function awardCoins(params: AwardCoinsParams) {
  const { employeeId, coins, type, description, reference } = params

  try {
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
          level: 1,
          experience: 0,
          rank: 'Beginner',
          lifetimePoints: 0,
          lifetimeCoins: 0
        }
      })
    }

    // Update coins
    const newCoins = Math.max(0, employeePoints.coins + coins)
    const newLifetimeCoins = type === 'earned' || type === 'bonus' || type === 'achievement'
      ? employeePoints.lifetimeCoins + Math.abs(coins)
      : employeePoints.lifetimeCoins

    const updatedPoints = await prisma.employeePoints.update({
      where: { employeeId },
      data: {
        coins: newCoins,
        lifetimeCoins: newLifetimeCoins
      }
    })

    // Create transaction record
    const transaction = await prisma.coinTransaction.create({
      data: {
        employeeId,
        coins,
        type,
        description,
        reference: reference || null
      }
    })

    return { 
      success: true, 
      employeePoints: updatedPoints,
      transaction 
    }
  } catch (error) {
    console.error('Error awarding coins:', error)
    throw error
  }
}

/**
 * Award or deduct points from an employee
 * Automatically handles level progression and achievement unlocks
 * Also awards coins (1 coin per 10 points earned)
 */
export async function awardPoints(params: AwardPointsParams) {
  const { employeeId, points, type, description, reference } = params

  try {
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
          level: 1,
          experience: 0,
          rank: 'Beginner',
          lifetimePoints: 0,
          lifetimeCoins: 0
        }
      })
    }

    // Update points and experience
    const newPoints = Math.max(0, employeePoints.points + points)
    const newExperience = employeePoints.experience + Math.abs(points)
    const newLifetimePoints = type === 'earned' || type === 'bonus'
      ? employeePoints.lifetimePoints + Math.abs(points)
      : employeePoints.lifetimePoints
    
    // Award coins: 1 coin per 10 points earned
    const coinsEarned = type === 'earned' || type === 'bonus' 
      ? Math.floor(Math.abs(points) / 10)
      : 0
    const newCoins = employeePoints.coins + coinsEarned
    const newLifetimeCoins = employeePoints.lifetimeCoins + coinsEarned
    
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
        coins: newCoins,
        experience: newExperience,
        level: newLevel,
        rank: newRank,
        lifetimePoints: newLifetimePoints,
        lifetimeCoins: newLifetimeCoins
      }
    })

    // Create point transaction
    const transaction = await prisma.pointTransaction.create({
      data: {
        employeeId,
        points,
        type,
        description,
        reference: reference || null
      }
    })

    // Create coin transaction if coins were earned
    if (coinsEarned > 0) {
      await prisma.coinTransaction.create({
        data: {
          employeeId,
          coins: coinsEarned,
          type: 'earned',
          description: `Bonus coins from ${description}`,
          reference: reference || null
        }
      })
    }

    // Check for new achievements
    await checkAndUnlockAchievements(employeeId, updatedPoints)

    return { 
      success: true, 
      employeePoints: updatedPoints,
      transaction,
      coinsEarned
    }
  } catch (error) {
    console.error('Error awarding points:', error)
    throw error
  }
}

/**
 * Check and unlock achievements based on employee's progress
 */
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
      } else if (criteria.type === 'attendance_streak') {
        shouldUnlock = await checkAttendanceStreak(employeeId, criteria.threshold)
      } else if (criteria.type === 'productivity_streak') {
        shouldUnlock = await checkProductivityStreak(employeeId, criteria.threshold, criteria.minProductivity || 80)
      } else if (criteria.type === 'tags_submitted') {
        shouldUnlock = await checkTagsSubmitted(employeeId, criteria.threshold)
      } else if (criteria.type === 'breaks_compliant') {
        shouldUnlock = await checkBreaksCompliant(employeeId, criteria.threshold)
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
            points: { increment: achievement.points },
            coins: { increment: achievement.coins || 0 }
          }
        })

        // Create point transaction
        await prisma.pointTransaction.create({
          data: {
            employeeId,
            points: achievement.points,
            type: 'earned',
            description: `Achievement unlocked: ${achievement.name}`,
            reference: `achievement:${achievement.id}`
          }
        })

        // Create coin transaction if achievement awards coins
        if (achievement.coins && achievement.coins > 0) {
          await prisma.coinTransaction.create({
            data: {
              employeeId,
              coins: achievement.coins,
              type: 'achievement',
              description: `Achievement unlocked: ${achievement.name}`,
              reference: `achievement:${achievement.id}`
            }
          })
        }
      }
    }
  } catch (error) {
    console.error('Error checking achievements:', error)
  }
}

async function checkAttendanceStreak(employeeId: number, threshold: number): Promise<boolean> {
  const records = await prisma.attendanceRecord.findMany({
    where: {
      employeeId,
      status: 'PRESENT'
    },
    orderBy: { date: 'desc' },
    take: threshold * 2 // Get more records to check streak
  })
  
  let streak = 0
  let lastDate = new Date()
  lastDate.setHours(0, 0, 0, 0)
  
  for (const record of records) {
    const recordDate = new Date(record.date)
    recordDate.setHours(0, 0, 0, 0)
    
    const daysDiff = Math.floor((lastDate.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff <= 1) {
      streak++
      lastDate = recordDate
    } else {
      break
    }
  }
  
  return streak >= threshold
}

async function checkProductivityStreak(employeeId: number, threshold: number, minProductivity: number): Promise<boolean> {
  const records = await prisma.flowaceRecord.findMany({
    where: {
      employeeId,
      productivityPercentage: { gte: minProductivity }
    },
    orderBy: { date: 'desc' },
    take: threshold * 2
  })
  
  let streak = 0
  let lastDate = new Date()
  lastDate.setHours(0, 0, 0, 0)
  
  for (const record of records) {
    const recordDate = new Date(record.date)
    recordDate.setHours(0, 0, 0, 0)
    
    const daysDiff = Math.floor((lastDate.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff <= 1) {
      streak++
      lastDate = recordDate
    } else {
      break
    }
  }
  
  return streak >= threshold
}

async function checkTagsSubmitted(employeeId: number, threshold: number): Promise<boolean> {
  const count = await prisma.submissionStatus.count({
    where: {
      employeeId,
      isLocked: true // Submitted and locked
    }
  })
  return count >= threshold
}

async function checkBreaksCompliant(employeeId: number, threshold: number): Promise<boolean> {
  const breaks = await prisma.break.findMany({
    where: {
      employeeId,
      isActive: false, // Ended breaks
      breakInTime: { not: null },
      breakOutTime: { not: null }
    },
    orderBy: { breakDate: 'desc' },
    take: threshold * 2
  })
  
  if (breaks.length < threshold) return false
  
  const compliantBreaks = breaks.filter(b => {
    if (!b.breakInTime || !b.breakOutTime) return false
    const duration = (new Date(b.breakInTime).getTime() - new Date(b.breakOutTime).getTime()) / 60000
    return Math.abs(duration) >= 15 && Math.abs(duration) <= 60 // 15-60 minute breaks are compliant
  })
  
  return compliantBreaks.length >= threshold
}

/**
 * Preset point values for different actions
 */
export const POINT_VALUES = {
  ATTENDANCE_PRESENT: 10,
  ATTENDANCE_STREAK_BONUS: 5, // Per day in streak
  TAG_SUBMITTED: 5,
  TAG_ON_TIME: 2, // Bonus for submitting on time
  BREAK_COMPLIANT: 3,
  PRODUCTIVITY_HIGH: 15, // 90%+ productivity
  PRODUCTIVITY_MEDIUM: 10, // 75-89% productivity
  PRODUCTIVITY_LOW: 5, // 60-74% productivity
  EARLY_CHECKIN: 5, // Before 9 AM
  LATE_PENALTY: -5,
  ABSENCE_PENALTY: -10
}

/**
 * Coin values and conversion rates
 */
export const COIN_VALUES = {
  // Conversion rates
  POINTS_TO_COINS: 10, // 10 points = 1 coin
  COIN_TO_CASH: 10, // 1 coin = ₹10
  
  // Coin costs for special rewards
  PAID_LEAVE_DAY: 50, // 50 coins = 1 paid leave day
  REMOVE_PENALTY: 30, // 30 coins = remove 1 penalty
  REMOVE_WARNING: 25, // 25 coins = remove 1 warning
  EARLY_CHECKOUT_HOUR: 20, // 20 coins = leave 1 hour early
  FLEXIBLE_HOURS_DAY: 40, // 40 coins = flexible hours for 1 day
  CASH_OUT_MIN: 100, // Minimum 100 coins to cash out (₹1000)
}
