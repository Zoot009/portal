'use client'

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TaskTypeFilter, SortField, SortOrder } from "../types/member-tasks"

interface SearchFilterBarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  taskTypeFilter: TaskTypeFilter
  onTaskTypeChange: (value: TaskTypeFilter) => void
  sortBy: SortField
  sortOrder: SortOrder
  onSortChange: (field: SortField, order: SortOrder) => void
}

export function SearchFilterBar({
  searchTerm,
  onSearchChange,
  taskTypeFilter,
  onTaskTypeChange,
  sortBy,
  sortOrder,
  onSortChange
}: SearchFilterBarProps) {
  
  const handleSortFieldChange = (field: string) => {
    onSortChange(field as SortField, sortOrder)
  }

  const handleSortOrderToggle = () => {
    onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      {/* Search Input */}
      <div className="relative flex-1 min-w-0">
        <Input
          placeholder="Search members by name, email, or employee ID..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pr-10"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => onSearchChange('')}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Task Type Filter */}
      <Select value={taskTypeFilter} onValueChange={(value) => onTaskTypeChange(value as TaskTypeFilter)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Task Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Tasks</SelectItem>
          <SelectItem value="service">Service Tasks Only</SelectItem>
          <SelectItem value="asking">Asking Tasks Only</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <Select value={sortBy} onValueChange={handleSortFieldChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="totalTasks">Total Tasks</SelectItem>
            <SelectItem value="name">Member Name</SelectItem>
            <SelectItem value="serviceTasks">Service Tasks</SelectItem>
            <SelectItem value="askingTasks">Asking Tasks</SelectItem>
          </SelectContent>
        </Select>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleSortOrderToggle}
          className="px-3"
        >
          {sortOrder === 'desc' ? 'High to Low' : 'Low to High'}
        </Button>
      </div>
    </div>
  )
}