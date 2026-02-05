'use client'

import { useState, Fragment } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AuditResponse } from "../types/audit"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight } from "lucide-react"

interface AuditUserTableProps {
  data?: AuditResponse
  isLoading: boolean
  searchTerm: string
}

export function AuditUserTable({ data, isLoading, searchTerm }: AuditUserTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const filteredUsers = data?.users.filter(user => 
    user.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const toggleRow = (userId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId)
    } else {
      newExpanded.add(userId)
    }
    setExpandedRows(newExpanded)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Activity Details</CardTitle>
          <CardDescription>
            Individual user activity breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Activity Details</CardTitle>
        <CardDescription>
          Individual user activity breakdown ({filteredUsers.length} users)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Total Activities</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                    No users found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((userAudit) => {
                  const isExpanded = expandedRows.has(userAudit.user.id)
                  
                  return (
                    <Fragment key={userAudit.user.id}>
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(userAudit.user.id)}
                      >
                        <TableCell>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                              <span className="font-medium">{userAudit.user.name}</span>
                              <span className="text-xs text-muted-foreground">{userAudit.user.email}</span>
                            </div>
                            <Badge variant="outline">{userAudit.user.role}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-lg">{userAudit.summary.totalActivities}</span>
                        </TableCell>
                      </TableRow>
                      
                      {isExpanded && (
                        <TableRow key={`${userAudit.user.id}-details`}>
                          <TableCell colSpan={3} className="p-0">
                            <div className="p-4 space-y-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                  <div className="text-xs text-muted-foreground">Clients</div>
                                  <div className="font-medium text-lg">
                                    {userAudit.summary.clientsCreated + userAudit.summary.clientsUpdated}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {userAudit.summary.clientsCreated} created / {userAudit.summary.clientsUpdated} updated
                                  </div>
                                </div>
                                
                                <div className="space-y-1">
                                  <div className="text-xs text-muted-foreground">Tags</div>
                                  <div className="font-medium text-lg">
                                    {userAudit.summary.tagsCreated + userAudit.summary.tagsUpdated}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {userAudit.summary.tagsCreated} created / {userAudit.summary.tagsUpdated} updated
                                  </div>
                                </div>
                                
                                <div className="space-y-1">
                                  <div className="text-xs text-muted-foreground">Maintenance</div>
                                  <div className="font-medium text-lg">
                                    {userAudit.summary.maintenanceClientsCreated + 
                                     userAudit.summary.maintenanceClientsUpdated +
                                     userAudit.summary.maintenanceFollowUpsCreated}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {userAudit.summary.maintenanceClientsCreated} created / {userAudit.summary.maintenanceClientsUpdated} updated / {userAudit.summary.maintenanceFollowUpsCreated} follow-ups
                                  </div>
                                </div>
                                
                                <div className="space-y-1">
                                  <div className="text-xs text-muted-foreground">Quality Checks</div>
                                  <div className="font-medium text-lg">
                                    {userAudit.summary.qualityChecksPerformed}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Performed
                                  </div>
                                </div>
                                
                                <div className="space-y-1">
                                  <div className="text-xs text-muted-foreground">Warnings</div>
                                  <div className="font-medium text-lg">
                                    {userAudit.summary.warningsCreated + userAudit.summary.warningsReviewed}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {userAudit.summary.warningsCreated} created / {userAudit.summary.warningsReviewed} reviewed
                                  </div>
                                </div>
                                
                                <div className="space-y-1">
                                  <div className="text-xs text-muted-foreground">Problematic Clients</div>
                                  <div className="font-medium text-lg">
                                    {userAudit.summary.problematicClientsCreated}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Created
                                  </div>
                                </div>
                                
                                <div className="space-y-1">
                                  <div className="text-xs text-muted-foreground">Tag Definitions</div>
                                  <div className="font-medium text-lg">
                                    {userAudit.summary.tagDefinitionsCreated}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Created
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
