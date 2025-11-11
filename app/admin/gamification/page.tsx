'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Award, Gift, TrendingUp, Users, Plus, Edit, Trash2, Eye, Coins, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminGamificationPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabParam || 'overview')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Update tab when URL changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  // Mock data - will be replaced with API calls
  const achievements = [
    {
      id: 1,
      name: 'Perfect Attendance',
      description: 'Complete 30 days without absence',
      category: 'attendance',
      points: 100,
      icon: '📅',
      isActive: true,
      unlocked: 15
    },
    {
      id: 2,
      name: 'Top Performer',
      description: 'Rank in top 3 for productivity',
      category: 'performance',
      points: 200,
      icon: '⭐',
      isActive: true,
      unlocked: 8
    },
    {
      id: 3,
      name: 'Team Player',
      description: 'Help 10 colleagues',
      category: 'social',
      points: 50,
      icon: '🤝',
      isActive: true,
      unlocked: 22
    }
  ]

  const rewards = [
    {
      id: 1,
      name: 'Extra Day Off',
      description: 'Get one additional day off',
      category: 'benefits',
      pointsCost: 500,
      stock: 10,
      isActive: true,
      redeemed: 3
    },
    {
      id: 2,
      name: 'Coffee Voucher',
      description: '$10 Starbucks gift card',
      category: 'items',
      pointsCost: 100,
      stock: null,
      isActive: true,
      redeemed: 25
    },
    {
      id: 3,
      name: 'Parking Spot',
      description: 'Reserved parking for 1 week',
      category: 'privileges',
      pointsCost: 150,
      stock: 5,
      isActive: true,
      redeemed: 12
    }
  ]

  const leaderboard = [
    { rank: 1, employeeName: 'John Doe', employeeCode: 'EMP001', points: 1250, level: 5 },
    { rank: 2, employeeName: 'Jane Smith', employeeCode: 'EMP002', points: 1100, level: 4 },
    { rank: 3, employeeName: 'Mike Johnson', employeeCode: 'EMP003', points: 980, level: 4 },
    { rank: 4, employeeName: 'Sarah Williams', employeeCode: 'EMP004', points: 850, level: 3 },
    { rank: 5, employeeName: 'Tom Brown', employeeCode: 'EMP005', points: 720, level: 3 }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gamification Management</h2>
          <p className="text-muted-foreground">
            Manage achievements, rewards, and employee engagement
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Achievements</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{achievements.length}</div>
            <p className="text-xs text-muted-foreground">
              {achievements.filter(a => a.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rewards</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rewards.length}</div>
            <p className="text-xs text-muted-foreground">
              {rewards.filter(r => r.isActive).length} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Players</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">
              employees participating
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points Distributed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,450</div>
            <p className="text-xs text-muted-foreground">
              total points earned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Achievements</CardTitle>
                  <CardDescription>Manage achievements and badges</CardDescription>
                </div>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Achievement
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Achievement</DialogTitle>
                      <DialogDescription>Add a new achievement for employees to unlock</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="name">Name</Label>
                          <Input id="name" placeholder="Perfect Attendance" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="icon">Icon</Label>
                          <Input id="icon" placeholder="📅" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" placeholder="Complete 30 days without absence" />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="category">Category</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="attendance">Attendance</SelectItem>
                              <SelectItem value="performance">Performance</SelectItem>
                              <SelectItem value="milestones">Milestones</SelectItem>
                              <SelectItem value="social">Social</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="points">Points Reward</Label>
                          <Input id="points" type="number" placeholder="100" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="criteria">Criteria (JSON)</Label>
                        <Textarea 
                          id="criteria" 
                          placeholder='{"type": "attendance", "days": 30, "consecutive": true}'
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={() => {
                        toast.success('Achievement created successfully')
                        setCreateDialogOpen(false)
                      }}>
                        Create Achievement
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Icon</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Unlocked By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {achievements.map((achievement) => (
                    <TableRow key={achievement.id}>
                      <TableCell>
                        <span className="text-2xl">{achievement.icon}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{achievement.name}</div>
                          <div className="text-sm text-muted-foreground">{achievement.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{achievement.category}</Badge>
                      </TableCell>
                      <TableCell>{achievement.points} pts</TableCell>
                      <TableCell>{achievement.unlocked} employees</TableCell>
                      <TableCell>
                        <Badge variant={achievement.isActive ? 'default' : 'secondary'}>
                          {achievement.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
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
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Rewards Store</CardTitle>
                  <CardDescription>Manage redeemable rewards</CardDescription>
                </div>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Reward
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Redeemed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rewards.map((reward) => (
                    <TableRow key={reward.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{reward.name}</div>
                          <div className="text-sm text-muted-foreground">{reward.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{reward.category}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{reward.pointsCost} pts</TableCell>
                      <TableCell>
                        {reward.stock === null ? (
                          <Badge variant="secondary">Unlimited</Badge>
                        ) : (
                          <span>{reward.stock} left</span>
                        )}
                      </TableCell>
                      <TableCell>{reward.redeemed}x</TableCell>
                      <TableCell>
                        <Badge variant={reward.isActive ? 'default' : 'secondary'}>
                          {reward.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
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
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global Leaderboard</CardTitle>
              <CardDescription>All-time top performers</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Employee Code</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry) => (
                    <TableRow key={entry.rank}>
                      <TableCell>
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                          <span className="font-bold">#{entry.rank}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{entry.employeeName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {entry.employeeCode}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{entry.points.toLocaleString()} pts</TableCell>
                      <TableCell>
                        <Badge>Level {entry.level}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gamification Settings</CardTitle>
              <CardDescription>Configure points and leveling system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Points per Attendance Day</Label>
                  <Input type="number" defaultValue="10" />
                  <p className="text-sm text-muted-foreground">Points earned for each day of attendance</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Points per Productivity Milestone</Label>
                  <Input type="number" defaultValue="50" />
                  <p className="text-sm text-muted-foreground">Points for reaching productivity targets</p>
                </div>

                <div className="space-y-2">
                  <Label>Experience per Level</Label>
                  <Input type="number" defaultValue="100" />
                  <p className="text-sm text-muted-foreground">Experience points required per level</p>
                </div>

                <div className="space-y-2">
                  <Label>Enable Gamification</Label>
                  <Select defaultValue="enabled">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Enabled</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">Enable or disable the gamification system</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => toast.success('Settings saved successfully')}>
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
