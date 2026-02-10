'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, Clock, User, Briefcase, Building2, Tag, XCircle, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useState } from 'react'

interface EmployeeSubmissionStatus {
  employee: {
    id: number
    name: string
    employeeCode: string
    department: string | null
    designation: string | null
    role: string
  }
  hasSubmitted: boolean
  submittedAt?: string
  totalMinutes: number
  totalTags: number
  totalAssignedTags: number
  logs: Array<{
    id: number
    tagName: string
    count: number
    totalMinutes: number
  }>
  missingTags?: Array<{
    id: number
    tagName: string
    timeMinutes: number
    isMandatory?: boolean
  }>
  missingMandatoryTags?: Array<{
    id: number
    tagName: string
    timeMinutes: number
    isMandatory: boolean
  }>
  hasMissingMandatoryTags?: boolean
  submissionStatus?: {
    notes?: string | null
  }
}

export default function WorkLogDetailsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  
  const employeeId = searchParams.get('employeeId')
  const date = searchParams.get('date')
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Fetch submission status for the specific employee
  const { data: submissionStatusResponse, isLoading } = useQuery({
    queryKey: ['employee-submission-status', employeeId, date],
    queryFn: async () => {
      if (!employeeId || !date) return null
      const response = await fetch(`/api/logs/submission-status?date=${date}`)
      if (!response.ok) throw new Error('Failed to fetch submission status')
      const result = await response.json()
      
      // Find the specific employee from the response
      const employee = result.data?.employees?.find(
        (emp: EmployeeSubmissionStatus) => emp.employee.id === parseInt(employeeId)
      )
      return employee
    },
    enabled: !!employeeId && !!date,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!employeeId || !date) throw new Error('Missing employee ID or date')
      
      const response = await fetch('/api/logs/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: parseInt(employeeId),
          date: date,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete work logs')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      toast.success(`Deleted ${data.data?.logsDeleted || 0} log(s) successfully`)
      
      // Clear all related queries - be more aggressive
      queryClient.invalidateQueries({ queryKey: ['employee-submission-status'] })
      queryClient.invalidateQueries({ queryKey: ['submission-status'] })
      queryClient.invalidateQueries({ queryKey: ['work-logs'] })
      queryClient.removeQueries({ queryKey: ['employee-submission-status', employeeId, date] })
      queryClient.clear() // Clear entire cache
      
      // Redirect after a short delay to ensure cache is cleared
      setTimeout(() => {
        router.push('/tags/logs')
        router.refresh()
      }, 500)
    },
    onError: (error: Error) => {
      console.error('Delete failed:', error)
      toast.error(error.message || 'Failed to delete work logs')
    },
  })

  const handleDelete = () => {
    deleteMutation.mutate()
    setDeleteDialogOpen(false)
  }

  const employeeData: EmployeeSubmissionStatus | null = submissionStatusResponse

  // Calculate missing tags
  const submittedTagNames = new Set(employeeData?.logs.map(log => log.tagName) || [])
  const missingTagsCount = employeeData ? employeeData.totalAssignedTags - employeeData.totalTags : 0

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!employeeData) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/tags/logs')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Work Logs
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-lg font-medium text-muted-foreground">No data found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Unable to load work log details for the selected employee
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formattedDate = date 
    ? new Date(date).toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })
    : 'Unknown Date'

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/tags/logs')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Work Log Details</h1>
            <p className="text-muted-foreground mt-1">
              Detailed work log submission for {formattedDate}
            </p>
          </div>
        </div>
        
        {/* Delete Button - Only show if data exists */}
        {employeeData.hasSubmitted && employeeData.logs.length > 0 && (
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleteMutation.isPending}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Submission'}
          </Button>
        )}
      </div>

      {/* Employee Information */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Full Name
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeeData.employee.name}</div>
            <p className="text-xs text-muted-foreground">Employee name</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Badge variant="outline" className="w-fit">
                Code
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{employeeData.employee.employeeCode}</div>
            <p className="text-xs text-muted-foreground">Employee code</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Logs submitted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Tags/Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeeData.totalTags}.0</div>
            <p className="text-xs text-muted-foreground">Tasks logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Hours/Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(employeeData.totalMinutes / 60).toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground">Work logged</p>
          </CardContent>
        </Card>
      </div>

      {/* Notes Section */}
      {employeeData.submissionStatus?.notes && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              Employee Notes
            </CardTitle>
            <CardDescription className="text-blue-600 dark:text-blue-400">
              Additional notes submitted by the employee
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-card border border-blue-300 dark:border-blue-700">
              <p className="text-sm whitespace-pre-wrap">{employeeData.submissionStatus.notes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Work Log Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Work Log Entries
          </CardTitle>
          <CardDescription>
            Detailed breakdown of all tasks completed on {formattedDate}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employeeData.logs.length > 0 ? (
            <div className="space-y-3">
              <div className="border rounded-lg overflow-hidden hover:shadow-md transition-all">
                {/* Header */}
                <div className="flex items-start justify-between p-4 bg-card">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">
                        {formattedDate}
                      </h4>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {employeeData.totalTags} {employeeData.totalTags === 1 ? 'task' : 'tasks'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.floor(employeeData.totalMinutes / 60)}h {employeeData.totalMinutes % 60}m
                        </span>
                        {employeeData.submittedAt && (
                          <span className="flex items-center gap-1">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(employeeData.submittedAt).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Task Details */}
                <div className="p-4 pt-0 bg-muted/20">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {employeeData.logs.map((log, index) => (
                      <div key={log.id} className="flex items-start gap-2 p-3 rounded-md bg-card border">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Tag className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{log.tagName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              Count: <span className="font-medium text-foreground">{log.count}</span>
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              Time: <span className="font-medium text-foreground">{log.totalMinutes}m</span>
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {Math.floor(log.totalMinutes / log.count)}m per task
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No work log entries found</p>
              <p className="text-sm mt-2">This employee hasn't submitted any work logs for this date</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Missing Tags Section */}
      {employeeData.missingTags && employeeData.missingTags.length > 0 && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <XCircle className="h-5 w-5" />
              Missing Tags - Not Submitted
              {employeeData.hasMissingMandatoryTags && (
                <Badge variant="destructive" className="ml-2">
                  Contains Mandatory Tags
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-red-600 dark:text-red-400">
              The following assigned tags were not submitted on {formattedDate}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-red-100/50 dark:bg-red-900/20">
                  <tr>
                    <th scope="col" className="px-6 py-3 font-medium text-red-700 dark:text-red-400">
                      Tag Name
                    </th>
                    <th scope="col" className="px-6 py-3 font-medium text-red-700 dark:text-red-400 text-center">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 font-medium text-red-700 dark:text-red-400 text-center">
                      Expected Time
                    </th>
                    <th scope="col" className="px-6 py-3 font-medium text-red-700 dark:text-red-400 text-center">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employeeData.missingTags.map((tag, index) => (
                    <tr 
                      key={tag.id} 
                      className={`border-b transition-colors ${tag.isMandatory ? 'bg-red-100/50 dark:bg-red-900/30 border-red-300 dark:border-red-700' : 'bg-card border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/10'}`}
                    >
                      <td className="px-6 py-4 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {tag.tagName}
                          {tag.isMandatory && (
                            <Badge variant="destructive" className="text-xs">
                              Mandatory
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {tag.isMandatory ? (
                          <Badge className="bg-red-600 dark:bg-red-700 text-white">
                            Mandatory
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Optional
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block px-3 py-1 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-medium text-sm">
                          {Math.floor(tag.timeMinutes / 60)}h {tag.timeMinutes % 60}m
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="destructive" className="dark:bg-red-900/30 dark:text-red-400">
                          Not Submitted
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Back Button at Bottom */}
      <div className="flex justify-center pt-4 pb-8">
        <Button
          variant="outline"
          onClick={() => router.push('/tags/logs')}
          className="gap-2 px-8"
          size="lg"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Work Logs List
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this submission?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all work logs submitted by <strong>{employeeData?.employee.name}</strong> for <strong>{formattedDate}</strong>.
              <br /><br />
              This action cannot be undone. The employee will be able to submit new data for this date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Submission
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
