'use client'

import { RoleGuard } from "@/components/role-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Clock, Calendar, Briefcase, Activity, AlertTriangle, Loader2, RefreshCw, TrendingUp, Shield, UserPlus, BarChart3, CheckCircle, XCircle, Clock3, MapPin, ExternalLink } from "lucide-react"
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const router = useRouter()

  // Fetch dashboard data
  const { data: dashboardData, isLoading, error, isFetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard')
      if (!response.ok) throw new Error('Failed to fetch dashboard data')
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  })

  // Fetch detailed statistics
  const { data: statisticsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats?period=month')
      if (!response.ok) throw new Error('Failed to fetch statistics')
      return response.json()
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
  })

  // Fetch recent employees
  const { data: employeesData } = useQuery({
    queryKey: ['recent-employees'],
    queryFn: async () => {
      const response = await fetch('/api/employees?limit=5&sortBy=createdAt&order=desc')
      if (!response.ok) throw new Error('Failed to fetch employees')
      return response.json()
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  })

  const stats = dashboardData?.data
  const detailedStats = statisticsData?.data
  const recentEmployees = employeesData?.data || []

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    queryClient.invalidateQueries({ queryKey: ['recent-employees'] })
  }

  if (isLoading || statsLoading) {
    return (
      <RoleGuard allowedRoles={['ADMIN', 'TEAMLEADER']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
          </div>
        </div>
      </RoleGuard>
    )
  }

  if (error) {
    return (
      <RoleGuard allowedRoles={['ADMIN', 'TEAMLEADER']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-lg font-medium text-red-600">Failed to load dashboard</p>
            <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
          </div>
        </div>
      </RoleGuard>
    )
  }

  const attendanceRate = stats?.attendance?.total > 0 
    ? Math.round((stats.attendance.present / stats.attendance.total) * 100) 
    : 0

  return (
    <RoleGuard allowedRoles={['ADMIN', 'TEAMLEADER']}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome to the Employee Management Portal
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={isFetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.employees?.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.employees?.total || 0} total registered
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Present Today
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.attendance?.present || 0}</div>
            <p className="text-xs text-muted-foreground">
              {attendanceRate}% attendance rate
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Work Logs Submitted
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.work?.recentLogs ? new Set(stats.work.recentLogs.map((log: any) => log.employeeId)).size : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.work?.recentLogs?.length || 0} total entries this month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Tags
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.tags?.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.tags?.totalAssignments || 0} total assignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Actions Required
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {(stats?.warnings?.active || 0) + (stats?.penalties?.unpaid || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.issues?.pending || 0} pending issues
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>
              Latest work log submissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats?.work?.recentLogs?.length > 0 ? (
              stats.work.recentLogs.slice(0, 5).map((log: any) => (
                <div key={log.id} className="flex items-center space-x-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {log.employee?.name || 'Employee'} worked on {log.tag?.tagName || log.tag?.name || 'General Work'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {Math.floor((log.totalMinutes || 0) / 60)}h {(log.totalMinutes || 0) % 60}m
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {log.count || 0} tasks
                      </Badge>
                      {log.tag?.category && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600">
                          {log.tag.category}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {new Date(log.submittedAt).toLocaleDateString()} at {new Date(log.submittedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm text-muted-foreground">No recent activities</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>
              Overview of key metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Teams</span>
                <span className="text-sm font-medium">{stats?.teams?.total || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Work Hours</span>
                <span className="text-sm font-medium">{stats?.work?.totalHoursThisMonth || 0}h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pending Issues</span>
                <span className="text-sm font-medium">{stats?.issues?.pending || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Warnings</span>
                <span className="text-sm font-medium text-yellow-600">{stats?.warnings?.active || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


    </div>
    </RoleGuard>
  )
}
