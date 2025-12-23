'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { 
  Search,
  ChevronLeft, 
  ChevronRight
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

// Helper function to get pay cycle dates (6th to 5th cycle)
function getPayCycleDates(referenceDate: Date) {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()
  const day = referenceDate.getDate()
  
  // If we're before the 6th, the cycle started last month
  // If we're on or after the 6th, the cycle started this month
  let cycleStartMonth = month
  let cycleStartYear = year
  
  if (day < 6) {
    cycleStartMonth = month - 1
    if (cycleStartMonth < 0) {
      cycleStartMonth = 11
      cycleStartYear = year - 1
    }
  }
  
  // Create start date: 6th of the cycle start month (using UTC to avoid timezone issues)
  const start = new Date(Date.UTC(cycleStartYear, cycleStartMonth, 6, 0, 0, 0, 0))
  
  // End date is 5th of next month
  let cycleEndMonth = cycleStartMonth + 1
  let cycleEndYear = cycleStartYear
  
  if (cycleEndMonth > 11) {
    cycleEndMonth = 0
    cycleEndYear = cycleStartYear + 1
  }
  
  // Create end date: 5th of the cycle end month (using UTC to avoid timezone issues)
  const end = new Date(Date.UTC(cycleEndYear, cycleEndMonth, 5, 23, 59, 59, 999))
  
  return { start, end }
}

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
  const [salaryCycleFilter, setSalaryCycleFilter] = useState('current')
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage, setRecordsPerPage] = useState(10)
  const [sortBy, setSortBy] = useState('presentDays')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Get pay cycle dates
  const currentCycle = getPayCycleDates(new Date())
  // For previous cycle, get the cycle that ended just before current cycle started
  const previousCycleDate = new Date(currentCycle.start.getTime() - 1) // One day before current cycle starts
  const previousCycle = getPayCycleDates(previousCycleDate)

  // Format cycle labels - simplified to show just the cycle pattern
  const currentCycleLabel = '6-5'
  const previousCycleLabel = '6-5'

  // Format hours to HH:MM display
  function formatHoursToHHMM(totalHours: number): string {
    if (!totalHours || totalHours === 0) return "00:00"
    
    const hours = Math.floor(totalHours)
    const minutes = Math.round((totalHours - hours) * 60)
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  // Format time for calculation purposes
  function formatTimeForCalc(timeString: string | null): Date | null {
    if (!timeString) return null
    
    try {
      const date = new Date(timeString)
      if (isNaN(date.getTime())) return null
      return date
    } catch {
      return null
    }
  }

  // Calculate total working hours using live calculation method with UTC
  const calculateTotalHoursLive = (
    checkInTime: string | null, 
    breakInTime: string | null, 
    breakOutTime: string | null, 
    checkOutTime: string | null, 
    overtime: number = 0
  ): number => {
    try {
      const checkIn = formatTimeForCalc(checkInTime)
      const checkOut = formatTimeForCalc(checkOutTime)
      
      if (!checkIn || !checkOut) return 0
      
      // Calculate total work time in milliseconds, then convert to minutes
      const totalWorkMinutes = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60)
      
      // Calculate break duration in minutes
      let breakDurationMinutes = 0
      const breakIn = formatTimeForCalc(breakInTime)
      const breakOut = formatTimeForCalc(breakOutTime)
      
      if (breakIn && breakOut) {
        breakDurationMinutes = (breakOut.getTime() - breakIn.getTime()) / (1000 * 60)
      }
      
      // Subtract break time and add overtime (convert overtime from hours to minutes)
      const effectiveWorkMinutes = Math.max(0, totalWorkMinutes - breakDurationMinutes) + (overtime * 60)
      
      // Convert back to decimal hours
      return Math.max(0, effectiveWorkMinutes) / 60
    } catch (error) {
      console.error('Error calculating total hours:', error)
      return 0
    }
  }

  // Process attendance data to generate analytics
  const processAnalytics = (records: any[]): EmployeeAnalytics[] => {
    const employeeMap = new Map<number, any>()
    
    records.forEach(record => {
      const empId = parseInt(record.employeeId)
      if (!employeeMap.has(empId)) {
        employeeMap.set(empId, {
          employeeId: empId,
          employeeName: record.employeeName,
          employeeCode: record.employeeCode,
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

  // Fetch attendance records for analytics with pay cycle filtering
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance-analytics', salaryCycleFilter, currentCycle.start.toISOString(), previousCycle.start.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams()
      
      if (salaryCycleFilter === 'current') {
        const startDate = currentCycle.start.toISOString().split('T')[0]
        const endDate = currentCycle.end.toISOString().split('T')[0]
        params.append('startDate', startDate)
        params.append('endDate', endDate)
      } else if (salaryCycleFilter === 'previous') {
        const startDate = previousCycle.start.toISOString().split('T')[0]
        const endDate = previousCycle.end.toISOString().split('T')[0]
        params.append('startDate', startDate)
        params.append('endDate', endDate)
      }
      // For 'all' cycles, don't add any date parameters
      
      const url = `/api/attendance/records${params.toString() ? '?' + params.toString() : ''}`
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch attendance data')
      const result = await response.json()
      return result.records || []
    },
    staleTime: 0, // Don't use stale data
    gcTime: 0, // Don't cache
    refetchOnWindowFocus: false,
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

  // Calculate summary statistics
  const totalEmployees = analytics.length
  const avgAttendanceRate = analytics.length > 0 
    ? analytics.reduce((sum, emp) => sum + emp.attendanceRate, 0) / analytics.length 
    : 0
  const totalHoursWorked = analytics.reduce((sum, emp) => sum + emp.totalHours, 0)

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
          <p className="text-muted-foreground">Analyze employee attendance patterns and performance</p>
        </div>
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
                  <TableHead className="text-center font-medium pr-6">Avg Hours/Day</TableHead>
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
                  <TableCell className="text-center font-mono text-sm pr-6">
                    {formatHoursToHHMM(employee.averageHoursPerDay)}
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