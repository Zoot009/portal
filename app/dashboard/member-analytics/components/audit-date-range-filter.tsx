'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { AuditFilterParams } from "../types/audit"

interface AuditDateRangeFilterProps {
  filters: AuditFilterParams
  onFiltersChange: (filters: AuditFilterParams) => void
}

export function AuditDateRangeFilter({ filters, onFiltersChange }: AuditDateRangeFilterProps) {
  const handleStartDateChange = (value: string) => {
    onFiltersChange({ ...filters, startDate: value || undefined })
  }

  const handleEndDateChange = (value: string) => {
    onFiltersChange({ ...filters, endDate: value || undefined })
  }

  const handleClearFilters = () => {
    onFiltersChange({ ...filters, startDate: undefined, endDate: undefined })
  }

  const handleQuickFilter = (type: 'yesterday' | 'last7days' | 'lastMonth') => {
    const today = new Date()
    let startDate = new Date()
    const endDate = new Date()

    switch (type) {
      case 'yesterday':
        startDate.setDate(today.getDate() - 1)
        endDate.setDate(today.getDate() - 1)
        break
      case 'last7days':
        startDate.setDate(today.getDate() - 7)
        break
      case 'lastMonth':
        startDate.setMonth(today.getMonth() - 1)
        break
    }

    onFiltersChange({
      ...filters,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Date Range Filter</CardTitle>
            <CardDescription>
              Filter activities by date range
            </CardDescription>
          </div>
          {(filters.startDate || filters.endDate) && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickFilter('yesterday')}
          >
            Yesterday
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickFilter('last7days')}
          >
            Last 7 Days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickFilter('lastMonth')}
          >
            Last Month
          </Button>
        </div>

        {/* Custom Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleStartDateChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleEndDateChange(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
