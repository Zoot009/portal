'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Coffee, Clock, Calendar, Loader2, Search, TrendingUp } from 'lucide-react'

export default function EmployeeBreaksPage() {
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch all employees
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await fetch('/api/employees')
      if (!response.ok) throw new Error('Failed to fetch employees')
      return response.json()
    },
  })

  // Fetch breaks for selected employee (fetch all, filter client-side)
  const { data: breaksData, isLoading } = useQuery({
    queryKey: ['employee-breaks', selectedEmployee],
    queryFn: async () => {
      if (!selectedEmployee) return null
      const response = await fetch(`/api/breaks/history?employeeId=${selectedEmployee}`)
      if (!response.ok) throw new Error('Failed to fetch breaks')
      return response.json()
    },
    enabled: !!selectedEmployee,
  })

  const employees = employeesData?.data || []
  const allBreaks = breaksData?.data || []

  // Filter employees by search term
  const filteredEmployees = employees.filter((emp: any) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return emp.name.toLowerCase().includes(searchLower) || 
           emp.employeeCode.toLowerCase().includes(searchLower)
  })

  // Filter breaks by date range
  const breaks = allBreaks.filter((breakSession: any) => {
    if (startDateFilter) {
      const breakDate = new Date(breakSession.breakDate).toISOString().split('T')[0]
      if (breakDate < startDateFilter) return false
    }
    if (endDateFilter) {
      const breakDate = new Date(breakSession.breakDate).toISOString().split('T')[0]
      if (breakDate > endDateFilter) return false
    }
    return true
  })

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Calculate stats for selected employee
  const totalBreaks = breaks.length
  const completedBreaks = breaks.filter((b: any) => b.status === 'COMPLETED').length
  const totalTime = breaks.reduce((sum: number, b: any) => sum + (b.duration || 0), 0)
  const avgTime = completedBreaks > 0 ? Math.round(totalTime / completedBreaks) : 0

  const selectedEmp = employees.find((e: any) => e.id.toString() === selectedEmployee)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Employee Breaks</h2>
        <p className="text-muted-foreground">View break history for specific employees</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter employee break data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Employee</label>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Employee</label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent>
                  {filteredEmployees.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No employees found
                    </div>
                  ) : (
                    filteredEmployees.map((employee: any) => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        {employee.name} ({employee.employeeCode})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedEmployee && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">From Date</label>
                <Input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  placeholder="Start date"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">To Date</label>
                <Input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  placeholder="End date"
                />
              </div>
            </div>
          )}

          {/* Active Filters Display */}
          {(selectedEmployee || startDateFilter || endDateFilter) && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {selectedEmployee && (
                <Badge variant="secondary" className="gap-1">
                  Employee: {employees.find((e: any) => e.id.toString() === selectedEmployee)?.name}
                  <button
                    onClick={() => {
                      setSelectedEmployee('')
                      setStartDateFilter('')
                      setEndDateFilter('')
                    }}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {startDateFilter && (
                <Badge variant="secondary" className="gap-1">
                  From: {new Date(startDateFilter).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  <button
                    onClick={() => setStartDateFilter('')}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {endDateFilter && (
                <Badge variant="secondary" className="gap-1">
                  To: {new Date(endDateFilter).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  <button
                    onClick={() => setEndDateFilter('')}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {(startDateFilter || endDateFilter) && (
                <button
                  onClick={() => {
                    setStartDateFilter('')
                    setEndDateFilter('')
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                >
                  Clear dates
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedEmployee && (
        <>
          {/* Employee Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Breaks</CardTitle>
                <Coffee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalBreaks}</div>
                <p className="text-xs text-muted-foreground">
                  {startDateFilter || endDateFilter ? 'Filtered range' : 'All time'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <Calendar className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{completedBreaks}</div>
                <p className="text-xs text-muted-foreground">Break sessions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Time</CardTitle>
                <Clock className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatDuration(totalTime)}</div>
                <p className="text-xs text-muted-foreground">{totalTime} minutes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average</CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{formatDuration(avgTime)}</div>
                <p className="text-xs text-muted-foreground">Per break</p>
              </CardContent>
            </Card>
          </div>

          {/* Breaks Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                Break History - {selectedEmp?.name} ({selectedEmp?.employeeCode})
              </CardTitle>
              <CardDescription>All break sessions for this employee</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : breaks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Coffee className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No breaks found</p>
                  <p className="text-sm mt-2">
                    {startDateFilter || endDateFilter
                      ? 'No breaks found in selected date range'
                      : 'This employee has not taken any breaks yet'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breaks.map((breakSession: any) => (
                      <TableRow key={breakSession.id}>
                        <TableCell>{formatDate(breakSession.breakDate)}</TableCell>
                        <TableCell>{formatTime(breakSession.startTime)}</TableCell>
                        <TableCell>
                          {breakSession.endTime ? formatTime(breakSession.endTime) : '-'}
                        </TableCell>
                        <TableCell>
                          {breakSession.duration ? formatDuration(breakSession.duration) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={breakSession.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {breakSession.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedEmployee && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select an employee</p>
              <p className="text-sm mt-2">Choose an employee from the dropdown to view their break history</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
