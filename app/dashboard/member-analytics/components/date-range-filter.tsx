'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from "date-fns"
import { cn } from "@/lib/utils"
import { FilterParams } from "../types/member-tasks"

interface DateRangeFilterProps {
  filters: FilterParams
  onFiltersChange: (filters: FilterParams) => void
}

type DatePreset = {
  label: string
  getValue: () => FilterParams
}

const datePresets: DatePreset[] = [
  {
    label: "Today",
    getValue: () => ({ date: format(new Date(), 'yyyy-MM-dd') })
  },
  {
    label: "Yesterday", 
    getValue: () => ({ date: format(subDays(new Date(), 1), 'yyyy-MM-dd') })
  },
  {
    label: "This Week",
    getValue: () => ({
      startDate: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      endDate: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    })
  },
  {
    label: "Last Week",
    getValue: () => {
      const lastWeek = subWeeks(new Date(), 1)
      return {
        startDate: format(startOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        endDate: format(endOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      }
    }
  },
  {
    label: "This Month",
    getValue: () => ({
      startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    })
  },
  {
    label: "Last Month",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1)
      return {
        startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd')
      }
    }
  },
  {
    label: "Last 7 Days",
    getValue: () => ({
      startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd')
    })
  },
  {
    label: "Last 30 Days", 
    getValue: () => ({
      startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd')
    })
  },
  {
    label: "All Time",
    getValue: () => ({})
  }
]

export function DateRangeFilter({ filters, onFiltersChange }: DateRangeFilterProps) {
  const [customRange, setCustomRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined })
  const [showCustomPicker, setShowCustomPicker] = useState(false)

  const getSelectedPreset = () => {
    return datePresets.find(preset => {
      const presetValue = preset.getValue()
      return JSON.stringify(presetValue) === JSON.stringify(filters)
    })?.label || "Custom Range"
  }

  const handlePresetClick = (preset: DatePreset) => {
    const newFilters = preset.getValue()
    onFiltersChange(newFilters)
  }

  const handleCustomRangeApply = () => {
    if (customRange.from && customRange.to) {
      onFiltersChange({
        startDate: format(customRange.from, 'yyyy-MM-dd'),
        endDate: format(customRange.to, 'yyyy-MM-dd')
      })
      setShowCustomPicker(false)
    }
  }

  const getDateRangeDisplay = () => {
    if (filters.date) {
      return `Selected Date: ${format(new Date(filters.date), 'MMM d, yyyy')}`
    } else if (filters.startDate && filters.endDate) {
      return `${format(new Date(filters.startDate), 'MMM d')} - ${format(new Date(filters.endDate), 'MMM d, yyyy')}`
    } else if (filters.tillDate) {
      return `Till ${format(new Date(filters.tillDate), 'MMM d, yyyy')}`
    } else {
      return `All Time (till ${format(new Date(), 'MMM d, yyyy')})`
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Date Range</CardTitle>
        <p className="text-sm text-muted-foreground">
          {getDateRangeDisplay()}
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {datePresets.map((preset) => (
            <Button
              key={preset.label}
              variant={getSelectedPreset() === preset.label ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetClick(preset)}
            >
              {preset.label}
            </Button>
          ))}
          
          <Popover open={showCustomPicker} onOpenChange={setShowCustomPicker}>
            <PopoverTrigger asChild>
              <Button
                variant={getSelectedPreset() === "Custom Range" ? "default" : "outline"}
                size="sm"
              >
                Custom Range
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-4">
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Select Date Range</h4>
                  <Calendar
                    initialFocus
                    mode="range"
                    selected={customRange as any}
                    onSelect={(range: any) => setCustomRange(range || { from: undefined, to: undefined })}
                    numberOfMonths={2}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomPicker(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCustomRangeApply}
                    disabled={!customRange.from || !customRange.to}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
    </Card>
  )
}