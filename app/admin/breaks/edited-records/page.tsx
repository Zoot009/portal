'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Edit, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Clock, ArrowRight, Coffee } from 'lucide-react'
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

interface BreakRecord {
  id: number
  employeeId: number
  startTime: string | null
  endTime: string | null
  duration: number | null
  breakDate: string
  status: 'ACTIVE' | 'COMPLETED'
  hasBeenEdited?: boolean
  editReason?: string
  updatedAt?: string
  editHistory?: EditHistoryEntry[]
  employee: {
    id: number
    name: string
    employeeCode: string
  }
}

export default function EditedBreaksPage() {
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage, setRecordsPerPage] = useState(10)
  const [expandedRecord, setExpandedRecord] = useState<number | null>(null)

  // Helper function to format field names
  const formatFieldName = (fieldName: string): string => {
    const fieldMap: Record<string, string> = {
      'breakInTime': 'Break Start Time',
      'breakOutTime': 'Break End Time',
      'breakDuration': 'Break Duration'
    }
    return fieldMap[fieldName] || fieldName
  }

  // Helper function to format values
  const formatValue = (value: string | null, fieldName: string): string => {
    if (!value || value === 'null' || value === 'Not set') return 'Not set'
    
    // Format time values
    if (fieldName === 'breakInTime' || fieldName === 'breakOutTime') {
      if (value.includes('T') && value.endsWith('Z')) {
        try {
          const date = new Date(value)
          return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        } catch {
          return value
        }
      }
    }

    // Format duration (in minutes)
    if (fieldName === 'breakDuration') {
      const minutes = parseInt(value)
      if (!isNaN(minutes)) {
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        if (hours > 0) {
          return `${hours}h ${mins}m`
        }
        return `${mins}m`
      }
    }
    
    return value
  }

  // Helper function to format time
  const formatTime = (isoTimeString: string | null | undefined): string => {
    if (!isoTimeString || isoTimeString === '-') return '-'
    try {
      const date = new Date(isoTimeString)
      if (isNaN(date.getTime())) return '-'
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch (error) {
      return '-'
    }
  }

  // Helper function to format duration
  const formatDuration = (minutes: number | null | undefined): string => {
    if (!minutes || minutes === 0) return '0m'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  // Fetch only edited break records
  const { data: breaksData, isLoading } = useQuery({
    queryKey: ['edited-breaks'],
    queryFn: async () => {
      const response = await fetch('/api/admin/breaks?edited=true')
      if (!response.ok) throw new Error('Failed to fetch edited breaks')
      const result = await response.json()
      return result.data || []
    }
  })

  const records = breaksData || []

  // Filter records
  const filteredRecords = records.filter((record: BreakRecord) => {
    const matchesSearch = !employeeSearch || 
      record.employee.name?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      record.employee.employeeCode?.toLowerCase().includes(employeeSearch.toLowerCase())
    
    const matchesDate = !dateFilter || record.breakDate.startsWith(dateFilter)
    
    return matchesSearch && matchesDate
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
    setDateFilter('')
    setCurrentPage(1)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Edited Break Records</h1>
          <p className="text-muted-foreground">View all break records that have been modified</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/breaks">
            <Button variant="outline">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to All Breaks
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Edited</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{filteredRecords.length}</div>
            <p className="text-xs text-muted-foreground">Breaks modified</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Edits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {filteredRecords.filter((r: BreakRecord) => {
                const today = new Date().toISOString().split('T')[0]
                return r.updatedAt?.startsWith(today)
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Edited today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {new Set(filteredRecords.map((r: BreakRecord) => r.employeeId)).size}
            </div>
            <p className="text-xs text-muted-foreground">Affected employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {filteredRecords.reduce((sum: number, r: BreakRecord) => 
                sum + (r.editHistory?.length || 0), 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Field modifications</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search */}
      <div className="bg-card rounded-lg border shadow-sm mb-6">
        <div className="px-6 py-4 border-b">
          <h3 className="text-base font-medium">Filter Edited Break Records</h3>
        </div>
        
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
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
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-40 h-10"
                placeholder="Filter by date"
              />

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllFilters}
                className="h-10 px-3 text-sm"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-card rounded-lg border">
        {isLoading ? (
          <div className="text-center py-12">Loading edited break records...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="text-left font-medium">Employee</TableHead>
                <TableHead className="text-left font-medium">Code</TableHead>
                <TableHead className="text-left font-medium">Date</TableHead>
                <TableHead className="text-center font-medium">Break Start</TableHead>
                <TableHead className="text-center font-medium">Break End</TableHead>
                <TableHead className="text-center font-medium">Duration</TableHead>
                <TableHead className="text-left font-medium">Edit Reason</TableHead>
                <TableHead className="text-center font-medium">Changes Made</TableHead>
                <TableHead className="text-center font-medium">Last Modified</TableHead>
                <TableHead className="text-center font-medium">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRecords.map((record: BreakRecord) => (
                <React.Fragment key={record.id}>
                  <TableRow className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{record.employee.name}</div>
                        <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800 text-xs">
                          <Edit className="h-3 w-3 mr-1" />
                          Modified
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {record.employee.employeeCode}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(record.breakDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {formatTime(record.startTime)}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {formatTime(record.endTime)}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm font-medium">
                      {formatDuration(record.duration)}
                    </TableCell>
                    <TableCell className="text-left text-sm text-muted-foreground max-w-xs">
                      <div className="truncate" title={record.editReason || 'No reason provided'}>
                        {record.editReason || 'No reason provided'}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {record.editHistory && record.editHistory.length > 0 ? (
                        <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                          <Clock className="h-3 w-3 mr-1" />
                          {record.editHistory.length} change{record.editHistory.length !== 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No changes</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {record.updatedAt ? new Date(record.updatedAt).toLocaleString() : '-'}
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
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                  
                  {/* Expandable change details row */}
                  {expandedRecord === record.id && record.editHistory && (
                    <TableRow>
                      <TableCell colSpan={10} className="bg-muted/50 p-0">
                        <div className="p-4">
                          <h4 className="text-sm font-medium mb-3">Change History</h4>
                          <div className="space-y-3">
                            {record.editHistory.map((edit) => (
                              <div key={edit.id} className="bg-card rounded-lg border p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="outline" className="text-xs">
                                        {formatFieldName(edit.fieldChanged)}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(edit.editedAt).toLocaleString()}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        by {edit.editedBy}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 text-sm">
                                      <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground">From:</span>
                                        <span className="font-mono bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 px-2 py-1 rounded">
                                          {formatValue(edit.oldValue, edit.fieldChanged)}
                                        </span>
                                      </div>
                                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                      <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground">To:</span>
                                        <span className="font-mono bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                                          {formatValue(edit.newValue, edit.fieldChanged)}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {edit.changeReason && (
                                      <div className="mt-2 text-sm text-muted-foreground">
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
              <Coffee className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-muted-foreground">No edited break records found</p>
            <p className="text-sm text-muted-foreground mt-1">Break records will appear here after they are modified</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalRecords > 0 && (
        <div className="flex items-center justify-between bg-card border rounded-lg px-6 py-4 mt-4">
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
