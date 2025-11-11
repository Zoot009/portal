'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Coffee, Clock, TrendingUp, Users, Loader2, Calendar } from 'lucide-react'

export default function BreakAnalyticsPage() {
  const [dateFilter, setDateFilter] = useState('')

  // Fetch all breaks
  const { data: breaksData, isLoading } = useQuery({
    queryKey: ['admin-breaks-analytics', dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (dateFilter) params.append('date', dateFilter)
      const response = await fetch(`/api/admin/breaks?${params}`)
      if (!response.ok) throw new Error('Failed to fetch breaks')
      return response.json()
    },
  })

  const allBreaks = breaksData?.data || []

  // Calculate analytics
  const totalBreaks = allBreaks.length
  const activeBreaks = allBreaks.filter((b: any) => b.status === 'ACTIVE').length
  const completedBreaks = allBreaks.filter((b: any) => b.status === 'COMPLETED').length
  const totalBreakTime = allBreaks.reduce((sum: number, b: any) => sum + (b.duration || 0), 0)
  const avgBreakTime = completedBreaks > 0 ? Math.round(totalBreakTime / completedBreaks) : 0
  
  // Unique employees
  const uniqueEmployees = new Set(allBreaks.map((b: any) => b.employeeId)).size
  
  // Break frequency per employee
  const breaksByEmployee = allBreaks.reduce((acc: any, b: any) => {
    if (!acc[b.employeeId]) {
      acc[b.employeeId] = {
        name: b.employee.name,
        code: b.employee.employeeCode,
        count: 0,
        totalTime: 0,
      }
    }
    acc[b.employeeId].count++
    acc[b.employeeId].totalTime += b.duration || 0
    return acc
  }, {})
  
  const topBreakTakers = Object.values(breaksByEmployee)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5)

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Break Analytics</h2>
        <p className="text-muted-foreground">Insights and statistics on employee breaks</p>
      </div>

      {/* Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter by Date</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Breaks</CardTitle>
            <Coffee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBreaks}</div>
            <p className="text-xs text-muted-foreground">
              {dateFilter ? 'Selected date' : 'All time'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Breaks</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeBreaks}</div>
            <p className="text-xs text-muted-foreground">Currently ongoing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatDuration(avgBreakTime)}</div>
            <p className="text-xs text-muted-foreground">Per break session</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{uniqueEmployees}</div>
            <p className="text-xs text-muted-foreground">Taking breaks</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Break Time</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{formatDuration(totalBreakTime)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {totalBreakTime} minutes across all breaks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {totalBreaks > 0 ? Math.round((completedBreaks / totalBreaks) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {completedBreaks} of {totalBreaks} breaks completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Break Takers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Break Takers</CardTitle>
          <CardDescription>Employees with most break sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {topBreakTakers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Coffee className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No break data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topBreakTakers.map((employee: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{employee.name}</p>
                      <p className="text-sm text-muted-foreground">{employee.code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{employee.count}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDuration(employee.totalTime)} total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
