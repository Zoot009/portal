'use client'

import { useState, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Calendar, Search, TrendingUp, Users, Eye } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useAnalytics } from './hooks/use-analytics'
import { AnalyticsTable } from './components/analytics-table'
import { AnalyticsFilters } from './types'

// List of user IDs or display names to ignore/exclude from the table
const IGNORED_USERS: string[] = [
  "e0f53608-a2f0-45d1-a572-69ab440fa97d",
  "c1106dd0-1baf-4a82-8f7a-35e7041206b4",
  "79dd88df-e0d9-474b-afd8-c96820f5aaac",
  "c522f383-d7e5-4a7c-96fb-65cb23a61c2b",
  "zoot1071",
  "zoot1093",
  "zoot1086",
  "zoot1085",
  "zoot1003",
  "zoot1004",
  "zoot1072",
  "zoot1081",
]

export default function MemberAnalyticsPage() {
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  
  const [filters, setFilters] = useState<AnalyticsFilters>({
    startDate: yesterday,
    endDate: yesterday,
    searchTerm: '',
  })

  const [tempFilters, setTempFilters] = useState({
    startDate: yesterday,
    endDate: yesterday,
  })

  const { data, isLoading, error } = useAnalytics({
    startDate: filters.startDate,
    endDate: filters.endDate,
  })

  // Filter data by search term client-side
  const filteredData = useMemo(() => {
    if (!data?.data) return []
    
    // First, filter out employees without an employee ID and ignored users
    const withEmployeeId = data.data.filter(
      (emp) => {
        // Check if employee has valid employee ID
        if (!emp.employeeId || emp.employeeId.trim() === '') return false
        
        // Check if user is in the ignored list (by employeeId or displayName)
        const isIgnored: boolean = IGNORED_USERS.some((ignored: string) => 
          ignored.toLowerCase() === emp.employeeId?.toLowerCase() ||
          ignored.toLowerCase() === emp.displayName?.toLowerCase()
        )
        
        return !isIgnored
      }
    )
    
    if (!filters.searchTerm) return withEmployeeId

    const searchLower = filters.searchTerm.toLowerCase()
    return withEmployeeId.filter(
      (emp) =>
        emp.employeeId.toLowerCase().includes(searchLower) ||
        emp.displayName.toLowerCase().includes(searchLower) ||
        emp.email?.toLowerCase().includes(searchLower)
    )
  }, [data?.data, filters.searchTerm])

  // Compute summary based on filtered data (excluding ignored users)
  const computedSummary = useMemo(() => {
    if (!filteredData.length) {
      return {
        pmsOnly: 0,
        crmOnly: 0,
        both: 0,
        totalPmsActivities: 0,
        totalCrmActivities: 0,
        totalActivities: 0,
        totalTaskCount: 0,
        zeroActivities: 0,
        zeroActivityEmployees: [],
      }
    }

    const zeroActivityEmployees = filteredData.filter((u) => u.totalActivities === 0)

    return {
      pmsOnly: filteredData.filter((u) => u.pms.total > 0 && u.crm.total === 0).length,
      crmOnly: filteredData.filter((u) => u.crm.total > 0 && u.pms.total === 0).length,
      both: filteredData.filter((u) => u.pms.total > 0 && u.crm.total > 0).length,
      totalPmsActivities: filteredData.reduce((sum, u) => sum + u.pms.total, 0),
      totalCrmActivities: filteredData.reduce((sum, u) => sum + u.crm.total, 0),
      totalActivities: filteredData.reduce((sum, u) => sum + u.totalActivities, 0),
      totalTaskCount: filteredData.reduce((sum, u) => sum + (u.pms.totalTaskCount || 0), 0),
      zeroActivities: zeroActivityEmployees.length,
      zeroActivityEmployees: zeroActivityEmployees,
    }
  }, [filteredData])

  const handleApplyFilters = () => {
    setFilters((prev) => ({
      ...prev,
      startDate: tempFilters.startDate,
      endDate: tempFilters.endDate,
    }))
  }

  const handleReset = () => {
    const defaultFilters = {
      startDate: yesterday,
      endDate: yesterday,
    }
    setTempFilters(defaultFilters)
    setFilters({ ...defaultFilters, searchTerm: '' })
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Member Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Combined PMS and CRM activity analytics for all team members
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Select date range and search for specific members</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={tempFilters.startDate}
                onChange={(e) =>
                  setTempFilters((prev) => ({ ...prev, startDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={tempFilters.endDate}
                onChange={(e) =>
                  setTempFilters((prev) => ({ ...prev, endDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Name, ID, or email..."
                  value={filters.searchTerm}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, searchTerm: e.target.value }))
                  }
                  className="pl-9"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load analytics data. Please try again later.
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {data && !isLoading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Employees with 0 Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-500" />
                    <span className="text-3xl font-bold">{computedSummary.zeroActivities}</span>
                  </div>
                  {computedSummary.zeroActivityEmployees.length > 0 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Eye className="h-3 w-3" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Employees with 0 Activities</DialogTitle>
                          <DialogDescription>
                            List of {computedSummary.zeroActivities} employee(s) with no activities
                          </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-96 overflow-y-auto">
                          <div className="space-y-2">
                            {computedSummary.zeroActivityEmployees.map((emp) => (
                              <div
                                key={emp.employeeId}
                                className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50 border"
                              >
                                <div>
                                  <div className="font-medium text-sm">{emp.displayName}</div>
                                  {emp.email && (
                                    <div className="text-xs text-muted-foreground">{emp.email}</div>
                                  )}
                                </div>
                                <Badge variant="outline" className="font-mono text-xs">
                                  {emp.employeeId}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <div className="flex gap-2 mt-3 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    PMS: {computedSummary.pmsOnly}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    CRM: {computedSummary.crmOnly}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Both: {computedSummary.both}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span className="text-3xl font-bold">{computedSummary.totalActivities}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  PMS Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {computedSummary.totalPmsActivities}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  CRM Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {computedSummary.totalCrmActivities}
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Task Count
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {computedSummary.totalTaskCount}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Work units completed
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Analytics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Activity Details</CardTitle>
              <CardDescription>
                Showing {filteredData.length} of {data.data.length} employees
                {filters.searchTerm && ` matching "${filters.searchTerm}"`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnalyticsTable data={filteredData} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
