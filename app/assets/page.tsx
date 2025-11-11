'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Laptop, 
  Monitor, 
  Smartphone, 
  Printer, 
  HardDrive, 
  Search, 
  Filter, 
  Plus, 
  Package, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Calendar,
  User,
  MoreHorizontal,
  Settings,
  Loader2
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const ASSET_TYPES = [
  { value: 'LAPTOP', label: 'Laptop', icon: Laptop, color: 'bg-blue-100 text-blue-800' },
  { value: 'DESKTOP', label: 'Desktop', icon: Monitor, color: 'bg-green-100 text-green-800' },
  { value: 'MOBILE', label: 'Mobile', icon: Smartphone, color: 'bg-purple-100 text-purple-800' },
  { value: 'PRINTER', label: 'Printer', icon: Printer, color: 'bg-orange-100 text-orange-800' },
  { value: 'STORAGE', label: 'Storage', icon: HardDrive, color: 'bg-gray-100 text-gray-800' },
  { value: 'OTHER', label: 'Other', icon: Package, color: 'bg-pink-100 text-pink-800' },
];

const ASSET_STATUSES = [
  { value: 'AVAILABLE', label: 'Available', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  { value: 'ASSIGNED', label: 'Assigned', color: 'bg-blue-100 text-blue-800', icon: User },
  { value: 'MAINTENANCE', label: 'Maintenance', color: 'bg-yellow-100 text-yellow-800', icon: Settings },
  { value: 'RETIRED', label: 'Retired', color: 'bg-red-100 text-red-800', icon: XCircle },
  { value: 'DAMAGED', label: 'Damaged', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
];

const CONDITIONS = [
  { value: 'NEW', label: 'New', color: 'bg-green-100 text-green-800' },
  { value: 'GOOD', label: 'Good', color: 'bg-blue-100 text-blue-800' },
  { value: 'FAIR', label: 'Fair', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'POOR', label: 'Poor', color: 'bg-red-100 text-red-800' },
];

export default function AssetsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Fetch assets from API
  const { data: assetsData, isLoading } = useQuery({
    queryKey: ['assets', searchTerm, statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (typeFilter !== 'ALL') params.append('assetType', typeFilter)
      
      const response = await fetch(`/api/assets?${params}`)
      if (!response.ok) throw new Error('Failed to fetch assets')
      return response.json()
    },
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  })

  const assets = assetsData?.data || []

  const totalAssets = assets.length
  const availableAssets = assets.filter((a: any) => a.status === 'AVAILABLE').length
  const assignedAssets = assets.filter((a: any) => a.status === 'ASSIGNED').length
  const maintenanceAssets = assets.filter((a: any) => a.status === 'MAINTENANCE').length
  const totalValue = assets.reduce((sum: number, asset: any) => sum + (asset.purchasePrice || 0), 0)

  const getAssetTypeInfo = (type: string) => ASSET_TYPES.find(t => t.value === type);
  const getStatusInfo = (status: string) => ASSET_STATUSES.find(s => s.value === status);
  const getConditionInfo = (condition: string) => CONDITIONS.find(c => c.value === condition);

  const isWarrantyExpiring = (warranty: string | null) => {
    if (!warranty) return false
    const warrantyDate = new Date(warranty)
    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    return warrantyDate < thirtyDaysFromNow
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asset Management</h1>
          <p className="text-muted-foreground">
            Track and manage company assets, assignments, and maintenance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/assets/maintenance')}>
            <Settings className="mr-2 h-4 w-4" />
            Maintenance
          </Button>
          <Button onClick={() => router.push('/assets/add')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Asset
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssets}</div>
            <p className="text-xs text-muted-foreground">Registered items</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{availableAssets}</div>
            <p className="text-xs text-muted-foreground">Ready for assignment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <User className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{assignedAssets}</div>
            <p className="text-xs text-muted-foreground">In use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            <Settings className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{maintenanceAssets}</div>
            <p className="text-xs text-muted-foreground">Under service</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Asset portfolio</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Inventory</CardTitle>
          <CardDescription>
            Manage your organization's hardware and equipment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets, serial numbers, or assignees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {ASSET_STATUSES.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                {ASSET_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Assets List */}
          <div className="space-y-4">
            {assets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No assets found matching your filters.
              </div>
            ) : (
              assets.map((asset: any) => {
                const typeInfo = getAssetTypeInfo(asset.assetType);
                const statusInfo = getStatusInfo(asset.status);
                const conditionInfo = getConditionInfo(asset.condition);
                const TypeIcon = typeInfo?.icon || Package;
                const StatusIcon = statusInfo?.icon || Package;
                
                const activeAssignment = asset.assignments?.[0]
                const assignedEmployee = activeAssignment?.employee

                return (
                  <Card key={asset.id} className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <TypeIcon className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold truncate">{asset.assetName}</h3>
                            <Badge className={typeInfo?.color}>
                              {typeInfo?.label}
                            </Badge>
                            <Badge className={statusInfo?.color}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {statusInfo?.label}
                            </Badge>
                            <Badge className={conditionInfo?.color}>
                              {conditionInfo?.label}
                            </Badge>
                            {isWarrantyExpiring(asset.warrantyExpiry) && (
                              <Badge className="bg-red-100 text-red-800">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                Warranty Expiring
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {asset.brand} {asset.model} • SN: {asset.serialNumber || 'N/A'} • Tag: {asset.assetTag || 'N/A'}
                          </p>
                          
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Purchase:</span>
                              <br />
                              {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Value:</span>
                              <br />
                              ${asset.purchasePrice?.toLocaleString() || '0'}
                            </div>
                            <div>
                              <span className="font-medium">Location:</span>
                              <br />
                              {asset.location || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Warranty:</span>
                              <br />
                              {asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : 'N/A'}
                            </div>
                          </div>
                          
                          {assignedEmployee && (
                            <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                              <span className="font-medium text-blue-800">
                                Assigned to: {assignedEmployee.name} ({assignedEmployee.employeeCode})
                              </span>
                              {activeAssignment.assignmentDate && (
                                <span className="text-blue-600 ml-2">
                                  (Since {new Date(activeAssignment.assignmentDate).toLocaleDateString()})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {asset.status === 'AVAILABLE' && (
                          <Button size="sm" onClick={() => router.push(`/assets/${asset.id}/assign`)}>
                            <User className="mr-1 h-4 w-4" />
                            Assign
                          </Button>
                        )}
                        
                        {asset.status === 'ASSIGNED' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => router.push(`/assets/${asset.id}/return`)}
                          >
                            Return
                          </Button>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/assets/${asset.id}`)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/assets/${asset.id}/edit`)}>
                              Edit Asset
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/assets/${asset.id}/maintenance`)}>
                              Schedule Maintenance
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              Retire Asset
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}