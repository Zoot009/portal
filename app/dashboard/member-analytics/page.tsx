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
import { AlertCircle, Calendar, Search, TrendingUp, Users } from 'lucide-react'
import { useAnalytics } from './hooks/use-analytics'
import { AnalyticsTable } from './components/analytics-table'
import { AnalyticsFilters } from './types'

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
    
    if (!filters.searchTerm) return data.data

    const searchLower = filters.searchTerm.toLowerCase()
    return data.data.filter(
      (emp) =>
        emp.employeeId.toLowerCase().includes(searchLower) ||
        emp.displayName.toLowerCase().includes(searchLower) ||
        emp.email?.toLowerCase().includes(searchLower)
    )
  }, [data?.data, filters.searchTerm])

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Employees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span className="text-3xl font-bold">{data.summary.totalEmployees}</span>
                </div>
                <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    PMS: {data.summary.pmsOnly}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    CRM: {data.summary.crmOnly}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Both: {data.summary.both}
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
                  <span className="text-3xl font-bold">{data.summary.totalActivities}</span>
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
                  {data.summary.totalPmsActivities}
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
                  {data.summary.totalCrmActivities}
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
