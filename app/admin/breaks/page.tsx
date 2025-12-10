'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Coffee, Calendar, Clock, Search, Download, Users, Loader2, Edit, Save, MoreVertical, History, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { getCurrentPayCycle, getPayCycleByOffset, formatPayCyclePeriod } from '@/lib/pay-cycle-utils'

interface EditHistoryEntry {
  id: number
  fieldChanged: string
  oldValue: string | null
  newValue: string | null
  changeReason: string | null
  editedAt: string
  editedBy: string
  editedByRole: string
}

interface BreakSession {
  id: number
  employeeId: number
  startTime: string | null
  endTime: string | null
  duration: number | null
  breakDate: string
  status: 'ACTIVE' | 'COMPLETED'
  hasBeenEdited?: boolean
  editReason?: string
  editHistory?: EditHistoryEntry[]
  employee: {
    id: number
    name: string
    employeeCode: string
  }
}

export default function AdminBreaksPage() {
  const [searchTerm, setSearchTerm] = useState('')

  // Calculate dynamic pay cycles
  const currentCycle = getCurrentPayCycle()
  const previousCycle = getPayCycleByOffset(-1)
  const nextCycle = getPayCycleByOffset(1)
  const currentCycleLabel = formatPayCyclePeriod(currentCycle.start, currentCycle.end)
  const previousCycleLabel = formatPayCyclePeriod(previousCycle.start, previousCycle.end)
  const nextCycleLabel = formatPayCyclePeriod(nextCycle.start, nextCycle.end)
  const [dateFilter, setDateFilter] = useState('')
  const [salaryCycleFilter, setSalaryCycleFilter] = useState('current')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedBreak, setSelectedBreak] = useState<BreakSession | null>(null)
  const [editFormData, setEditFormData] = useState({
    breakInTime: '',
    breakOutTime: '',
    editReason: '',
  })
  const [deleteReason, setDeleteReason] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportDateRange, setExportDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [exportType, setExportType] = useState<'all' | 'individual'>('all')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [isExporting, setIsExporting] = useState(false)

  const queryClient = useQueryClient()

  // Fetch all breaks
  const { data: breaksData, isLoading } = useQuery({
    queryKey: ['admin-breaks', dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (dateFilter) params.append('date', dateFilter)
      const response = await fetch(`/api/admin/breaks?${params}`)
      if (!response.ok) throw new Error('Failed to fetch breaks')
      return response.json()
    },
  })

  // Fetch employees for export selection
  const { data: employeesData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const response = await fetch('/api/employees')
      if (!response.ok) throw new Error('Failed to fetch employees')
      return response.json()
    }
  })

  // Edit break mutation
  const editBreakMutation = useMutation({
    mutationFn: async (data: { id: number; breakInTime: string; breakOutTime: string; editReason: string }) => {
      const response = await fetch(`/api/admin/breaks/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          breakInTime: data.breakInTime,
          breakOutTime: data.breakOutTime,
          editReason: data.editReason,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to edit break')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Break record updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-breaks'] })
      setEditDialogOpen(false)
      setSelectedBreak(null)
      setEditFormData({ breakInTime: '', breakOutTime: '', editReason: '' })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update break record')
    },
  })

  const handleEditClick = (breakSession: BreakSession) => {
    setSelectedBreak(breakSession)
    
    // Format times for datetime-local input
    const formatForInput = (dateString: string | null) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    setEditFormData({
      breakInTime: formatForInput(breakSession.startTime),
      breakOutTime: formatForInput(breakSession.endTime),
      editReason: '',
    })
    setEditDialogOpen(true)
  }

  const handleViewHistory = (breakSession: BreakSession) => {
    setSelectedBreak(breakSession)
    setHistoryDialogOpen(true)
  }

  const handleDeleteClick = (breakSession: BreakSession) => {
    setSelectedBreak(breakSession)
    setDeleteReason('')
    setDeleteDialogOpen(true)
  }

  // Delete break mutation
  const deleteBreakMutation = useMutation({
    mutationFn: async (data: { id: number; deleteReason: string }) => {
      const response = await fetch(`/api/admin/breaks/${data.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deleteReason: data.deleteReason,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete break')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Break record deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-breaks'] })
      setDeleteDialogOpen(false)
      setSelectedBreak(null)
      setDeleteReason('')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete break record')
    },
  })

  const handleConfirmDelete = () => {
    if (!selectedBreak) return

    if (!deleteReason.trim()) {
      toast.error('Please provide a reason for deleting this break record')
      return
    }

    deleteBreakMutation.mutate({
      id: selectedBreak.id,
      deleteReason: deleteReason,
    })
  }

  const handleSaveEdit = () => {
    if (!selectedBreak) return

    // Validation
    if (!editFormData.editReason.trim()) {
      toast.error('Please provide a reason for editing this break record')
      return
    }

    if (!editFormData.breakInTime || !editFormData.breakOutTime) {
      toast.error('Both break in and break out times are required')
      return
    }

    const inTime = new Date(editFormData.breakInTime)
    const outTime = new Date(editFormData.breakOutTime)

    if (outTime <= inTime) {
      toast.error('Break end time must be after break start time')
      return
    }

    editBreakMutation.mutate({
      id: selectedBreak.id,
      breakInTime: inTime.toISOString(),
      breakOutTime: outTime.toISOString(),
      editReason: editFormData.editReason,
    })
  }

  const allBreaks = breaksData?.data || []

  // Filter breaks by search term and salary cycle
  const filteredBreaks = allBreaks.filter((breakSession: BreakSession) => {
    const matchesSearch = breakSession.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         breakSession.employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Salary cycle filter
    let matchesSalaryCycle = true
    if (salaryCycleFilter !== 'all') {
      const breakDate = new Date(breakSession.breakDate)
      
      if (salaryCycleFilter === 'current') {
        // Use dynamic current cycle
        const cycleStart = new Date(currentCycle.start)
        const cycleEnd = new Date(currentCycle.end)
        cycleEnd.setHours(23, 59, 59, 999)
        matchesSalaryCycle = breakDate >= cycleStart && breakDate <= cycleEnd
      } else if (salaryCycleFilter === 'previous') {
        // Use dynamic previous cycle
        const cycleStart = new Date(previousCycle.start)
        const cycleEnd = new Date(previousCycle.end)
        cycleEnd.setHours(23, 59, 59, 999)
        matchesSalaryCycle = breakDate >= cycleStart && breakDate <= cycleEnd
      } else if (salaryCycleFilter === 'next') {
        // Use dynamic next cycle
        const cycleStart = new Date(nextCycle.start)
        const cycleEnd = new Date(nextCycle.end)
        cycleEnd.setHours(23, 59, 59, 999)
        matchesSalaryCycle = breakDate >= cycleStart && breakDate <= cycleEnd
      }
    }
    
    return matchesSearch && matchesSalaryCycle
  })

  // Pagination calculations
  const totalItems = filteredBreaks.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedBreaks = filteredBreaks.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setCurrentPage(1)
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Export functionality
  const handleExportClick = () => {
    // Set default date range (last 30 days to today)
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)
    
    setExportDateRange({
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    })
    setExportDialogOpen(true)
  }

  const handleExportConfirm = async () => {
    if (!exportDateRange.startDate || !exportDateRange.endDate) {
      toast.error('Please select both start and end dates')
      return
    }

    if (new Date(exportDateRange.startDate) > new Date(exportDateRange.endDate)) {
      toast.error('Start date must be before or equal to end date')
      return
    }

    // Validate individual employee selection
    if (exportType === 'individual' && !selectedEmployeeId) {
      toast.error('Please select an employee for individual export')
      return
    }

    setIsExporting(true)
    try {
      const params = new URLSearchParams({
        startDate: exportDateRange.startDate,
        endDate: exportDateRange.endDate,
        exportType: exportType
      })

      if (exportType === 'individual' && selectedEmployeeId) {
        params.append('employeeId', selectedEmployeeId)
      }

      const response = await fetch(`/api/admin/breaks/export?${params}`)

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition')
      let filename = 'breaks_export.csv'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Breaks data exported successfully!')
      setExportDialogOpen(false)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export breaks data')
    } finally {
      setIsExporting(false)
    }
  }

  // Calculate statistics
  const totalBreaks = filteredBreaks.length
  const activeBreaks = filteredBreaks.filter((b: BreakSession) => b.status === 'ACTIVE').length
  const completedBreaks = filteredBreaks.filter((b: BreakSession) => b.status === 'COMPLETED').length
  const totalBreakTime = filteredBreaks.reduce((sum: number, b: BreakSession) => sum + (b.duration || 0), 0)
  const avgBreakTime = completedBreaks > 0 ? Math.round(totalBreakTime / completedBreaks) : 0

  // Get unique employees count
  const uniqueEmployees = new Set(filteredBreaks.map((b: BreakSession) => b.employeeId)).size

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Break Management</h2>
          <p className="text-muted-foreground">Monitor and manage employee break sessions</p>
        </div>
        <Button onClick={handleExportClick}>
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Employee</label>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or code..."
                  value={searchTerm}
                  onChange={(e) => handleFilterChange(setSearchTerm)(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => handleFilterChange(setDateFilter)(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Pay Cycle</label>
              <Select value={salaryCycleFilter} onValueChange={(value) => {
                setSalaryCycleFilter(value)
                setCurrentPage(1)
              }}>
                <SelectTrigger className="w-full h-10 border-gray-300">
                  <SelectValue placeholder={`Current Cycle (${currentCycleLabel})`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cycles</SelectItem>
                  <SelectItem value="previous">Previous Cycle ({previousCycleLabel})</SelectItem>
                  <SelectItem value="current">Current Cycle ({currentCycleLabel})</SelectItem>
                  <SelectItem value="next">Next Cycle ({nextCycleLabel})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Breaks</CardTitle>
            <Coffee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBreaks}</div>
            <p className="text-xs text-muted-foreground">
              {dateFilter ? 'For selected date' : 'All time'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeBreaks}</div>
            <p className="text-xs text-muted-foreground">Currently on break</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{completedBreaks}</div>
            <p className="text-xs text-muted-foreground">Break sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatDuration(totalBreakTime)}</div>
            <p className="text-xs text-muted-foreground">{totalBreakTime} minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{uniqueEmployees}</div>
            <p className="text-xs text-muted-foreground">Unique employees</p>
          </CardContent>
        </Card>
      </div>

      {/* Breaks Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Break Sessions</CardTitle>
              <CardDescription>
                {filteredBreaks.length === 0 
                  ? 'All employee break sessions' 
                  : `Showing ${startIndex + 1}-${Math.min(endIndex, totalItems)} of ${totalItems} break sessions`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredBreaks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Coffee className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No break sessions found</p>
              <p className="text-sm mt-2">
                {searchTerm || dateFilter
                  ? 'Try adjusting your filters'
                  : 'Break sessions will appear here'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBreaks.map((breakSession: BreakSession) => (
                  <TableRow key={breakSession.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {breakSession.employee.name}
                        {breakSession.hasBeenEdited && (
                          <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800 text-xs">
                            <Edit className="h-3 w-3 mr-1" />
                            Edited
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{breakSession.employee.employeeCode}</TableCell>
                    <TableCell>{formatDate(breakSession.breakDate)}</TableCell>
                    <TableCell>{formatTime(breakSession.startTime)}</TableCell>
                    <TableCell>
                      {breakSession.endTime ? formatTime(breakSession.endTime) : '-'}
                    </TableCell>
                    <TableCell>
                      {breakSession.duration ? formatDuration(breakSession.duration) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={breakSession.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {breakSession.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {breakSession.hasBeenEdited && (
                            <DropdownMenuItem onClick={() => handleViewHistory(breakSession)}>
                              <History className="h-4 w-4 mr-2" />
                              View History
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleEditClick(breakSession)}
                            disabled={breakSession.status === 'ACTIVE'}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(breakSession)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination Controls */}
          {filteredBreaks.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value))
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground ml-4">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-9"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Break Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Break Record</DialogTitle>
            <DialogDescription>
              Update break times for {selectedBreak?.employee.name} ({selectedBreak?.employee.employeeCode})
              <br />
              Date: {selectedBreak && formatDate(selectedBreak.breakDate)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="breakInTime">Break Start Time *</Label>
              <Input
                id="breakInTime"
                type="datetime-local"
                value={editFormData.breakInTime}
                onChange={(e) => setEditFormData({ ...editFormData, breakInTime: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="breakOutTime">Break End Time *</Label>
              <Input
                id="breakOutTime"
                type="datetime-local"
                value={editFormData.breakOutTime}
                onChange={(e) => setEditFormData({ ...editFormData, breakOutTime: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editReason">Reason for Edit *</Label>
              <Textarea
                id="editReason"
                placeholder="Please provide a reason for editing this break record..."
                value={editFormData.editReason}
                onChange={(e) => setEditFormData({ ...editFormData, editReason: e.target.value })}
                rows={3}
                required
              />
              <p className="text-sm text-muted-foreground">
                This reason will be saved in the edit history
              </p>
            </div>

            {editFormData.breakInTime && editFormData.breakOutTime && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm font-medium">Calculated Duration:</p>
                <p className="text-lg font-bold text-primary">
                  {(() => {
                    const inTime = new Date(editFormData.breakInTime)
                    const outTime = new Date(editFormData.breakOutTime)
                    if (outTime > inTime) {
                      const minutes = Math.round((outTime.getTime() - inTime.getTime()) / (1000 * 60))
                      return formatDuration(minutes)
                    }
                    return 'Invalid time range'
                  })()}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false)
                setSelectedBreak(null)
                setEditFormData({ breakInTime: '', breakOutTime: '', editReason: '' })
              }}
              disabled={editBreakMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={editBreakMutation.isPending}
            >
              {editBreakMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Break Edit History</DialogTitle>
            <DialogDescription>
              View all changes made to this break record for {selectedBreak?.employee.name} ({selectedBreak?.employee.employeeCode})
              <br />
              Date: {selectedBreak && formatDate(selectedBreak.breakDate)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
            {selectedBreak?.editHistory && selectedBreak.editHistory.length > 0 ? (
              <>
                {selectedBreak.editReason && (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm font-medium">Latest Edit Reason:</p>
                    <p className="text-sm mt-1">{selectedBreak.editReason}</p>
                  </div>
                )}
                
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Change History</h4>
                  {selectedBreak.editHistory.map((edit: any) => (
                    <div key={edit.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {edit.fieldChanged === 'breakInTime' ? 'Break Start Time' : 
                             edit.fieldChanged === 'breakOutTime' ? 'Break End Time' : 
                             edit.fieldChanged === 'breakDuration' ? 'Duration' : 
                             edit.fieldChanged}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(edit.editedAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">From:</span>
                          <span className="font-mono bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 px-2 py-1 rounded text-xs">
                            {edit.oldValue ? (
                              edit.fieldChanged === 'breakDuration' ? 
                                formatDuration(parseInt(edit.oldValue)) :
                              edit.fieldChanged.includes('Time') ?
                                new Date(edit.oldValue).toLocaleString('en-US', {
                                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
                                }) :
                              edit.oldValue
                            ) : 'Not set'}
                          </span>
                        </div>
                        <span>→</span>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">To:</span>
                          <span className="font-mono bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 px-2 py-1 rounded text-xs">
                            {edit.newValue ? (
                              edit.fieldChanged === 'breakDuration' ? 
                                formatDuration(parseInt(edit.newValue)) :
                              edit.fieldChanged.includes('Time') ?
                                new Date(edit.newValue).toLocaleString('en-US', {
                                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
                                }) :
                              edit.newValue
                            ) : 'Not set'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Edited by: {edit.editedBy} ({edit.editedByRole})
                        </span>
                      </div>

                      {edit.changeReason && (
                        <div className="text-sm pt-2 border-t">
                          <span className="text-muted-foreground">Reason:</span> {edit.changeReason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No edit history available</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setHistoryDialogOpen(false)
                setSelectedBreak(null)
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Break Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this break record for {selectedBreak?.employee.name} ({selectedBreak?.employee.employeeCode})?
              <br />
              Date: {selectedBreak && formatDate(selectedBreak.breakDate)}
              <br />
              <span className="text-destructive font-medium">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="deleteReason">Reason for Deletion *</Label>
            <Textarea
              id="deleteReason"
              placeholder="Please provide a detailed reason for deleting this break record..."
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              rows={3}
              required
            />
            <p className="text-sm text-muted-foreground">
              This reason will be saved in the deletion history
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setDeleteDialogOpen(false)
                setSelectedBreak(null)
                setDeleteReason('')
              }}
              disabled={deleteBreakMutation.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteBreakMutation.isPending}
            >
              {deleteBreakMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Break
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export Date Range Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Export Breaks Data</DialogTitle>
            <DialogDescription>
              Select date range and export type for CSV format.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {/* Export Type Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Export Type</Label>
              <RadioGroup
                value={exportType}
                onValueChange={(value) => setExportType(value as 'all' | 'individual')}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2 p-2 border rounded hover:bg-muted/50 dark:hover:bg-muted">
                  <RadioGroupItem value="all" id="all-employees" />
                  <Label htmlFor="all-employees" className="cursor-pointer text-sm">
                    All Employees
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 p-2 border rounded hover:bg-muted/50 dark:hover:bg-muted">
                  <RadioGroupItem value="individual" id="individual-employee" />
                  <Label htmlFor="individual-employee" className="cursor-pointer text-sm">
                    Individual Employee
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Employee Selection */}
            {exportType === 'individual' && (
              <div className="space-y-2">
                <Label htmlFor="employee-select" className="text-sm font-medium">Select Employee</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employeesData?.data?.map((employee: any) => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        {employee.name} ({employee.employeeCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Date Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="start-date" className="text-xs text-muted-foreground">From</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={exportDateRange.startDate}
                    onChange={(e) => setExportDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="end-date" className="text-xs text-muted-foreground">To</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={exportDateRange.endDate}
                    onChange={(e) => setExportDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            
            {/* Export Summary */}
            {exportDateRange.startDate && exportDateRange.endDate && (
              <div className="rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-2 text-sm">Export Summary</p>
                <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                  <div className="flex justify-between">
                    <span>Data Type:</span>
                    <span>{exportType === 'all' ? 'All Employees' : 'Individual Employee'}</span>
                  </div>
                  {exportType === 'individual' && selectedEmployeeId && (
                    <div className="flex justify-between">
                      <span>Employee:</span>
                      <span className="text-right">
                        {employeesData?.data?.find((emp: any) => emp.id.toString() === selectedEmployeeId)?.name}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Date Range:</span>
                    <span>
                      {new Date(exportDateRange.startDate).toLocaleDateString()} to {new Date(exportDateRange.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Format:</span>
                    <span>CSV file</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExportDialogOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExportConfirm}
              disabled={isExporting || !exportDateRange.startDate || !exportDateRange.endDate}
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
