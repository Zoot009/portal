'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, ChevronLeft, ChevronRight, Coffee, Trash2, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface DeletedBreakRecord {
  id: number
  employeeId: number
  employeeName: string
  employeeCode: string
  breakDate: string
  breakInTime: string | null
  breakOutTime: string | null
  breakDuration: number
  deleteReason: string
  deletedBy: string
  deletedByRole: string
  deletedAt: string
  originalBreakId: number
}

export default function DeletedBreaksPage() {
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage, setRecordsPerPage] = useState(10)

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

  // Fetch deleted break records
  const { data: deletedRecordsData, isLoading } = useQuery({
    queryKey: ['deleted-breaks'],
    queryFn: async () => {
      const response = await fetch('/api/admin/breaks/deleted')
      if (!response.ok) throw new Error('Failed to fetch deleted breaks')
      const result = await response.json()
      return result.data || []
    }
  })

  const records = deletedRecordsData || []

  // Filter records
  const filteredRecords = records.filter((record: DeletedBreakRecord) => {
    const matchesSearch = !employeeSearch || 
      record.employeeName?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      record.employeeCode?.toLowerCase().includes(employeeSearch.toLowerCase())
    
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
          <h1 className="text-2xl font-bold">Deleted Break Records</h1>
          <p className="text-muted-foreground">View all break records that have been deleted by admins</p>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Deleted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{filteredRecords.length}</div>
            <p className="text-xs text-muted-foreground">Breaks removed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Deleted Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {filteredRecords.filter((r: DeletedBreakRecord) => {
                const today = new Date().toISOString().split('T')[0]
                return r.deletedAt?.startsWith(today)
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Deleted today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {new Set(filteredRecords.map((r: DeletedBreakRecord) => r.employeeId)).size}
            </div>
            <p className="text-xs text-muted-foreground">Affected employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatDuration(filteredRecords.reduce((sum: number, r: DeletedBreakRecord) => 
                sum + (r.breakDuration || 0), 0
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Total break time</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search */}
      <div className="bg-card rounded-lg border shadow-sm mb-6">
        <div className="px-6 py-4 border-b">
          <h3 className="text-base font-medium">Filter Deleted Break Records</h3>
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
          <div className="text-center py-12">Loading deleted break records...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="text-left font-medium">Employee</TableHead>
                <TableHead className="text-left font-medium">Code</TableHead>
                <TableHead className="text-left font-medium">Break Date</TableHead>
                <TableHead className="text-center font-medium">Break Start</TableHead>
                <TableHead className="text-center font-medium">Break End</TableHead>
                <TableHead className="text-center font-medium">Duration</TableHead>
                <TableHead className="text-left font-medium">Delete Reason</TableHead>
                <TableHead className="text-left font-medium">Deleted By</TableHead>
                <TableHead className="text-center font-medium">Deleted At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRecords.map((record: DeletedBreakRecord) => (
                <TableRow key={record.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{record.employeeName}</div>
                      <Badge variant="outline" className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 text-xs">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Deleted
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {record.employeeCode}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(record.breakDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {formatTime(record.breakInTime)}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {formatTime(record.breakOutTime)}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm font-medium">
                    {formatDuration(record.breakDuration)}
                  </TableCell>
                  <TableCell className="text-left text-sm text-muted-foreground max-w-xs">
                    <div className="truncate" title={record.deleteReason}>
                      {record.deleteReason}
                    </div>
                  </TableCell>
                  <TableCell className="text-left text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{record.deletedBy}</span>
                      <span className="text-xs text-muted-foreground">{record.deletedByRole}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {new Date(record.deletedAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        {filteredRecords.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <Coffee className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-muted-foreground">No deleted break records found</p>
            <p className="text-sm text-muted-foreground mt-1">Deleted breaks will appear here</p>
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
              Showing {startIndex + 1} to {Math.min(endIndex, totalRecords)} of {totalRecords} deleted records
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
