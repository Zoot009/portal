'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { MemberTasksResponse } from "../types/member-tasks"

interface TaskDistributionChartProps {
  data?: MemberTasksResponse
  isLoading: boolean
}

const COLORS = {
  serviceTasks: 'hsl(221.2 83.2% 53.3%)', // Blue
  askingTasks: 'hsl(24.6 95% 53.1%)',     // Orange
}

export function TaskDistributionChart({ data, isLoading }: TaskDistributionChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data?.summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const { totalServiceTasks, totalAskingTasks, totalTasks } = data.summary

  if (totalTasks === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No tasks completed
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = [
    {
      name: 'Service Tasks',
      value: totalServiceTasks,
      percentage: Math.round((totalServiceTasks / totalTasks) * 100),
      color: COLORS.serviceTasks
    },
    {
      name: 'Asking Tasks',
      value: totalAskingTasks,
      percentage: Math.round((totalAskingTasks / totalTasks) * 100),
      color: COLORS.askingTasks
    }
  ]

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="14"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value} tasks`,
                  name
                ]}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-md">
                        <p className="font-medium" style={{ color: data.color }}>
                          {data.name}
                        </p>
                        <div className="space-y-1 text-sm">
                          <p>Count: {data.value.toLocaleString()}</p>
                          <p>Percentage: {data.percentage}%</p>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value: any, entry: any) => {
                  const data = chartData.find(d => d.name === value)
                  return (
                    <span style={{ color: entry.color }}>
                      {value}: {data?.value} ({data?.percentage}%)
                    </span>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center text showing total */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-2xl font-bold">{totalTasks}</div>
              <div className="text-sm text-muted-foreground">Total Tasks</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}