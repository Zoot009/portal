'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Calendar, Download, Search, TrendingUp, Loader2, Trash2, AlertTriangle } from 'lucide-react'
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

export default function WorkLogsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null)
  const [selectedBulkDelete, setSelectedBulkDelete] = useState<{ employeeId: number; date: string; employeeName: string } | null>(null)
  
  const queryClient = useQueryClient()

  // Fetch work logs
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
      toast.success('Log deleted successfully')
      setDeleteDialogOpen(false)
      setSelectedLogId(null)
    },
    onError: () => {
      toast.error('Failed to delete log')
    }
  })

  // Bulk delete by employee and date mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ employeeId, date }: { employeeId: number; date: string }) => {
      const response = await fetch(`/api/logs/bulk-delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, logDate: date }),
      })
      if (!response.ok) throw new Error('Failed to bulk delete logs')
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-logs'] })
      toast.success(`Successfully deleted ${data.deletedCount} log(s)`)
      setBulkDeleteDialogOpen(false)
      setSelectedBulkDelete(null)
    },
    onError: () => {
      toast.error('Failed to delete logs')
    }
  })

  const filteredLogs = logs.filter((log: WorkLog) => {
    const matchesSearch = log.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Group logs by employee and date for bulk actions
  const groupedLogs = filteredLogs.reduce((acc: any, log: WorkLog) => {
    const dateStr = log.logDate.split('T')[0]
    const key = `${log.employeeId}-${dateStr}`
    if (!acc[key]) {
      acc[key] = {
        employeeId: log.employeeId,
        employeeName: log.employee.name,
        date: dateStr,
        count: 0,
        logs: []
      }
    }
    acc[key].count++
    acc[key].logs.push(log)
    return acc
  }, {})

  const totalMinutes = filteredLogs.reduce((sum: number, log: WorkLog) => sum + log.totalMinutes, 0)
  const totalHours = (totalMinutes / 60).toFixed(2)
  const totalEntries = filteredLogs.length

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
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Employee</label>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEntries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalHours}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Minutes</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalMinutes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Delete Options */}
      {Object.keys(groupedLogs).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Delete by Date</CardTitle>
            <CardDescription>
              Delete all logs for a specific employee on a specific date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.values(groupedLogs).map((group: any) => {
                const [year, month, day] = group.date.split('-')
                const formattedDate = `${month}/${day}/${year}`
                return (
                  <div key={`${group.employeeId}-${group.date}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{group.employeeName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formattedDate} • {group.count} {group.count === 1 ? 'entry' : 'entries'}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedBulkDelete({ 
                          employeeId: group.employeeId, 
                          date: group.date,
                          employeeName: group.employeeName 
                        })
                        setBulkDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete All
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Work Log Entries</CardTitle>
          <CardDescription>
            Detailed work logs submitted by employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No work logs found</p>
              <p className="text-sm mt-2">
                {searchTerm || dateFilter
                  ? 'Try adjusting your filters'
                  : 'Work logs will appear here once employees submit them'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Tag</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Minutes</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Log Date</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log: WorkLog) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.employee.name}</TableCell>
                    <TableCell>{log.employee.employeeCode}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.tag.tagName}</Badge>
                    </TableCell>
                    <TableCell>{log.count}</TableCell>
                    <TableCell>{log.totalMinutes}</TableCell>
                    <TableCell>
                      {Math.floor(log.totalMinutes / 60)}h {log.totalMinutes % 60}m
                    </TableCell>
                    <TableCell>
                      {(() => {
                        try {
                          // Parse date string directly without timezone conversion
                          const dateStr = log.logDate.split('T')[0] // Get YYYY-MM-DD part
                          const [year, month, day] = dateStr.split('-')
                          return `${month}/${day}/${year}`
                        } catch {
                          return 'Invalid Date'
                        }
                      })()}
                    </TableCell>
                    <TableCell>
                      {new Date(log.submittedAt).toLocaleString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedLogId(log.id)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Single Log Dialog */}
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

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Bulk Delete Confirmation
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedBulkDelete && (
                <>
                  Are you sure you want to delete <strong>all logs</strong> for{' '}
                  <strong>{selectedBulkDelete.employeeName}</strong> on{' '}
                  <strong>
                    {(() => {
                      const [year, month, day] = selectedBulkDelete.date.split('-')
                      return `${month}/${day}/${year}`
                    })()}
                  </strong>?
                  <br /><br />
                  This will delete all log entries for this employee on this date. This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedBulkDelete && bulkDeleteMutation.mutate({ 
                employeeId: selectedBulkDelete.employeeId, 
                date: selectedBulkDelete.date 
              })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
