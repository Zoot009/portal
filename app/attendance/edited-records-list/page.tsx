'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Edit, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Clock, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

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
  updatedAt?: string
  editCount?: number
  editReason?: string
  editedAt?: string
  editHistory?: EditHistoryEntry[]
}

const statusColors: Record<string, string> = {
  'PRESENT': 'bg-green-100 text-green-800',
  'ABSENT': 'bg-red-100 text-red-800',
  'LATE': 'bg-yellow-100 text-yellow-800',
  'HALF_DAY': 'bg-blue-100 text-blue-800',
  'LEAVE_APPROVED': 'bg-purple-100 text-purple-800',
  'WFH_APPROVED': 'bg-indigo-100 text-indigo-800'
}

export default function EditedRecordsListPage() {
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage, setRecordsPerPage] = useState(10)
  const [expandedRecord, setExpandedRecord] = useState<number | null>(null)

  // Helper function to format field names for display
  const formatFieldName = (fieldName: string): string => {
    const fieldMap: Record<string, string> = {
      'status': 'Status',
      'checkInTime': 'Check In Time',
      'checkOutTime': 'Check Out Time',
      'breakInTime': 'Break In Time',
      'breakOutTime': 'Break Out Time',
      'totalHours': 'Total Hours',
      'overtime': 'Overtime'
    }
    return fieldMap[fieldName] || fieldName
  }

  // Helper function to format values for display
  const formatValue = (value: string | null): string => {
    if (!value || value === 'null' || value === 'Not set') return 'Not set'
    
    // Check if it's a time value (contains T and ends with Z - ISO format)
    if (value.includes('T') && value.endsWith('Z')) {
      try {
        const date = new Date(value)
        return date.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      } catch {
        return value
      }
    }
    
    // Check if it's a decimal number (for hours)
    if (!isNaN(Number(value)) && Number(value) % 1 !== 0) {
      const num = Number(value)
      const hours = Math.floor(num)
      const minutes = Math.round((num % 1) * 60)
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    }
    
    return value
  }

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

  // Helper function to format hours from decimal to HH:MM
  const formatHours = (decimalHours: number | undefined | null): string => {
    if (!decimalHours || decimalHours === 0) return '00:00'
    const hours = Math.floor(decimalHours)
    const minutes = Math.round((decimalHours % 1) * 60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  // Fetch only edited records
  const { data: records = [], isLoading, refetch } = useQuery({
    queryKey: ['edited-attendance-records'],
    queryFn: async () => {
      const response = await fetch('/api/attendance/records?edited=true')
      if (!response.ok) throw new Error('Failed to fetch edited records')
      const result = await response.json()
      return result.records || []
    }
  })

  // Filter records
  const filteredRecords = records.filter((record: AttendanceRecord) => {
    const matchesSearch = !employeeSearch || 
      record.employeeName?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      record.employeeCode?.toLowerCase().includes(employeeSearch.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter
    
    const matchesDate = !dateFilter || record.date.startsWith(dateFilter)
    
    return matchesSearch && matchesStatus && matchesDate
  })

  // Pagination logic
  const totalRecords = filteredRecords.length
  const totalPages = Math.ceil(totalRecords / recordsPerPage)
  const startIndex = (currentPage - 1) * recordsPerPage
  const endIndex = startIndex + recordsPerPage
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex)

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(parseInt(value))
    setCurrentPage(1)
  }



  // Clear filters
  const clearAllFilters = () => {
    setEmployeeSearch('')
    setStatusFilter('all')
    setDateFilter('')
    setCurrentPage(1)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Edited Attendance Records</h1>
          <p className="text-muted-foreground">View all records that have been modified</p>
        </div>
        <div className="flex gap-2">
          <Link href="/attendance">
            <Button variant="outline">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to All Records
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Edited</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{filteredRecords.length}</div>
            <p className="text-xs text-muted-foreground">Records modified</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Today's Edits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredRecords.filter((r: AttendanceRecord) => {
                const today = new Date().toISOString().split('T')[0]
                return r.updatedAt?.startsWith(today)
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Edited today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Present Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredRecords.filter((r: AttendanceRecord) => r.status === 'PRESENT').length}
            </div>
            <p className="text-xs text-muted-foreground">Currently present</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Time Adjustments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {filteredRecords.filter((r: AttendanceRecord) => 
                r.checkInTime || r.checkOutTime || r.breakInTime || r.breakOutTime
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Time modifications</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-medium text-gray-900">Filter Edited Records</h3>
        </div>
        
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by employee name, code..."
                  value={employeeSearch}
                  onChange={(e) => {
                    setEmployeeSearch(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10 h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
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

              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-40 h-10 border-gray-300"
                placeholder="Filter by date"
              />

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllFilters}
                className="h-10 px-3 text-sm text-gray-600 hover:text-gray-900"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg border">
        {isLoading ? (
          <div className="text-center py-12">Loading edited records...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="text-left font-medium">Employee</TableHead>
                <TableHead className="text-left font-medium">Code</TableHead>
                <TableHead className="text-left font-medium">Date</TableHead>
                <TableHead className="text-left font-medium">Status</TableHead>
                <TableHead className="text-center font-medium">Check In</TableHead>
                <TableHead className="text-center font-medium">Break In</TableHead>
                <TableHead className="text-center font-medium">Break Out</TableHead>
                <TableHead className="text-center font-medium">Check Out</TableHead>
                <TableHead className="text-center font-medium">Total Hours</TableHead>
                <TableHead className="text-center font-medium">Overtime</TableHead>
                <TableHead className="text-left font-medium">Edit Reason</TableHead>
                <TableHead className="text-center font-medium">Changes Made</TableHead>
                <TableHead className="text-center font-medium">Last Modified</TableHead>
                <TableHead className="text-center font-medium">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRecords.map((record: AttendanceRecord) => (
                <React.Fragment key={record.id}>
                  <TableRow className="hover:bg-gray-50/50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-gray-900">{record.employeeName}</div>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                          <Edit className="h-3 w-3 mr-1" />
                          Modified
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-gray-600">
                      {record.employeeCode}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(record.date).toLocaleDateString()}
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
                      {formatHours(record.totalHours)}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm font-medium">
                      {formatHours(record.overtime)}
                    </TableCell>
                    <TableCell className="text-left text-sm text-gray-700 max-w-xs">
                      <div className="truncate" title={record.editReason || 'No reason provided'}>
                        {record.editReason || 'No reason provided'}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {record.editHistory && record.editHistory.length > 0 ? (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                          <Clock className="h-3 w-3 mr-1" />
                          {record.editHistory.length} change{record.editHistory.length !== 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">No changes</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm text-gray-600">
                      {record.updatedAt || record.editedAt ? new Date(record.updatedAt || record.editedAt!).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {record.editHistory && record.editHistory.length > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                          className="h-8 w-8 p-0"
                        >
                          {expandedRecord === record.id ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                          }
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                          <Edit className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                  
                  {/* Expandable change details row */}
                  {expandedRecord === record.id && record.editHistory && (
                    <TableRow>
                      <TableCell colSpan={14} className="bg-gray-50 p-0">
                        <div className="p-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Change History</h4>
                          <div className="space-y-3">
                            {record.editHistory.map((edit, index) => (
                              <div key={edit.id} className="bg-white rounded-lg border p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="outline" className="text-xs">
                                        {formatFieldName(edit.fieldChanged)}
                                      </Badge>
                                      <span className="text-xs text-gray-500">
                                        {new Date(edit.editedAt).toLocaleString()}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        by {edit.editedBy}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 text-sm">
                                      <div className="flex items-center gap-1">
                                        <span className="text-gray-500">From:</span>
                                        <span className="font-mono bg-red-50 text-red-700 px-2 py-1 rounded">
                                          {formatValue(edit.oldValue)}
                                        </span>
                                      </div>
                                      <ArrowRight className="h-3 w-3 text-gray-400" />
                                      <div className="flex items-center gap-1">
                                        <span className="text-gray-500">To:</span>
                                        <span className="font-mono bg-green-50 text-green-700 px-2 py-1 rounded">
                                          {formatValue(edit.newValue)}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {edit.changeReason && (
                                      <div className="mt-2 text-sm text-gray-600">
                                        <span className="font-medium">Reason:</span> {edit.changeReason}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        )}
        
        {filteredRecords.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <Edit className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-muted-foreground">No edited records found</p>
            <p className="text-sm text-muted-foreground mt-1">Records will appear here after they are modified</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalRecords > 0 && (
        <div className="flex items-center justify-between bg-white border rounded-lg px-6 py-4 mt-4">
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
              Showing {startIndex + 1} to {Math.min(endIndex, totalRecords)} of {totalRecords} edited records
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