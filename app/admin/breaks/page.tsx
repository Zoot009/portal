'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Coffee, Calendar, Clock, Search, Download, TrendingUp, Users, Loader2 } from 'lucide-react'

interface BreakSession {
  id: number
  employeeId: number
  startTime: string
  endTime: string | null
  duration: number | null
  breakDate: string
  status: 'ACTIVE' | 'COMPLETED'
  employee: {
    id: number
    name: string
    employeeCode: string
  }
}

export default function AdminBreaksPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  // Fetch all breaks
  const { data: breaksData, isLoading } = useQuery({
    queryKey: ['admin-breaks', dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (dateFilter) params.append('date', dateFilter)
      const response = await fetch(`/api/admin/breaks?${params}`)
      if (!response.ok) throw new Error('Failed to fetch breaks')
      return response.json()
    },
  })

  const allBreaks = breaksData?.data || []

  // Filter breaks by search term
  const filteredBreaks = allBreaks.filter((breakSession: BreakSession) => {
    const matchesSearch = breakSession.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         breakSession.employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
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

  // Calculate statistics
  const totalBreaks = filteredBreaks.length
  const activeBreaks = filteredBreaks.filter((b: BreakSession) => b.status === 'ACTIVE').length
  const completedBreaks = filteredBreaks.filter((b: BreakSession) => b.status === 'COMPLETED').length
  const totalBreakTime = filteredBreaks.reduce((sum: number, b: BreakSession) => sum + (b.duration || 0), 0)
  const avgBreakTime = completedBreaks > 0 ? Math.round(totalBreakTime / completedBreaks) : 0

  // Get unique employees count
  const uniqueEmployees = new Set(filteredBreaks.map((b: BreakSession) => b.employeeId)).size

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Break Management</h2>
          <p className="text-muted-foreground">Monitor and manage employee break sessions</p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
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
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Breaks</CardTitle>
            <Coffee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBreaks}</div>
            <p className="text-xs text-muted-foreground">
              {dateFilter ? 'For selected date' : 'All time'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeBreaks}</div>
            <p className="text-xs text-muted-foreground">Currently on break</p>
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
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatDuration(totalBreakTime)}</div>
            <p className="text-xs text-muted-foreground">{totalBreakTime} minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{uniqueEmployees}</div>
            <p className="text-xs text-muted-foreground">Unique employees</p>
          </CardContent>
        </Card>
      </div>

      {/* Breaks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Break Sessions</CardTitle>
          <CardDescription>All employee break sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBreaks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Coffee className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No break sessions found</p>
              <p className="text-sm mt-2">
                {searchTerm || dateFilter
                  ? 'Try adjusting your filters'
                  : 'Break sessions will appear here'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBreaks.map((breakSession: BreakSession) => (
                  <TableRow key={breakSession.id}>
                    <TableCell className="font-medium">{breakSession.employee.name}</TableCell>
                    <TableCell>{breakSession.employee.employeeCode}</TableCell>
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
    </div>
  )
}
