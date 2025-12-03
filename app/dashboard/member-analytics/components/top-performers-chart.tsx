'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { MemberTasksResponse, TaskTypeFilter } from "../types/member-tasks"

interface TopPerformersChartProps {
  data?: MemberTasksResponse
  isLoading: boolean
  searchTerm: string
  taskTypeFilter: TaskTypeFilter
}

export function TopPerformersChart({ data, isLoading, searchTerm, taskTypeFilter }: TopPerformersChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Members by Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Members by Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Filter and sort members
  const filteredData = data.data.filter(member => {
    const searchMatch = searchTerm === '' || 
      member.member.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.member.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
    
    return searchMatch
  })

  // Prepare chart data based on task type filter
  const chartData = filteredData
    .slice(0, 10) // Top 10
    .map(member => ({
      name: member.member.displayName,
      totalTasks: member.totalTasks,
      serviceTasks: member.serviceTasks.length,
      askingTasks: member.askingTasks.length,
      displayValue: taskTypeFilter === 'service' ? member.serviceTasks.length :
                   taskTypeFilter === 'asking' ? member.askingTasks.length :
                   member.totalTasks
    }))
    .sort((a, b) => b.displayValue - a.displayValue)

  const getBarColor = (index: number) => {
    // Gradient from low to high performance
    const colors = [
      'hsl(221.2 83.2% 53.3%)', // Blue
      'hsl(221.2 83.2% 48.3%)',
      'hsl(221.2 83.2% 43.3%)',
      'hsl(221.2 83.2% 38.3%)',
      'hsl(221.2 83.2% 33.3%)',
      'hsl(221.2 83.2% 28.3%)',
      'hsl(221.2 83.2% 23.3%)',
      'hsl(221.2 83.2% 18.3%)',
      'hsl(221.2 83.2% 13.3%)',
      'hsl(221.2 83.2% 8.3%)'
    ]
    return colors[index] || colors[0]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 10 Members by Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            layout="horizontal"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={80}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: any) => [
                value,
                taskTypeFilter === 'service' ? 'Service Tasks' :
                taskTypeFilter === 'asking' ? 'Asking Tasks' :
                'Total Tasks'
              ]}
              labelFormatter={(label: any) => `${label}`}
              content={({ active, payload, label }: any) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="bg-background border rounded-lg p-2 shadow-md">
                      <p className="font-medium">{label}</p>
                      <div className="space-y-1 text-sm">
                        <p className="text-blue-600">Service Tasks: {data.serviceTasks}</p>
                        <p className="text-orange-600">Asking Tasks: {data.askingTasks}</p>
                        <p className="font-medium">Total Tasks: {data.totalTasks}</p>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar 
              dataKey="displayValue" 
              fill="hsl(221.2 83.2% 53.3%)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}