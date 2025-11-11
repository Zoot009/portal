'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TrendingUp, Trophy, Medal, Award } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default function AdminLeaderboardPage() {
  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: ['admin-leaderboard'],
    queryFn: async () => {
      const res = await fetch('/api/gamification/leaderboard?period=all-time&limit=50')
      if (!res.ok) throw new Error('Failed to fetch leaderboard')
      return res.json()
    }
  })

  const leaderboard = leaderboardData?.leaderboard || []

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />
    return <span className="text-muted-foreground">#{rank}</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Leaderboard</h2>
          <p className="text-muted-foreground">
            Top performing employees ranked by points
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {leaderboard.slice(0, 3).map((entry: any, index: number) => (
          <Card key={entry.id} className={index === 0 ? 'border-yellow-500' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {index === 0 ? '🥇 1st Place' : index === 1 ? '🥈 2nd Place' : '🥉 3rd Place'}
              </CardTitle>
              {getRankIcon(index + 1)}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {entry.employee?.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{entry.employee?.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {entry.employee?.employeeCode}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge>{entry.points} pts</Badge>
                    <Badge variant="outline" className="text-amber-600">
                      {entry.coins || 0} coins
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All-Time Rankings</CardTitle>
          <CardDescription>Complete leaderboard of all employees</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Coins</TableHead>
                  <TableHead>Achievements</TableHead>
                  <TableHead>Rank Badge</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry: any, index: number) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getRankIcon(index + 1)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {entry.employee?.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{entry.employee?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {entry.employee?.employeeCode}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Level {entry.level}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{entry.points}</TableCell>
                    <TableCell className="text-amber-600 font-medium">
                      {entry.coins || 0}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {entry.achievementCount || 0} unlocked
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={
                          entry.rank === 'Legend' ? 'border-purple-600 text-purple-600' :
                          entry.rank === 'Diamond' ? 'border-blue-600 text-blue-600' :
                          entry.rank === 'Gold' ? 'border-yellow-600 text-yellow-600' :
                          entry.rank === 'Silver' ? 'border-gray-600 text-gray-600' :
                          entry.rank === 'Bronze' ? 'border-amber-600 text-amber-600' :
                          ''
                        }
                      >
                        {entry.rank}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
