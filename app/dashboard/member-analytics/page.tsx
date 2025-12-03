'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SummaryCards } from "./components/summary-cards"
import { DateRangeFilter } from "./components/date-range-filter"
import { SearchFilterBar } from "./components/search-filter-bar"
import { CompletionTrendChart } from "./components/completion-trend-chart"
import { MemberListTable } from "./components/member-list-table"
import { useMemberTasks } from "./hooks/use-member-tasks"
import { FilterParams, SortField, SortOrder } from "./types/member-tasks"

export default function MemberAnalyticsPage() {
  const [filters, setFilters] = useState<FilterParams>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [taskTypeFilter, setTaskTypeFilter] = useState<'all' | 'service' | 'asking'>('all')
  const [sortBy, setSortBy] = useState<'totalTasks' | 'name' | 'serviceTasks' | 'askingTasks'>('totalTasks')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { data, isLoading, error } = useMemberTasks(filters)

  if (error) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Member Tasks Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Track team productivity and individual performance metrics
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">

              <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Load Data</h3>
              <p className="text-red-600 text-sm mb-4">
                {error.message || 'Failed to connect to the PMS API. Please try again later.'}
              </p>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight"> Member Tasks Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track team productivity and individual performance metrics
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards data={data} isLoading={isLoading} />

      {/* Filters */}
      <div className="space-y-4">
        <DateRangeFilter filters={filters} onFiltersChange={setFilters} />
        <SearchFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          taskTypeFilter={taskTypeFilter}
          onTaskTypeChange={setTaskTypeFilter}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(field: SortField, order: SortOrder) => {
            setSortBy(field)
            setSortOrder(order)
          }}
        />
      </div>

      {/* Completion Trend Chart */}
      <CompletionTrendChart 
        filters={filters}
        isLoading={isLoading}
      />

      {/* Member List Table */}
      <MemberListTable
        data={data}
        isLoading={isLoading}
        searchTerm={searchTerm}
        taskTypeFilter={taskTypeFilter}
        sortBy={sortBy}
        sortOrder={sortOrder}
      />
    </div>
  )
}