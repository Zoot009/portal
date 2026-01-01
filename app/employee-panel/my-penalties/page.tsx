'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Calendar,
  FileText,
  Loader2,
  Check,
  Filter
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

// Helper function to format date - no timezone conversion needed since stored in IST
const formatISTDateTime = (dateString: string) => {
  const date = new Date(dateString);
  
  // Format without timezone conversion since it's already in IST
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  
  return new Intl.DateTimeFormat('en-IN', options).format(date);
};

interface Warning {
  id: number;
  warningType: string;
  warningDate: string;
  warningMessage: string;
  severity: string;
  isActive: boolean;
  relatedDate: string | null;
  viewedByEmployee: boolean;
  viewedAt: string | null;
}

interface Penalty {
  id: number;
  penaltyType: string;
  amount: number | null;
  description: string;
  penaltyDate: string;
  isPaid: boolean;
  notes: string | null;
  viewedByEmployee: boolean;
  viewedAt: string | null;
}

export default function MyPenaltiesPage() {
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [warningFilter, setWarningFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');
  const [penaltyFilter, setPenaltyFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch current employee info
  const { data: authData } = useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me');
      if (!response.ok) throw new Error('Failed to fetch auth');
      return response.json();
    }
  });

  useEffect(() => {
    if (authData?.employee?.id) {
      setEmployeeId(authData.employee.id);
    }
  }, [authData]);

  // Fetch warnings
  const { data: warningsResponse, isLoading: warningsLoading } = useQuery({
    queryKey: ['employee-warnings', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      const response = await fetch(`/api/warnings?employeeId=${employeeId}`);
      if (!response.ok) throw new Error('Failed to fetch warnings');
      return response.json();
    },
    enabled: !!employeeId,
  });

  // Fetch penalties
  const { data: penaltiesResponse, isLoading: penaltiesLoading } = useQuery({
    queryKey: ['employee-penalties', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      const response = await fetch(`/api/penalties?employeeId=${employeeId}`);
      if (!response.ok) throw new Error('Failed to fetch penalties');
      return response.json();
    },
    enabled: !!employeeId,
  });

  const warnings = warningsResponse?.data || [];
  const penalties = penaltiesResponse?.data || [];

  const isLoading = warningsLoading || penaltiesLoading;

  // Filter warnings based on read status
  const filteredWarnings = warnings.filter((warning: Warning) => {
    if (warningFilter === 'ACTIVE') return !warning.viewedByEmployee;
    if (warningFilter === 'RESOLVED') return warning.viewedByEmployee;
    return true; // ALL
  });

  // Filter penalties based on read status
  const filteredPenalties = penalties.filter((penalty: Penalty) => {
    if (penaltyFilter === 'ACTIVE') return !penalty.viewedByEmployee;
    if (penaltyFilter === 'RESOLVED') return penalty.viewedByEmployee;
    return true; // ALL
  });

  // Mutation to mark warning as read
  const markWarningAsRead = useMutation({
    mutationFn: async (warningId: number) => {
      const response = await fetch(`/api/warnings/${warningId}/mark-read`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to mark warning as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-warnings', employeeId] });
      toast({
        title: "Success",
        description: "Warning marked as read",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark warning as read",
        variant: "destructive",
      });
    },
  });

  // Mutation to mark penalty as read
  const markPenaltyAsRead = useMutation({
    mutationFn: async (penaltyId: number) => {
      const response = await fetch(`/api/penalties/${penaltyId}/mark-read`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to mark penalty as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-penalties', employeeId] });
      toast({
        title: "Success",
        description: "Penalty marked as read",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark penalty as read",
        variant: "destructive",
      });
    },
  });

  const stats = {
    activeWarnings: warnings.filter((w: Warning) => !w.viewedByEmployee).length,
    activePenalties: penalties.filter((p: Penalty) => !p.viewedByEmployee).length,
    totalWarnings: warnings.length,
    totalPenalties: penalties.length,
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'HIGH':
        return 'bg-red-500/10 text-red-700 border-red-200';
      case 'MEDIUM':
        return 'bg-orange-500/10 text-orange-700 border-orange-200';
      case 'LOW':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Warnings & Penalties</h1>
        <p className="text-muted-foreground">
          View your warnings and penalties issued by admin
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.activeWarnings}</div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Penalties</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.activePenalties}</div>
            <p className="text-xs text-muted-foreground">Pending clearance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Warnings</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWarnings}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penalties</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPenalties}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="warnings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="warnings">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Warnings ({warnings.length})
          </TabsTrigger>
          <TabsTrigger value="penalties">
            <ShieldAlert className="mr-2 h-4 w-4" />
            Penalties ({penalties.length})
          </TabsTrigger>
        </TabsList>

        {/* Warnings Tab */}
        <TabsContent value="warnings" className="space-y-4">
          {/* Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={warningFilter} onValueChange={(value: any) => setWarningFilter(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredWarnings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-semibold text-muted-foreground">No warnings found</p>
                <p className="text-sm text-muted-foreground">
                  {warningFilter === 'ALL' ? "You haven't received any warnings yet" : `No ${warningFilter.toLowerCase()} warnings`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredWarnings.map((warning: Warning) => (
                <Card key={warning.id} className="hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between p-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                          <AlertTriangle className="h-4 w-4 text-foreground" />
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
                          {!warning.viewedByEmployee && (
                            <Badge variant="destructive" className="text-xs">New</Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-foreground mb-2">{warning.warningMessage}</p>
                        
                        <p className="text-xs text-muted-foreground">
                          Issued: {formatISTDateTime(warning.warningDate)}
                        </p>
                        
                        {warning.relatedDate && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Related Date: {format(new Date(warning.relatedDate), 'PPP')}
                          </p>
                        )}
                        
                        {warning.viewedByEmployee && warning.viewedAt && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            ✓ Read on {formatISTDateTime(warning.viewedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-2">
                      {!warning.viewedByEmployee && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markWarningAsRead.mutate(warning.id)}
                          disabled={markWarningAsRead.isPending}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Mark as Read
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Penalties Tab */}
        <TabsContent value="penalties" className="space-y-4">
          {/* Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={penaltyFilter} onValueChange={(value: any) => setPenaltyFilter(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredPenalties.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <ShieldAlert className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-semibold text-muted-foreground">No penalties found</p>
                <p className="text-sm text-muted-foreground">
                  {penaltyFilter === 'ALL' ? "You haven't received any penalties yet" : `No ${penaltyFilter.toLowerCase()} penalties`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredPenalties.map((penalty: Penalty) => (
                <Card key={penalty.id} className="hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between p-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                          <ShieldAlert className="h-4 w-4 text-foreground" />
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
                          {!penalty.viewedByEmployee && (
                            <Badge variant="destructive" className="text-xs">New</Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-foreground mb-2">{penalty.description}</p>
                        
                        <p className="text-xs text-muted-foreground">
                          Issued: {formatISTDateTime(penalty.penaltyDate)}
                        </p>
                        
                        {penalty.notes && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs">
                            <strong>Notes:</strong> {penalty.notes}
                          </div>
                        )}
                        
                        {penalty.viewedByEmployee && penalty.viewedAt && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            ✓ Read on {formatISTDateTime(penalty.viewedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-2">
                      {!penalty.viewedByEmployee && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markPenaltyAsRead.mutate(penalty.id)}
                          disabled={markPenaltyAsRead.isPending}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Mark as Read
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
