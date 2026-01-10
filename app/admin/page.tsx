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
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { getCurrentPayCycle, getPayCycleByOffset, formatPayCyclePeriod } from '@/lib/pay-cycle-utils';

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
  const [cycleFilter, setCycleFilter] = useState('current');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [activeStatusFilter, setActiveStatusFilter] = useState('all'); // For active/non-active tab

  // Calculate dynamic pay cycles
  const currentCycle = getCurrentPayCycle();
  const previousCycle = getPayCycleByOffset(-1);
  const currentCycleLabel = formatPayCyclePeriod(currentCycle.start, currentCycle.end);
  const previousCycleLabel = formatPayCyclePeriod(previousCycle.start, previousCycle.end);

  // Fetch all employees for dropdown
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await fetch('/api/employees');
      if (!response.ok) throw new Error('Failed to fetch employees');
      const result = await response.json();
      return result.data || [];
    }
  });

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

  // Handle export penalties to CSV
  const handleExportPenaltiesToCSV = () => {
    // Use filtered penalties to export what user is currently viewing
    const dataToExport = filteredPenalties;

    if (dataToExport.length === 0) {
      toast.error('No penalties to export');
      return;
    }

    // Define CSV headers
    const headers = [
      'Employee Name',
      'Employee Code',
      'Amount',
      'Description',
      'Penalty Date',
      'Notes',
      'Viewed',
      'Viewed At'
    ];

    // Convert data to CSV rows
    const csvRows: string[][] = dataToExport.map((penalty: Penalty) => [
      penalty.employee.name,
      penalty.employee.employeeCode,
      penalty.amount ? penalty.amount.toFixed(2) : 'N/A',
      `"${penalty.description.replace(/"/g, '""')}"`, // Escape quotes in description
      new Date(penalty.penaltyDate).toLocaleDateString('en-GB'),
      penalty.notes ? `"${penalty.notes.replace(/"/g, '""')}"` : 'N/A',
      penalty.viewedByEmployee ? 'Yes' : 'No',
      penalty.viewedAt ? new Date(penalty.viewedAt).toLocaleDateString('en-GB') : 'N/A'
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Generate filename with current date and filter info
    const filterInfo = cycleFilter === 'current' ? 'current-cycle' : cycleFilter === 'previous' ? 'previous-cycle' : 'all-cycles';
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `penalties-${filterInfo}-${timestamp}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${dataToExport.length} penalties to CSV`);
  };

  // Filter functions
  const filteredWarnings = warnings.filter((warning: Warning) => {
    const matchesSearch = warning.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) || warning.employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEmployee = employeeFilter === 'all' || warning.employeeId.toString() === employeeFilter;
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' && warning.isActive) || (statusFilter === 'RESOLVED' && !warning.isActive);
    
    // Active status filter (Active = PRESENT/WFH, Non-Active = ABSENT/LEAVE)
    // For warnings, we'll just use all for now since warnings don't have this categorization
    
    // Cycle filter
    let matchesCycle = true;
    if (cycleFilter !== 'all') {
      const warningDate = new Date(warning.warningDate);
      
      if (cycleFilter === 'current') {
        const cycleStart = new Date(currentCycle.start);
        const cycleEnd = new Date(currentCycle.end);
        cycleEnd.setHours(23, 59, 59, 999);
        matchesCycle = warningDate >= cycleStart && warningDate <= cycleEnd;
      } else if (cycleFilter === 'previous') {
        const cycleStart = new Date(previousCycle.start);
        const cycleEnd = new Date(previousCycle.end);
        cycleEnd.setHours(23, 59, 59, 999);
        matchesCycle = warningDate >= cycleStart && warningDate <= cycleEnd;
      }
    }
    
    return matchesSearch && matchesEmployee && matchesStatus && matchesCycle;
  });

  const filteredPenalties = penalties.filter((penalty: Penalty) => {
    const matchesSearch = penalty.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) || penalty.employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEmployee = employeeFilter === 'all' || penalty.employeeId.toString() === employeeFilter;
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'APPLIED' && !penalty.isPaid) || (statusFilter === 'SERVED' && penalty.isPaid);
    
    // Active status filter - For penalties: Active = Applied (not paid), Non-Active = Served (paid)
    let matchesActiveStatus = true;
    if (activeStatusFilter === 'active') {
      matchesActiveStatus = !penalty.isPaid; // Applied penalties
    } else if (activeStatusFilter === 'non-active') {
      matchesActiveStatus = penalty.isPaid; // Served penalties
    }
    
    // Cycle filter
    let matchesCycle = true;
    if (cycleFilter !== 'all') {
      const penaltyDate = new Date(penalty.penaltyDate);
      
      if (cycleFilter === 'current') {
        const cycleStart = new Date(currentCycle.start);
        const cycleEnd = new Date(currentCycle.end);
        cycleEnd.setHours(23, 59, 59, 999);
        matchesCycle = penaltyDate >= cycleStart && penaltyDate <= cycleEnd;
      } else if (cycleFilter === 'previous') {
        const cycleStart = new Date(previousCycle.start);
        const cycleEnd = new Date(previousCycle.end);
        cycleEnd.setHours(23, 59, 59, 999);
        matchesCycle = penaltyDate >= cycleStart && penaltyDate <= cycleEnd;
      }
    }
    
    return matchesSearch && matchesStatus && matchesCycle && matchesActiveStatus;
  });

  // Pagination logic for warnings
  const totalWarnings = filteredWarnings.length;
  const totalWarningPages = Math.ceil(totalWarnings / recordsPerPage);
  const warningStartIndex = (currentPage - 1) * recordsPerPage;
  const warningEndIndex = warningStartIndex + recordsPerPage;
  const paginatedWarnings = filteredWarnings.slice(warningStartIndex, warningEndIndex);

  // Pagination logic for penalties
  const totalPenalties = filteredPenalties.length;
  const totalPenaltyPages = Math.ceil(totalPenalties / recordsPerPage);
  const penaltyStartIndex = (currentPage - 1) * recordsPerPage;
  const penaltyEndIndex = penaltyStartIndex + recordsPerPage;
  const paginatedPenalties = filteredPenalties.slice(penaltyStartIndex, penaltyEndIndex);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  // Reset to first page when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const isLoading = warningsLoading || penaltiesLoading;

  // Calculate stats based on filtered data
  const stats = {
    activeWarnings: filteredWarnings.filter((w: Warning) => w.isActive).length,
    activePenalties: filteredPenalties.filter((p: Penalty) => !p.isPaid).length,
    totalActions: filteredWarnings.length + filteredPenalties.length,
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
            <p className="text-xs text-muted-foreground">Filtered results</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="warnings" onClick={() => setCurrentPage(1)}>Warnings</TabsTrigger>
          <TabsTrigger value="penalties" onClick={() => setCurrentPage(1)}>Penalties</TabsTrigger>
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
                  onChange={(e) => { setSearchTerm(e.target.value); handleFilterChange(); }}
                  className="pl-8"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); handleFilterChange(); }}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="APPLIED">Applied</SelectItem>
                  <SelectItem value="SERVED">Served</SelectItem>
                </SelectContent>
              </Select>

              <Select value={cycleFilter} onValueChange={(value) => { setCycleFilter(value); handleFilterChange(); }}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder={`Current Cycle (${currentCycleLabel})`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cycles</SelectItem>
                  <SelectItem value="current">Current Cycle ({currentCycleLabel})</SelectItem>
                  <SelectItem value="previous">Previous Cycle ({previousCycleLabel})</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={employeeFilter} onValueChange={(value) => { setEmployeeFilter(value); handleFilterChange(); }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employeesData && employeesData.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.employeeCode} - {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Tabs value={activeStatusFilter} onValueChange={(value) => { setActiveStatusFilter(value); handleFilterChange(); }} className="w-auto">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="non-active">Non Active</TabsTrigger>
                </TabsList>
              </Tabs>
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
                paginatedWarnings.map((warning: Warning) => (
                  <Card key={warning.id} className="hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between p-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="shrink-0 mt-1">
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

          {/* Pagination for Warnings */}
          {totalWarnings > 0 && (
            <div className="flex items-center justify-between bg-card border rounded-lg px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Show</span>
                  <Select value={recordsPerPage.toString()} onValueChange={handleRecordsPerPageChange}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">entries</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Showing {warningStartIndex + 1} to {Math.min(warningEndIndex, totalWarnings)} of {totalWarnings} entries
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalWarningPages }, (_, i) => i + 1)
                    .filter(page => {
                      const distance = Math.abs(page - currentPage);
                      return distance <= 2 || page === 1 || page === totalWarningPages;
                    })
                    .map((page, index, array) => {
                      const showEllipsis = index > 0 && page - array[index - 1] > 1;
                      return (
                        <div key={page} className="flex items-center">
                          {showEllipsis && (
                            <span className="px-2 py-1 text-sm text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </Button>
                        </div>
                      );
                    })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalWarningPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="penalties" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5" />
                    Employee Penalties
                  </CardTitle>
                  <CardDescription>
                    Manage disciplinary actions and financial penalties
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPenaltiesToCSV}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
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
                paginatedPenalties.map((penalty: Penalty) => {
                  
                  return (
                    <Card key={penalty.id} className="hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between p-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="shrink-0 mt-1">
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

          {/* Pagination for Penalties */}
          {totalPenalties > 0 && (
            <div className="flex items-center justify-between bg-card border rounded-lg px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Show</span>
                  <Select value={recordsPerPage.toString()} onValueChange={handleRecordsPerPageChange}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">entries</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Showing {penaltyStartIndex + 1} to {Math.min(penaltyEndIndex, totalPenalties)} of {totalPenalties} entries
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPenaltyPages }, (_, i) => i + 1)
                    .filter(page => {
                      const distance = Math.abs(page - currentPage);
                      return distance <= 2 || page === 1 || page === totalPenaltyPages;
                    })
                    .map((page, index, array) => {
                      const showEllipsis = index > 0 && page - array[index - 1] > 1;
                      return (
                        <div key={page} className="flex items-center">
                          {showEllipsis && (
                            <span className="px-2 py-1 text-sm text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </Button>
                        </div>
                      );
                    })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPenaltyPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
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