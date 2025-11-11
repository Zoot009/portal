'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Calendar, 
  Download, 
  Filter,
  FileText,
  DollarSign,
  Target,
  Activity,
  PieChart,
  LineChart,
  Building,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// Mock data for charts and reports
const attendanceData = {
  weeklyAttendance: [
    { day: 'Mon', present: 85, absent: 15, late: 8 },
    { day: 'Tue', present: 88, absent: 12, late: 5 },
    { day: 'Wed', present: 82, absent: 18, late: 12 },
    { day: 'Thu', present: 90, absent: 10, late: 6 },
    { day: 'Fri', present: 87, absent: 13, late: 9 },
  ],
  monthlyTrends: [
    { month: 'Jan', attendance: 88.5, productivity: 92.1 },
    { month: 'Feb', attendance: 91.2, productivity: 89.7 },
    { month: 'Mar', attendance: 87.8, productivity: 91.5 },
    { month: 'Apr', attendance: 89.4, productivity: 88.9 },
  ],
};

const employeeMetrics = {
  totalEmployees: 128,
  activeEmployees: 122,
  newHires: 8,
  turnover: 2.3,
  departmentBreakdown: [
    { department: 'Engineering', count: 45, percentage: 35 },
    { department: 'Sales', count: 28, percentage: 22 },
    { department: 'Marketing', count: 18, percentage: 14 },
    { department: 'HR', count: 12, percentage: 9 },
    { department: 'Finance', count: 15, percentage: 12 },
    { department: 'Operations', count: 10, percentage: 8 },
  ],
};

const leaveAnalytics = {
  totalLeaveRequests: 156,
  approvedRequests: 142,
  pendingRequests: 8,
  rejectedRequests: 6,
  leaveTypes: [
    { type: 'Annual Leave', count: 68, percentage: 44 },
    { type: 'Sick Leave', count: 42, percentage: 27 },
    { type: 'Work From Home', count: 31, percentage: 20 },
    { type: 'Emergency Leave', count: 15, percentage: 9 },
  ],
};

const assetMetrics = {
  totalAssets: 245,
  assignedAssets: 189,
  availableAssets: 41,
  maintenanceAssets: 15,
  totalValue: 185420,
  assetCategories: [
    { category: 'Laptops', count: 89, value: 142300 },
    { category: 'Monitors', count: 95, value: 28500 },
    { category: 'Mobile Devices', count: 45, value: 13500 },
    { category: 'Printers', count: 16, value: 1120 },
  ],
};

export default function ReportsPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState('THIS_MONTH');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');

  const reportCards = [
    {
      title: 'Attendance Report',
      description: 'Daily and weekly attendance patterns',
      icon: UserCheck,
      color: 'from-blue-500 to-blue-600',
      value: '89.4%',
      change: '+2.1%',
      href: '/reports/attendance',
    },
    {
      title: 'Employee Analytics',
      description: 'Workforce composition and metrics',
      icon: Users,
      color: 'from-green-500 to-green-600',
      value: '128',
      change: '+8',
      href: '/reports/employees',
    },
    {
      title: 'Leave Analysis',
      description: 'Leave patterns and utilization',
      icon: Calendar,
      color: 'from-purple-500 to-purple-600',
      value: '156',
      change: '+12%',
      href: '/reports/leave',
    },
    {
      title: 'Asset Utilization',
      description: 'Asset allocation and maintenance',
      icon: Building,
      color: 'from-orange-500 to-orange-600',
      value: '$185.4K',
      change: '+5.2%',
      href: '/reports/assets',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into workforce and organizational metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="THIS_WEEK">This Week</SelectItem>
              <SelectItem value="THIS_MONTH">This Month</SelectItem>
              <SelectItem value="THIS_QUARTER">This Quarter</SelectItem>
              <SelectItem value="THIS_YEAR">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {reportCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <Card key={card.title} className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(card.href)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                  <CardDescription className="text-xs">{card.description}</CardDescription>
                </div>
                <div className={`p-2 rounded-lg bg-gradient-to-r ${card.color}`}>
                  <IconComponent className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold">{card.value}</div>
                  <Badge variant={card.change.startsWith('+') ? 'default' : 'destructive'} className="text-xs">
                    {card.change}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Key Metrics Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Key Performance Indicators
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Overall Attendance</span>
                    <span className="text-sm text-muted-foreground">89.4%</span>
                  </div>
                  <Progress value={89.4} className="h-2" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Employee Satisfaction</span>
                    <span className="text-sm text-muted-foreground">92.1%</span>
                  </div>
                  <Progress value={92.1} className="h-2" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Asset Utilization</span>
                    <span className="text-sm text-muted-foreground">77.1%</span>
                  </div>
                  <Progress value={77.1} className="h-2" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Leave Utilization</span>
                    <span className="text-sm text-muted-foreground">68.3%</span>
                  </div>
                  <Progress value={68.3} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Quick Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Monthly Attendance Summary
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Employee Performance Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Leave Trend Analysis
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Asset Cost Analysis
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Compliance Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Weekly Attendance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {attendanceData.weeklyAttendance.map((day) => (
                    <div key={day.day} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{day.day}</span>
                        <span className="text-muted-foreground">
                          {day.present}% Present • {day.late} Late
                        </span>
                      </div>
                      <div className="flex space-x-1">
                        <div className="flex-1 bg-green-200 h-2 rounded">
                          <div 
                            className="bg-green-500 h-2 rounded" 
                            style={{ width: `${day.present}%` }}
                          />
                        </div>
                        <div 
                          className="bg-red-500 h-2 rounded" 
                          style={{ width: `${day.absent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Attendance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {attendanceData.monthlyTrends.map((month) => (
                    <div key={month.month} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <div className="font-medium">{month.month}</div>
                        <div className="text-sm text-muted-foreground">
                          Attendance: {month.attendance}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{month.productivity}%</div>
                        <div className="text-xs text-muted-foreground">Productivity</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Employee Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-blue-600">{employeeMetrics.totalEmployees}</div>
                    <div className="text-sm text-muted-foreground">Total Employees</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-green-600">{employeeMetrics.activeEmployees}</div>
                    <div className="text-sm text-muted-foreground">Active</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-purple-600">+{employeeMetrics.newHires}</div>
                    <div className="text-sm text-muted-foreground">New Hires</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-orange-600">{employeeMetrics.turnover}%</div>
                    <div className="text-sm text-muted-foreground">Turnover</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Department Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {employeeMetrics.departmentBreakdown.map((dept) => (
                    <div key={dept.department} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{dept.department}</span>
                        <span className="text-muted-foreground">
                          {dept.count} ({dept.percentage}%)
                        </span>
                      </div>
                      <Progress value={dept.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leave" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Leave Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold">{leaveAnalytics.totalLeaveRequests}</div>
                    <div className="text-sm text-muted-foreground">Total Requests</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-green-600">{leaveAnalytics.approvedRequests}</div>
                    <div className="text-sm text-muted-foreground">Approved</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-yellow-600">{leaveAnalytics.pendingRequests}</div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-red-600">{leaveAnalytics.rejectedRequests}</div>
                    <div className="text-sm text-muted-foreground">Rejected</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Leave Type Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaveAnalytics.leaveTypes.map((type) => (
                    <div key={type.type} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{type.type}</span>
                        <span className="text-muted-foreground">
                          {type.count} ({type.percentage}%)
                        </span>
                      </div>
                      <Progress value={type.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Asset Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold">{assetMetrics.totalAssets}</div>
                    <div className="text-sm text-muted-foreground">Total Assets</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-blue-600">{assetMetrics.assignedAssets}</div>
                    <div className="text-sm text-muted-foreground">Assigned</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-green-600">{assetMetrics.availableAssets}</div>
                    <div className="text-sm text-muted-foreground">Available</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-orange-600">{assetMetrics.maintenanceAssets}</div>
                    <div className="text-sm text-muted-foreground">Maintenance</div>
                  </div>
                </div>
                <Separator />
                <div className="text-center p-4 border rounded">
                  <div className="text-3xl font-bold text-purple-600">
                    ${assetMetrics.totalValue.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Asset Value</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Asset Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assetMetrics.assetCategories.map((category) => (
                    <div key={category.category} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <div className="font-medium">{category.category}</div>
                        <div className="text-sm text-muted-foreground">
                          {category.count} items
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${category.value.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Total Value</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}