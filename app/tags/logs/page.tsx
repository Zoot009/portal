'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Calendar, Download, Search, TrendingUp, Loader2, Trash2, Users, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

interface WorkLog {
  id: number
  employeeId: number
  tagId: number
  count: number
  totalMinutes: number
  logDate: string
  submittedAt: string
  isManual: boolean
  source: string
  employee: {
    id: number
    name: string
    employeeCode: string
  }
  tag: {
    id: number
    tagName: string
    timeMinutes: number
  }
}

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
}

export default function WorkLogsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]) // Default to today
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'all' | 'submitted' | 'not-submitted' | 'missing-mandatory'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [filterType, setFilterType] = useState<'date' | 'cycle'>('date')
  const [selectedCycle, setSelectedCycle] = useState('')
  const itemsPerPage = 10
  
  const queryClient = useQueryClient()
  const router = useRouter()

  // Generate salary cycles (6th to 5th of next month)
  const generateSalaryCycles = () => {
    const cycles = []
    const today = new Date()
    
    // Generate last 6 months of cycles
    for (let i = 0; i < 6; i++) {
      const cycleStartDate = new Date(today.getFullYear(), today.getMonth() - i, 6)
      const cycleEndDate = new Date(today.getFullYear(), today.getMonth() - i + 1, 5)
      
      cycles.push({
        value: `${cycleStartDate.toISOString().split('T')[0]}_${cycleEndDate.toISOString().split('T')[0]}`,
        label: `${cycleStartDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} - ${cycleEndDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        startDate: cycleStartDate.toISOString().split('T')[0],
        endDate: cycleEndDate.toISOString().split('T')[0]
      })
    }
    
    return cycles
  }

  const salaryCycles = generateSalaryCycles()

  // Fetch submission status for all employees
  const { data: submissionStatusResponse, isLoading: statusLoading } = useQuery({
    queryKey: ['submission-status', dateFilter, filterType, selectedCycle],
    queryFn: async () => {
      if (filterType === 'date' && !dateFilter) return null
      if (filterType === 'cycle' && !selectedCycle) return null
      
      let url = '/api/logs/submission-status?'
      
      if (filterType === 'date') {
        url += `date=${dateFilter}`
      } else {
        const cycle = salaryCycles.find(c => c.value === selectedCycle)
        if (cycle) {
          url += `startDate=${cycle.startDate}&endDate=${cycle.endDate}`
        }
      }
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch submission status')
      return response.json()
    },
    enabled: (filterType === 'date' && !!dateFilter) || (filterType === 'cycle' && !!selectedCycle),
  })

  const submissionData = submissionStatusResponse?.data

  // Fetch work logs (for backward compatibility and details)
  const { data: logsResponse, isLoading: logsLoading } = useQuery({
    queryKey: ['work-logs', dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (dateFilter) params.append('logDate', dateFilter)
      
      const response = await fetch(`/api/logs?${params}`)
      if (!response.ok) throw new Error('Failed to fetch logs')
      return response.json()
    }
  })

  const logs = logsResponse?.data || []

  // Delete single log mutation
  const deleteMutation = useMutation({
    mutationFn: async (logId: number) => {
      const response = await fetch(`/api/logs/${logId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete log')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-logs'] })
      queryClient.invalidateQueries({ queryKey: ['submission-status'] })
      toast.success('Log deleted successfully')
      setDeleteDialogOpen(false)
      setSelectedLogId(null)
    },
    onError: () => {
      toast.error('Failed to delete log')
    }
  })

  // Filter employees based on view mode and search
  const filteredEmployees = (submissionData?.employees || []).filter((emp: EmployeeSubmissionStatus) => {
    // Apply view mode filter
    if (viewMode === 'submitted' && !emp.hasSubmitted) return false
    if (viewMode === 'not-submitted' && emp.hasSubmitted) return false
    if (viewMode === 'missing-mandatory' && !emp.hasMissingMandatoryTags) return false
    
    // Apply search filter
    const matchesSearch = emp.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Work Logs</h2>
          <p className="text-muted-foreground">
            Track and manage employee work logs by tags
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border/40 shadow-sm">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-end gap-4 flex-wrap">
            {/* Search Employee */}
            <div className="flex-1 min-w-[200px] space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Search Employee</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by name or code..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    handleFilterChange()
                  }}
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>

            {/* Filter Type */}
            <div className="w-[140px] space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Filter Type</label>
              <Select value={filterType} onValueChange={(value: 'date' | 'cycle') => {
                setFilterType(value)
                handleFilterChange()
              }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Single Date</SelectItem>
                  <SelectItem value="cycle">Salary Cycle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date or Cycle Selector */}
            {filterType === 'date' ? (
              <div className="w-[160px] space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value)
                    handleFilterChange()
                  }}
                  className="h-9 text-sm"
                />
              </div>
            ) : (
              <div className="w-[200px] space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Salary Cycle</label>
                <Select value={selectedCycle} onValueChange={(value) => {
                  setSelectedCycle(value)
                  handleFilterChange()
                }}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select cycle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {salaryCycles.map(cycle => (
                      <SelectItem key={cycle.value} value={cycle.value}>
                        {cycle.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* View Mode */}
            <div className="w-[180px] space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">View Mode</label>
              <Select value={viewMode} onValueChange={(value: any) => {
                setViewMode(value)
                handleFilterChange()
              }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  <SelectItem value="submitted">Submitted Only</SelectItem>
                  <SelectItem value="not-submitted">Not Submitted Only</SelectItem>
                  <SelectItem value="missing-mandatory">Missing Mandatory Tags</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submissionData?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{submissionData?.submitted || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {submissionData?.submittedPercentage || 0}% completion
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Submitted</CardTitle>
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{submissionData?.notSubmitted || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing Mandatory</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{submissionData?.missingMandatory || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Employees with missing mandatory tags
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Employee Submission Status Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Submission Status</CardTitle>
          <CardDescription>
            {dateFilter 
              ? `Work log submission status for ${new Date(dateFilter).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
              : 'Select a date to view submission status'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !dateFilter ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a date</p>
              <p className="text-sm mt-2">
                Choose a date to view employee work log submission status
              </p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No employees found</p>
              <p className="text-sm mt-2">
                {searchTerm
                  ? 'Try adjusting your search'
                  : 'No employees match the selected criteria'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-center">Total Tags</TableHead>
                    <TableHead className="text-center">Missing</TableHead>
                    <TableHead className="text-center">Total Hours</TableHead>
                    <TableHead>Submitted At</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmployees.map((empStatus: EmployeeSubmissionStatus) => (
                  <TableRow key={empStatus.employee.id} className={!empStatus.hasSubmitted ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                    <TableCell>
                      {empStatus.hasSubmitted ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Submitted
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="dark:bg-red-900/30 dark:text-red-400">
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Submitted
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{empStatus.employee.name}</TableCell>
                    <TableCell>{empStatus.employee.employeeCode}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-semibold text-foreground">{empStatus.totalTags}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-muted-foreground">{empStatus.totalAssignedTags}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {empStatus.totalAssignedTags - empStatus.totalTags > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <Badge variant="outline" className={`${empStatus.hasMissingMandatoryTags ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700'}`}>
                            {empStatus.totalAssignedTags - empStatus.totalTags}
                          </Badge>
                          {empStatus.hasMissingMandatoryTags && (
                            <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {empStatus.totalMinutes > 0 ? (
                        <span className="font-medium">
                          {Math.floor(empStatus.totalMinutes / 60)}h {empStatus.totalMinutes % 60}m
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {empStatus.submittedAt ? (
                        new Date(empStatus.submittedAt).toLocaleString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {empStatus.hasSubmitted && empStatus.logs.length > 0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            router.push(`/tags/logs/details?employeeId=${empStatus.employee.id}&date=${dateFilter}`)
                          }}
                        >
                          View Details
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">No data</span>
                      )}
                    </TableCell>
                  </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-2 py-4">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredEmployees.length)} of {filteredEmployees.length} employees
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>      {/* Delete Single Log Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Log Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this log entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedLogId && deleteMutation.mutate(selectedLogId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
