"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Upload, FileText, Clock, CheckCircle, XCircle, Search, Download, Eye, Trash2, Filter, CalendarIcon, SortAsc, SortDesc, MoreVertical } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import * as XLSX from 'xlsx'

interface UploadHistoryEntry {
  id: string
  filename: string
  fileType: string
  status: string
  totalRecords: number
  processedRecords: number
  errorRecords: number
  uploadedAt: string
  completedAt?: string
  batchId: string
  date?: string
  summary?: any
  errors?: any
  uploadFilename?: string
}

interface PreviewData {
  filename: string
  headers: string[]
  rows: any[]
  totalRows: number
  hasMore: boolean
}

export default function FlowaceUploadHistoryPage() {
  const router = useRouter()
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('all') // all, today, week, month, custom
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [statusFilter, setStatusFilter] = useState('all') // all, COMPLETED, FAILED
  const [recordCountFilter, setRecordCountFilter] = useState('all') // all, 1-25, 26-50, 51-100, 100+
  const [sortBy, setSortBy] = useState('uploadedAt') // uploadedAt, filename, totalRecords
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Fetch upload history
  const fetchUploadHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/upload-history')
      const data = await response.json()
      
      if (data.success) {
        // Filter only Flowace uploads
        const flowaceHistory = data.history.filter((entry: UploadHistoryEntry) => 
          entry.fileType === 'flowace_csv'
        )
        setUploadHistory(flowaceHistory)
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

  // Filter history based on search
  const filteredAndSortedHistory = useMemo(() => {
    const filtered = uploadHistory.filter(entry => {
      // Search filter
      const matchesSearch = !searchTerm || 
        entry.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.batchId.toLowerCase().includes(searchTerm.toLowerCase())

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

      // Status filter
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter

      // Record count filter
      let matchesRecordCount = true
      switch (recordCountFilter) {
        case '1-25':
          matchesRecordCount = entry.totalRecords >= 1 && entry.totalRecords <= 25
          break
        case '26-50':
          matchesRecordCount = entry.totalRecords >= 26 && entry.totalRecords <= 50
          break
        case '51-100':
          matchesRecordCount = entry.totalRecords >= 51 && entry.totalRecords <= 100
          break
        case '100+':
          matchesRecordCount = entry.totalRecords > 100
          break
      }

      return matchesSearch && matchesDate && matchesStatus && matchesRecordCount
    })

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any
      
      switch (sortBy) {
        case 'filename':
          aVal = a.filename.toLowerCase()
          bVal = b.filename.toLowerCase()
          break
        case 'totalRecords':
          aVal = a.totalRecords
          bVal = b.totalRecords
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
  }, [uploadHistory, searchTerm, dateFilter, startDate, endDate, statusFilter, recordCountFilter, sortBy, sortOrder])

  // Calculate stats
  const stats = useMemo(() => {
    const totalUploads = uploadHistory.length
    const successful = uploadHistory.filter(e => e.status === 'COMPLETED').length
    const failed = uploadHistory.filter(e => e.status === 'FAILED').length
    const totalRecords = filteredAndSortedHistory.reduce((sum, e) => sum + e.totalRecords, 0)
    const lastUpload = uploadHistory.length > 0 
      ? new Date(uploadHistory[0].uploadedAt).toLocaleDateString()
      : 'Never'
    
    return { totalUploads, successful, failed, totalRecords, lastUpload }
  }, [uploadHistory, filteredAndSortedHistory])

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('')
    setDateFilter('all')
    setStartDate(undefined)
    setEndDate(undefined)
    setStatusFilter('all')
    setRecordCountFilter('all')
  }

  const deleteUpload = async (entry: UploadHistoryEntry) => {
    if (!confirm(`Delete upload "${entry.filename}"?`)) return

    try {
      const response = await fetch('/api/upload-history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id })
      })

      if (response.ok) {
        toast.success('Upload history deleted')
        fetchUploadHistory()
      } else {
        toast.error('Failed to delete upload history')
      }
    } catch (error) {
      toast.error('Error deleting upload history')
    }
  }

  const downloadFile = async (entry: UploadHistoryEntry) => {
    try {
      // Get filename from summary if available
      const fileToDownload = entry.summary?.uploadFilename || `${entry.batchId}.csv`
      
      const response = await fetch(`/api/flowace/download?filename=${encodeURIComponent(fileToDownload)}`)
      
      if (!response.ok) {
        toast.error('Failed to download file')
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = entry.filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('File downloaded successfully')
    } catch (error) {
      console.error('Error downloading file:', error)
      toast.error('Error downloading file')
    }
  }

  const previewFile = async (entry: UploadHistoryEntry) => {
    try {
      setPreviewLoading(true)
      setPreviewOpen(true)
      
      // Get filename from summary if available
      const fileToPreview = entry.summary?.uploadFilename || `${entry.batchId}.csv`
      
      const response = await fetch(`/api/flowace/preview?filename=${encodeURIComponent(fileToPreview)}&limit=50`)
      
      if (!response.ok) {
        toast.error('Failed to preview file')
        setPreviewOpen(false)
        return
      }

      const data = await response.json()
      
      if (data.success) {
        setPreviewData(data)
      } else {
        toast.error(data.error || 'Failed to preview file')
        setPreviewOpen(false)
      }
    } catch (error) {
      console.error('Error previewing file:', error)
      toast.error('Error previewing file')
      setPreviewOpen(false)
    } finally {
      setPreviewLoading(false)
    }
  }

  // Download as Excel with all details
  const downloadAsExcel = async (entry: UploadHistoryEntry) => {
    try {
      // Get filename from summary if available
      const fileToDownload = entry.summary?.uploadFilename || `${entry.batchId}.csv`
      
      const response = await fetch(`/api/flowace/preview?filename=${encodeURIComponent(fileToDownload)}&limit=1000`)
      
      if (!response.ok) {
        toast.error('Failed to fetch file data')
        return
      }

      const data = await response.json()
      
      if (!data.success) {
        toast.error('Failed to load file data')
        return
      }

      // Create workbook
      const wb = XLSX.utils.book_new()
      
      // Create upload details sheet
      const uploadDetails = [
        ['File Name', entry.filename],
        ['Upload Date', new Date(entry.uploadedAt).toLocaleDateString()],
        ['Status', entry.status],
        ['Total Records', entry.totalRecords],
        ['Processed Records', entry.processedRecords],
        ['Error Records', entry.errorRecords],
        ['Batch ID', entry.batchId],
        [''],
        ['CSV Data:'],
        ['']
      ]
      
      // Add headers
      uploadDetails.push(data.headers)
      
      // Add data rows
      data.rows.forEach((row: any) => {
        uploadDetails.push(data.headers.map((header: string) => row[header] || ''))
      })
      
      const ws = XLSX.utils.aoa_to_sheet(uploadDetails)
      XLSX.utils.book_append_sheet(wb, ws, 'Upload Details')
      
      // Generate filename
      const fileName = `${entry.filename.replace('.csv', '')}_${format(new Date(entry.uploadedAt), 'yyyy-MM-dd')}.xlsx`
      
      // Download file
      XLSX.writeFile(wb, fileName)
      toast.success('Excel file downloaded successfully')
      
    } catch (error) {
      console.error('Error creating Excel file:', error)
      toast.error('Failed to create Excel file')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Flowace Upload History</h2>
          <p className="text-muted-foreground">
            View all uploaded Flowace CSV files and their details ({filteredAndSortedHistory.length} of {uploadHistory.length} uploads)
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
                  ['File Name', 'Upload Date', 'Status', 'Total Records', 'Processed', 'Errors', 'Uploaded At'],
                  ...filteredAndSortedHistory.map(entry => [
                    entry.filename,
                    entry.summary?.date ? new Date(entry.summary.date).toLocaleDateString() : '-',
                    entry.status,
                    entry.totalRecords,
                    entry.processedRecords,
                    entry.errorRecords,
                    new Date(entry.uploadedAt).toLocaleString()
                  ])
                ]
                const ws = XLSX.utils.aoa_to_sheet(wsData)
                XLSX.utils.book_append_sheet(wb, ws, 'Upload History')
                XLSX.writeFile(wb, `flowace_upload_history_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
                toast.success('Upload history exported successfully')
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Filtered
          </Button>
          <Button className="gap-2" onClick={() => router.push('/flowace')}>
            <Upload className="h-4 w-4" />
            Upload CSV
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
              <Label className="text-sm font-medium">Search Files</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search filename..."
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

            {/* Status Filter */}
            <div className="space-y-1">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
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
          </div>

          {/* Sort Options */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 mt-3 pt-3 border-t">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Sort By</Label>
              <div className="flex gap-1">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="flex-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uploadedAt">Upload Time</SelectItem>
                    <SelectItem value="filename">File Name</SelectItem>
                    <SelectItem value="totalRecords">Record Count</SelectItem>
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

          {/* Filter Badge */}
          {(searchTerm || dateFilter !== 'all' || statusFilter !== 'all' || recordCountFilter !== 'all') && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t">
              <Badge variant="secondary" className="h-6">
                {filteredAndSortedHistory.length} filtered results
              </Badge>
            </div>
          )}
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
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecords}</div>
            <p className="text-xs text-muted-foreground">in filtered results</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
            <p className="text-xs text-muted-foreground">processed successfully</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">processing errors</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Upload History</CardTitle>
          <CardDescription>
            Complete history of all Flowace CSV file uploads
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Loading upload history...</p>
            </div>
          ) : filteredAndSortedHistory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">
                {uploadHistory.length === 0 ? 'No upload history found' : 'No uploads match your filters'}
              </p>
              <p className="text-sm mt-2">
                {searchTerm || dateFilter !== 'all' || statusFilter !== 'all' || recordCountFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Upload your first Flowace CSV file to get started'}
              </p>
              {uploadHistory.length > 0 ? (
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Clear Filters
                </Button>
              ) : (
                <Button className="mt-4 gap-2" onClick={() => router.push('/flowace')}>
                  <Upload className="h-4 w-4" />
                  Upload CSV File
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Uploaded At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedHistory.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {entry.filename}
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.summary?.date ? new Date(entry.summary.date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={entry.status === 'COMPLETED' ? 'default' : 'destructive'}
                        className={entry.status === 'COMPLETED' ? 'bg-green-600' : ''}
                      >
                        {entry.status === 'COMPLETED' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {entry.status === 'FAILED' && <XCircle className="h-3 w-3 mr-1" />}
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {entry.processedRecords}/{entry.totalRecords} records
                      </Badge>
                      {entry.errorRecords > 0 && (
                        <div className="text-xs text-red-600 mt-1">{entry.errorRecords} errors</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(entry.uploadedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => previewFile(entry)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Content
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadFile(entry)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download CSV
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>CSV File Preview</DialogTitle>
            <DialogDescription>
              {previewData?.filename && `Viewing: ${previewData.filename}`}
              {previewData?.hasMore && ` (Showing first 50 rows)`}
            </DialogDescription>
          </DialogHeader>
          
          {previewLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading preview...</p>
            </div>
          ) : previewData ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {previewData.headers.slice(0, 8).map((header, index) => (
                      <TableHead key={index} className="text-xs font-semibold">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.rows.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {previewData.headers.slice(0, 8).map((header, colIndex) => (
                        <TableCell key={colIndex} className="text-xs">
                          {row[header] || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {previewData.hasMore && (
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  <p>Showing first 50 rows. Download the full file to see all data.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No preview data available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
