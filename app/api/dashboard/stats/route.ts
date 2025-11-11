import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/dashboard/stats - Get detailed statistics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'month' // day, week, month, year

    const now = new Date()
    let startDate = new Date()

    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
    }

    // Attendance statistics
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: startDate,
          lte: now,
        },
      },
    })

    const attendanceByStatus = attendanceRecords.reduce((acc: any, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1
      return acc
    }, {})

    const totalHoursWorked = attendanceRecords.reduce((sum, record) => {
      return sum + (record.totalHours || 0)
    }, 0)

    const totalOvertimeHours = attendanceRecords.reduce((sum, record) => {
      return sum + (record.overtime || 0)
    }, 0)

    // Leave statistics
    const leaveStats = await prisma.leaveRequest.groupBy({
      by: ['status'],
      where: {
        requestedAt: {
          gte: startDate,
          lte: now,
        },
      },
      _count: true,
    })

    const leaveByType = await prisma.leaveRequest.groupBy({
      by: ['leaveType'],
      where: {
        requestedAt: {
          gte: startDate,
          lte: now,
        },
      },
      _count: true,
    })

    // Tag usage statistics
    const tagStats = await prisma.log.groupBy({
      by: ['tagId'],
      where: {
        logDate: {
          gte: startDate,
          lte: now,
        },
      },
      _sum: {
        totalMinutes: true,
        count: true,
      },
      _count: true,
    })

    const topTags = await prisma.log.groupBy({
      by: ['tagId'],
      where: {
        logDate: {
          gte: startDate,
          lte: now,
        },
      },
      _sum: {
        totalMinutes: true,
      },
      orderBy: {
        _sum: {
          totalMinutes: 'desc',
        },
      },
      take: 10,
    })

    const tagDetails = await prisma.tag.findMany({
      where: {
        id: {
          in: topTags.map((t) => t.tagId),
        },
      },
    })

    const enrichedTopTags = topTags.map((stat) => ({
      ...stat,
      tag: tagDetails.find((t) => t.id === stat.tagId),
    }))

    // Employee productivity
    const employeeWorkStats = await prisma.log.groupBy({
      by: ['employeeId'],
      where: {
        logDate: {
          gte: startDate,
          lte: now,
        },
      },
      _sum: {
        totalMinutes: true,
        count: true,
      },
      orderBy: {
        _sum: {
          totalMinutes: 'desc',
        },
      },
      take: 10,
    })

    // Issue statistics
    const issueStats = await prisma.issue.groupBy({
      by: ['issueStatus'],
      _count: true,
    })

    const issueByCategoryStats = await prisma.issue.groupBy({
      by: ['issueCategory'],
      _count: true,
      orderBy: {
        _count: {
          issueCategory: 'desc',
        },
      },
    })

    // Warning statistics
    const warningStats = await prisma.warning.groupBy({
      by: ['warningType'],
      where: {
        warningDate: {
          gte: startDate,
          lte: now,
        },
      },
      _count: true,
    })

    const warningSeverityStats = await prisma.warning.groupBy({
      by: ['severity'],
      where: {
        warningDate: {
          gte: startDate,
          lte: now,
        },
      },
      _count: true,
    })

    // Penalty statistics
    const penaltyStats = await prisma.penalty.groupBy({
      by: ['penaltyType'],
      where: {
        penaltyDate: {
          gte: startDate,
          lte: now,
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    })

    return NextResponse.json({
      success: true,
      period,
      data: {
        attendance: {
          byStatus: attendanceByStatus,
          totalRecords: attendanceRecords.length,
          totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
          totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
          averageHoursPerDay: attendanceRecords.length > 0
            ? Math.round((totalHoursWorked / attendanceRecords.length) * 100) / 100
            : 0,
        },
        leaves: {
          byStatus: leaveStats,
          byType: leaveByType,
        },
        tags: {
          totalLogs: tagStats.reduce((sum, t) => sum + t._count, 0),
          totalMinutes: tagStats.reduce((sum, t) => sum + (t._sum.totalMinutes || 0), 0),
          topTags: enrichedTopTags,
        },
        employees: {
          topPerformers: employeeWorkStats,
        },
        issues: {
          byStatus: issueStats,
          byCategory: issueByCategoryStats,
        },
        warnings: {
          byType: warningStats,
          bySeverity: warningSeverityStats,
        },
        penalties: {
          byType: penaltyStats,
          totalAmount: penaltyStats.reduce((sum, p) => sum + (p._sum.amount || 0), 0),
        },
      },
    })
  } catch (error: any) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch statistics',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
