'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight } from "lucide-react"
import { MemberTasksResponse, MemberData, TaskTypeFilter, SortField, SortOrder } from "../types/member-tasks"
import { format, parseISO } from "date-fns"

interface MemberListTableProps {
  data?: MemberTasksResponse
  isLoading: boolean
  searchTerm: string
  taskTypeFilter: TaskTypeFilter
  sortBy: SortField
  sortOrder: SortOrder
}

interface ExpandedMemberProps {
  member: MemberData
}

function ExpandedMemberDetails({ member }: ExpandedMemberProps) {
  const [activeTab, setActiveTab] = useState<'service' | 'asking'>('service')

  return (
    <div className="border-t bg-muted/30 p-6 rounded-b-lg">
      <div className="mb-4 p-3 bg-background rounded-lg">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-lg font-bold text-primary">
              {member.member.displayName.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold">{member.member.displayName}</h4>
            <p className="text-sm text-muted-foreground">{member.member.email}</p>
            <p className="text-sm text-muted-foreground">ID: {member.member.employeeId}</p>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <div className="text-2xl font-bold">{member.totalTasks}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{member.assignedTasksCount || 0}</div>
              <div className="text-sm text-muted-foreground">Assigned</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <Button
          variant={activeTab === 'service' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('service')}
          className="rounded-b-none"
        >
          Service Tasks ({member.serviceTasks.length})
        </Button>
        <Button
          variant={activeTab === 'asking' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('asking')}
          className="rounded-b-none"
        >
          Asking Tasks ({member.askingTasks.length})
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'service' && (
        <div className="space-y-4">
          {member.serviceTasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No service tasks completed</p>
          ) : (
            member.serviceTasks.slice(0, 10).map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h5 className="font-medium">{task.title}</h5>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{task.orderNumber}</span>
                    <span>{task.customerName}</span>
                    <span>{task.teamName}</span>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">
                    {task.completedAt ? format(parseISO(task.completedAt), 'MMM dd, HH:mm') : 'No date'}
                  </div>
                  <div className="text-muted-foreground">
                    Due: {task.deadline ? format(parseISO(task.deadline), 'MMM dd, HH:mm') : 'No deadline'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'asking' && (
        <div className="space-y-4">
          {member.askingTasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No asking tasks completed</p>
          ) : (
            member.askingTasks.slice(0, 10).map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h5 className="font-medium">{task.title}</h5>
                    <Badge variant={
                      task.currentStage === 'INFORMED_TEAM' ? 'default' :
                      task.currentStage === 'VERIFIED' ? 'secondary' :
                      'outline'
                    }>
                      {task.currentStage.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{task.orderNumber}</span>
                    <span>{task.customerName}</span>
                    <span>By: {task.completedByName}</span>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">
                    {task.completedAt ? format(parseISO(task.completedAt), 'MMM dd, HH:mm') : 'No date'}
                  </div>
                  <div className="text-muted-foreground">
                    Due: {task.deadline ? format(parseISO(task.deadline), 'MMM dd, HH:mm') : 'No deadline'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function MemberListTable({
  data,
  isLoading,
  searchTerm,
  taskTypeFilter,
  sortBy,
  sortOrder
}: MemberListTableProps) {
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set())

  const toggleExpanded = (memberId: string) => {
    const newExpanded = new Set(expandedMembers)
    if (newExpanded.has(memberId)) {
      newExpanded.delete(memberId)
    } else {
      newExpanded.add(memberId)
    }
    setExpandedMembers(newExpanded)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Member Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Member Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Filter and sort members
  const filteredData = data.data.filter(member => {
    const searchMatch = searchTerm === '' || 
      member.member.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.member.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return searchMatch
  })

  // Sort members
  filteredData.sort((a, b) => {
    let aValue: number | string = 0
    let bValue: number | string = 0

    switch (sortBy) {
      case 'name':
        aValue = a.member.displayName?.toLowerCase() || ''
        bValue = b.member.displayName?.toLowerCase() || ''
        break
      case 'serviceTasks':
        aValue = a.serviceTasks.length
        bValue = b.serviceTasks.length
        break
      case 'askingTasks':
        aValue = a.askingTasks.length
        bValue = b.askingTasks.length
        break
      case 'totalTasks':
      default:
        aValue = a.totalTasks
        bValue = b.totalTasks
        break
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    } else {
      return sortOrder === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number)
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Member Details</CardTitle>
        <p className="text-sm text-muted-foreground">
          {filteredData.length} member(s) found
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {filteredData.map(member => {
            const isExpanded = expandedMembers.has(member.member.id)
            
            return (
              <Collapsible 
                key={member.member.id}
                open={isExpanded}
                onOpenChange={() => toggleExpanded(member.member.id)}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          {member.member.displayName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{member.member.displayName}</div>
                        <div className="text-sm text-muted-foreground">
                          {member.member.email} | {member.member.employeeId}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-blue-600">{member.serviceTasks.length}</div>
                        <div className="text-muted-foreground">Service</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-orange-600">{member.askingTasks.length}</div>
                        <div className="text-muted-foreground">Asking</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg">{member.totalTasks}</div>
                        <div className="text-muted-foreground">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg text-green-600">{member.assignedTasksCount || 0}</div>
                        <div className="text-muted-foreground">Assigned</div>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="mt-4">
                  <div className="px-4 pb-4">
                    <ExpandedMemberDetails member={member} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}