'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Wrench, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function AssetMaintenancePage() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newMaintenance, setNewMaintenance] = useState({
    assetId: '',
    maintenanceType: 'ROUTINE_MAINTENANCE',
    description: '',
    maintenanceDate: new Date().toISOString().split('T')[0],
    cost: 0,
    performedBy: '',
    nextDueDate: '',
    notes: ''
  })

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['maintenance-logs'],
    queryFn: async () => {
      const response = await fetch('/api/assets/maintenance')
      if (!response.ok) throw new Error('Failed to fetch maintenance logs')
      return response.json()
    }
  })

  const { data: assetsData } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await fetch('/api/assets')
      if (!response.ok) throw new Error('Failed to fetch assets')
      return response.json()
    }
  })

  const logs = logsData?.data || []
  const assets = assetsData?.data || []

  const addMaintenanceMutation = useMutation({
    mutationFn: async (data: typeof newMaintenance) => {
      const response = await fetch('/api/assets/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add maintenance record')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Maintenance record added successfully!')
      queryClient.invalidateQueries({ queryKey: ['maintenance-logs'] })
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      setIsDialogOpen(false)
      setNewMaintenance({
        assetId: '',
        maintenanceType: 'ROUTINE_MAINTENANCE',
        description: '',
        maintenanceDate: new Date().toISOString().split('T')[0],
        cost: 0,
        performedBy: '',
        nextDueDate: '',
        notes: ''
      })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add maintenance record')
    }
  })

  const handleAdd = () => {
    if (!newMaintenance.assetId || !newMaintenance.description) {
      toast.error('Please fill in all required fields')
      return
    }
    addMaintenanceMutation.mutate(newMaintenance)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const maintenanceTypeColors: Record<string, string> = {
    'ROUTINE_MAINTENANCE': 'bg-blue-100 text-blue-800',
    'REPAIR': 'bg-red-100 text-red-800',
    'UPGRADE': 'bg-green-100 text-green-800',
    'REPLACEMENT': 'bg-purple-100 text-purple-800',
    'WARRANTY_SERVICE': 'bg-yellow-100 text-yellow-800',
    'INSPECTION': 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Asset Maintenance</h2>
          <p className="text-muted-foreground">
            Track maintenance, repairs, and service history
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Maintenance
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Maintenance Record</DialogTitle>
              <DialogDescription>
                Record a new maintenance, repair, or service activity
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Select Asset *</Label>
                  <Select
                    value={newMaintenance.assetId}
                    onValueChange={(value) => setNewMaintenance({...newMaintenance, assetId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset: any) => (
                        <SelectItem key={asset.id} value={String(asset.id)}>
                          {asset.assetName} (S/N: {asset.serialNumber || 'N/A'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Maintenance Type *</Label>
                  <Select
                    value={newMaintenance.maintenanceType}
                    onValueChange={(value) => setNewMaintenance({...newMaintenance, maintenanceType: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ROUTINE_MAINTENANCE">Routine Maintenance</SelectItem>
                      <SelectItem value="REPAIR">Repair</SelectItem>
                      <SelectItem value="UPGRADE">Upgrade</SelectItem>
                      <SelectItem value="REPLACEMENT">Replacement</SelectItem>
                      <SelectItem value="WARRANTY_SERVICE">Warranty Service</SelectItem>
                      <SelectItem value="INSPECTION">Inspection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  value={newMaintenance.description}
                  onChange={(e) => setNewMaintenance({...newMaintenance, description: e.target.value})}
                  placeholder="Describe the maintenance work performed..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Maintenance Date</Label>
                  <Input
                    type="date"
                    value={newMaintenance.maintenanceDate}
                    onChange={(e) => setNewMaintenance({...newMaintenance, maintenanceDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cost ($)</Label>
                  <Input
                    type="number"
                    value={newMaintenance.cost}
                    onChange={(e) => setNewMaintenance({...newMaintenance, cost: Number(e.target.value)})}
                    placeholder="Enter cost"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Performed By</Label>
                  <Input
                    value={newMaintenance.performedBy}
                    onChange={(e) => setNewMaintenance({...newMaintenance, performedBy: e.target.value})}
                    placeholder="Technician or service provider name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Next Due Date</Label>
                  <Input
                    type="date"
                    value={newMaintenance.nextDueDate}
                    onChange={(e) => setNewMaintenance({...newMaintenance, nextDueDate: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                  value={newMaintenance.notes}
                  onChange={(e) => setNewMaintenance({...newMaintenance, notes: e.target.value})}
                  placeholder="Any additional notes or observations..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={addMaintenanceMutation.isPending}>
                {addMaintenanceMutation.isPending ? 'Adding...' : 'Add Record'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <Wrench className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${logs.reduce((sum: number, log: any) => sum + (log.cost || 0), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repairs</CardTitle>
            <Wrench className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {logs.filter((l: any) => l.type === 'REPAIR').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upgrades</CardTitle>
            <Wrench className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {logs.filter((l: any) => l.type === 'UPGRADE').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Maintenance History</CardTitle>
          <CardDescription>
            Complete maintenance and service records for all assets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Next Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No maintenance records found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.asset.assetName}</TableCell>
                    <TableCell>
                      <Badge className={maintenanceTypeColors[log.type] || ''}>
                        {log.type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{log.description}</TableCell>
                    <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                    <TableCell>${log.cost?.toLocaleString() || '0'}</TableCell>
                    <TableCell>{log.performedBy || '-'}</TableCell>
                    <TableCell>
                      {log.nextDueDate ? new Date(log.nextDueDate).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
