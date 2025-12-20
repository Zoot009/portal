'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Search, 
  Users, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import { getCurrentPayCycle, getPayCycleByOffset, formatPayCyclePeriod } from '@/lib/pay-cycle-utils'

interface EmployeeAnalytics {
  employeeId: number
  employeeName: string
  employeeCode: string
  totalRecords: number
  presentDays: number
  absentDays: number
  totalHours: number
  averageHoursPerDay: number
  attendanceRate: number
  firstRecord: string
  lastRecord: string
}

export default function EmployeeAnalyticsPage() {
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [salaryCycleFilter, setSalaryCycleFilter] = useState('current')
  const [sortBy, setSortBy] = useState('presentDays')

  // Calculate dynamic pay cycles
  const currentCycle = getCurrentPayCycle()
  const previousCycle = getPayCycleByOffset(-1)
  const currentCycleLabel = formatPayCyclePeriod(currentCycle.start, currentCycle.end)
  const previousCycleLabel = formatPayCyclePeriod(previousCycle.start, previousCycle.end)
  const [sortOrder, setSortOrder] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage, setRecordsPerPage] = useState(10)

  // Helper function to convert decimal hours to hh:mm format
  const formatHoursToHHMM = (decimalHours: number): string => {
    if (!decimalHours || decimalHours === 0) return '00:00'
    const hours = Math.floor(decimalHours)
    const minutes = Math.round((decimalHours % 1) * 60)
    const hoursStr = hours >= 100 ? hours.toString() : hours.toString().padStart(2, '0')
    return `${hoursStr}:${minutes.toString().padStart(2, '0')}`
  }

  // Helper function to calculate total hours live (same as employee dashboard)
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
          
          // Calculate break duration
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
      console.error('Error calculating total hours:', error)
      return 0
    }
  }

  // Process attendance data to generate analytics
  const processAnalytics = (records: any[]): EmployeeAnalytics[] => {
    const employeeMap = new Map<number, any>()
    
    records.forEach(record => {
      const empId = record.employeeId
      if (!employeeMap.has(empId)) {
        employeeMap.set(empId, {
          employeeId: empId,
          employeeName: record.employee.name,
          employeeCode: record.employee.employeeCode,
          records: [],
          totalHours: 0,
          presentDays: 0,
          absentDays: 0,
          daysWithHours: 0
        })
      }
      
      const emp = employeeMap.get(empId)
      emp.records.push(record)
      
      if (record.status === 'PRESENT') {
        emp.presentDays++
        // Use live calculation for accurate hours
        const liveHours = calculateTotalHoursLive(
          record.checkInTime,
          record.breakInTime,
          record.breakOutTime,
          record.checkOutTime,
          record.overtime || 0
        )
        emp.totalHours += liveHours
        
        // Only count days that actually have working hours for average calculation
        if (liveHours > 0) {
          emp.daysWithHours++
        }
      } else {
        emp.absentDays++
      }
    })
    
    return Array.from(employeeMap.values()).map(emp => {
      const totalRecords = emp.records.length
      const attendanceRate = totalRecords > 0 ? (emp.presentDays / totalRecords) * 100 : 0
      const averageHoursPerDay = emp.daysWithHours > 0 ? emp.totalHours / emp.daysWithHours : 0
      
      const sortedRecords = emp.records.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      
      return {
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        employeeCode: emp.employeeCode,
        totalRecords,
        presentDays: emp.presentDays,
        absentDays: emp.absentDays,
        totalHours: emp.totalHours,
        averageHoursPerDay: averageHoursPerDay,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        firstRecord: sortedRecords[0]?.date || 'N/A',
        lastRecord: sortedRecords[sortedRecords.length - 1]?.date || 'N/A'
      } as EmployeeAnalytics
    })
  }

  // Fetch attendance records for analytics with cycle filtering
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance-analytics', salaryCycleFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      
      // Apply cycle filtering like in attendance panel
      if (salaryCycleFilter !== 'all') {
        let cycleStart: string, cycleEnd: string
        
        if (salaryCycleFilter === 'current') {
          cycleStart = currentCycle.start
          cycleEnd = currentCycle.end
        } else if (salaryCycleFilter === 'previous') {
          cycleStart = previousCycle.start
          cycleEnd = previousCycle.end
        } else {
          // Default to current cycle
          cycleStart = currentCycle.start
          cycleEnd = currentCycle.end
        }
        
        params.append('startDate', cycleStart)
        params.append('endDate', cycleEnd)
      }
      
      const response = await fetch(`/api/attendance?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch attendance data')
      const result = await response.json()
      console.log('Employee Analytics API Response:', {
        salaryCycleFilter,
        params: params.toString(),
        dataLength: result.data?.length || 0,
        sampleRecord: result.data?.[0]
      })
      return result.data || []
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1
  })

  // Use the processed data from the API
  const analytics = attendanceData ? processAnalytics(attendanceData) : []
  
  // Filter analytics
  const filteredAnalytics = analytics.filter(emp => {
    const matchesSearch = !employeeSearch || 
      emp.employeeName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(employeeSearch.toLowerCase())
    
    return matchesSearch
  })

  // Sort analytics
  const sortedAnalytics = filteredAnalytics.sort((a, b) => {
    const aVal = a[sortBy as keyof EmployeeAnalytics] as number
    const bVal = b[sortBy as keyof EmployeeAnalytics] as number
    return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
  })

  // Pagination logic
  const totalAnalytics = sortedAnalytics.length
  const totalPages = Math.ceil(totalAnalytics / recordsPerPage)
  const startIndex = (currentPage - 1) * recordsPerPage
  const endIndex = startIndex + recordsPerPage
  const paginatedAnalytics = sortedAnalytics.slice(startIndex, endIndex)

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(parseInt(value))
    setCurrentPage(1)
  }

  // Clear all filters
  const clearAllFilters = () => {
    setEmployeeSearch('')
    setSalaryCycleFilter('current')
    setCurrentPage(1)
  }

  // Calculate summary statistics based on filtered data
  const totalEmployees = filteredAnalytics.length
  const avgAttendanceRate = filteredAnalytics.length > 0 
    ? filteredAnalytics.reduce((sum, emp) => sum + emp.attendanceRate, 0) / filteredAnalytics.length 
    : 0
  const totalHoursWorked = filteredAnalytics.reduce((sum, emp) => sum + emp.totalHours, 0)

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 95) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    if (rate >= 85) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    if (rate >= 75) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Employee Analytics</h1>
          <p className="text-muted-foreground">
            Analyze employee attendance patterns and performance
            {salaryCycleFilter === 'current' && ` • ${currentCycleLabel}`}
            {salaryCycleFilter === 'previous' && ` • ${previousCycleLabel}`}
            {salaryCycleFilter === 'all' && ' • All Cycles'}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-2xl font-bold">{totalEmployees}</p>
              <p className="text-muted-foreground">Total Employees</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Clock className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-2xl font-bold">{formatHoursToHHMM(totalHoursWorked)}</p>
              <p className="text-muted-foreground">Total Hours Worked</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <BarChart3 className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-2xl font-bold">{avgAttendanceRate.toFixed(1)}%</p>
              <p className="text-muted-foreground">Avg Attendance Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search */}
      <div className="bg-card rounded-lg border shadow-sm mb-6">
        <div className="px-6 py-4 border-b">
          <h3 className="text-base font-medium">Filter & Search</h3>
        </div>
        
        <div className="p-6">
          {/* Main Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by employee name, code..."
                  value={employeeSearch}
                  onChange={(e) => {
                    setEmployeeSearch(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10 h-10"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={salaryCycleFilter} onValueChange={(value) => {
                setSalaryCycleFilter(value)
                setCurrentPage(1)
              }}>
                <SelectTrigger className="w-52 h-10">
                  <SelectValue placeholder={`Current Cycle (${currentCycleLabel})`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cycles</SelectItem>
                  <SelectItem value="current">Current Cycle ({currentCycleLabel})</SelectItem>
                  <SelectItem value="previous">Previous Cycle ({previousCycleLabel})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>


        </div>
      </div>

      {/* Analytics Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12">Loading...</div>
          ) : sortedAnalytics.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No employees found matching your criteria</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="text-left font-medium pl-6">Employee</TableHead>
                  <TableHead className="text-left font-medium">Code</TableHead>
                  <TableHead className="text-center font-medium">Present Days</TableHead>
                  <TableHead className="text-center font-medium">Total Hours</TableHead>
                  <TableHead className="text-center font-medium">Avg Hours/Day</TableHead>
                  <TableHead className="text-center font-medium pr-6">Attendance Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {paginatedAnalytics.map((employee) => (
                <TableRow key={employee.employeeId} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="pl-6">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                          {employee.employeeName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{employee.employeeName}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {employee.employeeCode}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    <div className="flex items-center justify-center gap-1">
                      <span className="font-semibold text-green-600 dark:text-green-400">{employee.presentDays}</span>
                      <span className="text-muted-foreground">/</span>
                      <span>{employee.totalRecords}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm font-medium">
                    {formatHoursToHHMM(employee.totalHours)}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {formatHoursToHHMM(employee.averageHoursPerDay)}
                  </TableCell>
                  <TableCell className="text-center pr-6">
                    <Badge className={getAttendanceRateColor(employee.attendanceRate)}>
                      {employee.attendanceRate.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalAnalytics > 0 && (
        <div className="flex items-center justify-between bg-card border rounded-lg px-6 py-4 mt-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select value={recordsPerPage.toString()} onValueChange={handleRecordsPerPageChange}>
                <SelectTrigger className="w-20 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">entries</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(endIndex, totalAnalytics)}</span> of <span className="font-medium">{totalAnalytics}</span> entries
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  const distance = Math.abs(page - currentPage)
                  return distance <= 1 || page === 1 || page === totalPages
                })
                .map((page, index, array) => {
                  const showEllipsis = index > 0 && page - array[index - 1] > 1
                  return (
                    <div key={page} className="flex items-center">
                      {showEllipsis && (
                        <span className="px-2 py-1 text-sm text-muted-foreground">...</span>
                      )}
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className="min-w-9 h-9 px-3"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    </div>
                  )
                })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}