"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Upload, Search, TrendingUp, Clock, Target, Award, FileText, X, Trash2, Loader2, Calendar as CalendarIcon, MoreVertical, Edit } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export default function FlowacePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('all')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadDate, setUploadDate] = useState("")
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [records, setRecords] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({
    loggedHours: '',
    activeHours: '',
    productiveHours: '',
    activityPercentage: '',
    productivityPercentage: '',
    editReason: ''
  })

  // Fetch records on mount and after operations
  useEffect(() => {
    fetchRecords()
  }, [dateFilter, selectedDate])

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/flowace/records')
      const data = await response.json()

      if (response.ok) {
        setRecords(data.records || [])
        setStats(data.stats || {})
      } else {
        toast.error(data.error || "Failed to fetch records")
      }
    } catch (error) {
      console.error('Error fetching records:', error)
      toast.error("Failed to load Flowace data")
    } finally {
      setLoading(false)
    }
  }

  const formatHours = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.floor((hours - h) * 60)
    return `${h}h ${m}m`
  }

  // Convert decimal hours to HH:MM format for editing
  const decimalToHHMM = (decimalHours: number) => {
    const hours = Math.floor(decimalHours)
    const minutes = Math.floor((decimalHours - hours) * 60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  // Convert HH:MM format back to decimal hours
  const hhmmToDecimal = (hhmm: string) => {
    if (!hhmm || !hhmm.includes(':')) return 0
    const [hours, minutes] = hhmm.split(':').map(Number)
    return hours + (minutes / 60)
  }

  // Filter records by date
  const getFilteredRecords = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    return records.filter(record => {
      const recordDate = new Date(record.date)
      const recordDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate())
      
      switch (dateFilter) {
        case 'today':
          return recordDay.getTime() === today.getTime()
        case 'week':
          const weekAgo = new Date(today)
          weekAgo.setDate(weekAgo.getDate() - 7)
          return recordDay >= weekAgo
        case 'month':
          const monthAgo = new Date(today)
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          return recordDay >= monthAgo
        case 'custom':
          if (!selectedDate) return true
          const selectedDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
          return recordDay.getTime() === selectedDay.getTime()
        case 'all':
        default:
          return true
      }
    }).filter(record => 
      searchTerm === "" || 
      record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const filteredRecords = getFilteredRecords()

  // Calculate filtered stats based on visible records
  const filteredStats = {
    totalEmployees: new Set(filteredRecords.map(r => r.employeeCode)).size,
    avgProductivity: filteredRecords.length > 0 
      ? filteredRecords.reduce((acc, r) => acc + (r.productivityPercentage || 0), 0) / filteredRecords.length 
      : 0,
    avgActivity: filteredRecords.length > 0 
      ? filteredRecords.reduce((acc, r) => acc + (r.activityPercentage || 0), 0) / filteredRecords.length 
      : 0,
    totalHours: filteredRecords.reduce((acc, r) => acc + r.loggedHours, 0)
  }

  const handleClearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setDateFilter('all')
    setSelectedDate(undefined)
  }

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    if (date) {
      setDateFilter('custom')
    } else {
      setDateFilter('all')
    }
  }

  // Handle edit record
  const handleEditRecord = (record: any) => {
    setEditingRecord(record)
    setEditForm({
      loggedHours: decimalToHHMM(record.loggedHours || 0),
      activeHours: decimalToHHMM(record.activeHours || 0),
      productiveHours: decimalToHHMM(record.productiveHours || 0),
      activityPercentage: record.activityPercentage?.toFixed(1) || '',
      productivityPercentage: record.productivityPercentage?.toFixed(1) || '',
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
      const response = await fetch(`/api/flowace/edit/${editingRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loggedHours: hhmmToDecimal(editForm.loggedHours),
          activeHours: hhmmToDecimal(editForm.activeHours),
          productiveHours: hhmmToDecimal(editForm.productiveHours),
          activityPercentage: parseFloat(editForm.activityPercentage) || 0,
          productivityPercentage: parseFloat(editForm.productivityPercentage) || 0,
          editReason: editForm.editReason
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Update the record in state without refreshing the entire page
        setRecords(prevRecords => 
          prevRecords.map(record => 
            record.id === editingRecord.id 
              ? { ...record, ...data.record }
              : record
          )
        )
        toast.success('Record updated successfully')
        setIsEditDialogOpen(false)
        setEditingRecord(null)
      } else {
        toast.error(data.error || 'Failed to update record')
      }
    } catch (error) {
      console.error('Error updating record:', error)
      toast.error('Failed to update record')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.name.endsWith('.csv')) {
        setSelectedFile(file)
      } else {
        toast.error("Please select a CSV file")
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !uploadDate) {
      toast.error("Please select a file and date")
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('date', uploadDate)

    try {
      const response = await fetch('/api/flowace/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Processed ${data.recordsProcessed || 0} records successfully`)
        setUploadDialogOpen(false)
        setSelectedFile(null)
        setUploadDate("")
        // Refresh data
        fetchRecords()
      } else {
        toast.error(data.error || "Failed to upload file")
      }
    } catch (error) {
      toast.error("An error occurred while uploading")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)

    try {
      const response = await fetch('/api/flowace/delete?all=true', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || "All records deleted successfully")
        // Refresh data
        fetchRecords()
      } else {
        toast.error(data.error || "Failed to delete records")
      }
    } catch (error) {
      toast.error("An error occurred while deleting")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Flowace Analytics</h2>
          <p className="text-muted-foreground">
            Employee productivity metrics and performance tracking
          </p>
        </div>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete All Records
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete All Flowace Records?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all Flowace records from the database. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "Deleting..." : "Delete All"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                Upload CSV
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Upload Flowace CSV File</DialogTitle>
              <DialogDescription>
                Select a CSV file and specify the date for this data
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={uploadDate}
                  onChange={(e) => setUploadDate(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="file">CSV File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  required
                />
                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <FileText className="h-4 w-4" />
                    <span>{selectedFile.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                      className="h-6 w-6 p-0 ml-auto"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setUploadDialogOpen(false)
                  setSelectedFile(null)
                  setUploadDate("")
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploading || !selectedFile || !uploadDate}>
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : filteredStats.totalEmployees || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active employees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Productivity</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${filteredStats.avgProductivity?.toFixed(1) || 0}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              Overall rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatHours(filteredStats.totalHours || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Tracked hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Activity %</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${filteredStats.avgActivity?.toFixed(1) || 0}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              Average activity rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border space-y-4">
        <h3 className="font-semibold text-lg">Filter & Search</h3>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by employee name, code..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full md:w-[240px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="high">High Performers</SelectItem>
              <SelectItem value="low">Low Performers</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Quick filters:</span>
          <Button
            variant={dateFilter === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setDateFilter('today')
              setSelectedDate(undefined)
            }}
          >
            Today
          </Button>
          <Button
            variant={dateFilter === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setDateFilter('week')
              setSelectedDate(undefined)
            }}
          >
            This Week
          </Button>
          <Button
            variant={dateFilter === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setDateFilter('month')
              setSelectedDate(undefined)
            }}
          >
            This Month
          </Button>
          {selectedDate && (
            <Badge variant="secondary" className="gap-1">
              Custom: {format(selectedDate, "MMM d, yyyy")}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => {
                  setSelectedDate(undefined)
                  setDateFilter('all')
                }}
              />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="ml-auto"
          >
            Clear All Filters
          </Button>
        </div>
      </div>

      {/* Employee Analytics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Performance</CardTitle>
          <CardDescription>Productivity metrics from Flowace tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="text-left font-medium">Member Name</TableHead>
                  <TableHead className="text-center font-medium">Logged Hours</TableHead>
                  <TableHead className="text-center font-medium">Active Hours</TableHead>
                  <TableHead className="text-center font-medium">Productive Hours</TableHead>
                  <TableHead className="text-center font-medium">Activity %</TableHead>
                  <TableHead className="text-center font-medium">Productivity %</TableHead>
                  <TableHead className="text-center font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                      <p className="text-sm text-muted-foreground mt-2">Loading records...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow className="hover:bg-gray-50/50">
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No records found</p>
                      <p className="text-sm mt-2">
                        {records.length === 0 
                          ? "Upload Flowace CSV files to generate employee analytics"
                          : "Try adjusting your filters or search criteria"
                        }
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                      <TableRow key={record.id} className="hover:bg-gray-50/50">
                        <TableCell className="text-left">
                          <div className="flex flex-col">
                            <span className="font-medium">{record.employeeName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{formatHours(record.loggedHours)}</TableCell>
                        <TableCell className="text-center">{formatHours(record.activeHours)}</TableCell>
                        <TableCell className="text-center">{formatHours(record.productiveHours)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={record.activityPercentage >= 70 ? "default" : "secondary"}>
                            {record.activityPercentage?.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={record.productivityPercentage >= 70 ? "default" : "secondary"}>
                            {record.productivityPercentage?.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="cursor-pointer" onClick={() => handleEditRecord(record)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Record
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Record Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Flowace Record</DialogTitle>
            <DialogDescription>
              Edit metrics for {editingRecord?.employee?.name} on {editingRecord?.date ? new Date(editingRecord.date).toLocaleDateString() : ''}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="loggedHours">Logged Hours (HH:MM)</Label>
                <Input
                  id="loggedHours"
                  type="text"
                  value={editForm.loggedHours}
                  onChange={(e) => setEditForm({ ...editForm, loggedHours: e.target.value })}
                  placeholder="09:41"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="activeHours">Active Hours (HH:MM)</Label>
                <Input
                  id="activeHours"
                  type="text"
                  value={editForm.activeHours}
                  onChange={(e) => setEditForm({ ...editForm, activeHours: e.target.value })}
                  placeholder="09:14"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productiveHours">Productive Hours (HH:MM)</Label>
                <Input
                  id="productiveHours"
                  type="text"
                  value={editForm.productiveHours}
                  onChange={(e) => setEditForm({ ...editForm, productiveHours: e.target.value })}
                  placeholder="08:35"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="activityPercentage">Activity %</Label>
                <Input
                  id="activityPercentage"
                  type="text"
                  value={editForm.activityPercentage}
                  onChange={(e) => setEditForm({ ...editForm, activityPercentage: e.target.value })}
                  placeholder="0.0"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="productivityPercentage">Productivity %</Label>
                <Input
                  id="productivityPercentage"
                  type="text"
                  value={editForm.productivityPercentage}
                  onChange={(e) => setEditForm({ ...editForm, productivityPercentage: e.target.value })}
                  placeholder="0.0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editReason">Reason for Edit *</Label>
              <Input
                id="editReason"
                value={editForm.editReason}
                onChange={(e) => setEditForm({ ...editForm, editReason: e.target.value })}
                placeholder="Explain why you're editing this record"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditedRecord}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
