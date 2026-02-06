'use client'

import { Fragment, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { EmployeeAnalytics } from '../types'

interface AnalyticsTableProps {
  data: EmployeeAnalytics[]
}

export function AnalyticsTable({ data }: AnalyticsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (employeeId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId)
      } else {
        newSet.add(employeeId)
      }
      return newSet
    })
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No data available for the selected filters
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px] text-center"></TableHead>
            <TableHead className="text-left">Employee ID</TableHead>
            <TableHead className="text-left">Name</TableHead>
            <TableHead className="text-center">PMS Activities</TableHead>
            <TableHead className="text-center">CRM Activities</TableHead>
            <TableHead className="text-center">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((employee) => {
            const isExpanded = expandedRows.has(employee.employeeId)
            const hasPmsActivity = employee.pms.total > 0
            const hasCrmActivity = employee.crm.total > 0

            return (
              <Fragment key={employee.employeeId}>
                <TableRow 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleRow(employee.employeeId)}
                >
                  <TableCell className="text-center">
                    <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-left">{employee.employeeId}</TableCell>
                  <TableCell className="text-left">
                    <div>
                      <div className="font-medium">{employee.displayName}</div>
                      {employee.email && (
                        <div className="text-sm text-muted-foreground">{employee.email}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={hasPmsActivity ? 'default' : 'secondary'}>
                      {employee.pms.total}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={hasCrmActivity ? 'default' : 'secondary'}>
                      {employee.crm.total}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-bold">
                      {employee.totalActivities}
                    </Badge>
                  </TableCell>
                </TableRow>

                {isExpanded && (
                  <TableRow key={`${employee.employeeId}-details`}>
                    <TableCell colSpan={6} className="bg-muted/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 px-2">
                          {/* PMS Activities */}
                          <div>
                            <h4 className="font-semibold text-sm mb-3 text-blue-600">
                              PMS Activities ({employee.pms.total})
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Orders Created:</span>
                                <span className="font-medium">{employee.pms.ordersCreated}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Tasks Created:</span>
                                <span className="font-medium">{employee.pms.tasksCreated}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Tasks Completed:</span>
                                <span className="font-medium">{employee.pms.tasksCompleted}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Folder Links Added:</span>
                                <span className="font-medium">{employee.pms.folderLinksAdded}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Orders Delivered:</span>
                                <span className="font-medium">{employee.pms.ordersDelivered}</span>
                              </div>
                            </div>
                          </div>

                          {/* CRM Activities */}
                          <div>
                            <h4 className="font-semibold text-sm mb-3 text-purple-600">
                              CRM Activities ({employee.crm.total})
                            </h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Clients Created:</span>
                                <span className="font-medium">{employee.crm.clientsCreated}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Clients Updated:</span>
                                <span className="font-medium">{employee.crm.clientsUpdated}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Tags Created:</span>
                                <span className="font-medium">{employee.crm.tagsCreated}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Tags Updated:</span>
                                <span className="font-medium">{employee.crm.tagsUpdated}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Problematic Clients:</span>
                                <span className="font-medium">
                                  {employee.crm.problematicClientsCreated}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Maintenance Created:</span>
                                <span className="font-medium">
                                  {employee.crm.maintenanceClientsCreated}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Maintenance Updated:</span>
                                <span className="font-medium">
                                  {employee.crm.maintenanceClientsUpdated}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Follow-ups:</span>
                                <span className="font-medium">
                                  {employee.crm.maintenanceFollowUpsCreated}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Tag Definitions:</span>
                                <span className="font-medium">
                                  {employee.crm.tagDefinitionsCreated}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Quality Checks:</span>
                                <span className="font-medium">
                                  {employee.crm.qualityChecksPerformed}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Warnings Created:</span>
                                <span className="font-medium">{employee.crm.warningsCreated}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Warnings Reviewed:</span>
                                <span className="font-medium">{employee.crm.warningsReviewed}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
