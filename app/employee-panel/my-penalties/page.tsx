'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Calendar,
  FileText,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

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

  const stats = {
    activeWarnings: warnings.filter((w: Warning) => w.isActive).length,
    activePenalties: penalties.filter((p: Penalty) => !p.isPaid).length,
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
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : warnings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-semibold text-muted-foreground">No warnings found</p>
                <p className="text-sm text-muted-foreground">You haven't received any warnings yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {warnings.map((warning: Warning) => (
                <Card key={warning.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">
                            {warning.warningType.replace(/_/g, ' ')}
                          </CardTitle>
                          {!warning.viewedByEmployee && (
                            <Badge variant="destructive" className="text-xs">New</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(warning.warningDate), 'PPP')}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={getSeverityColor(warning.severity)}>
                          {warning.severity}
                        </Badge>
                        <Badge variant={warning.isActive ? "default" : "secondary"}>
                          {warning.isActive ? 'Active' : 'Resolved'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{warning.warningMessage}</p>
                    {warning.relatedDate && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Related Date: {format(new Date(warning.relatedDate), 'PPP')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Penalties Tab */}
        <TabsContent value="penalties" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : penalties.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <ShieldAlert className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-semibold text-muted-foreground">No penalties found</p>
                <p className="text-sm text-muted-foreground">You haven't received any penalties yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {penalties.map((penalty: Penalty) => (
                <Card key={penalty.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">
                            {penalty.penaltyType.replace(/_/g, ' ')}
                          </CardTitle>
                          {!penalty.viewedByEmployee && (
                            <Badge variant="destructive" className="text-xs">New</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(penalty.penaltyDate), 'PPP')}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {penalty.amount && (
                          <div className="text-lg font-bold text-red-600">
                            ₹{penalty.amount.toFixed(2)}
                          </div>
                        )}
                        <Badge variant={penalty.isPaid ? "secondary" : "destructive"}>
                          {penalty.isPaid ? 'Applied' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm">{penalty.description}</p>
                    {penalty.notes && (
                      <div className="mt-2 p-2 bg-muted rounded-md">
                        <p className="text-xs text-muted-foreground font-medium">Notes:</p>
                        <p className="text-xs text-muted-foreground">{penalty.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
