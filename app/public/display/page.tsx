'use client'

/**
 * Public Display Page for Team Activity Dashboard
 * 
 * This page shows yesterday's employee activity data without requiring authentication.
 * Designed for displaying on a TV or public monitor for quick analytics overview.
 * 
 * Features:
 * - No authentication required
 * - Auto-refreshes every 5 minutes
 * - Read-only display (no interactive elements)
 * - Shows yesterday's data only
 * - Same layout as member-analytics but without interactions
 * 
 * Access: /public/display
 */

import { useEffect, useState, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, TrendingUp, Users } from 'lucide-react'
import { ReadOnlyAnalyticsTable } from './components/read-only-analytics-table'

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

interface PMSActivities {
  ordersCreated: number
  tasksCreated: number
  tasksCompleted: number
  folderLinksAdded: number
  ordersDelivered: number
  askingTasksCreated: number
  askingTasksCompleted: number
  totalTaskCount: number
  total: number
}

interface CRMActivities {
  clientsCreated: number
  clientsUpdated: number
  tagsCreated: number
  tagsUpdated: number
  problematicClientsCreated: number
  maintenanceClientsCreated: number
  maintenanceClientsUpdated: number
  maintenanceFollowUpsCreated: number
  tagDefinitionsCreated: number
  qualityChecksPerformed: number
  warningsCreated: number
  warningsReviewed: number
  total: number
}

interface EmployeeAnalytics {
  employeeId: string
  displayName: string
  email?: string
  pms: PMSActivities
  crm: CRMActivities
  totalActivities: number
}

interface AnalyticsResponse {
  success: boolean
  data: EmployeeAnalytics[]
}

export default function PublicDisplayPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<boolean>(false)
  const yesterdayDate = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  const fetchData = async () => {
    try {
      setError(false)
      const params = new URLSearchParams({
        startDate: yesterdayDate,
        endDate: yesterdayDate,
      })

      const response = await fetch(`/api/proxy/member-analytics?${params.toString()}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        setError(true)
        return
      }

      const result = await response.json()
      setData(result)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchData()

    // Auto-refresh every 5 minutes
    const intervalId = setInterval(() => {
      fetchData()
    }, 5 * 60 * 1000)

    return () => clearInterval(intervalId)
  }, [])

  // Auto-scroll functionality
  useEffect(() => {
    let scrollInterval: NodeJS.Timeout
    let isScrollingDown = true
    const scrollSpeed = 1 // pixels per interval
    const pauseAtEnd = 3000 // pause for 3 seconds at top/bottom

    const autoScroll = () => {
      scrollInterval = setInterval(() => {
        const scrollHeight = document.documentElement.scrollHeight
        const scrollTop = window.scrollY
        const clientHeight = window.innerHeight

        if (isScrollingDown) {
          // Scrolling down
          if (scrollTop + clientHeight >= scrollHeight - 10) {
            // Reached bottom, pause then reverse
            clearInterval(scrollInterval)
            setTimeout(() => {
              isScrollingDown = false
              autoScroll()
            }, pauseAtEnd)
          } else {
            window.scrollBy(0, scrollSpeed)
          }
        } else {
          // Scrolling up
          if (scrollTop <= 0) {
            // Reached top, pause then reverse
            clearInterval(scrollInterval)
            setTimeout(() => {
              isScrollingDown = true
              autoScroll()
            }, pauseAtEnd)
          } else {
            window.scrollBy(0, -scrollSpeed)
          }
        }
      }, 30) // Run every 30ms for smooth scrolling
    }

    // Start auto-scrolling after initial load
    const startDelay = setTimeout(() => {
      autoScroll()
    }, 2000) // Wait 2 seconds before starting

    return () => {
      clearTimeout(startDelay)
      clearInterval(scrollInterval)
    }
  }, [data])

  // Filter out employees without an employee ID and ignored users
  const filteredData = useMemo(() => {
    if (!data?.data) return []
    
    return data.data.filter((emp) => {
      if (!emp.employeeId || emp.employeeId.trim() === '') return false
      
      const isIgnored = IGNORED_USERS.some((ignored) => 
        ignored.toLowerCase() === emp.employeeId?.toLowerCase() ||
        ignored.toLowerCase() === emp.displayName?.toLowerCase()
      )
      
      return !isIgnored
    })
  }, [data?.data])

  // Compute summary based on filtered data
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

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Member Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Combined PMS and CRM activity analytics for all team members (Yesterday)
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Member Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Combined PMS and CRM activity analytics for all team members · {format(subDays(new Date(), 1), 'MMMM d, yyyy')}
        </p>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load analytics data. Please try again later.
          </AlertDescription>
        </Alert>
      )}

      {/* Success State */}
      {data && !error && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

          </div>

          {/* Employees with 0 Activities Table */}
          {computedSummary.zeroActivityEmployees.length > 0 && (
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400">
                  Employees with 0 Activities
                </CardTitle>
                <CardDescription>
                  {computedSummary.zeroActivityEmployees.length} employee{computedSummary.zeroActivityEmployees.length !== 1 ? 's' : ''} with no activity yesterday
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReadOnlyAnalyticsTable data={computedSummary.zeroActivityEmployees} />
              </CardContent>
            </Card>
          )}

          {/* Analytics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Activity Details</CardTitle>
              <CardDescription>
                Showing {filteredData.length} employees{' '}
                {data.data && `of ${data.data.length} total`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReadOnlyAnalyticsTable data={filteredData} />
            </CardContent>
          </Card>

          {/* Footer note */}
          <div className="text-center text-sm text-muted-foreground">
            Data automatically refreshes every 5 minutes · Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </>
      )}
    </div>
  )
}
