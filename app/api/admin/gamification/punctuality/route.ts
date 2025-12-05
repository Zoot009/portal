import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { awardAttendancePoints, checkAndAwardAchievements } from '@/lib/gamification-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, processAllRecords } = body

    if (processAllRecords) {
      // Process all attendance records for punctuality points (admin only)
      console.log('Processing all attendance records for punctuality...')
      
      // Get all attendance records from last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const attendanceRecords = await prisma.attendanceRecord.findMany({
        where: {
          date: { gte: thirtyDaysAgo },
          status: { in: ['PRESENT', 'WFH_APPROVED'] },
          checkInTime: { not: null },
          checkOutTime: { not: null }
        },
        orderBy: { date: 'desc' }
      })

      let processedCount = 0
      let punctualDaysFound = 0

      for (const record of attendanceRecords) {
        try {
          // Award attendance points (including punctuality)
          await awardAttendancePoints(record.employeeId, record)
          
          // Check for punctuality
          const checkInHour = record.checkInTime!.getUTCHours()
          const checkInMinute = record.checkInTime!.getUTCMinutes()
          const checkOutHour = record.checkOutTime!.getUTCHours()
          const checkOutMinute = record.checkOutTime!.getUTCMinutes()
          
          const checkInInWindow = (checkInHour === 10 && checkInMinute >= 0 && checkInMinute <= 30)
          const checkOutInWindow = (checkOutHour === 19 && checkOutMinute >= 0 && checkOutMinute <= 30)
          
          if (checkInInWindow && checkOutInWindow) {
            punctualDaysFound++
          }
          
          processedCount++
        } catch (error) {
          console.error(`Error processing record ${record.id}:`, error)
        }
      }

      // Check achievements for all employees
      const employees = await prisma.employee.findMany({
        where: { isActive: true },
        select: { id: true, name: true, employeeCode: true }
      })

      let achievementsUnlocked = 0
      for (const employee of employees) {
        try {
          const newAchievements = await checkAndAwardAchievements(employee.id)
          achievementsUnlocked += newAchievements.length
        } catch (error) {
          console.error(`Error checking achievements for employee ${employee.id}:`, error)
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Processed all attendance records for punctuality',
        data: {
          totalRecordsProcessed: processedCount,
          punctualDaysFound,
          employeesChecked: employees.length,
          achievementsUnlocked
        }
      })

    } else if (employeeId) {
      // Process specific employee
      const employee = await prisma.employee.findUnique({
        where: { id: parseInt(employeeId) }
      })

      if (!employee) {
        return NextResponse.json(
          { success: false, error: 'Employee not found' },
          { status: 404 }
        )
      }

      // Get recent attendance records
      const recentRecords = await prisma.attendanceRecord.findMany({
        where: {
          employeeId: parseInt(employeeId),
          date: { gte: new Date(new Date().setDate(new Date().getDate() - 30)) },
          status: { in: ['PRESENT', 'WFH_APPROVED'] }
        },
        orderBy: { date: 'desc' }
      })

      // Process each record
      for (const record of recentRecords) {
        await awardAttendancePoints(record.employeeId, record)
      }

      // Check achievements
      const newAchievements = await checkAndAwardAchievements(parseInt(employeeId))

      // Get updated punctuality stats
      const punctualityPoints = await prisma.gamificationPoints.count({
        where: {
          employeeId: parseInt(employeeId),
          pointType: 'PUNCTUALITY_BONUS',
          relatedType: 'punctuality_daily',
          earnedAt: { gte: new Date(new Date().setDate(new Date().getDate() - 30)) }
        }
      })

      return NextResponse.json({
        success: true,
        message: `Processed punctuality for ${employee.name}`,
        data: {
          employeeName: employee.name,
          employeeCode: employee.employeeCode,
          recordsProcessed: recentRecords.length,
          punctualDaysFound: punctualityPoints,
          newAchievements: newAchievements.map(a => a.name)
        }
      })
    }

    return NextResponse.json(
      { success: false, error: 'Either employeeId or processAllRecords flag is required' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error processing punctuality:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process punctuality' },
      { status: 500 }
    )
  }
}