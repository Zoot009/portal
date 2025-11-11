import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/dashboard - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const employeeId = searchParams.get('employeeId')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    // Get employee counts
    const totalEmployees = await prisma.employee.count()
    const activeEmployees = await prisma.employee.count({
      where: { isActive: true },
    })
    const teamLeaders = await prisma.employee.count({
      where: { role: 'TEAMLEADER' },
    })
    const admins = await prisma.employee.count({
      where: { role: 'ADMIN' },
    })

    // Get today's attendance
    const todayAttendance = await prisma.attendanceRecord.findMany({
      where: {
        date: today,
      },
    })

    const attendanceStats = {
      total: todayAttendance.length,
      present: todayAttendance.filter(a =>
        ['PRESENT', 'WFH_APPROVED', 'LATE'].includes(a.status)
      ).length,
      absent: todayAttendance.filter(a => a.status === 'ABSENT').length,
      late: todayAttendance.filter(a => a.status === 'LATE').length,
      onLeave: todayAttendance.filter(a =>
        ['LEAVE_APPROVED', 'WFH_APPROVED'].includes(a.status)
      ).length,
    }

    // Get leave requests
    const pendingLeaves = await prisma.leaveRequest.count({
      where: { status: 'PENDING' },
    })
    const approvedLeavesThisMonth = await prisma.leaveRequest.count({
      where: {
        status: 'APPROVED',
        startDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    })

    // Get tags and assignments
    const activeTags = await prisma.tag.count({
      where: { isActive: true },
    })
    const totalAssignments = await prisma.assignment.count()

    // Get recent logs
    const recentLogs = await prisma.log.findMany({
      where: {
        logDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      take: 10,
      orderBy: {
        submittedAt: 'desc',
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
          },
        },
        tag: true,
      },
    })

    const totalWorkHours = await prisma.log.aggregate({
      where: {
        logDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        totalMinutes: true,
      },
    })

    // Get pending issues
    const pendingIssues = await prisma.issue.count({
      where: { issueStatus: 'pending' },
    })

    // Get warnings and penalties
    const activeWarnings = await prisma.warning.count({
      where: { isActive: true },
    })
    const unpaidPenalties = await prisma.penalty.count({
      where: { isPaid: false },
    })

    // Get teams
    const totalTeams = await prisma.team.count({
      where: { isActive: true },
    })

    // Get unread notifications (if employeeId provided)
    let unreadNotifications = 0
    if (employeeId) {
      unreadNotifications = await prisma.notification.count({
        where: {
          employeeId: parseInt(employeeId),
          isRead: false,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        employees: {
          total: totalEmployees,
          active: activeEmployees,
          teamLeaders,
          admins,
        },
        attendance: attendanceStats,
        leaves: {
          pending: pendingLeaves,
          approvedThisMonth: approvedLeavesThisMonth,
        },
        tags: {
          active: activeTags,
          totalAssignments,
        },
        work: {
          totalMinutesThisMonth: totalWorkHours._sum.totalMinutes || 0,
          totalHoursThisMonth: Math.round((totalWorkHours._sum.totalMinutes || 0) / 60),
          recentLogs,
        },
        issues: {
          pending: pendingIssues,
        },
        warnings: {
          active: activeWarnings,
        },
        penalties: {
          unpaid: unpaidPenalties,
        },
        teams: {
          total: totalTeams,
        },
        notifications: {
          unread: unreadNotifications,
        },
      },
    })
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard data',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
