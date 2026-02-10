"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { CalendarIcon, Clock, Search, UserCheck, UserX, Calendar, TrendingUp, Edit, ChevronDown, ChevronUp, Loader2, CalendarCheck, Info } from "lucide-react"
import React, { useState, useEffect } from "react"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSunday, eachDayOfInterval } from "date-fns"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"

interface EditHistoryItem {
  fieldChanged: string
  oldValue: string
  newValue: string
  changeReason?: string
  editedAt: string
  editedBy: string
  editedByRole: string
}

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
  editedAt: string | null
  editReason: string | null
  editHistory?: EditHistoryItem[]
}

export default function MyAttendanceRecordsPage() {
  const [searchDate, setSearchDate] = useState("")
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>()
  const [currentCycle, setCurrentCycle] = useState("")
  const [cycleFilter, setCycleFilter] = useState("current")
  const [availableCycles, setAvailableCycles] = useState<Array<{value: string, label: string, startDate: Date, endDate: Date}>>([])
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null)
  const [employeeInfo, setEmployeeInfo] = useState<{standardHours: number, dailyHours: number} | null>(null)
  const [deductBreaks, setDeductBreaks] = useState(false)
  const [totalBreakTime, setTotalBreakTime] = useState(0) // in minutes

  // Helper function to convert HH:MM string to decimal hours
  const timeToDecimal = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours + (minutes / 60)
  }

  // Helper function to convert decimal format like 8.20 to minutes (treating it as 8:20)
  const configValueToMinutes = (configValue: number): number => {
    // If the config value is like 8.20, treat it as 8 hours 20 minutes
    const wholePart = Math.floor(configValue)
    const decimalPart = Math.round((configValue - wholePart) * 100) // Get the decimal part as minutes
    return (wholePart * 60) + decimalPart
  }

  // Helper function to convert decimal hours to total minutes (for actual hours worked)
  const hoursToMinutes = (hours: number): number => {
    return Math.round(hours * 60)
  }

  // Helper function to convert minutes to decimal hours
  const minutesToHours = (minutes: number): number => {
    return minutes / 60
  }

  useEffect(() => {
    // Generate available salary cycles
    const today = new Date()
    const cycles = []
    
    // All cycles option
    cycles.push({
      value: 'all',
      label: 'All Cycles',
      startDate: new Date(2000, 0, 1),
      endDate: new Date(2099, 11, 31)
    })
    
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
    
    setCurrentCycle(`${format(currentStart, 'd MMM')} - ${format(currentEnd, 'd MMM yyyy')}`)
    
    // Previous cycle
    const prevStart = new Date(currentCycleYear, adjustedCurrentMonth - 1, 6)
    const prevEnd = new Date(currentCycleYear, adjustedCurrentMonth, 5)
    
    cycles.push({
      value: 'previous',
      label: `Previous Cycle (${format(prevStart, 'd MMM')} - ${format(prevEnd, 'd MMM yyyy')})`,
      startDate: prevStart,
      endDate: prevEnd
    })
    
    setAvailableCycles(cycles)
  }, [])

  useEffect(() => {
    fetchAttendanceRecords()
    fetchEmployeeInfo()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [attendanceRecords, statusFilter, dateFilter, searchDate, cycleFilter, customDateRange])

  useEffect(() => {
    // Force re-render when employee info changes
  }, [employeeInfo])

  // Recalculate when cycle filter changes
  useEffect(() => {
  }, [cycleFilter, availableCycles])

  // Fetch break time when cycle or employee info changes
  useEffect(() => {
    const fetchBreakData = async () => {
      if (!employeeInfo) return
      
      try {
        // Get employee ID from profile API
        const response = await fetch('/api/employee/profile')
        if (response.ok) {
          const data = await response.json()
          const employeeId = data.employee?.id
          
          if (employeeId) {
            let startDate: Date, endDate: Date
            
            if (cycleFilter === 'all') {
              // For "all", use a wide date range
              startDate = new Date(2000, 0, 1)
              endDate = new Date(2099, 11, 31)
            } else {
              // Find the selected cycle dates
              const selectedCycle = availableCycles.find(c => c.value === cycleFilter)
              if (selectedCycle) {
                startDate = selectedCycle.startDate
                endDate = selectedCycle.endDate
              } else {
                // Default to current cycle if no specific cycle selected
                const today = new Date()
                const currentMonth = today.getMonth()
                const currentYear = today.getFullYear()
                const day = today.getDate()
                
                // 6-5 cycle logic
                if (day >= 6) {
                  startDate = new Date(currentYear, currentMonth, 6)
                  endDate = new Date(currentYear, currentMonth + 1, 5)
                } else {
                  startDate = new Date(currentYear, currentMonth - 1, 6)
                  endDate = new Date(currentYear, currentMonth, 5)
                }
              }
            }
            
            const breakMinutes = await fetchBreakTimeForCycle(employeeId, startDate, endDate)
            setTotalBreakTime(breakMinutes)
          }
        }
      } catch (error) {
        console.error('Error fetching break data:', error)
        setTotalBreakTime(0)
      }
    }

    fetchBreakData()
  }, [cycleFilter, availableCycles, employeeInfo])

  async function fetchAttendanceRecords() {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/employee/attendance')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch (${response.status})`)
      }

      const data = await response.json()
      
      setAttendanceRecords(data.records || [])
      setError(null)
    } catch (err: any) {
      setError(err.message)
      
      // Auto-retry for authentication errors (auto-linking should fix it)
      if (err.message.includes('Not authenticated')) {
        setTimeout(() => {
          fetchAttendanceRecords()
        }, 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  async function fetchEmployeeInfo() {
    try {
      const response = await fetch('/api/employee/profile')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.status}`)
      }
      
      const data = await response.json()
      
      const standardHours = data.employee?.standardHours || 160 // Default to 160 hours per month
      const dailyHours = 8.20 // Default daily hours (8.20 = 8 hours 20 minutes)
      
      setEmployeeInfo({ standardHours, dailyHours })
    } catch (err) {
      // Set default values if API fails
      const defaultInfo = { standardHours: 160, dailyHours: 8.20 } // 8.20 = 8:20
      setEmployeeInfo(defaultInfo)
    }
  }

  function applyFilters() {
    let filtered = [...attendanceRecords]

    // Cycle filter
    if (cycleFilter !== "all") {
      const selectedCycle = availableCycles.find(c => c.value === cycleFilter)
      if (selectedCycle) {
        const startStr = format(selectedCycle.startDate, 'yyyy-MM-dd')
        const endStr = format(selectedCycle.endDate, 'yyyy-MM-dd')
        filtered = filtered.filter(record => record.date >= startStr && record.date <= endStr)
      }
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(record => record.status === statusFilter)
    }

    // Custom date range filter (takes priority over preset date filters)
    if (customDateRange?.from) {
      const fromStr = format(customDateRange.from, 'yyyy-MM-dd')
      if (customDateRange.to) {
        const toStr = format(customDateRange.to, 'yyyy-MM-dd')
        filtered = filtered.filter(record => record.date >= fromStr && record.date <= toStr)
      } else {
        // Only from date selected
        filtered = filtered.filter(record => record.date >= fromStr)
      }
    } else {
      // Date filter (only applies if custom range is not set)
      const today = new Date()
      if (dateFilter === "today") {
        const todayStr = format(today, 'yyyy-MM-dd')
        filtered = filtered.filter(record => record.date === todayStr)
      } else if (dateFilter === "week") {
        const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        filtered = filtered.filter(record => record.date >= weekStart && record.date <= weekEnd)
      } else if (dateFilter === "month") {
        const monthStart = format(startOfMonth(today), 'yyyy-MM-dd')
        const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd')
        filtered = filtered.filter(record => record.date >= monthStart && record.date <= monthEnd)
      }
    }

    // Search filter
    if (searchDate.trim()) {
      filtered = filtered.filter(record => record.date.includes(searchDate))
    }

    setFilteredRecords(filtered)
  }

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '-'
      const hours = date.getUTCHours().toString().padStart(2, '0')
      const minutes = date.getUTCMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    } catch (error) {
      return '-'
    }
  }

  const formatHours = (hours: number) => {
    return hours.toFixed(2)
  }

  // Helper function to format decimal hours to HH:MM or HHH:MM for large values
  const formatHoursToTime = (decimalHours: number): string => {
    if (!decimalHours || decimalHours === 0) return '00:00'
    const hours = Math.floor(decimalHours)
    const minutes = Math.round((decimalHours % 1) * 60)
    // For hours >= 100, don't pad with leading zeros
    const hoursStr = hours >= 100 ? hours.toString() : hours.toString().padStart(2, '0')
    return `${hoursStr}:${minutes.toString().padStart(2, '0')}`
  }

  // Helper function to format edit history values based on field type
  const formatEditValue = (fieldName: string, value: string): string => {
    if (!value || value === 'N/A') return 'N/A'
    
    // Fields that should be displayed as HH:MM
    const timeFields = ['totalHours', 'overtime']
    if (timeFields.includes(fieldName)) {
      const numValue = parseFloat(value)
      if (!isNaN(numValue)) {
        return formatHoursToTime(numValue)
      }
    }
    
    // Fields that are already time values (ISO strings)
    const timestampFields = ['checkInTime', 'checkOutTime', 'breakInTime', 'breakOutTime']
    if (timestampFields.includes(fieldName)) {
      return formatTime(value)
    }
    
    // For other fields, return as-is
    return value
  }

  const calculateWorkMinutes = (hours: number) => {
    return Math.round(hours * 60)
  }

  const calculateBreakTime = (breakIn: string | null, breakOut: string | null) => {
    if (!breakIn || !breakOut) return '-'
    
    try {
      const breakInDate = new Date(breakIn)
      const breakOutDate = new Date(breakOut)
      
      if (isNaN(breakInDate.getTime()) || isNaN(breakOutDate.getTime())) return '-'
      
      const diffMs = breakOutDate.getTime() - breakInDate.getTime()
      const diffMins = Math.round(diffMs / 60000)
      
      if (diffMins <= 0) return '-'
      
      if (diffMins < 60) {
        return `${diffMins}m`
      } else {
        const hours = Math.floor(diffMins / 60)
        const mins = diffMins % 60
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
      }
    } catch (error) {
      return '-'
    }
  }

  // Helper function to calculate total hours live (matches admin panel logic)
  const calculateTotalHoursLive = (checkIn: string | null, breakIn: string | null, breakOut: string | null, checkOut: string | null, overtime: number): string => {
    if (!checkIn || !checkOut) return '00:00'
    
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
      
      if (!checkInTime || !checkOutTime) return '00:00'
      
      // Parse check-in and check-out times
      const checkInParts = checkInTime.split(':').map(Number)
      const checkOutParts = checkOutTime.split(':').map(Number)
      
      if (checkInParts.length !== 2 || checkOutParts.length !== 2) return '00:00'
      if (checkInParts.some(isNaN) || checkOutParts.some(isNaN)) return '00:00'
      
      const [checkInHours, checkInMinutes] = checkInParts
      const [checkOutHours, checkOutMinutes] = checkOutParts
      
      // Convert to total minutes
      const checkInTotalMinutes = checkInHours * 60 + checkInMinutes
      const checkOutTotalMinutes = checkOutHours * 60 + checkOutMinutes
      
      // Calculate work time (check-out minus check-in)
      if (checkOutTotalMinutes <= checkInTotalMinutes) return '00:00'
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
      
      // Convert back to HH:MM format
      const finalHours = Math.floor(Math.max(0, totalWorkMinutes) / 60)
      const finalMinutes = Math.max(0, totalWorkMinutes) % 60
      
      return `${finalHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`
    } catch (error) {
      console.error('Error calculating total hours:', error)
      return '00:00'
    }
  }

  // Function to fetch and calculate total break time for current cycle
  const fetchBreakTimeForCycle = async (employeeId: number, startDate: Date, endDate: Date) => {
    try {
      const response = await fetch(`/api/breaks/history?employeeId=${employeeId}`)
      if (response.ok) {
        const result = await response.json()
        const breaks = result.data || []
        
        // Adjust end date to include the full last day
        const adjustedEndDate = new Date(endDate)
        adjustedEndDate.setDate(adjustedEndDate.getDate() + 1)
        adjustedEndDate.setHours(23, 59, 59, 999)
        
        // Filter breaks within the current cycle
        const cycleBreaks = breaks.filter((breakItem: any) => {
          const breakDate = new Date(breakItem.breakDate)
          return breakDate >= startDate && breakDate <= adjustedEndDate && breakItem.status === 'COMPLETED'
        })
        
        // Calculate total break time in minutes
        const totalMinutes = cycleBreaks.reduce((total: number, breakItem: any) => {
          if (breakItem.duration) {
            return total + breakItem.duration
          }
          return total
        }, 0)
        
        return totalMinutes
      }
    } catch (error) {
      console.error('Error fetching break data:', error)
    }
    return 0
  }

  // Calculate stats from filtered data including hours adjustments
  const stats = filteredRecords.reduce((acc, record) => {
    acc.totalRecords++
    if (record.status === 'PRESENT' || record.status === 'WFH_APPROVED') acc.present++
    if (record.status === 'ABSENT') acc.absent++
    
    // Count Sundays
    const recordDate = new Date(record.date)
    if (isSunday(recordDate)) {
      acc.sundays++
    }
    
    // Calculate hours using the same live calculation as the table display
    const liveHoursStr = calculateTotalHoursLive(
      record.checkInTime, 
      record.breakInTime, 
      record.breakOutTime, 
      record.checkOutTime, 
      record.overtime
    )
    
    // Convert HH:MM to minutes
    const [hours, minutes] = liveHoursStr.split(':').map(Number)
    const currentMinutes = (hours * 60) + minutes
    
    if (currentMinutes > 0) {
      acc.currentTotalMinutes += currentMinutes
      acc.daysWithHours++
    }
    
    // For original hours, use the database value (totalHours) - this represents what was originally stored
    // If record has been edited, find original hours from edit history
    if (record.hasBeenEdited && record.editHistory) {
      const totalHoursEdit = record.editHistory.find(edit => edit.fieldChanged === 'totalHours')
      if (totalHoursEdit) {
        const originalHours = parseFloat(totalHoursEdit.oldValue) || 0
        acc.originalTotalMinutes += hoursToMinutes(originalHours)
      } else {
        // If no edit to totalHours, use current stored value for original
        acc.originalTotalMinutes += hoursToMinutes(record.totalHours)
      }
    } else {
      // Not edited, use stored totalHours for original
      acc.originalTotalMinutes += hoursToMinutes(record.totalHours)
    }
    
    return acc
  }, { 
    totalRecords: 0, 
    present: 0, 
    absent: 0, 
    currentTotalMinutes: 0, 
    originalTotalMinutes: 0,
    daysWithHours: 0,
    sundays: 0
  })

  // Convert back to hours for display
  const currentTotalHours = minutesToHours(stats.currentTotalMinutes)
  const originalTotalHours = minutesToHours(stats.originalTotalMinutes)
  const hoursAdjusted = currentTotalHours - originalTotalHours
  const avgWorkHours = stats.daysWithHours > 0 ? currentTotalHours / stats.daysWithHours : 0
  
  // Calculate working days (exclude Sundays)
  const totalDays = stats.totalRecords
  const workingDaysInFilter = totalDays - stats.sundays
  const expectedMinutes = workingDaysInFilter * 500 // 8 hours 20 minutes = 500 minutes
  const expectedHours = minutesToHours(expectedMinutes)

  // Filter records for table display - exclude Sundays with no work hours and no overtime
  const displayRecords = filteredRecords.filter(record => {
    const recordDate = new Date(record.date)
    if (isSunday(recordDate)) {
      // Only show Sunday if there are work hours or overtime
      const liveHoursStr = calculateTotalHoursLive(
        record.checkInTime, 
        record.breakInTime, 
        record.breakOutTime, 
        record.checkOutTime, 
        record.overtime
      )
      const [hours, minutes] = liveHoursStr.split(':').map(Number)
      const totalMinutes = (hours * 60) + minutes
      
      return totalMinutes > 0 || (record.overtime && record.overtime > 0)
    }
    return true // Show all non-Sunday records
  })

  // Calculate hours goal for current salary cycle
  const calculateHoursGoal = () => {
    // Use employee's daily hours or default (8.20 means 8 hours 20 minutes)
    const dailyHours = employeeInfo?.dailyHours || 8.20
    const dailyMinutes = configValueToMinutes(dailyHours) // Convert 8.20 -> 500 minutes (8*60 + 20)
    
    const today = new Date()
    
    // For current cycle filter, determine which salary cycle we're in
    // If cycle filter is "current" or we need current cycle
    let cycleStart: Date
    let cycleEnd: Date
    
    // Find the selected cycle from available cycles
    const selectedCycle = availableCycles.find(c => c.value === cycleFilter)
    
    if (selectedCycle && selectedCycle.value !== 'all') {
      // Use the selected cycle dates
      cycleStart = selectedCycle.startDate
      cycleEnd = selectedCycle.endDate
    } else {
      // Calculate current cycle
      if (today.getDate() >= 6) {
        // We're after the 6th of current month, so cycle is 6th of this month to 5th of next month
        cycleStart = new Date(today.getFullYear(), today.getMonth(), 6)
        cycleEnd = new Date(today.getFullYear(), today.getMonth() + 1, 5)
      } else {
        // We're before the 6th of current month, so cycle is 6th of last month to 5th of this month
        cycleStart = new Date(today.getFullYear(), today.getMonth() - 1, 6)
        cycleEnd = new Date(today.getFullYear(), today.getMonth(), 5)
      }
    }
    
    // Get all days in the salary cycle (inclusive of both start and end dates)
    const allDays = eachDayOfInterval({ start: cycleStart, end: cycleEnd })
    
    // Count working days (exclude Sundays)
    const workingDays = allDays.filter(day => !isSunday(day)).length
    
    // Calculate total minutes goal, then convert to hours
    const totalMinutesGoal = workingDays * dailyMinutes
    const hoursGoal = minutesToHours(totalMinutesGoal)
    
    console.log('Hours goal calculation:', { 
      cycleFilter,
      selectedCycleDates: selectedCycle ? `${selectedCycle.startDate.toDateString()} - ${selectedCycle.endDate.toDateString()}` : 'calculated',
      cycleStart: cycleStart.toDateString(),
      cycleEnd: cycleEnd.toDateString(),
      totalDays: allDays.length,
      workingDays, 
      dailyHours,
      dailyMinutes,
      totalMinutesGoal,
      hoursGoal,
      hoursGoalFormatted: formatHoursToTime(hoursGoal)
    })
    
    return { workingDays, hoursGoal }
  }

  const { workingDays, hoursGoal } = calculateHoursGoal()

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PRESENT": return "bg-green-100 text-green-800"
      case "WFH_APPROVED": return "bg-blue-100 text-blue-800"
      case "LEAVE_APPROVED": return "bg-yellow-100 text-yellow-800"
      case "ABSENT": return "bg-red-100 text-red-800"
      case "LATE": return "bg-orange-100 text-orange-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance Records</h2>
          <p className="text-muted-foreground">
            View your attendance history and edit details
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-sm font-medium">
                {deductBreaks ? "Net Hours (after breaks)" : "Total Hours"}
              </CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Toggle to switch between total hours and net hours after deducting breaks. 
                    Break calculations follow the 6-5 monthly cycle.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Switch
              checked={deductBreaks}
              onCheckedChange={setDeductBreaks}
              className="scale-75"
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '-' : formatHoursToTime(
                deductBreaks ? 
                  Math.max(0, currentTotalHours - (totalBreakTime / 60)) : 
                  currentTotalHours
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {deductBreaks ? 
                `Total: ${formatHoursToTime(currentTotalHours)} | Breaks: ${formatHoursToTime(totalBreakTime / 60)}` :
                "Current total in filter"
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Hours</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? '-' : formatHoursToTime(expectedHours)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Worked</CardTitle>
            <UserCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {loading ? '-' : stats.daysWithHours}
            </div>
            <p className="text-xs text-muted-foreground">
              Out of {filteredRecords.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Work Hours</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{loading ? '-' : formatHoursToTime(avgWorkHours)}</div>
            <p className="text-xs text-muted-foreground">
              Per day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Goal</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {loading ? '-' : formatHoursToTime(hoursGoal)}
            </div>
            <p className="text-xs text-muted-foreground">
              {workingDays} days @ 08:20/day
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 p-4 rounded-lg border dark:border">
        <Select value={cycleFilter} onValueChange={setCycleFilter}>
          <SelectTrigger className="w-[280px]">
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

        <div className="flex items-center gap-2 ">
          <Button
            variant={dateFilter === "all" ? "default" : "outline"}
            onClick={() => setDateFilter("all")}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={dateFilter === "today" ? "default" : "outline"}
            onClick={() => setDateFilter("today")}
            size="sm"
          >
            Today
          </Button>
          <Button
            variant={dateFilter === "week" ? "default" : "outline"}
            onClick={() => setDateFilter("week")}
            size="sm"
          >
            This Week
          </Button>
          <Button
            variant={dateFilter === "month" ? "default" : "outline"}
            onClick={() => setDateFilter("month")}
            size="sm"
          >
            This Month
          </Button>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PRESENT">Present</SelectItem>
            <SelectItem value="ABSENT">Absent</SelectItem>
            <SelectItem value="WFH_APPROVED">WFH</SelectItem>
            <SelectItem value="LEAVE_APPROVED">On Leave</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={cn(
                !customDateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              initialFocus
              mode="range"
              defaultMonth={customDateRange?.from}
              selected={customDateRange}
              onSelect={setCustomDateRange}
              numberOfMonths={1}
            />
            {customDateRange && (
              <div className="p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setCustomDateRange(undefined)
                    setDateFilter("all")
                  }}
                >
                  Clear Date Range
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Attendance Records Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>Your recent attendance records</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by date..."
                  className="pl-8 w-[200px]"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading attendance records...</div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              {error.includes('Not authenticated') ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <div className="text-lg font-semibold mb-2">Setting up your account...</div>
                  <div className="text-sm text-muted-foreground text-center max-w-md">
                    We're automatically linking your account. This will just take a moment.
                  </div>
                </>
              ) : (
                <>
                  <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Attendance</div>
                  <div className="text-muted-foreground mb-4 text-center max-w-md">{error}</div>
                  <Button onClick={() => fetchAttendanceRecords()} variant="outline">
                    Retry
                  </Button>
                </>
              )}
            </div>
          ) : displayRecords.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">No attendance records found</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="text-left font-medium w-10"></TableHead>
                  <TableHead className="text-left font-medium">Date</TableHead>
                  <TableHead className="text-left font-medium">Day</TableHead>
                  <TableHead className="text-left font-medium">Status</TableHead>
                  <TableHead className="text-center font-medium">Check In</TableHead>
                  <TableHead className="text-center font-medium">Break In</TableHead>
                  <TableHead className="text-center font-medium">Break Out</TableHead>
                  <TableHead className="text-center font-medium">Check Out</TableHead>
                  <TableHead className="text-center font-medium">Hours</TableHead>
                  <TableHead className="text-center font-medium">Break Time</TableHead>
                  <TableHead className="text-center font-medium">Overtime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRecords.map((record) => (
                  <React.Fragment key={record.id}>
                    <TableRow 
                      className={`hover:bg-gray transition-colors ${record.hasBeenEdited ? 'cursor-pointer' : ''}`}
                      onClick={() => record.hasBeenEdited && setExpandedRecordId(expandedRecordId === record.id ? null : record.id)}
                    >
                      <TableCell className="text-center">
                        {record.hasBeenEdited && (
                          expandedRecordId === record.id ? 
                            <ChevronUp className="h-4 w-4 text-gray-500" /> : 
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-gray-500 dark:text-gray-700">
                        <div className="flex items-center gap-2">
                          {record.date}
                          {record.hasBeenEdited && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                              Edited
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">{format(new Date(record.date), 'EEEE')}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(record.status)}>
                          {record.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">{formatTime(record.checkInTime)}</TableCell>
                      <TableCell className="text-center font-mono text-sm">{formatTime(record.breakInTime)}</TableCell>
                      <TableCell className="text-center font-mono text-sm">{formatTime(record.breakOutTime)}</TableCell>
                      <TableCell className="text-center font-mono text-sm">{formatTime(record.checkOutTime)}</TableCell>
                      <TableCell className="text-center font-mono text-sm font-medium">
                        {calculateTotalHoursLive(record.checkInTime, record.breakInTime, record.breakOutTime, record.checkOutTime, record.overtime)}
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm text-gray-600 dark:text-gray-400">{calculateBreakTime(record.breakInTime, record.breakOutTime)}</TableCell>
                      <TableCell className="text-center font-mono text-sm font-medium text-blue-600">{record.overtime > 0 ? formatHoursToTime(record.overtime) : '00:00'}</TableCell>
                    </TableRow>
                    
                    {/* Expandable Change History Row */}
                    {record.hasBeenEdited && expandedRecordId === record.id && record.editHistory && (
                      <TableRow key={`${record.id}-details`} className="bg-orange-50/30 dark:bg-orange-950/20">
                        <TableCell colSpan={11} className="py-4">
                          <div className="space-y-3 px-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Edit History</h4>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Edited {record.editedAt ? format(new Date(record.editedAt), 'MMM d, yyyy \'at\' h:mm a') : 'N/A'}
                              </div>
                            </div>
                            
                            {record.editReason && (
                              <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-orange-200 dark:border-orange-800">
                                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Edit:</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{record.editReason}</div>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {record.editHistory.map((edit, idx) => (
                                <div key={idx} className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
                                    {edit.fieldChanged.replace(/([A-Z])/g, ' $1').trim()}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-red-600 line-through font-mono">
                                      {formatEditValue(edit.fieldChanged, edit.oldValue)}
                                    </span>
                                    <span className="text-gray-400">→</span>
                                    <span className="text-green-600 font-medium font-mono">
                                      {formatEditValue(edit.fieldChanged, edit.newValue)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
