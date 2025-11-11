'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Download, FileText, FileSpreadsheet, Calendar } from 'lucide-react'
import { toast } from 'sonner'

const exportTypes = [
  { id: 'attendance', name: 'Attendance Report', icon: Calendar, description: 'Employee attendance records with check-in/out times' },
  { id: 'productivity', name: 'Productivity Report', icon: FileText, description: 'Productivity metrics and performance data' },
  { id: 'leave', name: 'Leave Report', icon: Calendar, description: 'Leave requests and approval history' },
  { id: 'assets', name: 'Asset Report', icon: FileSpreadsheet, description: 'Asset assignments and inventory' },
  { id: 'flowace', name: 'Flowace Report', icon: FileText, description: 'Flowace tracking and activity data' },
  { id: 'salary', name: 'Salary Report', icon: FileSpreadsheet, description: 'Salary and payment information' }
]

export default function ExportReportsPage() {
  const [selectedType, setSelectedType] = useState('')
  const [dateRange, setDateRange] = useState('this_month')
  const [format, setFormat] = useState('csv')
  const [includeSummary, setIncludeSummary] = useState(true)

  const exportMutation = useMutation({
    mutationFn: async (params: any) => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      return { success: true, filename: `report_${Date.now()}.${params.format}` }
    },
    onSuccess: (data) => {
      toast.success(`Report exported successfully! File: ${data.filename}`)
    },
    onError: () => {
      toast.error('Failed to export report')
    }
  })

  const handleExport = () => {
    if (!selectedType) {
      toast.error('Please select a report type')
      return
    }
    exportMutation.mutate({ type: selectedType, dateRange, format, includeSummary })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Export Reports</h2>
        <p className="text-muted-foreground">
          Generate and download reports in various formats
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Report Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
            <CardDescription>
              Select report type and customize export settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a report type" />
                </SelectTrigger>
                <SelectContent>
                  {exportTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedType && (
                <p className="text-sm text-muted-foreground">
                  {exportTypes.find(t => t.id === selectedType)?.description}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="this_quarter">This Quarter</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Comma-separated values)</SelectItem>
                  <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                  <SelectItem value="pdf">PDF Document</SelectItem>
                  <SelectItem value="json">JSON Data</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="summary"
                checked={includeSummary}
                onCheckedChange={(checked) => setIncludeSummary(checked as boolean)}
              />
              <label
                htmlFor="summary"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Include summary statistics
              </label>
            </div>

            <Button
              onClick={handleExport}
              disabled={!selectedType || exportMutation.isPending}
              className="w-full"
            >
              {exportMutation.isPending ? (
                <>Generating Report...</>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Available Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Available Reports</CardTitle>
            <CardDescription>
              Select from the following report types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {exportTypes.map((type) => (
                <Card
                  key={type.id}
                  className={`cursor-pointer transition-colors ${selectedType === type.id ? 'border-primary bg-accent' : 'hover:bg-accent'}`}
                  onClick={() => setSelectedType(type.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">
                        <type.icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm">{type.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {type.description}
                        </p>
                      </div>
                      {selectedType === type.id && (
                        <Badge variant="default">Selected</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Export Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• CSV format is recommended for importing into other systems</li>
            <li>• Excel format preserves formatting and allows for further analysis</li>
            <li>• PDF format is ideal for printing and sharing with stakeholders</li>
            <li>• JSON format is useful for developers and API integrations</li>
            <li>• Large date ranges may take longer to generate</li>
            <li>• Exported files will be downloaded to your browser's download folder</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
