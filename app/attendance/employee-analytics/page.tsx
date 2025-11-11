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
  const [sortOrder, setSortOrder] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage, setRecordsPerPage] = useState(10)

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
          absentDays: 0
        })
      }
      
      const emp = employeeMap.get(empId)
      emp.records.push(record)
      
      if (record.status === 'PRESENT') {
        emp.presentDays++
        emp.totalHours += record.totalHours || 0
      } else {
        emp.absentDays++
      }
    })
    
    return Array.from(employeeMap.values()).map(emp => {
      const totalRecords = emp.records.length
      const attendanceRate = totalRecords > 0 ? (emp.presentDays / totalRecords) * 100 : 0
      const averageHoursPerDay = emp.presentDays > 0 ? emp.totalHours / emp.presentDays : 0
      
      const sortedRecords = emp.records.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      
      return {
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        employeeCode: emp.employeeCode,
        totalRecords,
        presentDays: emp.presentDays,
        absentDays: emp.absentDays,
        totalHours: Math.round(emp.totalHours * 100) / 100,
        averageHoursPerDay: Math.round(averageHoursPerDay * 100) / 100,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        firstRecord: sortedRecords[0]?.date || 'N/A',
        lastRecord: sortedRecords[sortedRecords.length - 1]?.date || 'N/A'
      } as EmployeeAnalytics
    })
  }

  // Fetch attendance records for analytics (fetch all data once)
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance-analytics-all'],
    queryFn: async () => {
      const response = await fetch('/api/attendance/records')
      if (!response.ok) throw new Error('Failed to fetch attendance data')
      const result = await response.json()
      return result.records || []
    },
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes (renamed from cacheTime)
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

  // Calculate summary statistics
  const totalEmployees = analytics.length
  const avgAttendanceRate = analytics.length > 0 
    ? analytics.reduce((sum, emp) => sum + emp.attendanceRate, 0) / analytics.length 
    : 0
  const totalHoursWorked = analytics.reduce((sum, emp) => sum + emp.totalHours, 0)

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 95) return 'bg-green-100 text-green-800'
    if (rate >= 85) return 'bg-blue-100 text-blue-800'
    if (rate >= 75) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
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
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-medium text-gray-900">Filter & Search</h3>
        </div>
        
        <div className="p-6">
          {/* Main Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by employee name, code..."
                  value={employeeSearch}
                  onChange={(e) => {
                    setEmployeeSearch(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10 h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={salaryCycleFilter} onValueChange={(value) => {
                setSalaryCycleFilter(value)
                setCurrentPage(1)
              }}>
                <SelectTrigger className="w-52 h-10 border-gray-300">
                  <SelectValue placeholder="Current Cycle (6 Oct - 5 Nov)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Cycle (6 Oct - 5 Nov)</SelectItem>
                  <SelectItem value="previous">Previous Cycle (6 Sep - 5 Oct)</SelectItem>
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
                <TableRow key={employee.employeeId} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell className="pl-6">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-gray-600 text-white text-sm font-semibold">
                          {employee.employeeName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">{employee.employeeName}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-gray-600">
                    {employee.employeeCode}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    <div className="flex items-center justify-center gap-1">
                      <span className="font-semibold text-green-600">{employee.presentDays}</span>
                      <span className="text-gray-400">/</span>
                      <span>{employee.totalRecords}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm font-medium">
                    {employee.totalHours}h
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm pr-6">
                    {employee.averageHoursPerDay}h
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
        <div className="flex items-center justify-between bg-white border rounded-lg px-6 py-4 mt-6">
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
              Showing <span className="font-medium text-gray-900">{startIndex + 1}</span> to <span className="font-medium text-gray-900">{Math.min(endIndex, totalAnalytics)}</span> of <span className="font-medium text-gray-900">{totalAnalytics}</span> entries
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