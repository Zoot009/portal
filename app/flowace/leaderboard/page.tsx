"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { TrendingUp, TrendingDown, Download, Award, Target, CalendarIcon, Filter } from "lucide-react"
import { useState, useRef, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import html2canvas from "html2canvas"
import { toast } from "sonner"
import { format } from "date-fns"

interface FlowaceRecord {
  id: number
  employeeCode: string
  employeeName?: string
  date: string
  loggedHours: number
  activeHours: number
  productiveHours: number
  activityPercentage: number
  productivityPercentage: number
  employee?: {
    id: number
    employeeCode: string
    name: string
    email: string
  }
}

export default function FlowaceLeaderboardPage() {
  const [isDownloading, setIsDownloading] = useState(false)
  const leaderboardRef = useRef<HTMLDivElement>(null)
  
  // Filter states
  const [dateFilter, setDateFilter] = useState('all') // all, today, week, month, specific
  const [specificDate, setSpecificDate] = useState<Date | undefined>()
  const [sortBy, setSortBy] = useState('activeHours') // activeHours, productivity, loggedHours

  // Fetch Flowace records
  const { data, isLoading } = useQuery({
    queryKey: ['flowace-leaderboard'],
    queryFn: async () => {
      const response = await fetch('/api/flowace/records')
      if (!response.ok) throw new Error('Failed to fetch Flowace records')
      return response.json()
    }
  })

  const records: FlowaceRecord[] = data?.records || []

  // Filter records by date
  const filteredRecords = useMemo(() => {
    let filtered = records

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    switch (dateFilter) {
      case 'today':
        filtered = records.filter(record => {
          const recordDate = new Date(record.date)
          recordDate.setHours(0, 0, 0, 0)
          return recordDate.getTime() === today.getTime()
        })
        break
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        filtered = records.filter(record => {
          const recordDate = new Date(record.date)
          return recordDate >= weekAgo
        })
        break
      case 'month':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        filtered = records.filter(record => {
          const recordDate = new Date(record.date)
          return recordDate >= monthAgo
        })
        break
      case 'specific':
        if (specificDate) {
          const targetDate = new Date(specificDate)
          targetDate.setHours(0, 0, 0, 0)
          filtered = records.filter(record => {
            const recordDate = new Date(record.date)
            recordDate.setHours(0, 0, 0, 0)
            return recordDate.getTime() === targetDate.getTime()
          })
        }
        break
    }

    return filtered
  }, [records, dateFilter, specificDate])

  // Get unique dates for the date selector
  const availableDates = useMemo(() => {
    const dates = new Set<string>()
    records.forEach(record => {
      const date = new Date(record.date)
      dates.add(date.toISOString().split('T')[0])
    })
    return Array.from(dates).sort((a, b) => b.localeCompare(a)) // Most recent first
  }, [records])

  // Group by employee and sum active hours
  const employeeStats = new Map<string, {
    name: string
    code: string
    totalActiveHours: number
    totalLoggedHours: number
    totalProductiveHours: number
    avgProductivity: number
    recordCount: number
  }>()

  filteredRecords.forEach(record => {
    const code = record.employeeCode
    const name = record.employee?.name || record.employeeName || 'Unknown'
    
    if (!employeeStats.has(code)) {
      employeeStats.set(code, {
        name: name,
        code: record.employeeCode,
        totalActiveHours: 0,
        totalLoggedHours: 0,
        totalProductiveHours: 0,
        avgProductivity: 0,
        recordCount: 0
      })
    }
    const stats = employeeStats.get(code)!
    stats.totalActiveHours += record.activeHours
    stats.totalLoggedHours += record.loggedHours
    stats.totalProductiveHours += record.productiveHours
    stats.avgProductivity += record.productivityPercentage
    stats.recordCount += 1
  })

  // Calculate average productivity
  employeeStats.forEach(stats => {
    stats.avgProductivity = stats.recordCount > 0 ? stats.avgProductivity / stats.recordCount : 0
  })

  // Sort based on selected criteria
  const sortedEmployees = Array.from(employeeStats.values()).sort((a, b) => {
    switch (sortBy) {
      case 'productivity':
        return b.avgProductivity - a.avgProductivity
      case 'loggedHours':
        return b.totalLoggedHours - a.totalLoggedHours
      default:
        return b.totalActiveHours - a.totalActiveHours
    }
  })

  // Get top 3 winners and bottom 3 losers
  const winners = sortedEmployees.slice(0, 3)
  const losers = sortedEmployees.slice(-3).reverse()

  const formatHours = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.floor((hours - h) * 60)
    return `${h}h ${m}m`
  }

  const handleDownload = async () => {
    if (!leaderboardRef.current) return

    setIsDownloading(true)
    try {
      const canvas = await html2canvas(leaderboardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      })

      const link = document.createElement('a')
      const timestamp = new Date().toISOString().split('T')[0]
      const dateLabel = dateFilter === 'specific' && specificDate 
        ? format(specificDate, 'yyyy-MM-dd')
        : dateFilter
      link.download = `flowace-leaderboard-${dateLabel}-${timestamp}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      toast.success('Leaderboard downloaded successfully!')
    } catch (error) {
      console.error('Error downloading leaderboard:', error)
      toast.error('Failed to download leaderboard')
    } finally {
      setIsDownloading(false)
    }
  }

  // Get display title for date filter
  const getDateFilterTitle = () => {
    switch (dateFilter) {
      case 'today':
        return `Today (${format(new Date(), 'MMM dd, yyyy')})`
      case 'week':
        return 'Last 7 Days'
      case 'month':
        return 'Last 30 Days'
      case 'specific':
        return specificDate ? format(specificDate, 'MMM dd, yyyy') : 'Select Date'
      default:
        return 'All Time'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Performance Leaderboard</h2>
          <p className="text-muted-foreground">
            Employee rankings based on Flowace data - {getDateFilterTitle()}
          </p>
        </div>
        <Button onClick={handleDownload} disabled={isDownloading} className="gap-2">
          <Download className="h-4 w-4" />
          {isDownloading ? 'Downloading...' : 'Download PNG'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-4 w-4" />
            Filter Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3 md:grid-cols-3">
            {/* Date Filter */}
            <div className="space-y-1">
              <Label className="text-sm font-medium">Date Period</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="specific">Specific Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Specific Date Picker */}
            {dateFilter === 'specific' && (
              <div className="space-y-1">
                <Label className="text-sm font-medium">Select Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {specificDate ? format(specificDate, "MMM dd, yyyy") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={specificDate}
                      onSelect={setSpecificDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Sort By */}
            <div className="space-y-1">
              <Label className="text-sm font-medium">Rank By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activeHours">Active Hours</SelectItem>
                  <SelectItem value="productivity">Productivity %</SelectItem>
                  <SelectItem value="loggedHours">Logged Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Available Dates Info */}
          {availableDates.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                <span>Data available for {availableDates.length} dates</span>
                <span className="text-xs">
                  (Latest: {format(new Date(availableDates[0]), 'MMM dd, yyyy')})
                </span>
              </div>
            </div>
          )}

          {/* Results Summary */}
          {filteredRecords.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <Badge variant="secondary" className="h-6">
                Showing {sortedEmployees.length} employees with {filteredRecords.length} total records
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <div ref={leaderboardRef} className="space-y-6">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <CardTitle>Top Performers</CardTitle>
            </div>
            <CardDescription>
              {sortBy === 'productivity' 
                ? 'Highest productivity percentage' 
                : sortBy === 'loggedHours'
                ? 'Most logged hours'
                : 'Highest active hours'} - {getDateFilterTitle()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : winners.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No data available for selected period. Upload Flowace records to see rankings.
              </div>
            ) : (
              <div className="space-y-3">
                {winners.map((employee, index) => (
                  <div
                    key={employee.code}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white border-2 border-gray-200">
                      <span className="text-lg font-bold text-gray-700">#{index + 1}</span>
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gray-600 text-white text-sm font-semibold">
                        {employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{employee.name}</h3>
                        <Badge variant="outline" className="font-mono text-xs">
                          {employee.code}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>Active: <span className="font-medium text-gray-900">{formatHours(employee.totalActiveHours)}</span></span>
                        <span>Productive: <span className="font-medium text-gray-900">{formatHours(employee.totalProductiveHours)}</span></span>
                        <span>Productivity: <span className="font-medium text-gray-900">{employee.avgProductivity.toFixed(1)}%</span></span>
                        <span>{employee.recordCount} day{employee.recordCount > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Needs Improvement */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-orange-600" />
              <CardTitle>Lowest Performance</CardTitle>
            </div>
            <CardDescription>
              {sortBy === 'productivity' 
                ? 'Lowest productivity percentage' 
                : sortBy === 'loggedHours'
                ? 'Least logged hours'
                : 'Lowest active hours'} - {getDateFilterTitle()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : losers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No data available for selected period. Upload Flowace records to see rankings.
              </div>
            ) : (
              <div className="space-y-3">
                {losers.map((employee, index) => (
                  <div
                    key={employee.code}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white border-2 border-gray-200">
                      <span className="text-lg font-bold text-gray-700">#{sortedEmployees.length - 2 + index}</span>
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gray-600 text-white text-sm font-semibold">
                        {employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{employee.name}</h3>
                        <Badge variant="outline" className="font-mono text-xs">
                          {employee.code}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>Active: <span className="font-medium text-gray-900">{formatHours(employee.totalActiveHours)}</span></span>
                        <span>Productive: <span className="font-medium text-gray-900">{formatHours(employee.totalProductiveHours)}</span></span>
                        <span>Productivity: <span className="font-medium text-gray-900">{employee.avgProductivity.toFixed(1)}%</span></span>
                        <span>{employee.recordCount} day{employee.recordCount > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
