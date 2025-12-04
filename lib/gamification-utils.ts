import { prisma } from '@/lib/prisma'
import { PointType } from '@prisma/client'

interface PointAwardConfig {
  PERFECT_ATTENDANCE_WEEKLY: number
  PERFECT_ATTENDANCE_MONTHLY: number
  DAILY_ATTENDANCE: number
  EARLY_CHECKIN: number
  OVERTIME_BONUS: number
  WORK_LOG_COMPLETION: number
  WORK_LOG_CONSISTENCY: number
  PUNCTUALITY_BONUS: number
}

const POINT_VALUES: PointAwardConfig = {
  PERFECT_ATTENDANCE_WEEKLY: 50,
  PERFECT_ATTENDANCE_MONTHLY: 200,
  DAILY_ATTENDANCE: 10,
  EARLY_CHECKIN: 5,
  OVERTIME_BONUS: 15,
  WORK_LOG_COMPLETION: 8,
  WORK_LOG_CONSISTENCY: 25,
  PUNCTUALITY_BONUS: 12
}

export async function awardAttendancePoints(employeeId: number, attendanceRecord: any) {
  const points: { type: PointType; points: number; reason: string; relatedId?: number }[] = []

  // Daily attendance points
  if (attendanceRecord.status === 'PRESENT' || attendanceRecord.status === 'WFH_APPROVED') {
    points.push({
      type: 'ATTENDANCE_BONUS',
      points: POINT_VALUES.DAILY_ATTENDANCE,
      reason: 'Daily attendance bonus',
      relatedId: attendanceRecord.id
    })
  }

  // Early check-in bonus (before 9:30 AM)
  if (attendanceRecord.checkInTime) {
    const checkInTime = new Date(attendanceRecord.checkInTime)
    const checkInHour = checkInTime.getUTCHours()
    const checkInMinute = checkInTime.getUTCMinutes()
    
    if (checkInHour < 9 || (checkInHour === 9 && checkInMinute <= 30)) {
      points.push({
        type: 'PUNCTUALITY_BONUS',
        points: POINT_VALUES.EARLY_CHECKIN,
        reason: 'Early check-in bonus',
        relatedId: attendanceRecord.id
      })
    }
  }

  // Overtime bonus
  if (attendanceRecord.overtime > 0) {
    const overtimePoints = Math.floor(attendanceRecord.overtime) * POINT_VALUES.OVERTIME_BONUS
    points.push({
      type: 'OVERTIME_BONUS',
      points: overtimePoints,
      reason: `Overtime bonus (${attendanceRecord.overtime} hours)`,
      relatedId: attendanceRecord.id
    })
  }

  // Award points
  if (points.length > 0) {
    await Promise.all(
      points.map(point =>
        prisma.gamificationPoints.create({
          data: {
            employeeId,
            points: point.points,
            pointType: point.type,
            reason: point.reason,
            relatedId: point.relatedId,
            relatedType: 'attendance'
          }
        })
      )
    )
  }

  return points
}

export async function awardWorkLogPoints(employeeId: number, logs: any[], submissionDate: Date) {
  const points: { type: PointType; points: number; reason: string; relatedId?: number }[] = []

  // Work log completion points
  const totalPoints = logs.reduce((sum, log) => {
    return sum + Math.floor((log.totalMinutes || 0) / 30) * POINT_VALUES.WORK_LOG_COMPLETION
  }, 0)

  if (totalPoints > 0) {
    points.push({
      type: 'WORK_LOG_COMPLETION',
      points: totalPoints,
      reason: `Work log completion (${logs.length} logs, ${logs.reduce((sum, log) => sum + (log.totalMinutes || 0), 0)} minutes)`,
    })
  }

  // Consistency bonus (submitted on time)
  const currentHour = new Date().getHours()
  if (currentHour <= 18) { // Before 6 PM
    points.push({
      type: 'CONSISTENCY_BONUS',
      points: POINT_VALUES.WORK_LOG_CONSISTENCY,
      reason: 'On-time work log submission',
    })
  }

  // Award points
  if (points.length > 0) {
    await Promise.all(
      points.map(point =>
        prisma.gamificationPoints.create({
          data: {
            employeeId,
            points: point.points,
            pointType: point.type,
            reason: point.reason,
            relatedId: point.relatedId,
            relatedType: 'work_log'
          }
        })
      )
    )
  }

  return points
}

export async function checkAndAwardAchievements(employeeId: number) {
  // Get all active achievements
  const achievements = await prisma.achievement.findMany({
    where: { isActive: true }
  })

  // Get employee's current achievements
  const employeeAchievements = await prisma.employeeAchievement.findMany({
    where: { employeeId }
  })

  const newAchievements: any[] = []

  for (const achievement of achievements) {
    const existingAchievement = employeeAchievements.find(
      ea => ea.achievementId === achievement.id
    )

    // Skip if already completed
    if (existingAchievement?.isCompleted) continue

    const requirements = achievement.requirements as any
    let progress = 0
    let isCompleted = false

    // Check different achievement types
    switch (achievement.name) {
      case 'Perfect Week':
        progress = await checkPerfectWeekAttendance(employeeId)
        isCompleted = progress >= 100
        break
      
      case 'Perfect Month':
        progress = await checkPerfectMonthAttendance(employeeId)
        isCompleted = progress >= 100
        break
      
      case 'Early Bird':
        progress = await checkEarlyBirdAchievement(employeeId)
        isCompleted = progress >= 100
        break
      
      case 'Work Logger':
        progress = await checkWorkLoggerAchievement(employeeId)
        isCompleted = progress >= 100
        break
      
      case 'Points Collector':
        progress = await checkPointsCollectorAchievement(employeeId)
        isCompleted = progress >= 100
        break
    }

    // Update or create employee achievement
    if (existingAchievement) {
      await prisma.employeeAchievement.update({
        where: { id: existingAchievement.id },
        data: {
          progress,
          isCompleted,
          ...(isCompleted && !existingAchievement.isCompleted ? { unlockedAt: new Date() } : {})
        }
      })
    } else {
      await prisma.employeeAchievement.create({
        data: {
          employeeId,
          achievementId: achievement.id,
          progress,
          isCompleted,
          ...(isCompleted ? { unlockedAt: new Date() } : {})
        }
      })
    }

    // Award points if newly completed
    if (isCompleted && (!existingAchievement || !existingAchievement.isCompleted)) {
      await prisma.gamificationPoints.create({
        data: {
          employeeId,
          points: achievement.pointValue,
          pointType: 'ACHIEVEMENT_UNLOCK',
          reason: `Achievement unlocked: ${achievement.name}`,
          relatedId: achievement.id,
          relatedType: 'achievement'
        }
      })

      newAchievements.push(achievement)
    }
  }

  return newAchievements
}

// Helper functions for achievement checks
async function checkPerfectWeekAttendance(employeeId: number): Promise<number> {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: {
      employeeId,
      date: { gte: oneWeekAgo },
      status: { in: ['PRESENT', 'WFH_APPROVED'] }
    }
  })

  const workingDays = 6 // Assuming 6 working days per week
  return Math.min(100, (attendanceRecords.length / workingDays) * 100)
}

async function checkPerfectMonthAttendance(employeeId: number): Promise<number> {
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: {
      employeeId,
      date: { gte: oneMonthAgo },
      status: { in: ['PRESENT', 'WFH_APPROVED'] }
    }
  })

  const workingDays = 24 // Assuming ~24 working days per month
  return Math.min(100, (attendanceRecords.length / workingDays) * 100)
}

async function checkEarlyBirdAchievement(employeeId: number): Promise<number> {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const earlyCheckIns = await prisma.attendanceRecord.count({
    where: {
      employeeId,
      date: { gte: oneWeekAgo },
      checkInTime: {
        not: null
      }
    }
  })

  // Check if check-in times are before 9:30 AM
  const records = await prisma.attendanceRecord.findMany({
    where: {
      employeeId,
      date: { gte: oneWeekAgo },
      checkInTime: { not: null }
    },
    select: { checkInTime: true }
  })

  const earlyCount = records.filter(record => {
    if (!record.checkInTime) return false
    const checkInTime = new Date(record.checkInTime)
    const hour = checkInTime.getUTCHours()
    const minute = checkInTime.getUTCMinutes()
    return hour < 9 || (hour === 9 && minute <= 30)
  }).length

  const targetDays = 5 // 5 early check-ins in a week
  return Math.min(100, (earlyCount / targetDays) * 100)
}

async function checkWorkLoggerAchievement(employeeId: number): Promise<number> {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const workLogDays = await prisma.log.groupBy({
    by: ['logDate'],
    where: {
      employeeId,
      logDate: { gte: oneWeekAgo }
    }
  })

  const targetDays = 5 // 5 days of work logs in a week
  return Math.min(100, (workLogDays.length / targetDays) * 100)
}

async function checkPointsCollectorAchievement(employeeId: number): Promise<number> {
  const totalPoints = await prisma.gamificationPoints.aggregate({
    where: { employeeId },
    _sum: { points: true }
  })

  const targetPoints = 500 // 500 total points
  const currentPoints = totalPoints._sum.points || 0
  return Math.min(100, (currentPoints / targetPoints) * 100)
}

export async function updateLeaderboard(period: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL') {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const week = getWeekNumber(today)

  // Calculate date range based on period
  let startDate: Date
  let endDate: Date = new Date()

  switch (period) {
    case 'WEEKLY':
      startDate = new Date(today)
      startDate.setDate(today.getDate() - 7)
      break
    case 'MONTHLY':
      startDate = new Date(year, month - 1, 1)
      endDate = new Date(year, month, 0)
      break
    case 'QUARTERLY':
      const quarterStart = Math.floor((month - 1) / 3) * 3
      startDate = new Date(year, quarterStart, 1)
      endDate = new Date(year, quarterStart + 3, 0)
      break
    case 'ANNUAL':
      startDate = new Date(year, 0, 1)
      endDate = new Date(year, 11, 31)
      break
  }

  // Get all active employees
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    select: { id: true }
  })

  // Calculate metrics for each employee
  for (const employee of employees) {
    // Total points in period
    const pointsResult = await prisma.gamificationPoints.aggregate({
      where: {
        employeeId: employee.id,
        earnedAt: { gte: startDate, lte: endDate }
      },
      _sum: { points: true }
    })

    // Points by category
    const attendancePoints = await prisma.gamificationPoints.aggregate({
      where: {
        employeeId: employee.id,
        earnedAt: { gte: startDate, lte: endDate },
        pointType: { in: ['ATTENDANCE_BONUS', 'PUNCTUALITY_BONUS'] }
      },
      _sum: { points: true }
    })

    const worklogPoints = await prisma.gamificationPoints.aggregate({
      where: {
        employeeId: employee.id,
        earnedAt: { gte: startDate, lte: endDate },
        pointType: { in: ['WORK_LOG_COMPLETION', 'CONSISTENCY_BONUS'] }
      },
      _sum: { points: true }
    })

    const achievementPoints = await prisma.gamificationPoints.aggregate({
      where: {
        employeeId: employee.id,
        earnedAt: { gte: startDate, lte: endDate },
        pointType: 'ACHIEVEMENT_UNLOCK'
      },
      _sum: { points: true }
    })

    // Attendance rate
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        employeeId: employee.id,
        date: { gte: startDate, lte: endDate }
      }
    })

    const presentDays = attendanceRecords.filter(
      record => record.status === 'PRESENT' || record.status === 'WFH_APPROVED'
    ).length

    const attendanceRate = attendanceRecords.length > 0 
      ? (presentDays / attendanceRecords.length) * 100 
      : 0

    // Average work hours
    const totalHours = attendanceRecords.reduce(
      (sum, record) => sum + (record.totalHours || 0), 0
    )
    const avgWorkHours = attendanceRecords.length > 0 
      ? totalHours / attendanceRecords.length 
      : 0

    // Achievement count
    const achievementCount = await prisma.employeeAchievement.count({
      where: {
        employeeId: employee.id,
        isCompleted: true,
        unlockedAt: { gte: startDate, lte: endDate }
      }
    })

    // Upsert leaderboard entry
    const whereClause = {
      employeeId: employee.id,
      period,
      year,
      month: period === 'MONTHLY' ? month : 0,
      week: period === 'WEEKLY' ? week : 0
    };
    
    await prisma.leaderboard.upsert({
      where: {
        employeeId_period_year_month_week: whereClause
      },
      update: {
        totalPoints: pointsResult._sum.points || 0,
        attendancePoints: attendancePoints._sum.points || 0,
        worklogPoints: worklogPoints._sum.points || 0,
        achievementPoints: achievementPoints._sum.points || 0,
        attendanceRate,
        avgWorkHours,
        achievementCount
      },
      create: {
        employeeId: employee.id,
        period,
        year,
        month: period === 'MONTHLY' ? month : 0,
        week: period === 'WEEKLY' ? week : 0,
        totalPoints: pointsResult._sum.points || 0,
        attendancePoints: attendancePoints._sum.points || 0,
        worklogPoints: worklogPoints._sum.points || 0,
        achievementPoints: achievementPoints._sum.points || 0,
        attendanceRate,
        avgWorkHours,
        achievementCount
      }
    })
  }

  // Calculate rankings
  const leaderboardEntries = await prisma.leaderboard.findMany({
    where: {
      period,
      year,
      ...(period === 'MONTHLY' ? { month } : {}),
      ...(period === 'WEEKLY' ? { week } : {})
    },
    orderBy: { totalPoints: 'desc' }
  })

  // Update rankings
  for (let i = 0; i < leaderboardEntries.length; i++) {
    await prisma.leaderboard.update({
      where: { id: leaderboardEntries[i].id },
      data: { overallRank: i + 1 }
    })
  }
}

// Helper function to get week number
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}