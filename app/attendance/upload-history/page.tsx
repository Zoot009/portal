'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, FileText, Download, MoreVertical, Eye, Search, Filter, CalendarIcon, SortAsc, SortDesc, Trash2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { format } from 'date-fns'
import * as XLSX from 'xlsx'

interface UploadHistoryEntry {
  id: string
  fileName: string
  uploadDate: string
  recordCount: number
  uploadedAt: string
  fileContent?: string
}

export default function UploadHistoryPage() {
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFileContent, setSelectedFileContent] = useState<string>('')
  const [selectedFileName, setSelectedFileName] = useState<string>('')

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('all') // all, today, week, month, custom
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [recordCountFilter, setRecordCountFilter] = useState('all') // all, 1-25, 26-50, 51-100, 100+
  const [sortBy, setSortBy] = useState('uploadedAt') // uploadedAt, fileName, recordCount, uploadDate
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showDuplicates, setShowDuplicates] = useState(false)

  // Filtered and sorted data
  const filteredAndSortedHistory = useMemo(() => {
    let filtered = uploadHistory.filter(entry => {
      // Search filter
      const matchesSearch = !searchTerm || 
        entry.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.fileContent && entry.fileContent.toLowerCase().includes(searchTerm.toLowerCase()))

      // Date filter
      let matchesDate = true
      const uploadDate = new Date(entry.uploadedAt)
      const today = new Date()
      
      switch (dateFilter) {
        case 'today':
          matchesDate = uploadDate.toDateString() === today.toDateString()
          break
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          matchesDate = uploadDate >= weekAgo
          break
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          matchesDate = uploadDate >= monthAgo
          break
        case 'custom':
          if (startDate && endDate) {
            matchesDate = uploadDate >= startDate && uploadDate <= endDate
          } else if (startDate) {
            matchesDate = uploadDate >= startDate
          } else if (endDate) {
            matchesDate = uploadDate <= endDate
          }
          break
      }

      // Record count filter
      let matchesRecordCount = true
      switch (recordCountFilter) {
        case '1-25':
          matchesRecordCount = entry.recordCount >= 1 && entry.recordCount <= 25
          break
        case '26-50':
          matchesRecordCount = entry.recordCount >= 26 && entry.recordCount <= 50
          break
        case '51-100':
          matchesRecordCount = entry.recordCount >= 51 && entry.recordCount <= 100
          break
        case '100+':
          matchesRecordCount = entry.recordCount > 100
          break
      }

      return matchesSearch && matchesDate && matchesRecordCount
    })

    // Duplicate filter
    if (showDuplicates) {
      const dateGroups = filtered.reduce((acc, entry) => {
        const date = entry.uploadDate
        if (!acc[date]) acc[date] = []
        acc[date].push(entry)
        return acc
      }, {} as Record<string, UploadHistoryEntry[]>)
      
      filtered = filtered.filter(entry => dateGroups[entry.uploadDate].length > 1)
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any
      
      switch (sortBy) {
        case 'fileName':
          aVal = a.fileName.toLowerCase()
          bVal = b.fileName.toLowerCase()
          break
        case 'recordCount':
          aVal = a.recordCount
          bVal = b.recordCount
          break
        case 'uploadDate':
          aVal = new Date(a.uploadDate)
          bVal = new Date(b.uploadDate)
          break
        default:
          aVal = new Date(a.uploadedAt)
          bVal = new Date(b.uploadedAt)
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })

    return filtered
  }, [uploadHistory, searchTerm, dateFilter, startDate, endDate, recordCountFilter, sortBy, sortOrder, showDuplicates])

  // Get duplicate dates for highlighting
  const duplicateDates = useMemo(() => {
    const dateGroups = uploadHistory.reduce((acc, entry) => {
      const date = entry.uploadDate
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.keys(dateGroups).filter(date => dateGroups[date] > 1)
  }, [uploadHistory])

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('')
    setDateFilter('all')
    setStartDate(undefined)
    setEndDate(undefined)
    setRecordCountFilter('all')
    setShowDuplicates(false)
  }
  const fetchUploadHistory = async () => {
    try {
      const response = await fetch('/api/upload-history')
      if (response.ok) {
        const data = await response.json()
        setUploadHistory(data.history || [])
      }
    } catch (error) {
      console.error('Error fetching upload history:', error)
      toast.error('Failed to load upload history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUploadHistory()
  }, [])

  // Download as Excel
  const downloadAsExcel = (entry: UploadHistoryEntry) => {
    try {
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()
      
      // Create upload details sheet
      const uploadDetails = [
        ['File Name', entry.fileName],
        ['Upload Date', new Date(entry.uploadDate).toLocaleDateString()],
        ['Record Count', entry.recordCount],
        ['Uploaded At', new Date(entry.uploadedAt).toLocaleString()],
        [''],
        ['Original SRP Content:'],
        [''],
      ]
      
      // Add SRP content line by line
      if (entry.fileContent) {
        const lines = entry.fileContent.split('\n')
        lines.forEach(line => {
          uploadDetails.push([line])
        })
      }
      
      const ws = XLSX.utils.aoa_to_sheet(uploadDetails)
      XLSX.utils.book_append_sheet(wb, ws, 'Upload Details')
      
      // Generate filename
      const fileName = `${entry.fileName.replace('.srp', '')}_${entry.uploadDate}.xlsx`
      
      // Download file
      XLSX.writeFile(wb, fileName)
      toast.success('Excel file downloaded successfully')
      
    } catch (error) {
      console.error('Error creating Excel file:', error)
      toast.error('Failed to create Excel file')
    }
  }

  // View file content
  const viewFileContent = (entry: UploadHistoryEntry) => {
    setSelectedFileContent(entry.fileContent || 'Content not available')
    setSelectedFileName(entry.fileName)
  }

  // Delete upload entry and associated attendance records
  const deleteUpload = async (entry: UploadHistoryEntry) => {
    const confirmMessage = `Are you sure you want to delete the upload "${entry.fileName}"?\n\nThis will also delete all ${entry.recordCount} attendance records from ${new Date(entry.uploadDate).toLocaleDateString()}.\n\nThis action cannot be undone.`
    
    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      // Delete upload history entry
      const uploadResponse = await fetch('/api/upload-history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id })
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to delete upload history')
      }

      // Delete associated attendance records by date
      const recordsResponse = await fetch('/api/attendance/records', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          uploadDate: entry.uploadDate,
          uploadId: entry.id 
        })
      })

      if (!recordsResponse.ok) {
        throw new Error('Failed to delete attendance records')
      }

      // Refresh upload history
      await fetchUploadHistory()
      
      toast.success(`Successfully deleted upload "${entry.fileName}" and ${entry.recordCount} attendance records`)
      
    } catch (error) {
      console.error('Error deleting upload:', error)
      toast.error('Failed to delete upload. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Upload History</h2>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Upload History</h2>
          <p className="text-muted-foreground">
            View all uploaded SRP files and their details ({filteredAndSortedHistory.length} of {uploadHistory.length} uploads)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              // Export filtered results
              if (filteredAndSortedHistory.length > 0) {
                const wb = XLSX.utils.book_new()
                const wsData = [
                  ['File Name', 'Upload Date', 'Record Count', 'Uploaded At'],
                  ...filteredAndSortedHistory.map(entry => [
                    entry.fileName,
                    new Date(entry.uploadDate).toLocaleDateString(),
                    entry.recordCount,
                    new Date(entry.uploadedAt).toLocaleString()
                  ])
                ]
                const ws = XLSX.utils.aoa_to_sheet(wsData)
                XLSX.utils.book_append_sheet(wb, ws, 'Upload History')
                XLSX.writeFile(wb, `upload_history_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
                toast.success('Upload history exported successfully')
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Filtered
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-4 w-4" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="space-y-1">
              <Label className="text-sm font-medium">Search Files & Content</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search filename or content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>

            {/* Date Filter */}
            <div className="space-y-1">
              <Label className="text-sm font-medium">Upload Time Period</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Record Count Filter */}
            <div className="space-y-1">
              <Label className="text-sm font-medium">Record Count</Label>
              <Select value={recordCountFilter} onValueChange={setRecordCountFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All counts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Counts</SelectItem>
                  <SelectItem value="1-25">1-25 Records</SelectItem>
                  <SelectItem value="26-50">26-50 Records</SelectItem>
                  <SelectItem value="51-100">51-100 Records</SelectItem>
                  <SelectItem value="100+">100+ Records</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Options */}
            <div className="space-y-1">
              <Label className="text-sm font-medium">Sort By</Label>
              <div className="flex gap-1">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="flex-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uploadedAt">Upload Time</SelectItem>
                    <SelectItem value="fileName">File Name</SelectItem>
                    <SelectItem value="recordCount">Record Count</SelectItem>
                    <SelectItem value="uploadDate">Record Date</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Custom Date Range */}
          {dateFilter === 'custom' && (
            <div className="grid gap-3 md:grid-cols-2 mt-3 pt-3 border-t">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick start date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick end date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Special Filters */}
          <div className="flex items-center gap-3 mt-3 pt-3 border-t">
            <Button
              variant={showDuplicates ? "default" : "outline"}
              size="sm"
              onClick={() => setShowDuplicates(!showDuplicates)}
              className="h-8"
            >
              {showDuplicates ? "Hide" : "Show"} Duplicate Dates ({duplicateDates.length})
            </Button>
            {(searchTerm || dateFilter !== 'all' || recordCountFilter !== 'all' || showDuplicates) && (
              <Badge variant="secondary" className="h-6">
                {filteredAndSortedHistory.length} filtered results
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Filtered Results</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredAndSortedHistory.length}</div>
            <p className="text-xs text-muted-foreground">of {uploadHistory.length} total</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredAndSortedHistory.reduce((total, entry) => total + entry.recordCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">in filtered results</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duplicate Dates</CardTitle>
            <FileText className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{duplicateDates.length}</div>
            <p className="text-xs text-muted-foreground">dates with multiple uploads</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Upload</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredAndSortedHistory.length > 0 
                ? new Date(filteredAndSortedHistory[0].uploadedAt).toLocaleDateString()
                : 'None'
              }
            </div>
            <p className="text-xs text-muted-foreground">in filtered results</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Upload History</CardTitle>
          <CardDescription>
            Complete history of all SRP file uploads
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAndSortedHistory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {uploadHistory.length === 0 ? 'No uploads found' : 'No uploads match your filters'}
              </p>
              {uploadHistory.length > 0 && (
                <Button variant="outline" onClick={clearFilters} className="mt-2">
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Uploaded At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedHistory.map((entry) => {
                  const isDuplicate = duplicateDates.includes(entry.uploadDate)
                  return (
                    <TableRow 
                      key={entry.id} 
                      className={isDuplicate ? 'bg-yellow-50 hover:bg-yellow-100' : ''}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {entry.fileName}
                          {isDuplicate && (
                            <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">
                              Duplicate Date
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(entry.uploadDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {entry.recordCount} records
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(entry.uploadedAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => viewFileContent(entry)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Content
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadAsExcel(entry)}>
                              <Download className="mr-2 h-4 w-4" />
                              Download Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteUpload(entry)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Upload
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* File Content Dialog */}
      <Dialog open={!!selectedFileContent} onOpenChange={() => setSelectedFileContent('')}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>File Content: {selectedFileName}</DialogTitle>
            <DialogDescription>
              Original SRP file content
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-auto">
            <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded">
              {selectedFileContent}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}