"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Search, TrendingUp, Clock, Target, Award, Calendar as CalendarIcon, X } from "lucide-react"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface FlowaceRecord {
  id: number
  employeeCode: string
  employeeName: string
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

export default function FlowaceEmployeeAnalyticsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [cycleFilter, setCycleFilter] = useState("current")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  // Fetch Flowace records
  const { data, isLoading } = useQuery({
    queryKey: ['flowace-records', selectedDate],
    queryFn: async () => {
      let url = '/api/flowace/records'
      if (selectedDate) {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        url += `?date=${dateStr}`
      }
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch Flowace records')
      return response.json()
    }
  })

  const records: FlowaceRecord[] = data?.records || []
  const stats = data?.stats || {
    totalEmployees: 0,
    avgProductivity: 0,
    totalHours: 0,
    topPerformer: null
  }

  // Filter records by search term only (date filtering is done by API)
  const filteredRecords = records.filter(record => {
    const matchesSearch = !searchTerm || 
      (record.employee?.name || record.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  const handleClearFilters = () => {
    setSearchTerm("")
    setCycleFilter("current")
    setSelectedDate(undefined)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Flowace Employee Analytics</h2>
        <p className="text-muted-foreground">
          Analyze employee productivity patterns and performance metrics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              Active employees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Productivity</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.avgProductivity.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Overall rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Tracked hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Activity</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {records.length > 0 
                ? (records.reduce((acc, r) => acc + (r.activityPercentage || 0), 0) / records.length).toFixed(1)
                : '0.0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              Activity rate
            </p>
          </CardContent>
        </Card>
      </div>
      {/* Filters */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-medium text-gray-900">Filter & Search</h3>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <Select value={cycleFilter} onValueChange={setCycleFilter}>
              <SelectTrigger className="w-full md:w-[280px]">
                <SelectValue placeholder="Select Cycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current Cycle</SelectItem>
                <SelectItem value="previous">Previous Cycle</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by employee name or code..."
                className="pl-10 h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full md:w-[240px] justify-start text-left font-normal h-10",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedDate && (
              <Badge variant="secondary" className="gap-1">
                Date: {format(selectedDate, "MMM d, yyyy")}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => setSelectedDate(undefined)}
                />
              </Badge>
            )}
            {(searchTerm || selectedDate || cycleFilter !== "current") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="ml-auto"
              >
                Clear All Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Employee Analytics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Performance</CardTitle>
          <CardDescription>Productivity metrics from Flowace tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="text-left font-medium">Member Name</TableHead>
                  <TableHead className="text-center font-medium">Logged Hours</TableHead>
                  <TableHead className="text-center font-medium">Active Hours</TableHead>
                  <TableHead className="text-center font-medium">Productive Hours</TableHead>
                  <TableHead className="text-center font-medium">Activity %</TableHead>
                  <TableHead className="text-center font-medium">Productivity %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow className="hover:bg-gray-50/50">
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No analytics data available</p>
                      <p className="text-sm mt-2">Upload Flowace CSV files to generate employee analytics</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record, index) => (
                    <TableRow key={record.id || index} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="font-medium">{record.employee?.name || record.employeeName}</TableCell>
                      <TableCell className="text-center">{record.loggedHours.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{record.activeHours.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{record.productiveHours.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={record.activityPercentage >= 80 ? "default" : "secondary"}>
                          {record.activityPercentage.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={
                            record.productivityPercentage >= 80 ? "default" : 
                            record.productivityPercentage >= 60 ? "secondary" : "outline"
                          }
                        >
                          {record.productivityPercentage.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
