'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Search, 
  Filter, 
  Plus,
  FileText,
  Loader2,
  MoreVertical,
  Edit,
  Trash2
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface Warning {
  id: number;
  employeeId: number;
  warningType: string;
  warningDate: string;
  warningMessage: string;
  severity: string;
  isActive: boolean;
  issuedBy: number | null;
  relatedDate: string | null;
  viewedByEmployee: boolean;
  viewedAt: string | null;
  employee: {
    id: number;
    name: string;
    employeeCode: string;
    email: string;
    department: string | null;
  };
}

interface Penalty {
  id: number;
  employeeId: number;
  attendanceId: number | null;
  penaltyType: string;
  amount: number | null;
  description: string;
  penaltyDate: string;
  isPaid: boolean;
  notes: string | null;
  issuedBy: number | null;
  viewedByEmployee: boolean;
  viewedAt: string | null;
  employee: {
    id: number;
    name: string;
    employeeCode: string;
    email: string;
    department: string | null;
  };
}

function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('warnings');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Handle tab parameter from URL (for penalty reminder navigation)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'penalties') {
      setActiveTab('penalties');
    }
  }, [searchParams]);

  // Fetch warnings
  const { data: warningsResponse, isLoading: warningsLoading, refetch: refetchWarnings } = useQuery({
    queryKey: ['warnings'],
    queryFn: async () => {
      const response = await fetch('/api/warnings');
      if (!response.ok) throw new Error('Failed to fetch warnings');
      return response.json();
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Fetch penalties
  const { data: penaltiesResponse, isLoading: penaltiesLoading, refetch: refetchPenalties } = useQuery({
    queryKey: ['penalties'],
    queryFn: async () => {
      const response = await fetch('/api/penalties');
      if (!response.ok) throw new Error('Failed to fetch penalties');
      return response.json();
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const warnings = warningsResponse?.data || [];
  const penalties = penaltiesResponse?.data || [];

  // Delete warning mutation
  const deleteWarningMutation = useMutation({
    mutationFn: async (warningId: number) => {
      const response = await fetch(`/api/warnings/${warningId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete warning');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warnings'] });
      toast.success('Warning deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete warning');
    },
  });

  // Delete penalty mutation
  const deletePenaltyMutation = useMutation({
    mutationFn: async (penaltyId: number) => {
      const response = await fetch(`/api/penalties/${penaltyId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete penalty');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penalties'] });
      toast.success('Penalty deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete penalty');
    },
  });

  // Handle delete warning
  const handleDeleteWarning = (warningId: number) => {
    deleteWarningMutation.mutate(warningId);
  };

  // Handle delete penalty
  const handleDeletePenalty = (penaltyId: number) => {
    deletePenaltyMutation.mutate(penaltyId);
  };

  // Handle edit warning
  const handleEditWarning = (warningId: number) => {
    router.push(`/admin/create?type=warning&id=${warningId}`);
  };

  // Handle edit penalty
  const handleEditPenalty = (penaltyId: number) => {
    router.push(`/admin/create?type=penalty&id=${penaltyId}`);
  };

  // Filter functions
  const filteredWarnings = warnings.filter((warning: Warning) => 
    warning.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (statusFilter === 'ALL' || (statusFilter === 'ACTIVE' && warning.isActive) || (statusFilter === 'RESOLVED' && !warning.isActive))
  );

  const filteredPenalties = penalties.filter((penalty: Penalty) => 
    penalty.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (statusFilter === 'ALL' || (statusFilter === 'APPLIED' && !penalty.isPaid) || (statusFilter === 'SERVED' && penalty.isPaid))
  );

  const isLoading = warningsLoading || penaltiesLoading;

  const stats = {
    activeWarnings: warnings.filter((w: Warning) => w.isActive).length,
    activePenalties: penalties.filter((p: Penalty) => !p.isPaid).length,
    totalActions: warnings.length + penalties.length,
  };

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Management</h1>
          <p className="text-muted-foreground">
            Manage employee warnings and penalties
          </p>
        </div>
        <Button onClick={() => router.push('/admin/create')}>
          <Plus className="mr-2 h-4 w-4" />
          New Action
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.activeWarnings}</div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Penalties</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.activePenalties}</div>
            <p className="text-xs text-muted-foreground">Currently applied</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.totalActions}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="warnings">Warnings</TabsTrigger>
          <TabsTrigger value="penalties">Penalties</TabsTrigger>
        </TabsList>

        {/* Common Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees, titles, or descriptions..."
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
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="APPLIED">Applied</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <TabsContent value="warnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Employee Warnings
              </CardTitle>
              <CardDescription>
                Manage disciplinary warnings and employee conduct issues
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {warningsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredWarnings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium">No warnings found</p>
                  <p className="text-sm mt-2">
                    {searchTerm || statusFilter !== 'ALL'
                      ? 'Try adjusting your filters'
                      : 'No warnings have been issued yet'}
                  </p>
                </div>
              ) : (
                filteredWarnings.map((warning: Warning) => (
                  <Card key={warning.id} className="hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between p-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-medium">
                              {warning.warningType.replace(/_/g, ' ')}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {warning.severity}
                            </Badge>
                            {warning.viewedByEmployee && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                                ✓ Read
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            <span className="font-medium">{warning.employee.name}</span>
                            <span className="mx-1">•</span>
                            <span>{warning.employee.employeeCode}</span>
                          </p>
                          
                          <p className="text-sm mb-2">{warning.warningMessage}</p>
                          
                          <p className="text-xs text-muted-foreground">
                            {new Date(warning.warningDate).toLocaleDateString()}
                            {warning.viewedByEmployee && warning.viewedAt && (
                              <span className="ml-2 text-green-600 dark:text-green-400">
                                • Read on {new Date(warning.viewedAt).toLocaleDateString()}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditWarning(warning.id)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteWarning(warning.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="penalties" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                Employee Penalties
              </CardTitle>
              <CardDescription>
                Manage disciplinary actions and financial penalties
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {penaltiesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPenalties.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium">No penalties found</p>
                  <p className="text-sm mt-2">
                    {searchTerm || statusFilter !== 'ALL'
                      ? 'Try adjusting your filters'
                      : 'No penalties have been issued yet'}
                  </p>
                </div>
              ) : (
                filteredPenalties.map((penalty: Penalty) => {
                  
                  return (
                    <Card key={penalty.id} className="hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between p-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-sm font-medium">
                                {penalty.penaltyType.replace(/_/g, ' ')}
                              </h3>
                              {penalty.amount && (
                                <Badge variant="outline" className="text-xs">
                                  ₹{penalty.amount.toFixed(2)}
                                </Badge>
                              )}
                              {penalty.viewedByEmployee && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                                  ✓ Read
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2">
                              <span className="font-medium">{penalty.employee.name}</span>
                              <span className="mx-1">•</span>
                              <span>{penalty.employee.employeeCode}</span>
                            </p>
                            
                            <p className="text-sm mb-2">{penalty.description}</p>
                            
                            <p className="text-xs text-muted-foreground">
                              {new Date(penalty.penaltyDate).toLocaleDateString()}
                              {penalty.viewedByEmployee && penalty.viewedAt && (
                                <span className="ml-2 text-green-600 dark:text-green-400">
                                  • Read on {new Date(penalty.viewedAt).toLocaleDateString()}
                                </span>
                              )}
                            </p>
                            
                            {penalty.notes && (
                              <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                                <strong>Notes:</strong> {penalty.notes}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditPenalty(penalty.id)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeletePenalty(penalty.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </RoleGuard>
  );
}

// Wrap with Suspense for useSearchParams
export default function AdminPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <AdminPage />
    </Suspense>
  );
}