import { prisma } from '@/lib/prisma'

/**
 * Punctuality Achievement System
 * 
 * Criteria:
 * - Check-in: 10:00 AM to 10:30 AM
 * - Check-out: 7:00 PM to 7:30 PM
 * - Awards 15 points per day when criteria is met
 */

const PUNCTUALITY_CRITERIA = {
  checkIn: {
    start: { hour: 10, minute: 0 },   // 10:00 AM
    end: { hour: 10, minute: 30 }     // 10:30 AM
  },
  checkOut: {
    start: { hour: 19, minute: 0 },   // 7:00 PM
    end: { hour: 19, minute: 30 }     // 7:30 PM
  },
  pointsPerDay: 15
}

/**
 * Check if a time falls within the punctuality window
 */
function isTimeInWindow(timeStr: string, window: { start: { hour: number, minute: number }, end: { hour: number, minute: number } }): boolean {
  const [hours, minutes] = timeStr.split(':').map(Number)
  
  const timeInMinutes = hours * 60 + minutes
  const startInMinutes = window.start.hour * 60 + window.start.minute
  const endInMinutes = window.end.hour * 60 + window.end.minute
  
  return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes
}

/**
 * Convert UTC DateTime to HH:MM format
 */
function formatTimeFromDateTime(dateTime: Date): string {
  return `${dateTime.getUTCHours().toString().padStart(2, '0')}:${dateTime.getUTCMinutes().toString().padStart(2, '0')}`
}

/**
 * Check if an attendance record meets punctuality criteria
 */
export function isPunctualDay(checkInTime: Date | null, checkOutTime: Date | null): boolean {
  if (!checkInTime || !checkOutTime) return false
  
  const checkInTimeStr = formatTimeFromDateTime(checkInTime)
  const checkOutTimeStr = formatTimeFromDateTime(checkOutTime)
  
  const punctualCheckIn = isTimeInWindow(checkInTimeStr, PUNCTUALITY_CRITERIA.checkIn)
  const punctualCheckOut = isTimeInWindow(checkOutTimeStr, PUNCTUALITY_CRITERIA.checkOut)
  
  return punctualCheckIn && punctualCheckOut
}

/**
 * Award punctuality points for an attendance record
 */
export async function awardPunctualityPoints(employeeId: number, attendanceRecord: any) {
  try {
    // Check if this day meets punctuality criteria
    const isPunctual = isPunctualDay(attendanceRecord.checkInTime, attendanceRecord.checkOutTime)
    
    if (!isPunctual) return false
    
    // Check if points already awarded for this day
    const existingPoints = await prisma.gamificationPoints.findFirst({
      where: {
        employeeId,
        pointType: 'PUNCTUALITY_BONUS',
        relatedId: attendanceRecord.id,
        relatedType: 'punctuality_daily'
      }
    })
    
    if (existingPoints) return false // Already awarded
    
    // Award points
    await prisma.gamificationPoints.create({
      data: {
        employeeId,
        points: PUNCTUALITY_CRITERIA.pointsPerDay,
        pointType: 'PUNCTUALITY_BONUS',
        reason: 'Daily punctuality bonus (10:00-10:30 check-in, 7:00-7:30 check-out)',
        relatedId: attendanceRecord.id,
        relatedType: 'punctuality_daily'
      }
    })
    
    console.log(`Awarded ${PUNCTUALITY_CRITERIA.pointsPerDay} punctuality points to employee ${employeeId}`)
    return true
    
  } catch (error) {
    console.error('Error awarding punctuality points:', error)
    return false
  }
}

/**
 * Check punctuality achievement progress for an employee
 */
export async function checkPunctualityAchievement(employeeId: number): Promise<{ progress: number, isCompleted: boolean }> {
  try {
    // Get punctuality points from last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const punctualityPoints = await prisma.gamificationPoints.count({
      where: {
        employeeId,
        pointType: 'PUNCTUALITY_BONUS',
        relatedType: 'punctuality_daily',
        earnedAt: {
          gte: thirtyDaysAgo
        }
      }
    })
    
    // Achievement criteria: 10 punctual days in 30 days
    const targetDays = 10
    const progress = Math.min(100, (punctualityPoints / targetDays) * 100)
    const isCompleted = punctualityPoints >= targetDays
    
    return { progress, isCompleted }
    
  } catch (error) {
    console.error('Error checking punctuality achievement:', error)
    return { progress: 0, isCompleted: false }
  }
}

/**
 * Create the punctuality achievement in database (run once)
 */
export async function createPunctualityAchievement() {
  try {
    const existingAchievement = await prisma.achievement.findUnique({
      where: { name: 'Punctuality Master' }
    })
    
    if (existingAchievement) {
      console.log('Punctuality Master achievement already exists')
      return existingAchievement
    }
    
    const achievement = await prisma.achievement.create({
      data: {
        name: 'Punctuality Master',
        description: 'Be punctual for 10 days in a month. Check-in between 10:00-10:30 AM and check-out between 7:00-7:30 PM.',
        badgeIcon: '⏰',
        badgeColor: '#10b981', // Green color
        pointValue: 50, // Bonus points for completing achievement
        category: 'ATTENDANCE',
        requirements: {
          type: 'punctuality',
          targetDays: 10,
          period: 'monthly',
          checkInWindow: { start: '10:00', end: '10:30' },
          checkOutWindow: { start: '19:00', end: '19:30' }
        }
      }
    })
    
    console.log('Created Punctuality Master achievement:', achievement)
    return achievement
    
  } catch (error) {
    console.error('Error creating punctuality achievement:', error)
    throw error
  }
}