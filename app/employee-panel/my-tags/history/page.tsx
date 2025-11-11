"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Calendar, Tag, Clock, Loader2, RefreshCw } from "lucide-react"
import { useState, useMemo } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

interface LogEntry {
  id: number
  employeeId: number
  tagId: number
  count: number
  totalMinutes: number
  logDate: string
  submittedAt: string
  tag: {
    id: number
    tagName: string
    timeMinutes: number
    category: string | null
  }
}

interface GroupedLog {
  date: string
  logs: LogEntry[]
  totalCount: number
  totalMinutes: number
  status: string
}

export default function TagHistoryPage() {
  const { user } = useUser()
  const [searchTerm, setSearchTerm] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Fetch employee data
  const { data: employeeData, isLoading: employeeLoading } = useQuery({
    queryKey: ['employee-profile', user?.id],
    queryFn: async () => {
      const clerkUserId = user?.id
      if (!clerkUserId) throw new Error('No user ID found')
      
      let response = await fetch(`/api/employees?clerkUserId=${encodeURIComponent(clerkUserId)}`)
      if (!response.ok) throw new Error('Failed to fetch employee')
      let result = await response.json()
      
      if (result.data && result.data.length > 0) {
        return { data: result.data[0] }
      }
      
      const searchTerm = user?.primaryEmailAddress?.emailAddress || user?.username
      if (searchTerm) {
        response = await fetch(`/api/employees?search=${encodeURIComponent(searchTerm)}`)
        if (!response.ok) throw new Error('Failed to fetch employee')
        result = await response.json()
        
        if (result.data && result.data.length > 0) {
          return { data: result.data[0] }
        }
      }
      
      throw new Error('Employee not found')
    },
    enabled: !!user?.id
  })

  // Fetch work logs history
  const { data: logsData, isLoading: logsLoading, error: logsError, refetch } = useQuery({
    queryKey: ['work-logs-history', employeeData?.data?.id],
    queryFn: async () => {
      const employeeId = employeeData?.data?.id
      if (!employeeId) throw new Error('No employee ID')
      
      const response = await fetch(`/api/logs?employeeId=${employeeId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch work logs')
      }
      const result = await response.json()
      return result
    },
    enabled: !!employeeData?.data?.id
  })

  // Group logs by date
  const groupedLogs: GroupedLog[] = useMemo(() => {
    if (!logsData?.data) return []

    const grouped = logsData.data.reduce((acc: { [key: string]: GroupedLog }, log: LogEntry) => {
      const date = new Date(log.logDate).toISOString().split('T')[0]
      
      if (!acc[date]) {
        acc[date] = {
          date,
          logs: [],
          totalCount: 0,
          totalMinutes: 0,
          status: 'APPROVED' // Default status, you can add logic to determine this
        }
      }
      
      acc[date].logs.push(log)
      acc[date].totalCount += log.count
      acc[date].totalMinutes += log.totalMinutes
      
      return acc
    }, {})

    const result = Object.values(grouped) as GroupedLog[]
    return result.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [logsData])

  // Filter grouped logs by search and date range
  const filteredHistory = useMemo(() => {
    let filtered = groupedLogs

    // Apply date range filter
    if (startDate || endDate) {
      filtered = filtered.filter((entry: GroupedLog) => {
        const entryDate = new Date(entry.date)
        const start = startDate ? new Date(startDate) : null
        const end = endDate ? new Date(endDate) : null

        if (start && end) {
          return entryDate >= start && entryDate <= end
        } else if (start) {
          return entryDate >= start
        } else if (end) {
          return entryDate <= end
        }
        return true
      })
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((entry: GroupedLog) =>
        entry.date.includes(searchTerm) ||
        entry.logs.some((log: LogEntry) => log.tag.tagName.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    return filtered
  }, [groupedLogs, searchTerm, startDate, endDate])

  // Calculate statistics
  const stats = useMemo(() => {
    if (groupedLogs.length === 0) {
      return {
        totalDays: 0,
        avgTagsPerDay: '0.0',
        avgHoursPerDay: '0.0'
      }
    }

    return {
      totalDays: groupedLogs.length,
      avgTagsPerDay: (groupedLogs.reduce((sum: number, e: GroupedLog) => sum + e.totalCount, 0) / groupedLogs.length).toFixed(1),
      avgHoursPerDay: (groupedLogs.reduce((sum: number, e: GroupedLog) => sum + e.totalMinutes, 0) / groupedLogs.length / 60).toFixed(1)
    }
  }, [groupedLogs])

  // Loading state
  if (employeeLoading || logsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">
          {employeeLoading ? 'Loading employee data...' : 'Loading work history...'}
        </p>
      </div>
    )
  }

  // Error state
  if (logsError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Work History</h2>
          <p className="text-muted-foreground">
            View your work log history and statistics
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-destructive">Failed to load work history</p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Work History</h2>
          <p className="text-muted-foreground">
            View your work log history and statistics
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              // Export to CSV
              const csvContent = [
                ['Date', 'Task', 'Count', 'Time (min)'],
                ...filteredHistory.flatMap((entry: GroupedLog) =>
                  entry.logs.map((log: LogEntry) => [
                    new Date(entry.date).toLocaleDateString(),
                    log.tag.tagName,
                    log.count.toString(),
                    log.totalMinutes.toString()
                  ])
                )
              ].map(row => row.join(',')).join('\n')
              
              const blob = new Blob([csvContent], { type: 'text/csv' })
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `work-history-${new Date().toISOString().split('T')[0]}.csv`
              a.click()
              toast.success('Work history exported successfully!')
            }}
            variant="outline" 
            size="sm"
            disabled={filteredHistory.length === 0}
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </Button>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDays}</div>
            <p className="text-xs text-muted-foreground">Logs submitted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Tags/Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgTagsPerDay}</div>
            <p className="text-xs text-muted-foreground">Tasks logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Hours/Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgHoursPerDay}h
            </div>
            <p className="text-xs text-muted-foreground">Work logged</p>
          </CardContent>
        </Card>
      </div>

      {/* Tag History */}
      <Card>
        <CardHeader>
          <CardTitle>Work Log History</CardTitle>
          <CardDescription>Filter and view all your submitted work tags</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Compact Filter Row */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 h-9"
              />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-40 h-9 text-sm"
                placeholder="From"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-40 h-9 text-sm"
                placeholder="To"
              />
              {(searchTerm || startDate || endDate) && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSearchTerm("")
                    setStartDate("")
                    setEndDate("")
                  }}
                  className="h-9"
                >
                  Clear
                </Button>
              )}
            </div>

            {filteredHistory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No work history found</p>
                <p className="text-sm">
                  {searchTerm ? 'Try adjusting your search' : 'Start submitting your work logs to see history here'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map((entry: GroupedLog) => (
                  <div
                    key={entry.date}
                    className="border rounded-lg overflow-hidden hover:shadow-md transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between p-4 bg-card">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">
                            {new Date(entry.date).toLocaleDateString('en-US', { 
                              weekday: 'short',
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </h4>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {entry.totalCount} {entry.totalCount === 1 ? 'task' : 'tasks'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {Math.floor(entry.totalMinutes / 60)}h {entry.totalMinutes % 60}m
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Task Details */}
                    <div className="p-4 pt-0 bg-muted/20">
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {entry.logs.map((log: LogEntry) => (
                          <div key={log.id} className="flex items-start gap-2 p-3 rounded-md bg-card border">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Tag className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{log.tag.tagName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  Count: <span className="font-medium text-foreground">{log.count}</span>
                                </span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">
                                  Time: <span className="font-medium text-foreground">{log.totalMinutes}m</span>
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {log.tag.timeMinutes}m per task
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
