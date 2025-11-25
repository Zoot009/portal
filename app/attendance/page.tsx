'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Clock, Upload, Calendar as CalendarIcon, MoreVertical, Edit, Trash2, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { toast } from 'sonner'
import Link from 'next/link'

interface AttendanceRecord {
  id: number
  employeeCode: string
  employeeName: string
  date: string
  status: string
  checkInTime?: string | null
  checkOutTime?: string | null
  breakInTime?: string | null
  breakOutTime?: string | null
  totalHours?: number
  overtime?: number
  hasBeenEdited?: boolean
}

const statusColors: Record<string, string> = {
  'PRESENT': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'ABSENT': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'LATE': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'HALF_DAY': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'LEAVE_APPROVED': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'WFH_APPROVED': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
}

export default function AttendanceRecordsPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [salaryCycleFilter, setSalaryCycleFilter] = useState('current')
  const [quickFilter, setQuickFilter] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage, setRecordsPerPage] = useState(10)
  
  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null)
  const [editForm, setEditForm] = useState({
    status: '',
    checkInTime: '',
    breakInTime: '',
    breakOutTime: '',
    checkOutTime: '',
    totalHours: '', // Not used anymore, preview is calculated live
    overtime: '',
    editReason: ''
  })

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingRecord, setDeletingRecord] = useState<AttendanceRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Helper function to format time
  const formatTime = (isoTimeString: string | null | undefined): string => {
    if (!isoTimeString || isoTimeString === '-') return '-'
    try {
      const date = new Date(isoTimeString)
      if (isNaN(date.getTime())) return '-'
      const hours = date.getUTCHours().toString().padStart(2, '0')
      const minutes = date.getUTCMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    } catch (error) {
      return '-'
    }
  }

  // Helper function to format time for input field (HH:MM format)
  const formatTimeForInput = (isoTimeString: string | null | undefined): string => {
    if (!isoTimeString || isoTimeString === '-') return ''
    try {
      const date = new Date(isoTimeString)
      if (isNaN(date.getTime())) return ''
      const hours = date.getUTCHours().toString().padStart(2, '0')
      const minutes = date.getUTCMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    } catch (error) {
      return ''
    }
  }

  // Helper function to format overtime from decimal hours to HH:MM
  const formatOvertimeForInput = (overtime: number | undefined | null): string => {
    if (!overtime || overtime === 0) return '00:00'
    const hours = Math.floor(overtime)
    const minutes = Math.round((overtime % 1) * 60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  // Helper function to parse HH:MM format to decimal hours
  const parseOvertimeFromInput = (timeString: string): number => {
    if (!timeString || timeString === '') return 0
    const [hours, minutes] = timeString.split(':').map(Number)
    if (isNaN(hours) || isNaN(minutes)) return 0
    return hours + (minutes / 60)
  }

  // Helper function to calculate total hours and return in HH:MM format
  const calculateTotalHours = (checkIn: string, breakIn: string, breakOut: string, checkOut: string, overtime: string): string => {
    if (!checkIn || !checkOut) return '00:00'
    
    try {
      // Parse check-in and check-out times
      const checkInParts = checkIn.split(':').map(Number)
      const checkOutParts = checkOut.split(':').map(Number)
      
      if (checkInParts.length !== 2 || checkOutParts.length !== 2) return '00:00'
      if (checkInParts.some(isNaN) || checkOutParts.some(isNaN)) return '00:00'
      
      const [checkInHours, checkInMinutes] = checkInParts
      const [checkOutHours, checkOutMinutes] = checkOutParts
      
      // Convert to total minutes
      const checkInTotalMinutes = checkInHours * 60 + checkInMinutes
      const checkOutTotalMinutes = checkOutHours * 60 + checkOutMinutes
      
      // Calculate work time (check-out minus check-in)
      if (checkOutTotalMinutes <= checkInTotalMinutes) return '00:00'
      let totalWorkMinutes = checkOutTotalMinutes - checkInTotalMinutes
      
      // Subtract break time if both break times are provided
      if (breakIn && breakOut) {
        const breakInParts = breakIn.split(':').map(Number)
        const breakOutParts = breakOut.split(':').map(Number)
        
        if (breakInParts.length === 2 && breakOutParts.length === 2 && 
            !breakInParts.some(isNaN) && !breakOutParts.some(isNaN)) {
          
          const breakInTotalMinutes = breakInParts[0] * 60 + breakInParts[1]
          const breakOutTotalMinutes = breakOutParts[0] * 60 + breakOutParts[1]
          
          // Calculate break duration (handle any order of break times)
          const breakDurationMinutes = Math.abs(breakOutTotalMinutes - breakInTotalMinutes)
          totalWorkMinutes -= breakDurationMinutes
        }
      }
      
      // Add overtime if provided
      if (overtime && overtime !== '00:00') {
        const overtimeParts = overtime.split(':').map(Number)
        if (overtimeParts.length === 2 && !overtimeParts.some(isNaN)) {
          const overtimeMinutes = overtimeParts[0] * 60 + overtimeParts[1]
          totalWorkMinutes += overtimeMinutes
        }
      }
      
      // Convert back to HH:MM format
      const finalHours = Math.floor(Math.max(0, totalWorkMinutes) / 60)
      const finalMinutes = Math.max(0, totalWorkMinutes) % 60
      
      return `${finalHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`
    } catch (error) {
      console.error('Error calculating total hours:', error)
      return '00:00'
    }
  }

  // Fetch records
  const { data: records = [], isLoading, refetch } = useQuery({
    queryKey: ['attendance-records'],
    queryFn: async () => {
      const response = await fetch('/api/attendance/records')
      if (!response.ok) throw new Error('Failed to fetch records')
      const result = await response.json()
      return result.records || []
    }
  })

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setSelectedFile(file || null)
  }

  // Handle file upload
  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload')
      return
    }

    if (!uploadDate) {
      toast.error('Please select a date for the attendance records')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('date', uploadDate)
      
      const response = await fetch('/api/attendance/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }
      
      await refetch()
      toast.success(result.message || `File uploaded successfully! Processed ${result.recordsProcessed || 0} records.`)
      setIsUploadDialogOpen(false)
      setSelectedFile(null)
      
      // Reset file input
      const fileInput = document.getElementById('srp-file') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // Filter records
  const filteredRecords = records.filter((record: AttendanceRecord) => {
    const matchesSearch = !employeeSearch || 
      record.employeeName?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      record.employeeCode?.toLowerCase().includes(employeeSearch.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter
    
    // Salary cycle filter
    let matchesSalaryCycle = true
    if (salaryCycleFilter !== 'all') {
      const recordDate = new Date(record.date)
      const today = new Date()
      
      if (salaryCycleFilter === 'current') {
        // Current cycle: 6 Nov to 5 Dec
        const cycleStart = new Date(2025, 10, 6) // Nov 6, 2025 (month is 0-indexed)
        const cycleEnd = new Date(2025, 11, 5) // Dec 5, 2025
        cycleEnd.setHours(23, 59, 59, 999)
        matchesSalaryCycle = recordDate >= cycleStart && recordDate <= cycleEnd
      } else if (salaryCycleFilter === 'previous') {
        // Previous cycle: 6 Oct to 5 Nov
        const cycleStart = new Date(2025, 9, 6) // Oct 6, 2025
        const cycleEnd = new Date(2025, 10, 5) // Nov 5, 2025
        cycleEnd.setHours(23, 59, 59, 999)
        matchesSalaryCycle = recordDate >= cycleStart && recordDate <= cycleEnd
      }
    }
    
    // Quick filter for date ranges
    let matchesQuickFilter = true
    if (quickFilter) {
      const recordDate = new Date(record.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Start of today
      
      switch (quickFilter) {
        case 'today':
          const recordDateOnly = new Date(recordDate)
          recordDateOnly.setHours(0, 0, 0, 0)
          matchesQuickFilter = recordDateOnly.getTime() === today.getTime()
          break
          
        case 'week':
          const weekStart = new Date(today)
          weekStart.setDate(today.getDate() - today.getDay()) // Start of current week (Sunday)
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6) // End of current week (Saturday)
          weekEnd.setHours(23, 59, 59, 999)
          matchesQuickFilter = recordDate >= weekStart && recordDate <= weekEnd
          break
          
        case 'month':
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1) // Start of current month
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0) // End of current month
          monthEnd.setHours(23, 59, 59, 999)
          matchesQuickFilter = recordDate >= monthStart && recordDate <= monthEnd
          break
          
        default:
          matchesQuickFilter = true
      }
    }
    
    // Calendar date filter
    let matchesDateFilter = true
    if (selectedDate && !quickFilter) {
      const recordDate = new Date(record.date)
      recordDate.setHours(0, 0, 0, 0)
      const filterDate = new Date(selectedDate)
      filterDate.setHours(0, 0, 0, 0)
      matchesDateFilter = recordDate.getTime() === filterDate.getTime()
    }
    
    return matchesSearch && matchesStatus && matchesSalaryCycle && matchesQuickFilter && matchesDateFilter
  })

  // Pagination logic
  const totalRecords = filteredRecords.length
  const totalPages = Math.ceil(totalRecords / recordsPerPage)
  const startIndex = (currentPage - 1) * recordsPerPage
  const endIndex = startIndex + recordsPerPage
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex)

  // Reset to first page when filters change
  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(parseInt(value))
    setCurrentPage(1)
  }

  // Quick filter handlers
  const handleQuickFilter = (filter: string) => {
    setQuickFilter(filter === quickFilter ? '' : filter)
    setCurrentPage(1)
  }

  const clearAllFilters = () => {
    setEmployeeSearch('')
    setStatusFilter('all')
    setSalaryCycleFilter('current')
    setQuickFilter('')
    setSelectedDate(undefined)
    setCurrentPage(1)
  }

  // Handle edit record
  const handleEditRecord = (record: AttendanceRecord) => {
    setEditingRecord(record)
    
    // Simply load the current record times into the form
    setEditForm({
      status: record.status || '',
      checkInTime: formatTimeForInput(record.checkInTime),
      breakInTime: formatTimeForInput(record.breakInTime),
      breakOutTime: formatTimeForInput(record.breakOutTime),
      checkOutTime: formatTimeForInput(record.checkOutTime),
      totalHours: '', // Not needed as we calculate live
      overtime: formatOvertimeForInput(record.overtime),
      editReason: ''
    })
    
    setIsEditDialogOpen(true)
  }

  // Handle save edited record
  const handleSaveEditedRecord = async () => {
    if (!editingRecord) return
    
    if (!editForm.editReason.trim()) {
      toast.error('Please provide a reason for editing this record')
      return
    }

    try {
      // Calculate total hours in HH:MM format, then convert to decimal for database
      const totalHHMM = calculateTotalHours(
        editForm.checkInTime,
        editForm.breakInTime,
        editForm.breakOutTime,
        editForm.checkOutTime,
        editForm.overtime
      )
      
      // Convert HH:MM to decimal for database storage
      const [hours, minutes] = totalHHMM.split(':').map(Number)
      const totalHoursDecimal = hours + (minutes / 60)

      const updatedRecord = {
        ...editingRecord,
        status: editForm.status,
        checkInTime: editForm.checkInTime ? `${editingRecord.date}T${editForm.checkInTime}:00.000Z` : null,
        breakInTime: editForm.breakInTime ? `${editingRecord.date}T${editForm.breakInTime}:00.000Z` : null,
        breakOutTime: editForm.breakOutTime ? `${editingRecord.date}T${editForm.breakOutTime}:00.000Z` : null,
        checkOutTime: editForm.checkOutTime ? `${editingRecord.date}T${editForm.checkOutTime}:00.000Z` : null,
        totalHours: totalHoursDecimal,
        overtime: parseOvertimeFromInput(editForm.overtime),
        editReason: editForm.editReason,
        hasBeenEdited: true
      }

      const response = await fetch(`/api/attendance/records/${editingRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedRecord),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to update record')
      }

      await refetch()
      toast.success('Record updated successfully')
      setIsEditDialogOpen(false)
      setEditingRecord(null)
      setEditForm({
        status: '',
        checkInTime: '',
        breakInTime: '',
        breakOutTime: '',
        checkOutTime: '',
        totalHours: '',
        overtime: '',
        editReason: ''
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update record')
    }
  }

  // Handle view history
  const handleViewHistory = (record: AttendanceRecord) => {
    // Navigate to edited records page in sidebar
    window.location.href = `/attendance/edited-records-list`
  }

  // Handle delete record
  const handleDeleteRecord = (record: AttendanceRecord) => {
    setDeletingRecord(record)
    setIsDeleteDialogOpen(true)
  }

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deletingRecord) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/attendance/records/${deletingRecord.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete record')
      }

      await refetch()
      toast.success('Attendance record deleted successfully')
      setIsDeleteDialogOpen(false)
      setDeletingRecord(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete record')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Attendance Records</h1>
          <p className="text-muted-foreground">View and manage employee attendance data</p>
        </div>
        <div className="flex gap-2">
          <Link href="/attendance/edited-records-list">
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edited Records
            </Button>
          </Link>
          
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload SRP
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload SRP File</DialogTitle>
              <DialogDescription>Select an SRP file and date to import attendance records.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="upload-date">Attendance Date</Label>
                <Input
                  id="upload-date"
                  type="date"
                  value={uploadDate}
                  onChange={(e) => setUploadDate(e.target.value)}
                  disabled={uploading}
                  className="border-gray-300"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="srp-file">SRP File</Label>
                <Input
                  id="srp-file"
                  type="file"
                  accept=".srp,.txt,.csv"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                {selectedFile && (
                  <p className="text-sm text-gray-600">Selected: {selectedFile.name}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsUploadDialogOpen(false)
                  setSelectedFile(null)
                  const fileInput = document.getElementById('srp-file') as HTMLInputElement
                  if (fileInput) fileInput.value = ''
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleFileUpload}
                disabled={uploading || !selectedFile}
              >
                {uploading ? 'Uploading...' : 'Upload File'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Edit Record Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Attendance Record</DialogTitle>
            <DialogDescription>
              {editingRecord?.employeeName} • {editingRecord?.date ? new Date(editingRecord.date).toLocaleDateString() : ''}
            </DialogDescription>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4">
              {/* Status */}
              <div>
                <Label htmlFor="edit-status" className="text-sm font-medium mb-2 block">Status</Label>
                <Select value={editForm.status} onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRESENT">Present</SelectItem>
                    <SelectItem value="ABSENT">Absent</SelectItem>
                    <SelectItem value="LATE">Late</SelectItem>
                    <SelectItem value="HALF_DAY">Half Day</SelectItem>
                    <SelectItem value="LEAVE_APPROVED">Leave Approved</SelectItem>
                    <SelectItem value="WFH_APPROVED">WFH Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-check-in" className="text-sm font-medium mb-2 block">Check In</Label>
                  <Input
                    id="edit-check-in"
                    type="time"
                    value={editForm.checkInTime}
                    onChange={(e) => {
                      setEditForm(prev => ({
                        ...prev,
                        checkInTime: e.target.value
                      }))
                    }}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-check-out" className="text-sm font-medium mb-2 block">Check Out</Label>
                  <Input
                    id="edit-check-out"
                    type="time"
                    value={editForm.checkOutTime}
                    onChange={(e) => {
                      setEditForm(prev => ({
                        ...prev,
                        checkOutTime: e.target.value
                      }))
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-break-in" className="text-sm font-medium mb-2 block">Break In</Label>
                  <Input
                    id="edit-break-in"
                    type="time"
                    value={editForm.breakInTime}
                    onChange={(e) => {
                      setEditForm(prev => ({
                        ...prev,
                        breakInTime: e.target.value
                      }))
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-break-out" className="text-sm font-medium mb-2 block">Break Out</Label>
                  <Input
                    id="edit-break-out"
                    type="time"
                    value={editForm.breakOutTime}
                    onChange={(e) => {
                      setEditForm(prev => ({
                        ...prev,
                        breakOutTime: e.target.value
                      }))
                    }}
                  />
                </div>
              </div>

              {/* Overtime */}
              <div>
                <Label htmlFor="edit-overtime" className="text-sm font-medium mb-2 block">Overtime</Label>
                <Input
                  id="edit-overtime"
                  type="text"
                  placeholder="HH:MM (e.g., 01:30)"
                  value={editForm.overtime}
                  onChange={(e) => {
                    const value = e.target.value
                    // Allow only digits and colon
                    if (value === '' || /^[0-9:]*$/.test(value)) {
                      setEditForm(prev => ({
                        ...prev,
                        overtime: value
                      }))
                    }
                  }}
                  onBlur={(e) => {
                    let value = e.target.value.replace(/[^0-9]/g, '')
                    
                    if (value === '') {
                      setEditForm(prev => ({ ...prev, overtime: '00:00' }))
                      return
                    }
                    
                    // Auto-format based on input length
                    if (value.length <= 2) {
                      // Just hours: "2" -> "02:00"
                      value = value.padStart(2, '0') + ':00'
                    } else if (value.length === 3) {
                      // "245" -> "02:45"
                      value = value[0].padStart(2, '0') + ':' + value.substring(1)
                    } else {
                      // "0245" -> "02:45"
                      value = value.substring(0, value.length - 2).padStart(2, '0') + ':' + value.substring(value.length - 2)
                    }
                    
                    setEditForm(prev => ({ ...prev, overtime: value }))
                  }}
                  className="font-mono"
                  maxLength={5}
                />
              </div>

              {/* Preview - Live Calculation */}
              <div className="bg-muted border rounded-lg p-3">
                <div className="text-sm font-medium text-gray-700 mb-2">Preview Total Hours</div>
                <div className="text-lg font-bold text-blue-600">
                  {calculateTotalHours(
                    editForm.checkInTime,
                    editForm.breakInTime,
                    editForm.breakOutTime,
                    editForm.checkOutTime,
                    editForm.overtime
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="edit-reason" className="text-sm font-medium mb-2 block">
                  Reason for editing
                </Label>
                <Textarea
                  id="edit-reason"
                  placeholder="Why are you editing this record?"
                  value={editForm.editReason}
                  onChange={(e) => setEditForm(prev => ({ ...prev, editReason: e.target.value }))}
                  className="h-16"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditDialogOpen(false)
                setEditingRecord(null)
                setEditForm({
                  status: '',
                  checkInTime: '',
                  breakInTime: '',
                  breakOutTime: '',
                  checkOutTime: '',
                  totalHours: '',
                  overtime: '',
                  editReason: ''
                })
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEditedRecord}
              disabled={!editForm.editReason.trim()}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Delete Attendance Record?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this attendance record? This action cannot be undone.
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Employee:</span>
                    <span>{deletingRecord?.employeeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Employee Code:</span>
                    <span className="font-mono">{deletingRecord?.employeeCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Date:</span>
                    <span>
                      {deletingRecord?.date ? (() => {
                        const dateStr = deletingRecord.date.split('T')[0]
                        const [year, month, day] = dateStr.split('-')
                        return `${month}/${day}/${year}`
                      })() : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <Badge className={statusColors[deletingRecord?.status || ''] || 'bg-gray-100 text-gray-800'}>
                      {deletingRecord?.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setDeletingRecord(null)
              }}
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete Record'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Records</h3>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold">{filteredRecords.length}</p>
                <span className="text-xs text-muted-foreground">in filtered results</span>
              </div>
            </div>
            <div className="ml-4 p-2 bg-muted rounded-lg">
              <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-card border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Present</h3>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {filteredRecords.filter((r: AttendanceRecord) => r.status === 'PRESENT').length}
                </p>
                <span className="text-xs text-muted-foreground">employees</span>
              </div>
            </div>
            <div className="ml-4 p-2 bg-green-50 dark:bg-green-950 rounded-lg">
              <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-card border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Absent</h3>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {filteredRecords.filter((r: AttendanceRecord) => r.status === 'ABSENT').length}
                </p>
                <span className="text-xs text-muted-foreground">employees</span>
              </div>
            </div>
            <div className="ml-4 p-2 bg-red-50 dark:bg-red-950 rounded-lg">
              <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-card rounded-lg border shadow-sm mb-6">
        <div className="px-6 py-4 border-b">
          <h3 className="text-base font-medium">Filter & Search</h3>
        </div>
        
        <div className="p-6">
          {/* Main Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by employee name, code..."
                  value={employeeSearch}
                  onChange={(e) => {
                    setEmployeeSearch(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10 h-10"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value)
                setCurrentPage(1)
              }}>
                <SelectTrigger className="w-40 h-10 border-gray-300">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PRESENT">Present</SelectItem>
                  <SelectItem value="ABSENT">Absent</SelectItem>
                  <SelectItem value="LATE">Late</SelectItem>
                  <SelectItem value="WFH_APPROVED">WFH</SelectItem>
                </SelectContent>
              </Select>

              <Select value={salaryCycleFilter} onValueChange={(value) => {
                setSalaryCycleFilter(value)
                setCurrentPage(1)
              }}>
                <SelectTrigger className="w-52 h-10 border-gray-300">
                  <SelectValue placeholder="Current Cycle (6 Nov - 5 Dec)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Cycle (6 Nov - 5 Dec)</SelectItem>
                  <SelectItem value="previous">Previous Cycle (6 Oct - 5 Nov)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Quick filters:</span>
            <div className="flex items-center gap-2">
              <Button 
                variant={quickFilter === 'today' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => handleQuickFilter('today')}
                className="h-8 px-3 text-sm"
              >
                Today
              </Button>
              <Button 
                variant={quickFilter === 'week' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => handleQuickFilter('week')}
                className="h-8 px-3 text-sm"
              >
                This Week
              </Button>
              <Button 
                variant={quickFilter === 'month' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => handleQuickFilter('month')}
                className="h-8 px-3 text-sm"
              >
                This Month
              </Button>
              
              {/* Calendar Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-sm"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date)
                      if (date) {
                        setQuickFilter('')
                        setCurrentPage(1)
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllFilters}
                className="h-8 px-3 text-sm"
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}

      {/* Records Table */}
      <div className="bg-card rounded-lg border">
        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="text-left font-medium">Name</TableHead>
                <TableHead className="text-left font-medium">Code</TableHead>
                <TableHead className="text-center font-medium">Date</TableHead>
                <TableHead className="text-left font-medium">Status</TableHead>
                <TableHead className="text-center font-medium">Check In</TableHead>
                <TableHead className="text-center font-medium">Break In</TableHead>
                <TableHead className="text-center font-medium">Break Out</TableHead>
                <TableHead className="text-center font-medium">Check Out</TableHead>
                <TableHead className="text-center font-medium">Hours</TableHead>
                <TableHead className="text-center font-medium">Overtime</TableHead>
                <TableHead className="text-center font-medium">Break Time</TableHead>
                <TableHead className="text-center font-medium">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRecords.map((record: AttendanceRecord) => (
                <TableRow key={record.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{record.employeeName}</div>
                      {record.hasBeenEdited && (
                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-xs">
                          Edited
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {record.employeeCode}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {(() => {
                      try {
                        const dateStr = record.date.split('T')[0]
                        const [year, month, day] = dateStr.split('-')
                        return `${month}/${day}/${year}`
                      } catch {
                        return 'Invalid Date'
                      }
                    })()}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[record.status] || 'bg-gray-100 text-gray-800'}>
                      {record.status?.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {formatTime(record.checkInTime)}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {formatTime(record.breakInTime)}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {formatTime(record.breakOutTime)}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {formatTime(record.checkOutTime)}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm font-medium">
                    {(() => {
                      // Calculate total hours live using the same logic as edit dialog
                      const checkIn = formatTimeForInput(record.checkInTime)
                      const breakIn = formatTimeForInput(record.breakInTime)
                      const breakOut = formatTimeForInput(record.breakOutTime)
                      const checkOut = formatTimeForInput(record.checkOutTime)
                      const overtime = formatOvertimeForInput(record.overtime)
                      
                      if (checkIn && checkOut) {
                        return calculateTotalHours(checkIn, breakIn, breakOut, checkOut, overtime)
                      }
                      return '00:00'
                    })()}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm font-medium">
                    {typeof record.overtime === 'number' 
                      ? `${Math.floor(record.overtime)}:${String(Math.round((record.overtime % 1) * 60)).padStart(2, '0')}`
                      : record.overtime || '0:00'
                    }
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm font-medium">
                    {(() => {
                      // Calculate break duration
                      const breakIn = formatTimeForInput(record.breakInTime)
                      const breakOut = formatTimeForInput(record.breakOutTime)
                      
                      if (breakIn && breakOut) {
                        const breakInParts = breakIn.split(':').map(Number)
                        const breakOutParts = breakOut.split(':').map(Number)
                        
                        if (breakInParts.length === 2 && breakOutParts.length === 2 && 
                            !breakInParts.some(isNaN) && !breakOutParts.some(isNaN)) {
                          
                          const breakInMinutes = breakInParts[0] * 60 + breakInParts[1]
                          const breakOutMinutes = breakOutParts[0] * 60 + breakOutParts[1]
                          
                          // Calculate break duration (always positive)
                          const breakDurationMinutes = Math.abs(breakOutMinutes - breakInMinutes)
                          const hours = Math.floor(breakDurationMinutes / 60)
                          const minutes = breakDurationMinutes % 60
                          
                          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
                        }
                      }
                      return '-'
                    })()}
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditRecord(record)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Record
                        </DropdownMenuItem>
                        {record.hasBeenEdited && (
                          <DropdownMenuItem onClick={() => handleViewHistory(record)}>
                            <Clock className="mr-2 h-4 w-4" />
                            View History
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteRecord(record)}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Record
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        {filteredRecords.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No attendance records found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalRecords > 0 && (
        <div className="flex items-center justify-between bg-card border rounded-lg px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select value={recordsPerPage.toString()} onValueChange={handleRecordsPerPageChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">entries</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, totalRecords)} of {totalRecords} entries
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  const distance = Math.abs(page - currentPage)
                  return distance <= 2 || page === 1 || page === totalPages
                })
                .map((page, index, array) => {
                  const showEllipsis = index > 0 && page - array[index - 1] > 1
                  return (
                    <div key={page} className="flex items-center">
                      {showEllipsis && (
                        <span className="px-2 py-1 text-sm text-muted-foreground">...</span>
                      )}
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    </div>
                  )
                })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
