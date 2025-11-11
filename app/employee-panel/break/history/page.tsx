'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Coffee, Calendar, Clock, Loader2, Search } from 'lucide-react'

interface BreakSession {
  id: number
  employeeId: number
  startTime: string
  endTime: string | null
  duration: number | null
  breakDate: string
  status: 'ACTIVE' | 'COMPLETED'
  createdAt: string
}

export default function BreakHistoryPage() {
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch employee info
  const { data: authData } = useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me')
      if (!response.ok) throw new Error('Failed to fetch user data')
      return response.json()
    },
  })

  const employeeId = authData?.employee?.id

  // Fetch break history (fetch all breaks, we'll filter client-side)
  const { data: breakHistoryData, isLoading } = useQuery({
    queryKey: ['break-history', employeeId],
    queryFn: async () => {
      if (!employeeId) return null
      const response = await fetch(`/api/breaks/history?employeeId=${employeeId}`)
      if (!response.ok) throw new Error('Failed to fetch break history')
      return response.json()
    },
    enabled: !!employeeId,
  })

  const allBreaks = breakHistoryData?.data || []
  
  // Filter breaks based on date range and search
  const breakHistory = allBreaks.filter((breakSession: BreakSession) => {
    // Date range filter
    if (startDateFilter) {
      const breakDate = new Date(breakSession.breakDate).toISOString().split('T')[0]
      if (breakDate < startDateFilter) return false
    }
    if (endDateFilter) {
      const breakDate = new Date(breakSession.breakDate).toISOString().split('T')[0]
      if (breakDate > endDateFilter) return false
    }
    
    // Search filter (search in date)
    if (searchTerm) {
      const dateStr = new Date(breakSession.breakDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).toLowerCase()
      return dateStr.includes(searchTerm.toLowerCase())
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

  // Group breaks by date
  const groupedBreaks = breakHistory.reduce((acc: any, breakSession: BreakSession) => {
    const dateKey = new Date(breakSession.breakDate).toISOString().split('T')[0]
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: dateKey,
        breaks: [],
        totalDuration: 0,
      }
    }
    acc[dateKey].breaks.push(breakSession)
    acc[dateKey].totalDuration += breakSession.duration || 0
    return acc
  }, {})

  const sortedDateKeys = Object.keys(groupedBreaks).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  )

  const totalBreakTime = breakHistory.reduce((sum: number, breakSession: BreakSession) => {
    return sum + (breakSession.duration || 0)
  }, 0)

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
        <h2 className="text-3xl font-bold tracking-tight">Break History</h2>
        <p className="text-muted-foreground">View all your break sessions</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by date..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          {(startDateFilter || endDateFilter || searchTerm) && (
            <div className="mt-4 flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Active filters:</p>
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
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  Search: {searchTerm}
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
              <button
                onClick={() => {
                  setStartDateFilter('')
                  setEndDateFilter('')
                  setSearchTerm('')
                }}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                Clear all
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Breaks</CardTitle>
            <Coffee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{breakHistory.length}</div>
            <p className="text-xs text-muted-foreground">
              {startDateFilter || endDateFilter ? 'Filtered results' : 'All time'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Break Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(totalBreakTime)}</div>
            <p className="text-xs text-muted-foreground">{totalBreakTime} minutes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Break</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {breakHistory.length > 0 
                ? formatDuration(Math.round(totalBreakTime / breakHistory.length))
                : '0m'}
            </div>
            <p className="text-xs text-muted-foreground">Per break session</p>
          </CardContent>
        </Card>
      </div>

      {/* Break History by Date */}
      {sortedDateKeys.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Coffee className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No break history found</p>
              <p className="text-sm mt-2">
                {startDateFilter || endDateFilter || searchTerm
                  ? 'Try adjusting your filters'
                  : 'Your break history will appear here'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        sortedDateKeys.map((dateKey) => {
          const group = groupedBreaks[dateKey]
          return (
            <Card key={dateKey}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{formatDate(group.date)}</CardTitle>
                    <CardDescription>
                      {group.breaks.length} break{group.breaks.length !== 1 ? 's' : ''} • Total: {formatDuration(group.totalDuration)}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{group.breaks.length} sessions</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Break #</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.breaks.map((breakSession: BreakSession, index: number) => (
                      <TableRow key={breakSession.id}>
                        <TableCell className="font-medium">#{group.breaks.length - index}</TableCell>
                        <TableCell>
                          {new Date(breakSession.startTime).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </TableCell>
                        <TableCell>
                          {breakSession.endTime
                            ? new Date(breakSession.endTime).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })
                            : '-'}
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
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
