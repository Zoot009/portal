'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Gift, Plus, Edit, Trash2, Package, Coins } from 'lucide-react'

export default function AdminRewardsPage() {
  const { data: rewardsData, isLoading } = useQuery({
    queryKey: ['admin-rewards'],
    queryFn: async () => {
      const res = await fetch('/api/gamification/rewards?includeStats=true')
      if (!res.ok) throw new Error('Failed to fetch rewards')
      return res.json()
    }
  })

  const rewards = rewardsData?.rewards || []
  const pointRewards = rewards.filter((r: any) => r.rewardType === 'points')
  const coinRewards = rewards.filter((r: any) => r.rewardType === 'coins' || r.rewardType === 'both')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reward Management</h2>
          <p className="text-muted-foreground">
            Manage rewards catalog and redemption settings
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Reward
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rewards</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rewards.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Point-Based</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pointRewards.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coin-Based</CardTitle>
            <Coins className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coinRewards.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Redemptions</CardTitle>
            <Gift className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rewards.reduce((sum: number, r: any) => sum + (r._count?.employeeRewards || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Point-Based Rewards</CardTitle>
          <CardDescription>Traditional rewards redeemable with points</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reward</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Point Cost</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Redemptions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pointRewards.map((reward: any) => (
                  <TableRow key={reward.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{reward.icon}</span>
                        <div>
                          <div className="font-medium">{reward.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {reward.description}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{reward.category}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{reward.pointsCost}</TableCell>
                    <TableCell>
                      {reward.stock === null ? (
                        <Badge variant="secondary">Unlimited</Badge>
                      ) : (
                        <span>{reward.stock}</span>
                      )}
                    </TableCell>
                    <TableCell>{reward._count?.employeeRewards || 0}</TableCell>
                    <TableCell>
                      {reward.isActive ? (
                        <Badge variant="default" className="bg-green-600">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-600" />
            Coin-Based Rewards
          </CardTitle>
          <CardDescription>Special rewards redeemable with coins (real value)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reward</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Coin Cost</TableHead>
                <TableHead>Cash Value</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Redemptions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coinRewards.map((reward: any) => (
                <TableRow key={reward.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{reward.icon}</span>
                      <div>
                        <div className="font-medium">{reward.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {reward.description}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-amber-600 text-amber-600">
                      {reward.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-amber-600">
                    {reward.coinsCost}
                  </TableCell>
                  <TableCell>
                    {reward.cashValue ? `₹${reward.cashValue.toLocaleString()}` : '-'}
                  </TableCell>
                  <TableCell>
                    {reward.stock === null ? (
                      <Badge variant="secondary">Unlimited</Badge>
                    ) : (
                      <span>{reward.stock}</span>
                    )}
                  </TableCell>
                  <TableCell>{reward._count?.employeeRewards || 0}</TableCell>
                  <TableCell>
                    {reward.isActive ? (
                      <Badge variant="default" className="bg-green-600">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
