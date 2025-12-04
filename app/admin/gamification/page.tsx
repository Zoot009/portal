"use client"

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { 
  Trophy, 
  Star, 
  Users, 
  TrendingUp, 
  Award, 
  Gift,
  Activity,
  BarChart3,
  Target,
  Crown,
  Zap
} from "lucide-react"
import { format } from 'date-fns'
import { RoleGuard } from "@/components/role-guard"

interface AdminGamificationData {
  overview: {
    totalEmployees: number
    activeEmployees: number
    engagementRate: number
    totalPointsDistributed: number
    totalActivities: number
  }
  topPerformers: Array<{
    rank: number
    employeeId: number
    name: string
    employeeCode: string
    department: string | null
    totalPoints: number
    attendancePoints: number
    worklogPoints: number
    achievementPoints: number
    attendanceRate: number | null
    avgWorkHours: number | null
  }>
  pointDistribution: Array<{
    type: string
    totalPoints: number
    count: number
  }>
  achievements: Array<{
    id: number
    name: string
    description: string
    pointValue: number
    category: string
    unlockedBy: number
    unlockRate: number
  }>
  recentActivities: Array<{
    id: number
    employeeName: string
    employeeCode: string
    points: number
    reason: string
    pointType: string
    earnedAt: string
  }>
  rewardRedemptions: Array<{
    id: number
    employeeName: string
    employeeCode: string
    rewardName: string
    rewardCategory: string
    pointsUsed: number
    status: string
    redeemedAt: string
  }>
}

export default function AdminGamificationPage() {
  const { data: adminData, isLoading } = useQuery<{success: boolean, data: AdminGamificationData}>({
    queryKey: ['admin-gamification'],
    queryFn: async () => {
      const res = await fetch('/api/admin/gamification')
      if (!res.ok) throw new Error('Failed to fetch admin gamification data')
      return res.json()
    },
    refetchInterval: 60000 // Refresh every minute
  })

  const data = adminData?.data

  const getPointTypeIcon = (type: string) => {
    switch (type) {
      case 'ATTENDANCE_BONUS': return <Target className="h-4 w-4" />
      case 'WORK_LOG_COMPLETION': return <Activity className="h-4 w-4" />
      case 'PUNCTUALITY_BONUS': return <Zap className="h-4 w-4" />
      case 'ACHIEVEMENT_UNLOCK': return <Award className="h-4 w-4" />
      case 'OVERTIME_BONUS': return <TrendingUp className="h-4 w-4" />
      default: return <Star className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <Badge variant="secondary">Pending</Badge>
      case 'APPROVED': return <Badge variant="default">Approved</Badge>
      case 'FULFILLED': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Fulfilled</Badge>
      case 'CANCELLED': return <Badge variant="destructive">Cancelled</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <RoleGuard allowedRoles={['ADMIN']} fallbackPath="/dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-lg font-medium">Loading gamification dashboard...</p>
          </div>
        </div>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['ADMIN']} fallbackPath="/dashboard">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Gamification Dashboard</h2>
            <p className="text-muted-foreground">
              Monitor employee engagement and reward system performance
            </p>
          </div>
          <Button>
            <Gift className="h-4 w-4 mr-2" />
            Manage Rewards
          </Button>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.overview.totalEmployees || 0}</div>
              <p className="text-xs text-muted-foreground">
                {data?.overview.activeEmployees || 0} active this cycle
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.overview.engagementRate || 0}%</div>
              <Progress value={data?.overview.engagementRate || 0} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Points Distributed</CardTitle>
              <Star className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.overview.totalPointsDistributed || 0}</div>
              <p className="text-xs text-muted-foreground">
                {data?.overview.totalActivities || 0} activities
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Achievements</CardTitle>
              <Award className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.achievements.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                available to unlock
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reward Redemptions</CardTitle>
              <Gift className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.rewardRedemptions.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                this pay cycle
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="leaderboard" className="space-y-4">
          <TabsList>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-600" />
                  Top Performers This Month
                </CardTitle>
                <CardDescription>Employees ranked by total points earned</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Total Points</TableHead>
                      <TableHead className="text-right">Attendance</TableHead>
                      <TableHead className="text-right">Work Logs</TableHead>
                      <TableHead className="text-right">Achievements</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.topPerformers.slice(0, 10).map((performer) => (
                      <TableRow key={performer.employeeId}>
                        <TableCell>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                            performer.rank === 1 ? 'bg-yellow-500' :
                            performer.rank === 2 ? 'bg-gray-400' :
                            performer.rank === 3 ? 'bg-amber-600' :
                            'bg-gray-500'
                          }`}>
                            {performer.rank <= 3 ? (
                              performer.rank === 1 ? <Crown className="h-4 w-4" /> : `#${performer.rank}`
                            ) : (
                              performer.rank
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {performer.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{performer.name}</p>
                              <p className="text-sm text-muted-foreground">{performer.employeeCode}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{performer.department || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="font-mono">
                            {performer.totalPoints}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{performer.attendancePoints}</TableCell>
                        <TableCell className="text-right">{performer.worklogPoints}</TableCell>
                        <TableCell className="text-right">{performer.achievementPoints}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Achievement Performance</CardTitle>
                <CardDescription>Track how employees are progressing on achievements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.achievements.map((achievement) => (
                    <div key={achievement.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                        <Award className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{achievement.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {achievement.category}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {achievement.pointValue} points
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{achievement.description}</p>
                        <div className="flex items-center gap-4">
                          <Progress value={achievement.unlockRate} className="flex-1" />
                          <span className="text-sm font-medium">{achievement.unlockRate.toFixed(1)}%</span>
                          <span className="text-sm text-muted-foreground">
                            {achievement.unlockedBy} employees
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Point Distribution by Type</CardTitle>
                  <CardDescription>How points are being earned across different activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data?.pointDistribution.map((dist) => (
                      <div key={dist.type} className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          {getPointTypeIcon(dist.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{dist.type.replace(/_/g, ' ')}</span>
                            <Badge variant="outline">{dist.totalPoints} pts</Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>{dist.count} activities</span>
                            <span>{Math.round((dist.totalPoints / (data.overview.totalPointsDistributed || 1)) * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Engagement Metrics</CardTitle>
                  <CardDescription>Employee participation in gamification system</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Active Participation</span>
                        <span className="text-sm text-muted-foreground">
                          {data?.overview.engagementRate}%
                        </span>
                      </div>
                      <Progress value={data?.overview.engagementRate || 0} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{data?.overview.activeEmployees}</div>
                        <p className="text-xs text-muted-foreground">Active Users</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{data?.overview.totalActivities}</div>
                        <p className="text-xs text-muted-foreground">Total Activities</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
                <CardDescription>Latest point earning activities across all employees</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.recentActivities.slice(0, 15).map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg border bg-card">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {activity.employeeName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{activity.employeeName}</p>
                        <p className="text-sm text-muted-foreground">{activity.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(activity.earnedAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          +{activity.points}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{activity.employeeCode}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="redemptions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Reward Redemptions</CardTitle>
                <CardDescription>Track employee reward redemptions and their status</CardDescription>
              </CardHeader>
              <CardContent>
                {data?.rewardRedemptions.length === 0 ? (
                  <div className="text-center py-8">
                    <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">No redemptions yet</p>
                    <p className="text-sm text-muted-foreground">
                      Employees haven't redeemed any rewards this cycle
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Reward</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Points Used</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.rewardRedemptions.map((redemption) => (
                        <TableRow key={redemption.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {redemption.employeeName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{redemption.employeeName}</p>
                                <p className="text-xs text-muted-foreground">{redemption.employeeCode}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{redemption.rewardName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{redemption.rewardCategory}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{redemption.pointsUsed}</TableCell>
                          <TableCell>{getStatusBadge(redemption.status)}</TableCell>
                          <TableCell>{format(new Date(redemption.redeemedAt), 'MMM d, yyyy')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  )
}
