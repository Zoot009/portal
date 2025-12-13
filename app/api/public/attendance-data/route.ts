import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentPayCycle } from '@/lib/pay-cycle-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const employeeId = searchParams.get('employeeId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const cycleStart = searchParams.get('cycleStart')
    const cycleEnd = searchParams.get('cycleEnd')
    const limit = searchParams.get('limit')
    
    // Build where clause
    const whereClause: any = {
      status: {
        in: ['PRESENT', 'HALF_DAY', 'LATE', 'WFH_APPROVED']
      }
    }
    
    // Filter by employee if specified
    if (employeeId) {
      whereClause.employeeId = parseInt(employeeId)
    }
    
    // Filter by date range
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    } else if (cycleStart && cycleEnd) {
      whereClause.date = {
        gte: new Date(cycleStart),
        lte: new Date(cycleEnd)
      }
    } else {
      // Default to current pay cycle (6th to 5th)
      const currentCycle = getCurrentPayCycle()
      whereClause.date = {
        gte: currentCycle.start,
        lte: currentCycle.end
      }
    }
    
    // Get attendance records
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            department: true,
            designation: true
          }
        }
      },
      orderBy: [
        { employeeId: 'asc' },
        { date: 'desc' }
      ],
      take: limit ? parseInt(limit) : undefined
    })
    
    // Transform data - return only essential attendance fields
    const attendanceData = attendanceRecords.map(record => {
      // Format times EXACTLY like frontend (using UTC hours/minutes)
      const formatTime = (date: Date | null) => {
        if (!date) return null
        const hours = date.getUTCHours().toString().padStart(2, '0')
        const minutes = date.getUTCMinutes().toString().padStart(2, '0')
        return `${hours}:${minutes}`
      }

      // Format date EXACTLY like frontend MM/DD/YYYY
      const dateStr = record.date.toISOString().split('T')[0] // "2025-12-12"
      const [year, month, day] = dateStr.split('-')
      const frontendDateFormat = `${month}/${day}/${year}` // "12/12/2025"
      
      const attendanceDate = new Date(record.date)
      const dayName = attendanceDate.toLocaleDateString('en-US', { weekday: 'long' })
      
      return {
        employeeName: record.employee.name,
        employeeCode: record.employee.employeeCode,
        
        // Date formats (matching frontend exactly)
        date: dateStr,                    // "2025-12-12" (ISO format)
        dateFormatted: frontendDateFormat, // "12/12/2025" (same as frontend)
        dayOfWeek: dayName,               // "Thursday"
        
        // Work metrics
        totalHours: record.totalHours || 0,
        
        // Time entries (EXACTLY like frontend - UTC time, HH:MM format)
        checkInTime: formatTime(record.checkInTime),
        breakInTime: formatTime(record.breakInTime), 
        breakOutTime: formatTime(record.breakOutTime),
        checkOutTime: formatTime(record.checkOutTime),
        
        // Status
        status: record.status
      }
    })
    
    // Get cycle info for response
    const currentCycle = getCurrentPayCycle()
    const cycleStartStr = currentCycle.start.toISOString().split('T')[0]
    const cycleEndStr = currentCycle.end.toISOString().split('T')[0]
    
    return NextResponse.json({
      success: true,
      data: {
        records: attendanceData,
        totalRecords: attendanceData.length,
        dateRange: {
          start: startDate || cycleStart || cycleStartStr,
          end: endDate || cycleEndStr || cycleEndStr
        },
        payingCycle: {
          start: cycleStartStr,  // e.g., "2025-12-06"
          end: cycleEndStr,      // e.g., "2026-01-05"
          description: `${currentCycle.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${currentCycle.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        }
      }
    })
    
  } catch (error) {
    console.error('Error fetching attendance data for gamification:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch attendance data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}