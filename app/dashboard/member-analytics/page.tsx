'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SummaryCards } from "./components/summary-cards"
import { DateRangeFilter } from "./components/date-range-filter"
import { SearchFilterBar } from "./components/search-filter-bar"
import { CompletionTrendChart } from "./components/completion-trend-chart"
import { MemberListTable } from "./components/member-list-table"
import { useMemberTasks } from "./hooks/use-member-tasks"
import { FilterParams, SortField, SortOrder } from "./types/member-tasks"
import { AuditSummaryCards } from "./components/audit-summary-cards"
import { AuditDateRangeFilter } from "./components/audit-date-range-filter"
import { AuditUserTable } from "./components/audit-user-table"
import { ActivityBreakdownChart } from "./components/activity-breakdown-chart"
import { useAuditData } from "./hooks/use-audit-data"
import { AuditFilterParams } from "./types/audit"
import { Input } from "@/components/ui/input"

export default function MemberAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('pms')
  
  // PMS Tab State
  const [pmsFilters, setPmsFilters] = useState<FilterParams>({})
  const [pmsSearchTerm, setPmsSearchTerm] = useState('')
  const [taskTypeFilter, setTaskTypeFilter] = useState<'all' | 'service' | 'asking'>('all')
  const [sortBy, setSortBy] = useState<'totalTasks' | 'name' | 'serviceTasks' | 'askingTasks'>('totalTasks')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // CRM Tab State
  const [auditFilters, setAuditFilters] = useState<AuditFilterParams>({ limit: 100, offset: 0 })
  const [auditSearchTerm, setAuditSearchTerm] = useState('')

  const { data: pmsData, isLoading: pmsLoading, error: pmsError } = useMemberTasks(pmsFilters)
  const { data: auditData, isLoading: auditLoading, error: auditError } = useAuditData(auditFilters)

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Member Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track team productivity, performance metrics, and user activities
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="pms">PMS Analytics</TabsTrigger>
          <TabsTrigger value="crm">CRM Audit</TabsTrigger>
        </TabsList>

        {/* PMS Tab */}
        <TabsContent value="pms" className="space-y-6">
          {pmsError ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center max-w-md">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Load Data</h3>
                  <p className="text-red-600 text-sm mb-4">
                    {pmsError.message || 'Failed to connect to the PMS API. Please try again later.'}
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
          ) : (
            <>
              {/* Summary Cards */}
              <SummaryCards data={pmsData} isLoading={pmsLoading} />

              {/* Filters */}
              <div className="space-y-4">
                <DateRangeFilter filters={pmsFilters} onFiltersChange={setPmsFilters} />
                <SearchFilterBar
                  searchTerm={pmsSearchTerm}
                  onSearchChange={setPmsSearchTerm}
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
                filters={pmsFilters}
                isLoading={pmsLoading}
              />

              {/* Member List Table */}
              <MemberListTable
                data={pmsData}
                isLoading={pmsLoading}
                searchTerm={pmsSearchTerm}
                taskTypeFilter={taskTypeFilter}
                sortBy={sortBy}
                sortOrder={sortOrder}
              />
            </>
          )}
        </TabsContent>

        {/* CRM Tab */}
        <TabsContent value="crm" className="space-y-6">
          {auditError ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center max-w-md">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Load Data</h3>
                  <p className="text-red-600 text-sm mb-4">
                    {auditError.message || 'Failed to connect to the Audit API. Please try again later.'}
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
          ) : (
            <>
              {/* Summary Cards */}
              <AuditSummaryCards data={auditData} isLoading={auditLoading} />

              {/* Filters */}
              <div className="space-y-4">
                <AuditDateRangeFilter filters={auditFilters} onFiltersChange={setAuditFilters} />
                <div className="flex gap-4">
                  <Input
                    placeholder="Search by name or email..."
                    value={auditSearchTerm}
                    onChange={(e) => setAuditSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
              </div>

              {/* User Activity Table */}
              <AuditUserTable
                data={auditData}
                isLoading={auditLoading}
                searchTerm={auditSearchTerm}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}