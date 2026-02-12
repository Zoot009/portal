'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

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

interface ReadOnlyAnalyticsTableProps {
  data: EmployeeAnalytics[]
}

export function ReadOnlyAnalyticsTable({ data }: ReadOnlyAnalyticsTableProps) {
  // Sort by total activities descending (read-only, no user interaction)
  const sortedData = [...data].sort((a, b) => b.totalActivities - a.totalActivities)

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No data available for the selected date
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">Name</TableHead>
            <TableHead className="text-right font-semibold">PMS Activities</TableHead>
            <TableHead className="text-right font-semibold">CRM Activities</TableHead>
            <TableHead className="text-right font-semibold">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((employee) => {
            const hasPmsActivity = employee.pms.total > 0
            const hasCrmActivity = employee.crm.total > 0

            return (
              <TableRow key={employee.employeeId}>
                <TableCell>
                  <div>
                    <div className="font-medium">{employee.displayName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{employee.employeeId}</div>
                    {employee.email && (
                      <div className="text-sm text-muted-foreground">{employee.email}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={hasPmsActivity ? 'default' : 'secondary'}>
                    {employee.pms.total}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={hasCrmActivity ? 'default' : 'secondary'}>
                    {employee.crm.total}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className="font-bold">
                    {employee.totalActivities}
                  </Badge>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
