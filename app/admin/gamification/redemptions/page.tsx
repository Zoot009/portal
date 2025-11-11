'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Coins, CheckCircle, XCircle, Clock, DollarSign, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function CoinRedemptionsPage() {
  const queryClient = useQueryClient()

  const { data: redemptionsData, isLoading } = useQuery({
    queryKey: ['admin-coin-redemptions'],
    queryFn: async () => {
      const res = await fetch('/api/admin/gamification/redemptions')
      if (!res.ok) throw new Error('Failed to fetch redemptions')
      return res.json()
    }
  })

  const approveRedemption = useMutation({
    mutationFn: async (redemptionId: number) => {
      const res = await fetch(`/api/admin/gamification/redemptions/${redemptionId}/approve`, {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Failed to approve redemption')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Redemption approved successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-coin-redemptions'] })
    },
    onError: () => {
      toast.error('Failed to approve redemption')
    }
  })

  const rejectRedemption = useMutation({
    mutationFn: async (redemptionId: number) => {
      const res = await fetch(`/api/admin/gamification/redemptions/${redemptionId}/reject`, {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Failed to reject redemption')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Redemption rejected')
      queryClient.invalidateQueries({ queryKey: ['admin-coin-redemptions'] })
    },
    onError: () => {
      toast.error('Failed to reject redemption')
    }
  })

  const redemptions = redemptionsData?.redemptions || []
  const pendingRedemptions = redemptions.filter((r: any) => r.status === 'pending')
  const approvedRedemptions = redemptions.filter((r: any) => r.status === 'approved')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Coin Redemptions</h2>
          <p className="text-muted-foreground">
            Approve or reject employee coin redemption requests
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRedemptions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedRedemptions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Coins Spent</CardTitle>
            <Coins className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {redemptions.reduce((sum: number, r: any) => sum + (r.reward?.coinsCost || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Value</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{redemptions.reduce((sum: number, r: any) => 
                sum + ((r.reward?.coinsCost || 0) * 10), 0
              ).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      <Card className="border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            Pending Approvals
          </CardTitle>
          <CardDescription>Coin redemption requests awaiting your approval</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRedemptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending redemptions
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead>Coins</TableHead>
                  <TableHead>Cash Value</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRedemptions.map((redemption: any) => (
                  <TableRow key={redemption.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{redemption.employee?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {redemption.employee?.employeeCode}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{redemption.reward?.icon}</span>
                        <div>
                          <div className="font-medium">{redemption.reward?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {redemption.reward?.description}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-amber-600 font-medium">
                      {redemption.reward?.coinsCost}
                    </TableCell>
                    <TableCell className="font-medium">
                      ₹{((redemption.reward?.coinsCost || 0) * 10).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {format(new Date(redemption.redeemedAt), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => approveRedemption.mutate(redemption.id)}
                          disabled={approveRedemption.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => rejectRedemption.mutate(redemption.id)}
                          disabled={rejectRedemption.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
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

      {/* Approved Redemptions */}
      <Card>
        <CardHeader>
          <CardTitle>Redemption History</CardTitle>
          <CardDescription>All coin redemptions (approved and rejected)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : redemptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No redemptions yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead>Coins</TableHead>
                  <TableHead>Cash Value</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redemptions.map((redemption: any) => (
                  <TableRow key={redemption.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{redemption.employee?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {redemption.employee?.employeeCode}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{redemption.reward?.icon}</span>
                        <span>{redemption.reward?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-amber-600 font-medium">
                      {redemption.reward?.coinsCost}
                    </TableCell>
                    <TableCell>
                      ₹{((redemption.reward?.coinsCost || 0) * 10).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {format(new Date(redemption.redeemedAt), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {redemption.status === 'pending' && (
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                      {redemption.status === 'approved' && (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      )}
                      {redemption.status === 'rejected' && (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Rejected
                        </Badge>
                      )}
                      {redemption.status === 'used' && (
                        <Badge variant="outline">Used</Badge>
                      )}
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
