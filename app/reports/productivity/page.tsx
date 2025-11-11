'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Download, Calendar } from 'lucide-react'

const mockProductivityData = [
  {
    employeeId: 1,
    employeeName: 'John Doe',
    employeeCode: 'EMP001',
    department: 'Development',
    totalHours: 160,
    productiveHours: 144,
    productivityRate: 90,
    attendanceRate: 95,
    tasksCompleted: 42,
    averageTaskTime: 3.8,
    trend: 'up'
  },
  {
    employeeId: 2,
    employeeName: 'Jane Smith',
    employeeCode: 'EMP002',
    department: 'Marketing',
    totalHours: 160,
    productiveHours: 136,
    productivityRate: 85,
    attendanceRate: 92,
    tasksCompleted: 38,
    averageTaskTime: 4.2,
    trend: 'down'
  }
]

export default function ProductivityReportsPage() {
  const [dateRange, setDateRange] = useState('this_month')
  const [departmentFilter, setDepartmentFilter] = useState('all')

  const { data: productivityData, isLoading } = useQuery({
    queryKey: ['productivity-reports', dateRange, departmentFilter],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return mockProductivityData
    }
  })

  const avgProductivity = (productivityData?.reduce((sum, d) => sum + d.productivityRate, 0) || 0) / (productivityData?.length || 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Productivity Reports</h2>
          <p className="text-muted-foreground">
            Analyze employee productivity and performance metrics
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
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
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Productivity</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{avgProductivity.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {productivityData?.reduce((sum, d) => sum + d.totalHours, 0)}h
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productive Hours</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {productivityData?.reduce((sum, d) => sum + d.productiveHours, 0)}h
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {productivityData?.reduce((sum, d) => sum + d.tasksCompleted, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Productivity Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Productivity Metrics</CardTitle>
          <CardDescription>
            Detailed productivity analysis for each employee
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Productive Hours</TableHead>
                <TableHead>Productivity Rate</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>Tasks Done</TableHead>
                <TableHead>Avg Task Time</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productivityData?.map((data) => (
                <TableRow key={data.employeeId}>
                  <TableCell className="font-medium">{data.employeeName}</TableCell>
                  <TableCell>{data.employeeCode}</TableCell>
                  <TableCell>{data.department}</TableCell>
                  <TableCell>{data.totalHours}h</TableCell>
                  <TableCell>{data.productiveHours}h</TableCell>
                  <TableCell>
                    <Badge variant={data.productivityRate >= 80 ? 'default' : 'secondary'}>
                      {data.productivityRate}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={data.attendanceRate >= 90 ? 'default' : 'secondary'}>
                      {data.attendanceRate}%
                    </Badge>
                  </TableCell>
                  <TableCell>{data.tasksCompleted}</TableCell>
                  <TableCell>{data.averageTaskTime}h</TableCell>
                  <TableCell>
                    {data.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
