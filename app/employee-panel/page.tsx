"use client"

import { RoleGuard } from "@/components/role-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarCheck, FileText, Tags, AlertCircle, Clock, TrendingUp, Loader2, Coffee } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { format, startOfMonth, endOfMonth } from "date-fns"
import Link from "next/link"

export default function EmployeeDashboardPage() {
  // Fetch employee data
  const { data: employeeData } = useQuery({
    queryKey: ['employee-profile'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me')
      if (!res.ok) throw new Error('Failed to fetch employee data')
      return res.json()
    }
  })

  const employeeId = employeeData?.employee?.id

  // Fetch attendance records
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['employee-attendance'],
    queryFn: async () => {
      const res = await fetch('/api/employee/attendance')
      if (!res.ok) throw new Error('Failed to fetch attendance')
      return res.json()
    },
    enabled: !!employeeId
  })

  // Fetch issues
  const { data: issuesData, isLoading: issuesLoading } = useQuery({
    queryKey: ['employee-issues', employeeId],
    queryFn: async () => {
      if (!employeeId) return null
      const res = await fetch(`/api/issues?employeeId=${employeeId}`)
      if (!res.ok) throw new Error('Failed to fetch issues')
      return res.json()
    },
    enabled: !!employeeId
  })

  // Fetch work logs
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['employee-logs', employeeId],
    queryFn: async () => {
      if (!employeeId) return null
      const res = await fetch(`/api/logs?employeeId=${employeeId}`)
      if (!res.ok) return { data: [] }
      return res.json()
    },
    enabled: !!employeeId
  })

  // Calculate stats from real data
  const attendanceRecords = attendanceData?.records || []
  const issues = issuesData?.data || []
  const logs = logsData?.data || []

  // This month's attendance
  const today = new Date()
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const monthStartStr = format(monthStart, 'yyyy-MM-dd')
  const monthEndStr = format(monthEnd, 'yyyy-MM-dd')

  const thisMonthAttendance = attendanceRecords.filter((record: any) => 
    record.date >= monthStartStr && record.date <= monthEndStr
  )

  const presentDays = thisMonthAttendance.filter((record: any) => 
    record.status === 'PRESENT' || record.status === 'WFH_APPROVED'
  ).length

  const totalWorkDays = thisMonthAttendance.length
  const attendanceRate = totalWorkDays > 0 ? ((presentDays / totalWorkDays) * 100).toFixed(1) : 0

  // Issues stats
  const pendingIssues = issues.filter((issue: any) => issue.issueStatus.toLowerCase() === 'pending').length
  const resolvedIssues = issues.filter((issue: any) => issue.issueStatus.toLowerCase() === 'resolved').length

  // Calculate total work hours this month
  const totalWorkHours = thisMonthAttendance.reduce((sum: number, record: any) => {
    return sum + (record.totalHours || 0)
  }, 0)

  // Logs this month
  const thisMonthLogs = logs.filter((log: any) => {
    const logDate = new Date(log.date)
    return logDate >= monthStart && logDate <= monthEnd
  })

  // Recent 5 attendance records
  const recentAttendance = attendanceRecords.slice(0, 5)

  // Aggregate logs by tag for this month
  const tagStats = thisMonthLogs.reduce((acc: any, log: any) => {
    const tagName = log.tag?.tagName || 'Unknown'
    if (!acc[tagName]) {
      acc[tagName] = { name: tagName, count: 0, time: 0 }
    }
    acc[tagName].count += log.count || 0
    acc[tagName].time += log.totalMinutes || 0
    return acc
  }, {})

  const topTags = Object.values(tagStats)
    .sort((a: any, b: any) => b.time - a.time)
    .slice(0, 5)

  const isLoading = attendanceLoading || issuesLoading || logsLoading

  return (
    <RoleGuard allowedRoles={['EMPLOYEE', 'ADMIN', 'TEAMLEADER']} fallbackPath="/dashboard">
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome back! Here's your overview
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month Attendance</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">{presentDays}/{totalWorkDays}</div>
                <p className="text-xs text-muted-foreground">
                  {attendanceRate}% attendance rate
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Work Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">{totalWorkHours.toFixed(1)}h</div>
                <p className="text-xs text-muted-foreground">
                  This month
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Logged</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">{thisMonthLogs.length}</div>
                <p className="text-xs text-muted-foreground">
                  This month
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Issues</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">{issues.length}</div>
                <p className="text-xs text-muted-foreground">
                  {pendingIssues} pending, {resolvedIssues} resolved
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Attendance</CardTitle>
            <CardDescription>Your last 5 attendance records</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : recentAttendance.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No attendance records found</p>
            ) : (
              <div className="space-y-4">
                {recentAttendance.map((record: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{record.date}</p>
                      <p className="text-xs text-muted-foreground">{record.status.replace('_', ' ')}</p>
                    </div>
                    <div className="text-sm font-medium">
                      {record.totalHours ? `${record.totalHours.toFixed(1)}h` : '-'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Tags</CardTitle>
            <CardDescription>Assigned work categories</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : topTags.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No work logs found this month</p>
            ) : (
              <div className="space-y-4">
                {topTags.map((tag: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{tag.name}</p>
                      <p className="text-xs text-muted-foreground">{tag.count} logs this month</p>
                    </div>
                    <div className="text-sm font-medium">{tag.time} min</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Link href="/employee-panel/my-tags/submit">
              <button className="w-full flex flex-col items-center gap-2 rounded-lg border p-4 hover:bg-accent transition-colors">
                <FileText className="h-8 w-8" />
                <span className="text-sm font-medium">Submit Logs</span>
              </button>
            </Link>
            <Link href="/employee-panel/break">
              <button className="w-full flex flex-col items-center gap-2 rounded-lg border p-4 hover:bg-accent transition-colors">
                <Coffee className="h-8 w-8" />
                <span className="text-sm font-medium">Break Tracker</span>
              </button>
            </Link>
            <Link href="/employee-panel/my-issues">
              <button className="w-full flex flex-col items-center gap-2 rounded-lg border p-4 hover:bg-accent transition-colors">
                <AlertCircle className="h-8 w-8" />
                <span className="text-sm font-medium">Raise Issue</span>
              </button>
            </Link>
            <Link href="/employee-panel/attendance/records">
              <button className="w-full flex flex-col items-center gap-2 rounded-lg border p-4 hover:bg-accent transition-colors">
                <CalendarCheck className="h-8 w-8" />
                <span className="text-sm font-medium">Attendance</span>
              </button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
    </RoleGuard>
  )
}
