"use client"

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Trophy, Star, Gift, TrendingUp, Award, Zap, Target, Clock, Calendar } from "lucide-react"
import { format } from 'date-fns'
import { RoleGuard } from "@/components/role-guard"

interface GamificationData {
  points: {
    total: number
    currentCycle: number
  }
  achievements: {
    total: number
    unlocked: number
    progress: number
    recent: Array<{
      id: number
      name: string
      description: string
      badgeIcon: string | null
      badgeColor: string | null
      pointValue: number
      unlockedAt: string
      isCompleted: boolean
    }>
  }
  leaderboard: {
    currentRank: number | null
    totalPoints: number
    attendanceRank: number | null
    worklogRank: number | null
    topEmployees: Array<{
      rank: number
      name: string
      employeeCode: string
      points: number
      isMe: boolean
    }>
  }
  recentActivities: Array<{
    id: number
    points: number
    reason: string
    pointType: string
    earnedAt: string
  }>
  availableRewards: Array<{
    id: number
    name: string
    description: string
    cost: number
    category: string
    imageUrl: string | null
    canAfford: boolean
  }>
}

export default function EmployeeGamificationPage() {
  const [selectedTab, setSelectedTab] = useState("overview")

  const { data: gamificationData, isLoading } = useQuery<{success: boolean, data: GamificationData}>({
    queryKey: ['employee-gamification'],
    queryFn: async () => {
      const res = await fetch('/api/employee/gamification')
      if (!res.ok) throw new Error('Failed to fetch gamification data')
      return res.json()
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  const data = gamificationData?.data

  const getPointTypeIcon = (type: string) => {
    switch (type) {
      case 'ATTENDANCE_BONUS': return <Calendar className="h-4 w-4" />
      case 'WORK_LOG_COMPLETION': return <Target className="h-4 w-4" />
      case 'PUNCTUALITY_BONUS': return <Clock className="h-4 w-4" />
      case 'ACHIEVEMENT_UNLOCK': return <Award className="h-4 w-4" />
      case 'OVERTIME_BONUS': return <Zap className="h-4 w-4" />
      default: return <Star className="h-4 w-4" />
    }
  }

  const getPointTypeColor = (type: string) => {
    switch (type) {
      case 'ATTENDANCE_BONUS': return 'bg-green-100 text-green-800'
      case 'WORK_LOG_COMPLETION': return 'bg-blue-100 text-blue-800'
      case 'PUNCTUALITY_BONUS': return 'bg-purple-100 text-purple-800'
      case 'ACHIEVEMENT_UNLOCK': return 'bg-yellow-100 text-yellow-800'
      case 'OVERTIME_BONUS': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <RoleGuard allowedRoles={['EMPLOYEE', 'ADMIN', 'TEAMLEADER']} fallbackPath="/dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-lg font-medium">Loading your rewards...</p>
          </div>
        </div>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['EMPLOYEE', 'ADMIN', 'TEAMLEADER']} fallbackPath="/dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Rewards Dashboard</h2>
          <p className="text-muted-foreground">
            Track your achievements, earn points, and redeem rewards
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Points</CardTitle>
              <Star className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{data?.points.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                +{data?.points.currentCycle || 0} this pay cycle
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Achievements</CardTitle>
              <Award className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.achievements.unlocked || 0}/{data?.achievements.total || 0}</div>
              <Progress 
                value={data?.achievements.progress || 0} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leaderboard Rank</CardTitle>
              <Trophy className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data?.leaderboard.currentRank ? `#${data.leaderboard.currentRank}` : 'Unranked'}
              </div>
              <p className="text-xs text-muted-foreground">
                {data?.leaderboard.totalPoints || 0} points this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Rewards</CardTitle>
              <Gift className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.availableRewards.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                rewards you can claim
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            <TabsTrigger value="activities">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Recent Achievements */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Achievements</CardTitle>
                  <CardDescription>Your latest unlocked achievements</CardDescription>
                </CardHeader>
                <CardContent>
                  {data?.achievements.recent.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No achievements unlocked yet. Keep working to earn your first badge!
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {data?.achievements.recent.slice(0, 3).map((achievement) => (
                        <div key={achievement.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg"
                            style={{ backgroundColor: achievement.badgeColor || '#3B82F6' }}
                          >
                            {achievement.badgeIcon || '🏆'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{achievement.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{achievement.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                +{achievement.pointValue} points
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(achievement.unlockedAt), 'MMM d')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activities */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activities</CardTitle>
                  <CardDescription>Your latest point earning activities</CardDescription>
                </CardHeader>
                <CardContent>
                  {data?.recentActivities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No recent activities. Start attending and logging work to earn points!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {data?.recentActivities.slice(0, 5).map((activity) => (
                        <div key={activity.id} className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getPointTypeColor(activity.pointType)}`}>
                            {getPointTypeIcon(activity.pointType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{activity.reason}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(activity.earnedAt), 'MMM d, h:mm a')}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            +{activity.points}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Achievements</CardTitle>
                <CardDescription>Track your progress on all available achievements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {data?.achievements.recent.map((achievement) => (
                    <div key={achievement.id} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-3 mb-3">
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl"
                          style={{ backgroundColor: achievement.badgeColor || '#3B82F6' }}
                        >
                          {achievement.badgeIcon || '🏆'}
                        </div>
                        <div>
                          <h3 className="font-semibold">{achievement.name}</h3>
                          <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        </div>
                      </div>
                      {achievement.isCompleted ? (
                        <Badge className="w-full justify-center bg-green-600">
                          <Award className="h-3 w-3 mr-1" />
                          Unlocked!
                        </Badge>
                      ) : (
                        <div>
                          <Progress value={75} className="mb-2" />
                          <p className="text-xs text-center text-muted-foreground">75% complete</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Leaderboard</CardTitle>
                <CardDescription>See how you rank against your colleagues this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.leaderboard.topEmployees.map((employee) => (
                    <div 
                      key={employee.employeeCode} 
                      className={`flex items-center gap-4 p-3 rounded-lg border ${employee.isMe ? 'bg-blue-50 border-blue-200' : 'bg-card'}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        employee.rank === 1 ? 'bg-yellow-500' :
                        employee.rank === 2 ? 'bg-gray-400' :
                        employee.rank === 3 ? 'bg-amber-600' :
                        'bg-gray-500'
                      }`}>
                        #{employee.rank}
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {employee.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className={`font-medium ${employee.isMe ? 'text-blue-700' : ''}`}>
                          {employee.name} {employee.isMe ? '(You)' : ''}
                        </p>
                        <p className="text-sm text-muted-foreground">{employee.employeeCode}</p>
                      </div>
                      <Badge variant="outline" className="font-mono">
                        {employee.points} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Available Rewards</CardTitle>
                <CardDescription>Redeem your points for these exciting rewards</CardDescription>
              </CardHeader>
              <CardContent>
                {data?.availableRewards.length === 0 ? (
                  <div className="text-center py-8">
                    <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">No rewards available</p>
                    <p className="text-sm text-muted-foreground">
                      Keep earning points to unlock rewards!
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {data?.availableRewards.map((reward) => (
                      <div key={reward.id} className="p-4 rounded-lg border bg-card">
                        <div className="aspect-square bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg mb-3 flex items-center justify-center">
                          <Gift className="h-8 w-8 text-blue-600" />
                        </div>
                        <h3 className="font-semibold mb-1">{reward.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{reward.description}</p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="font-mono">
                            {reward.cost} points
                          </Badge>
                          <Button 
                            size="sm" 
                            disabled={!reward.canAfford}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {reward.canAfford ? 'Redeem' : 'Need more points'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Activity History</CardTitle>
                <CardDescription>Complete history of your point earning activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg border bg-card">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getPointTypeColor(activity.pointType)}`}>
                        {getPointTypeIcon(activity.pointType)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.reason}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(activity.earnedAt), 'MMMM d, yyyy \'at\' h:mm a')}
                        </p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={activity.points > 0 ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600'}
                      >
                        {activity.points > 0 ? '+' : ''}{activity.points}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  )
}
