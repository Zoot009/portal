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
 * - Clean, TV-friendly layout
 * 
 * Access: /public/display
 */

import { useEffect, useState } from 'react'
import { format, subDays } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Users } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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
  const yesterday = format(subDays(new Date(), 1), 'MMMM d, yyyy')

  const fetchData = async () => {
    try {
      const yesterdayDate = format(subDays(new Date(), 1), 'yyyy-MM-dd')
      const params = new URLSearchParams({
        startDate: yesterdayDate,
        endDate: yesterdayDate,
      })

      const response = await fetch(`/api/proxy/member-analytics?${params.toString()}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        console.error('Failed to fetch analytics data')
        return
      }

      const result = await response.json()
      setData(result)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching analytics:', error)
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

  // Filter out employees without an employee ID and ignored users
  const filteredData = data?.data?.filter((emp) => {
    if (!emp.employeeId || emp.employeeId.trim() === '') return false
    
    const isIgnored = IGNORED_USERS.some((ignored) => 
      ignored.toLowerCase() === emp.employeeId?.toLowerCase() ||
      ignored.toLowerCase() === emp.displayName?.toLowerCase()
    )
    
    return !isIgnored
  }) || []

  // Sort by total activities descending
  const sortedData = [...filteredData].sort((a, b) => b.totalActivities - a.totalActivities)

  // Compute summary
  const summary = {
    pmsOnly: filteredData.filter((u) => u.pms.total > 0 && u.crm.total === 0).length,
    crmOnly: filteredData.filter((u) => u.crm.total > 0 && u.pms.total === 0).length,
    both: filteredData.filter((u) => u.pms.total > 0 && u.crm.total > 0).length,
    totalPmsActivities: filteredData.reduce((sum, u) => sum + u.pms.total, 0),
    totalCrmActivities: filteredData.reduce((sum, u) => sum + u.crm.total, 0),
    totalActivities: filteredData.reduce((sum, u) => sum + u.totalActivities, 0),
    zeroActivities: filteredData.filter((u) => u.totalActivities === 0).length,
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto"></div>
          <p className="text-xl text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-2">
          Member Analytics Dashboard
        </h1>
        <p className="text-2xl text-muted-foreground">
          {yesterday}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium text-muted-foreground">
              Employees with 0 Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-gray-500" />
              <span className="text-5xl font-bold">{summary.zeroActivities}</span>
            </div>
            <div className="flex gap-2 mt-4 text-sm">
              <Badge variant="outline" className="text-sm px-3 py-1">
                PMS: {summary.pmsOnly}
              </Badge>
              <Badge variant="outline" className="text-sm px-3 py-1">
                CRM: {summary.crmOnly}
              </Badge>
              <Badge variant="outline" className="text-sm px-3 py-1">
                Both: {summary.both}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium text-muted-foreground">
              Total Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <span className="text-5xl font-bold">{summary.totalActivities}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium text-muted-foreground">
              PMS Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-blue-600">
              {summary.totalPmsActivities}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium text-muted-foreground">
              CRM Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-purple-600">
              {summary.totalCrmActivities}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Activity Table */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Employee Activity Details</CardTitle>
          <p className="text-lg text-muted-foreground">
            Showing {sortedData.length} employees
          </p>
        </CardHeader>
        <CardContent>
          {sortedData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xl">
              No data available for yesterday
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-lg font-semibold">Name</TableHead>
                    <TableHead className="text-right text-lg font-semibold">PMS</TableHead>
                    <TableHead className="text-right text-lg font-semibold">CRM</TableHead>
                    <TableHead className="text-right text-lg font-semibold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((employee) => (
                    <TableRow key={employee.employeeId} className="text-base">
                      <TableCell className="font-medium">
                        {employee.displayName}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={employee.pms.total > 0 ? 'text-blue-600 font-semibold' : 'text-muted-foreground'}>
                          {employee.pms.total}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={employee.crm.total > 0 ? 'text-purple-600 font-semibold' : 'text-muted-foreground'}>
                          {employee.crm.total}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${
                          employee.totalActivities === 0 
                            ? 'text-red-500' 
                            : 'text-green-600'
                        }`}>
                          {employee.totalActivities}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer note */}
      <div className="text-center text-sm text-muted-foreground mt-8">
        Data automatically refreshes every 5 minutes • Last updated: {lastUpdated.toLocaleTimeString()}
      </div>
    </div>
  )
}
