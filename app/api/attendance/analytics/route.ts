import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Base query conditions
    const whereConditions: any = {}
    
    if (employeeId) {
      whereConditions.employeeId = parseInt(employeeId)
    }
    
    if (startDate && endDate) {
      whereConditions.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    // Fetch attendance records with employee details
    const records = await prisma.attendanceRecord.findMany({
      where: whereConditions,
      include: {
        employee: {
          select: {
            name: true,
            employeeCode: true,
            department: true,
            designation: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    // Get employee statistics using Prisma groupBy
    const employeeStats = await prisma.attendanceRecord.groupBy({
      by: ['employeeId'],
      where: whereConditions,
      _count: {
        id: true
      },
      _sum: {
        totalHours: true
      },
      _avg: {
        totalHours: true
      }
    })

    // Simplified calculations without complex raw queries for now
    const monthlyTrends: any[] = []
    const topPerformers: any[] = []
    const punctualityData: any[] = []

    // Format the response
    const formattedRecords = records.map(record => ({
      id: record.id,
      employeeId: record.employeeId,
      employeeName: record.employee?.name || `Employee ${record.employeeId}`,
      employeeCode: record.employee?.employeeCode || record.employeeId.toString(),
      department: record.employee?.department,
      designation: record.employee?.designation,
      date: record.date.toISOString().split('T')[0],
      status: record.status,
      checkInTime: record.checkInTime?.toISOString() || null,
      checkOutTime: record.checkOutTime?.toISOString() || null,
      breakInTime: record.breakInTime?.toISOString() || null,
      breakOutTime: record.breakOutTime?.toISOString() || null,
      totalHours: record.totalHours || 0,
      shift: record.shift || '10:00'
    }))

    return NextResponse.json({
      success: true,
      data: {
        records: formattedRecords,
        employeeStats,
        monthlyTrends,
        topPerformers,
        punctualityData,
        summary: {
          totalRecords: records.length,
          totalEmployees: new Set(records.map(r => r.employeeId)).size,
          totalHours: records.reduce((sum, r) => sum + (r.totalHours || 0), 0),
          presentRecords: records.filter(r => r.status === 'PRESENT').length,
          absentRecords: records.filter(r => r.status === 'ABSENT').length
        }
      }
    })

  } catch (error: any) {
    console.error('Error fetching analytics data:', error)
    return NextResponse.json(
      { error: `Failed to fetch analytics data: ${error.message}` },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, employeeId, dateRange } = await request.json()

    if (action === 'detailed-report') {
      // Generate detailed report for specific employee
      const detailedData = await prisma.attendanceRecord.findMany({
        where: {
          employeeId: parseInt(employeeId),
          date: {
            gte: new Date(dateRange.start),
            lte: new Date(dateRange.end)
          }
        },
        include: {
          employee: true
        },
        orderBy: {
          date: 'desc'
        }
      })

      return NextResponse.json({
        success: true,
        data: detailedData
      })
    }

    return NextResponse.json(
      { error: 'Invalid action specified' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('Error processing analytics request:', error)
    return NextResponse.json(
      { error: `Failed to process request: ${error.message}` },
      { status: 500 }
    )
  }
}