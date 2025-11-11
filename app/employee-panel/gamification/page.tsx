'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Award, Gift, TrendingUp, Star, Lock, CheckCircle, Loader2, Coins } from 'lucide-react'
import { toast } from 'sonner'

function GamificationContent() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabParam || 'overview')
  const queryClient = useQueryClient()

  // Update tab when URL changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  // Fetch employee points and stats
  const { data: pointsData, isLoading: pointsLoading } = useQuery({
    queryKey: ['employee-points'],
    queryFn: async () => {
      const res = await fetch('/api/gamification/points')
      if (!res.ok) throw new Error('Failed to fetch points')
      return res.json()
    }
  })

  // Fetch achievements
  const { data: achievementsData, isLoading: achievementsLoading } = useQuery({
    queryKey: ['employee-achievements'],
    queryFn: async () => {
      const res = await fetch('/api/gamification/achievements')
      if (!res.ok) throw new Error('Failed to fetch achievements')
      return res.json()
    }
  })

  // Fetch rewards
  const { data: rewardsData, isLoading: rewardsLoading } = useQuery({
    queryKey: ['rewards-catalog'],
    queryFn: async () => {
      const res = await fetch('/api/gamification/rewards')
      if (!res.ok) throw new Error('Failed to fetch rewards')
      return res.json()
    }
  })

  // Fetch my redeemed rewards
  const { data: myRewardsData, isLoading: myRewardsLoading } = useQuery({
    queryKey: ['my-rewards'],
    queryFn: async () => {
      const res = await fetch('/api/gamification/rewards?myRewards=true')
      if (!res.ok) throw new Error('Failed to fetch my rewards')
      return res.json()
    }
  })

  // Fetch leaderboard
  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const res = await fetch('/api/gamification/leaderboard?period=all-time&limit=10')
      if (!res.ok) throw new Error('Failed to fetch leaderboard')
      return res.json()
    }
  })

  // Redeem reward mutation
  const redeemMutation = useMutation({
    mutationFn: async (rewardId: number) => {
      const res = await fetch('/api/gamification/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId })
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to redeem reward')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Reward redeemed successfully!')
      queryClient.invalidateQueries({ queryKey: ['employee-points'] })
      queryClient.invalidateQueries({ queryKey: ['my-rewards'] })
      queryClient.invalidateQueries({ queryKey: ['rewards-catalog'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  if (pointsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const employeeStats = pointsData ? {
    points: pointsData.employeePoints.points,
    coins: pointsData.employeePoints.coins || 0,
    lifetimePoints: pointsData.employeePoints.lifetimePoints || 0,
    lifetimeCoins: pointsData.employeePoints.lifetimeCoins || 0,
    level: pointsData.employeePoints.level,
    experience: pointsData.employeePoints.experience,
    experienceToNextLevel: 100, // 100 XP per level
    rank: pointsData.employeePoints.rank,
    globalRank: pointsData.globalRank,
    totalEmployees: pointsData.totalEmployees
  } : {
    points: 0,
    coins: 0,
    lifetimePoints: 0,
    lifetimeCoins: 0,
    level: 1,
    experience: 0,
    experienceToNextLevel: 100,
    rank: 'Beginner',
    globalRank: 0,
    totalEmployees: 0
  }

  const achievements = achievementsData?.achievements || []
  const rewards = rewardsData?.rewards || []
  const myRewards = myRewardsData?.rewards || []
  const leaderboard = leaderboardData?.leaderboard || []
  const recentTransactions = pointsData?.transactions?.slice(0, 5) || []

  const experiencePercentage = (employeeStats.experience / employeeStats.experienceToNextLevel) * 100

  // Find current employee in leaderboard
  const myLeaderboardEntry = leaderboard.find((entry: any) => 
    entry.employeeId === pointsData?.employeePoints?.employeeId
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gamification</h2>
          <p className="text-muted-foreground">
            Earn points, unlock achievements, and redeem rewards
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeeStats.points.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Rank: {employeeStats.rank}
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-900">Coins</CardTitle>
            <Coins className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900">{employeeStats.coins.toLocaleString()}</div>
            <p className="text-xs text-amber-700">
              = ₹{(employeeStats.coins * 10).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Level</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Level {employeeStats.level}</div>
            <Progress value={experiencePercentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {employeeStats.experience}/{employeeStats.experienceToNextLevel} XP
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Achievements</CardTitle>
            <Award className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {achievements.filter((a: any) => a.unlocked).length}/{achievements.length}
            </div>
            <p className="text-xs text-muted-foreground">
              unlocked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Global Rank</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#{employeeStats.globalRank}</div>
            <p className="text-xs text-muted-foreground">
              out of {employeeStats.totalEmployees}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="rewards">Rewards Store</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest point transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentTransactions.map((transaction: any) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{transaction.description}</div>
                        <div className="text-xs text-muted-foreground">{new Date(transaction.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className={`font-bold ${transaction.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.points > 0 ? '+' : ''}{transaction.points} pts
                      </div>
                    </div>
                  ))}
                  {recentTransactions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No transactions yet. Start earning points!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* My Rewards */}
            <Card>
              <CardHeader>
                <CardTitle>My Redeemed Rewards</CardTitle>
                <CardDescription>Rewards you've claimed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {myRewards.map((reward: any) => (
                    <div key={reward.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{reward.rewardName}</div>
                        <div className="text-xs text-muted-foreground">{new Date(reward.redeemedAt).toLocaleDateString()}</div>
                      </div>
                      <Badge variant={reward.status === 'approved' ? 'default' : 'secondary'}>
                        {reward.status}
                      </Badge>
                    </div>
                  ))}
                  {myRewards.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No rewards redeemed yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {achievements.map((achievement: any) => (
              <Card key={achievement.id} className={achievement.unlocked ? '' : 'opacity-75'}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{achievement.icon}</div>
                      <div>
                        <CardTitle className="text-base">{achievement.name}</CardTitle>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {achievement.category}
                        </Badge>
                      </div>
                    </div>
                    {achievement.unlocked ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Lock className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{achievement.description}</p>
                  
                  {achievement.unlocked ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-green-600">Unlocked!</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(achievement.unlockedAt!).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm font-semibold">+{achievement.points} points</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{achievement.progress}%</span>
                      </div>
                      <Progress value={achievement.progress} />
                      <div className="text-xs text-muted-foreground">
                        Reward: {achievement.points} points
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Rewards Store Tab */}
        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Rewards Store</CardTitle>
                  <CardDescription>Redeem your points for rewards</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Available Points</div>
                  <div className="text-2xl font-bold">{employeeStats.points}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rewards.map((reward: any) => (
                  <Card key={reward.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{reward.name}</CardTitle>
                      <Badge variant="outline">{reward.category}</Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{reward.description}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Cost:</span>
                          <span className="text-lg font-bold">{reward.pointsCost} pts</span>
                        </div>
                        
                        {reward.stock !== null && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Stock:</span>
                            <span className="font-medium">{reward.stock} left</span>
                          </div>
                        )}
                      </div>

                      <Button 
                        className="w-full" 
                        disabled={!reward.canAfford || reward.stock === 0 || redeemMutation.isPending}
                        onClick={() => redeemMutation.mutate(reward.id)}
                      >
                        {redeemMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Gift className="h-4 w-4 mr-2" />
                        )}
                        {!reward.canAfford ? 'Not Enough Points' : reward.stock === 0 ? 'Out of Stock' : 'Redeem'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global Leaderboard</CardTitle>
              <CardDescription>All-time top performers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.map((entry: any) => {
                  const isMe = entry.employeeId === pointsData?.employeePoints?.employeeId
                  return (
                    <div
                      key={entry.rank}
                      className={`flex items-center gap-4 p-4 rounded-lg border ${
                        isMe ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white border-2 border-gray-200">
                        <span className="text-lg font-bold text-gray-700">#{entry.rank}</span>
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gray-600 text-white text-sm font-semibold">
                          {entry.employeeName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{entry.employeeName}</h3>
                          {isMe && <Badge>You</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>{entry.points.toLocaleString()} points</span>
                          <span>Level {entry.level}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {leaderboard.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No leaderboard data yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function EmployeeGamificationPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <GamificationContent />
    </Suspense>
  )
}
