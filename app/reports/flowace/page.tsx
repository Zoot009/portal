'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Download, Activity, Clock } from 'lucide-react'

const mockFlowaceData = [
  {
    id: '1',
    employeeCode: 'EMP001',
    employeeName: 'John Doe',
    date: '2024-10-14',
    loggedHours: 8.5,
    activeHours: 7.8,
    productiveHours: 6.9,
    productivityPercentage: 88,
    activityPercentage: 92,
    workStartTime: '09:00',
    workEndTime: '18:30'
  },
  {
    id: '2',
    employeeCode: 'EMP002',
    employeeName: 'Jane Smith',
    date: '2024-10-14',
    loggedHours: 8.0,
    activeHours: 7.2,
    productiveHours: 6.1,
    productivityPercentage: 85,
    activityPercentage: 90,
    workStartTime: '08:45',
    workEndTime: '17:45'
  }
]

export default function FlowaceIntegrationPage() {
  const [dateFilter, setDateFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const { data: flowaceData, isLoading } = useQuery({
    queryKey: ['flowace-data', dateFilter],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return mockFlowaceData
    }
  })

  const filteredData = flowaceData?.filter(record =>
    record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const avgProductivity = filteredData.reduce((sum, d) => sum + d.productivityPercentage, 0) / (filteredData.length || 1)
  const totalLoggedHours = filteredData.reduce((sum, d) => sum + d.loggedHours, 0)
  const avgActivityPercentage = filteredData.reduce((sum, d) => sum + d.activityPercentage, 0) / (filteredData.length || 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Flowace Integration</h2>
          <p className="text-muted-foreground">
            View Flowace productivity and activity tracking data
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Employee</label>
              <Input
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Productivity</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{avgProductivity.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logged Hours</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalLoggedHours.toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Activity</CardTitle>
            <Activity className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{avgActivityPercentage.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Records</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredData.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Flowace Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Flowace Tracking Data</CardTitle>
          <CardDescription>
            Real-time productivity and activity metrics from Flowace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Logged Hours</TableHead>
                <TableHead>Active Hours</TableHead>
                <TableHead>Productive Hours</TableHead>
                <TableHead>Productivity %</TableHead>
                <TableHead>Activity %</TableHead>
                <TableHead>Work Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.employeeName}</TableCell>
                  <TableCell>{record.employeeCode}</TableCell>
                  <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                  <TableCell>{record.loggedHours.toFixed(1)}h</TableCell>
                  <TableCell>{record.activeHours.toFixed(1)}h</TableCell>
                  <TableCell>{record.productiveHours.toFixed(1)}h</TableCell>
                  <TableCell>
                    <Badge
                      variant={record.productivityPercentage >= 80 ? 'default' : 'secondary'}
                      className={record.productivityPercentage >= 80 ? 'bg-green-100 text-green-800' : ''}
                    >
                      {record.productivityPercentage}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={record.activityPercentage >= 80 ? 'default' : 'secondary'}
                      className={record.activityPercentage >= 80 ? 'bg-blue-100 text-blue-800' : ''}
                    >
                      {record.activityPercentage}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {record.workStartTime} - {record.workEndTime}
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
