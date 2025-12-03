'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { FilterParams } from "../types/member-tasks"
import { format, parseISO, eachDayOfInterval } from "date-fns"

interface CompletionTrendChartProps {
  filters: FilterParams
  isLoading: boolean
}

export function CompletionTrendChart({ filters, isLoading }: CompletionTrendChartProps) {
  // Only show trend chart if we have a date range spanning more than 1 day
  const showTrendChart = () => {
    if (filters.startDate && filters.endDate) {
      const start = parseISO(filters.startDate)
      const end = parseISO(filters.endDate)
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays > 1
    }
    return false
  }

  if (!showTrendChart()) {
    return null
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tasks Completion Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  // Generate mock trend data based on date range
  // In a real implementation, this would come from the API
  const generateTrendData = () => {
    if (!filters.startDate || !filters.endDate) return []

    const start = parseISO(filters.startDate)
    const end = parseISO(filters.endDate)
    
    const days = eachDayOfInterval({ start, end })
    
    return days.map(day => {
      // Mock data - in real implementation, this would be calculated from actual task completion data
      const baseValue = Math.floor(Math.random() * 50) + 10
      const serviceValue = Math.floor(baseValue * 0.7)
      const askingValue = baseValue - serviceValue
      
      return {
        date: format(day, 'MMM dd'),
        fullDate: format(day, 'yyyy-MM-dd'),
        totalTasks: baseValue,
        serviceTasks: serviceValue,
        askingTasks: askingValue
      }
    })
  }

  const trendData = generateTrendData()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks Completion Trend</CardTitle>
        <p className="text-sm text-muted-foreground">
          Daily task completion counts over the selected period
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(label, payload: any) => {
                const item = payload?.[0]?.payload
                return item ? format(parseISO(item.fullDate), 'EEEE, MMM dd, yyyy') : label
              }}
              formatter={(value: number, name: string) => [
                value,
                name === 'totalTasks' ? 'Total Tasks' :
                name === 'serviceTasks' ? 'Service Tasks' :
                'Asking Tasks'
              ]}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="totalTasks" 
              stroke="hsl(222.2 47.4% 11.2%)"
              strokeWidth={3}
              name="Total Tasks"
            />
            <Line 
              type="monotone" 
              dataKey="serviceTasks" 
              stroke="hsl(221.2 83.2% 53.3%)"
              strokeWidth={2}
              name="Service Tasks"
            />
            <Line 
              type="monotone" 
              dataKey="askingTasks" 
              stroke="hsl(24.6 95% 53.1%)"
              strokeWidth={2}
              name="Asking Tasks"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}