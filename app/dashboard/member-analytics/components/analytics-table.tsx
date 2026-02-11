'use client'

import { useState } from 'react'
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
import { ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { EmployeeAnalytics } from '../types'

type SortField = 'displayName' | 'pmsTotal' | 'crmTotal' | 'totalActivities'
type SortDirection = 'asc' | 'desc' | null

interface AnalyticsTableProps {
  data: EmployeeAnalytics[]
}

export function AnalyticsTable({ data }: AnalyticsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('totalActivities')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction: desc -> asc -> desc
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />
    }
    return sortDirection === 'desc' ? 
      <ArrowDown className="h-4 w-4" /> : 
      <ArrowUp className="h-4 w-4" />
  }

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    if (!sortDirection) return 0
    
    let aValue: string | number
    let bValue: string | number
    
    switch (sortField) {
      case 'displayName':
        aValue = a.displayName.toLowerCase()
        bValue = b.displayName.toLowerCase()
        break
      case 'pmsTotal':
        aValue = a.pms.total
        bValue = b.pms.total
        break
      case 'crmTotal':
        aValue = a.crm.total
        bValue = b.crm.total
        break
      case 'totalActivities':
        aValue = a.totalActivities
        bValue = b.totalActivities
        break
      default:
        return 0
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

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
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>
              <Button 
                variant="ghost" 
                onClick={() => handleSort('displayName')}
                className="h-8 px-2 font-semibold hover:bg-transparent"
              >
                Name {getSortIcon('displayName')}
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button 
                variant="ghost" 
                onClick={() => handleSort('pmsTotal')}
                className="h-8 px-2 font-semibold hover:bg-transparent"
              >
                PMS Activities {getSortIcon('pmsTotal')}
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button 
                variant="ghost" 
                onClick={() => handleSort('crmTotal')}
                className="h-8 px-2 font-semibold hover:bg-transparent"
              >
                CRM Activities {getSortIcon('crmTotal')}
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button 
                variant="ghost" 
                onClick={() => handleSort('totalActivities')}
                className="h-8 px-2 font-semibold hover:bg-transparent"
              >
                Total {getSortIcon('totalActivities')}
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((employee) => {
            const isExpanded = expandedRows.has(employee.employeeId)
            const hasPmsActivity = employee.pms.total > 0
            const hasCrmActivity = employee.crm.total > 0

            return (
              <>
                <TableRow 
                  key={employee.employeeId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleRow(employee.employeeId)}
                >
                  <TableCell>
                    <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
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

                {isExpanded && (
                  <TableRow key={`${employee.employeeId}-details`}>
                    <TableCell colSpan={5} className="bg-muted/30">
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
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Asking Tasks Completed:</span>
                                <span className="font-medium">{employee.pms.askingTasksCompleted}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Completed Task Count:</span>
                                <span className="font-medium">{employee.pms.totalTaskCount}</span>
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
              </>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
