"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Target, 
  Award,
  AlertCircle,
  CheckCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from "lucide-react"
import React, { useState, useEffect } from "react"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSunday } from 'date-fns'
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'

interface AttendanceRecord {
  id: string
  date: string
  status: string
  checkInTime: string | null
  checkOutTime: string | null
  breakInTime: string | null
  breakOutTime: string | null
  totalHours: number
  overtime: number
  hasBeenEdited: boolean
}

export default function MyAttendanceAnalyticsPage() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [cycleFilter, setCycleFilter] = useState("current")
  const [availableCycles, setAvailableCycles] = useState<Array<{value: string, label: string, startDate: Date, endDate: Date}>>([])
  const [employeeInfo, setEmployeeInfo] = useState<{standardHours: number, dailyHours: number} | null>(null)

  // Helper functions
  const configValueToMinutes = (configValue: number): number => {
    const wholePart = Math.floor(configValue)
    const decimalPart = Math.round((configValue - wholePart) * 100)
    return (wholePart * 60) + decimalPart
  }

  const hoursToMinutes = (hours: number): number => {
    return Math.round(hours * 60)
  }

  const minutesToHours = (minutes: number): number => {
    return minutes / 60
  }

  const formatHoursToTime = (decimalHours: number): string => {
    if (!decimalHours || decimalHours === 0) return '00:00'
    const hours = Math.floor(decimalHours)
    const minutes = Math.round((decimalHours % 1) * 60)
    const hoursStr = hours >= 100 ? hours.toString() : hours.toString().padStart(2, '0')
    return `${hoursStr}:${minutes.toString().padStart(2, '0')}`
  }

  // Helper function to calculate total hours live (same as dashboard)
  const calculateTotalHoursLive = (checkIn: string | null, breakIn: string | null, breakOut: string | null, checkOut: string | null, overtime: number): number => {
    if (!checkIn || !checkOut) return 0
    
    try {
      // Format times to HH:MM
      const formatTimeForCalc = (dateString: string | null): string => {
        if (!dateString) return ''
        try {
          const date = new Date(dateString)
          if (isNaN(date.getTime())) return ''
          const hours = date.getUTCHours().toString().padStart(2, '0')
          const minutes = date.getUTCMinutes().toString().padStart(2, '0')
          return `${hours}:${minutes}`
        } catch {
          return ''
        }
      }

      const checkInTime = formatTimeForCalc(checkIn)
      const checkOutTime = formatTimeForCalc(checkOut)
      const breakInTime = formatTimeForCalc(breakIn)
      const breakOutTime = formatTimeForCalc(breakOut)
      
      if (!checkInTime || !checkOutTime) return 0
      
      // Parse check-in and check-out times
      const checkInParts = checkInTime.split(':').map(Number)
      const checkOutParts = checkOutTime.split(':').map(Number)
      
      if (checkInParts.length !== 2 || checkOutParts.length !== 2) return 0
      if (checkInParts.some(isNaN) || checkOutParts.some(isNaN)) return 0
      
      const [checkInHours, checkInMinutes] = checkInParts
      const [checkOutHours, checkOutMinutes] = checkOutParts
      
      // Convert to total minutes
      const checkInTotalMinutes = checkInHours * 60 + checkInMinutes
      const checkOutTotalMinutes = checkOutHours * 60 + checkOutMinutes
      
      // Calculate work time (check-out minus check-in)
      if (checkOutTotalMinutes <= checkInTotalMinutes) return 0
      let totalWorkMinutes = checkOutTotalMinutes - checkInTotalMinutes
      
      // Subtract break time if both break times are provided
      if (breakInTime && breakOutTime) {
        const breakInParts = breakInTime.split(':').map(Number)
        const breakOutParts = breakOutTime.split(':').map(Number)
        
        if (breakInParts.length === 2 && breakOutParts.length === 2 && 
            !breakInParts.some(isNaN) && !breakOutParts.some(isNaN)) {
          
          const breakInTotalMinutes = breakInParts[0] * 60 + breakInParts[1]
          const breakOutTotalMinutes = breakOutParts[0] * 60 + breakOutParts[1]
          
          // Calculate break duration (handle any order of break times)
          const breakDurationMinutes = Math.abs(breakOutTotalMinutes - breakInTotalMinutes)
          totalWorkMinutes -= breakDurationMinutes
        }
      }
      
      // Add overtime if provided
      if (overtime && overtime > 0) {
        const overtimeMinutes = Math.round(overtime * 60)
        totalWorkMinutes += overtimeMinutes
      }
      
      // Convert back to decimal hours
      return Math.max(0, totalWorkMinutes) / 60
    } catch (error) {
      console.error('Error calculating hours:', error)
      return 0
    }
  }

  useEffect(() => {
    const today = new Date()
    const cycles = []
    
    // Current cycle
    const currentCycleStart = today.getDate() >= 6 ? today.getMonth() : today.getMonth() - 1
    const currentCycleYear = currentCycleStart < 0 ? today.getFullYear() - 1 : today.getFullYear()
    const adjustedCurrentMonth = currentCycleStart < 0 ? 11 : currentCycleStart
    
    const currentStart = new Date(currentCycleYear, adjustedCurrentMonth, 6)
    const currentEnd = new Date(currentCycleYear, adjustedCurrentMonth + 1, 5)
    
    cycles.push({
      value: 'current',
      label: `Current Cycle (${format(currentStart, 'd MMM')} - ${format(currentEnd, 'd MMM yyyy')})`,
      startDate: currentStart,
      endDate: currentEnd
    })
    
    // Previous cycle
    const prevStart = new Date(currentCycleYear, adjustedCurrentMonth - 1, 6)
    const prevEnd = new Date(currentCycleYear, adjustedCurrentMonth, 5)
    
    cycles.push({
      value: 'previous',
      label: `Previous Cycle (${format(prevStart, 'd MMM')} - ${format(prevEnd, 'd MMM yyyy')})`,
      startDate: prevStart,
      endDate: prevEnd
    })
    
    // Last 3 months
    const last3MonthsStart = new Date(currentCycleYear, adjustedCurrentMonth - 2, 6)
    cycles.push({
      value: 'last3months',
      label: `Last 3 Months (${format(last3MonthsStart, 'd MMM')} - ${format(currentEnd, 'd MMM yyyy')})`,
      startDate: last3MonthsStart,
      endDate: currentEnd
    })
    
    setAvailableCycles(cycles)
  }, [])

  useEffect(() => {
    fetchAttendanceRecords()
    fetchEmployeeInfo()
  }, [])

  async function fetchAttendanceRecords() {
    try {
      setLoading(true)
      const response = await fetch('/api/employee/attendance')
      
      if (!response.ok) {
        throw new Error('Failed to fetch attendance records')
      }

      const data = await response.json()
      setAttendanceRecords(data.records || [])
    } catch (err) {
      console.error('Error fetching attendance:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchEmployeeInfo() {
    try {
      const response = await fetch('/api/employee/profile')
      if (!response.ok) throw new Error('Failed to fetch profile')
      
      const data = await response.json()
      const standardHours = data.employee?.standardHours || 160
      const dailyHours = 8.20
      
      setEmployeeInfo({ standardHours, dailyHours })
    } catch (err) {
      console.error('Error fetching employee info:', err)
      setEmployeeInfo({ standardHours: 160, dailyHours: 8.20 })
    }
  }

  // Filter records by selected cycle
  const filteredRecords = attendanceRecords.filter(record => {
    const selectedCycle = availableCycles.find(c => c.value === cycleFilter)
    if (!selectedCycle) return true
    
    const startStr = format(selectedCycle.startDate, 'yyyy-MM-dd')
    const endStr = format(selectedCycle.endDate, 'yyyy-MM-dd')
    return record.date >= startStr && record.date <= endStr
  })

  // Calculate hours goal
  const calculateHoursGoal = () => {
    const dailyHours = employeeInfo?.dailyHours || 8.20
    const dailyMinutes = configValueToMinutes(dailyHours)
    
    const selectedCycle = availableCycles.find(c => c.value === cycleFilter)
    if (!selectedCycle) return { workingDays: 0, hoursGoal: 0, dailyGoalMinutes: dailyMinutes, remainingWorkingDays: 0 }
    
    const allDays = eachDayOfInterval({ start: selectedCycle.startDate, end: selectedCycle.endDate })
    const workingDays = allDays.filter(day => !isSunday(day)).length
    const totalMinutesGoal = workingDays * dailyMinutes
    const hoursGoal = minutesToHours(totalMinutesGoal)
    
    // Calculate remaining working days from today until cycle end
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const cycleEnd = new Date(selectedCycle.endDate)
    cycleEnd.setHours(23, 59, 59, 999)
    
    let remainingWorkingDays = 0
    if (today <= cycleEnd) {
      const futureStart = today > selectedCycle.startDate ? today : selectedCycle.startDate
      const remainingDays = eachDayOfInterval({ start: futureStart, end: selectedCycle.endDate })
      remainingWorkingDays = remainingDays.filter(day => !isSunday(day)).length
    }
    
    return { workingDays, hoursGoal, dailyGoalMinutes: dailyMinutes, remainingWorkingDays }
  }

  const { workingDays, hoursGoal, dailyGoalMinutes, remainingWorkingDays } = calculateHoursGoal()

  // Calculate comprehensive statistics
  const stats = filteredRecords.reduce((acc, record) => {
    acc.totalRecords++
    
    // Status counts
    if (record.status === 'PRESENT' || record.status === 'WFH_APPROVED') acc.present++
    if (record.status === 'ABSENT') acc.absent++
    if (record.status === 'LEAVE_APPROVED') acc.leave++
    if (record.status === 'LATE') acc.late++
    
    // Hours calculation using live calculation
    const liveHours = calculateTotalHoursLive(
      record.checkInTime,
      record.breakInTime,
      record.breakOutTime,
      record.checkOutTime,
      record.overtime || 0
    )
    
    if (liveHours > 0) {
      const minutesWorked = hoursToMinutes(liveHours)
      acc.totalMinutes += minutesWorked
      acc.daysWithHours++
      
      // Daily comparison
      if (minutesWorked >= dailyGoalMinutes) {
        acc.daysMetGoal++
      }
    }
    
    // Overtime
    if (record.overtime > 0) {
      acc.overtimeMinutes += hoursToMinutes(record.overtime)
      acc.daysWithOvertime++
    }
    
    // Edited records
    if (record.hasBeenEdited) {
      acc.editedRecords++
    }
    
    return acc
  }, { 
    totalRecords: 0,
    present: 0,
    absent: 0,
    leave: 0,
    late: 0,
    totalMinutes: 0,
    daysWithHours: 0,
    overtimeMinutes: 0,
    daysWithOvertime: 0,
    editedRecords: 0,
    daysMetGoal: 0
  })

  const totalHours = minutesToHours(stats.totalMinutes)
  const avgDailyHours = stats.daysWithHours > 0 ? totalHours / stats.daysWithHours : 0
  const hoursRemaining = hoursGoal - totalHours
  const progressPercentage = hoursGoal > 0 ? (totalHours / hoursGoal) * 100 : 0
  const overtimeHours = minutesToHours(stats.overtimeMinutes)
  const attendanceRate = stats.totalRecords > 0 ? (stats.present / stats.totalRecords) * 100 : 0

  // Estimate days needed to reach goal
  const avgDailyMinutes = stats.daysWithHours > 0 ? stats.totalMinutes / stats.daysWithHours : 0
  const daysNeeded = avgDailyMinutes > 0 ? Math.ceil(hoursToMinutes(hoursRemaining) / avgDailyMinutes) : 0

  // Prepare chart data - Daily hours trend
  const dailyHoursData = filteredRecords
    .map(record => {
      const liveHours = calculateTotalHoursLive(
        record.checkInTime,
        record.breakInTime,
        record.breakOutTime,
        record.checkOutTime,
        record.overtime || 0
      )
      return { ...record, liveHours }
    })
    .filter(r => r.liveHours > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(record => ({
      date: format(new Date(record.date), 'MMM dd'),
      hours: parseFloat(record.liveHours.toFixed(2)),
      goal: minutesToHours(dailyGoalMinutes)
    }))

  // Prepare chart data - Weekly aggregation
  const weeklyData = filteredRecords.reduce((acc: any[], record) => {
    const liveHours = calculateTotalHoursLive(
      record.checkInTime,
      record.breakInTime,
      record.breakOutTime,
      record.checkOutTime,
      record.overtime || 0
    )
    
    const weekStart = format(startOfWeek(new Date(record.date), { weekStartsOn: 1 }), 'MMM dd')
    const existing = acc.find(w => w.week === weekStart)
    
    if (existing) {
      existing.hours += liveHours
      existing.days++
    } else {
      acc.push({
        week: weekStart,
        hours: liveHours,
        days: 1
      })
    }
    
    return acc
  }, []).map(w => ({
    ...w,
    hours: parseFloat(w.hours.toFixed(2)),
    avgDaily: parseFloat((w.hours / w.days).toFixed(2))
  }))

  // Status distribution for pie chart
  const statusData = [
    { name: 'Present', value: stats.present, color: '#10b981' },
    { name: 'Absent', value: stats.absent, color: '#ef4444' },
    { name: 'Leave', value: stats.leave, color: '#f59e0b' },
    { name: 'Late', value: stats.late, color: '#f97316' }
  ].filter(item => item.value > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance Analytics</h2>
          <p className="text-muted-foreground">
            Detailed insights into your attendance and work hours
          </p>
        </div>
        <Select value={cycleFilter} onValueChange={setCycleFilter}>
          <SelectTrigger className="w-[320px]">
            <SelectValue placeholder="Select Cycle" />
          </SelectTrigger>
          <SelectContent>
            {availableCycles.map((cycle) => (
              <SelectItem key={cycle.value} value={cycle.value}>
                {cycle.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading analytics...</div>
        </div>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hours Worked</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatHoursToTime(totalHours)}</div>
                <p className="text-xs text-muted-foreground mb-2">
                  of {formatHoursToTime(hoursGoal)} goal
                </p>
                <Progress value={progressPercentage} className="h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hours Remaining</CardTitle>
                <Target className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${hoursRemaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {hoursRemaining > 0 ? formatHoursToTime(hoursRemaining) : '✓ Goal Met'}
                </div>
                {hoursRemaining > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {remainingWorkingDays} days left
                    {daysNeeded > 0 && daysNeeded > remainingWorkingDays && (
                      <span className="text-red-600 font-medium"> • Need to increase pace!</span>
                    )}
                    {daysNeeded > 0 && daysNeeded <= remainingWorkingDays && (
                      <span className="text-green-600"> • On track</span>
                    )}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Daily Hours</CardTitle>
                <Activity className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{formatHoursToTime(avgDailyHours)}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Goal: {formatHoursToTime(minutesToHours(dailyGoalMinutes))}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overtime</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatHoursToTime(overtimeHours)}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {stats.daysWithOvertime} days with OT
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Goal Progress */}
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Goal Progress
                </CardTitle>
                <CardDescription>Track your progress towards the hours goal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm font-bold">{progressPercentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-3" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Working Days</div>
                    <div className="text-lg font-bold">{workingDays}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Days Worked</div>
                    <div className="text-lg font-bold">{stats.daysWithHours}</div>
                  </div>
                </div>

                {/* Pace Analysis */}
                <div className="border-t pt-3 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Current Pace</span>
                    <span className="font-semibold text-blue-600">
                      {formatHoursToTime(avgDailyHours)}/day
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Required Pace</span>
                    <span className="font-semibold text-purple-600">
                      {formatHoursToTime(minutesToHours(dailyGoalMinutes))}/day
                    </span>
                  </div>

                  {hoursRemaining > 0 && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Remaining Days</span>
                        <span className="font-semibold text-orange-600">
                          {remainingWorkingDays} days
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Needed Per Day</span>
                        <span className="font-semibold text-red-600">
                          {formatHoursToTime(hoursRemaining / Math.max(1, remainingWorkingDays))}/day
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {hoursRemaining > 0 ? (
                  <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Target className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                          {formatHoursToTime(hoursRemaining)} hours remaining in {remainingWorkingDays} days
                        </div>
                        <div className="text-sm text-orange-800 dark:text-orange-200">
                          Need <span className="font-bold text-orange-900 dark:text-orange-100">{formatHoursToTime(hoursRemaining / Math.max(1, remainingWorkingDays))}/day</span> to meet goal
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm font-semibold text-green-900 dark:text-green-100">
                        Goal Achieved! 🎉 You've met your hours goal for this period.
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Attendance Summary */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Attendance Summary
                </CardTitle>
                <CardDescription>Status breakdown for selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Present Days</span>
                      </div>
                      <span className="font-semibold text-green-600">
                        {stats.present} ({stats.totalRecords > 0 ? ((stats.present / stats.totalRecords) * 100).toFixed(0) : 0}%)
                      </span>
                    </div>
                    <Progress 
                      value={stats.totalRecords > 0 ? (stats.present / stats.totalRecords) * 100 : 0} 
                      className="h-2 bg-green-100 [&>div]:bg-green-600" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span>Absent Days</span>
                      </div>
                      <span className="font-semibold text-red-600">
                        {stats.absent} ({stats.totalRecords > 0 ? ((stats.absent / stats.totalRecords) * 100).toFixed(0) : 0}%)
                      </span>
                    </div>
                    <Progress 
                      value={stats.totalRecords > 0 ? (stats.absent / stats.totalRecords) * 100 : 0} 
                      className="h-2 bg-red-100 [&>div]:bg-red-600" 
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-yellow-600" />
                        <span>Leave Days</span>
                      </div>
                      <span className="font-semibold text-yellow-600">
                        {stats.leave} ({stats.totalRecords > 0 ? ((stats.leave / stats.totalRecords) * 100).toFixed(0) : 0}%)
                      </span>
                    </div>
                    <Progress 
                      value={stats.totalRecords > 0 ? (stats.leave / stats.totalRecords) * 100 : 0} 
                      className="h-2 bg-yellow-100 [&>div]:bg-yellow-600" 
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span>Late Days</span>
                      </div>
                      <span className="font-semibold text-orange-600">
                        {stats.late} ({stats.totalRecords > 0 ? ((stats.late / stats.totalRecords) * 100).toFixed(0) : 0}%)
                      </span>
                    </div>
                    <Progress 
                      value={stats.totalRecords > 0 ? (stats.late / stats.totalRecords) * 100 : 0} 
                      className="h-2 bg-orange-100 [&>div]:bg-orange-600" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Additional Insights
                </CardTitle>
                <CardDescription>Key metrics and consistency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Consistency Score</span>
                      <span className="font-semibold text-purple-600">
                        {stats.daysWithHours > 0 ? ((stats.daysMetGoal / stats.daysWithHours) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={stats.daysWithHours > 0 ? (stats.daysMetGoal / stats.daysWithHours) * 100 : 0} 
                      className="h-2 bg-purple-100 [&>div]:bg-purple-600" 
                    />
                    <p className="text-xs text-muted-foreground">
                      Days you met daily goal: {stats.daysMetGoal}/{stats.daysWithHours}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Attendance Rate</span>
                      <span className="font-semibold text-green-600">{attendanceRate.toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={attendanceRate} 
                      className="h-2 bg-green-100 [&>div]:bg-green-600" 
                    />
                    <p className="text-xs text-muted-foreground">
                      {stats.present} present / {stats.totalRecords} total days
                    </p>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-muted-foreground">Edited Records</div>
                        <div className="text-2xl font-bold text-orange-600">{stats.editedRecords}</div>
                      </div>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700">
                        {stats.totalRecords > 0 ? ((stats.editedRecords / stats.totalRecords) * 100).toFixed(0) : 0}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Hours Trend */}
          {dailyHoursData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Daily Hours Trend
                </CardTitle>
                <CardDescription>Your daily work hours compared to goal ({formatHoursToTime(minutesToHours(dailyGoalMinutes))})</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dailyHoursData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value: any) => formatHoursToTime(value)}
                      labelStyle={{ color: '#000' }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="hours" 
                      stroke="#3b82f6" 
                      fill="#93c5fd" 
                      name="Hours Worked"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="goal" 
                      stroke="#f97316" 
                      strokeDasharray="5 5" 
                      name="Daily Goal"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Weekly Aggregation */}
          {weeklyData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Weekly Hours Breakdown
                </CardTitle>
                <CardDescription>Total and average daily hours per week</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: any, name: string) => {
                        if (name === 'Total Hours') return formatHoursToTime(value)
                        return formatHoursToTime(value)
                      }}
                    />
                    <Legend />
                    <Bar dataKey="hours" fill="#3b82f6" name="Total Hours" />
                    <Bar dataKey="avgDaily" fill="#8b5cf6" name="Avg Daily" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
