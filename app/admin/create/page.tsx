'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateActionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('warning');
  const [submitting, setSubmitting] = useState(false);
  
  // Get edit mode parameters from URL
  const editType = searchParams.get('type'); // 'warning' or 'penalty'
  const editId = searchParams.get('id');
  const isEditMode = !!(editType && editId);

  // Warning form state
  const [warningForm, setWarningForm] = useState({
    employeeId: '',
    warningType: '',
    warningMessage: '',
    severity: 'LOW',
  });

  // Penalty form state
  const [penaltyForm, setPenaltyForm] = useState({
    employeeId: '',
    penaltyType: '',
    amount: '',
    description: '',
    penaltyDate: new Date().toISOString().split('T')[0],
  });

  // Fetch employees
  const { data: employeesResponse } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await fetch('/api/employees');
      if (!response.ok) throw new Error('Failed to fetch employees');
      return response.json();
    }
  });

  const employees = employeesResponse?.data || [];

  // Fetch existing warning data if editing
  const { data: existingWarning, isLoading: loadingWarning } = useQuery({
    queryKey: ['warning', editId],
    queryFn: async () => {
      const response = await fetch(`/api/warnings/${editId}`);
      if (!response.ok) throw new Error('Failed to fetch warning');
      return response.json();
    },
    enabled: isEditMode && editType === 'warning' && !!editId,
  });

  // Fetch existing penalty data if editing
  const { data: existingPenalty, isLoading: loadingPenalty } = useQuery({
    queryKey: ['penalty', editId],
    queryFn: async () => {
      const response = await fetch(`/api/penalties/${editId}`);
      if (!response.ok) throw new Error('Failed to fetch penalty');
      return response.json();
    },
    enabled: isEditMode && editType === 'penalty' && !!editId,
  });

  // Set active tab based on edit type
  useEffect(() => {
    if (editType === 'warning') {
      setActiveTab('warning');
    } else if (editType === 'penalty') {
      setActiveTab('penalty');
    }
  }, [editType]);

  // Populate warning form when editing
  useEffect(() => {
    if (existingWarning?.data) {
      const warning = existingWarning.data;
      setWarningForm({
        employeeId: warning.employeeId.toString(),
        warningType: warning.warningType,
        warningMessage: warning.warningMessage,
        severity: warning.severity,
      });
    }
  }, [existingWarning]);

  // Populate penalty form when editing
  useEffect(() => {
    if (existingPenalty?.data) {
      const penalty = existingPenalty.data;
      setPenaltyForm({
        employeeId: penalty.employeeId.toString(),
        penaltyType: penalty.penaltyType,
        amount: penalty.amount?.toString() || '',
        description: penalty.description,
        penaltyDate: penalty.penaltyDate.split('T')[0],
      });
    }
  }, [existingPenalty]);

  const handleWarningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!warningForm.employeeId || !warningForm.warningType || !warningForm.warningMessage) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      const url = isEditMode && editType === 'warning' 
        ? `/api/warnings/${editId}` 
        : '/api/warnings';
      
      const method = isEditMode && editType === 'warning' ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(warningForm)
      });

      if (response.ok) {
        toast.success(isEditMode ? 'Warning updated successfully' : 'Warning issued successfully');
        router.push('/admin');
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'issue'} warning`);
      }
    } catch (error) {
      console.error('Error with warning:', error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'issue'} warning`);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePenaltySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!penaltyForm.employeeId || !penaltyForm.penaltyType || !penaltyForm.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      const url = isEditMode && editType === 'penalty' 
        ? `/api/penalties/${editId}` 
        : '/api/penalties';
      
      const method = isEditMode && editType === 'penalty' ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(penaltyForm)
      });

      if (response.ok) {
        toast.success(isEditMode ? 'Penalty updated successfully' : 'Penalty created successfully');
        router.push('/admin');
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} penalty`);
      }
    } catch (error) {
      console.error('Error with penalty:', error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} penalty`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEditMode ? 'Edit Action' : 'New Action'}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode ? 'Update an existing warning or penalty' : 'Create a new warning or penalty'}
            </p>
          </div>
        </div>

        {/* Loading state for edit mode */}
        {isEditMode && (loadingWarning || loadingPenalty) ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="warning" disabled={isEditMode && editType !== 'warning'}>
                  Warning
                </TabsTrigger>
                <TabsTrigger value="penalty" disabled={isEditMode && editType !== 'penalty'}>
                  Penalty
                </TabsTrigger>
              </TabsList>

          {/* Warning Form */}
          <TabsContent value="warning">
            <Card>
              <CardHeader>
                <CardTitle>{isEditMode ? 'Edit Warning' : 'Issue Warning'}</CardTitle>
                <CardDescription>
                  {isEditMode ? 'Update the warning details' : 'Create a disciplinary warning for an employee'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleWarningSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="warning-employee">Employee *</Label>
                    <Select 
                      value={warningForm.employeeId} 
                      onValueChange={(value) => setWarningForm({...warningForm, employeeId: value})}
                    >
                      <SelectTrigger id="warning-employee">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                        {employees.map((emp: any) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.name} ({emp.employeeCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="warning-type">Warning Type *</Label>
                    <Select 
                      value={warningForm.warningType} 
                      onValueChange={(value) => setWarningForm({...warningForm, warningType: value})}
                    >
                      <SelectTrigger id="warning-type">
                        <SelectValue placeholder="Select warning type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ATTENDANCE">Attendance</SelectItem>
                        <SelectItem value="LEAVE_MISUSE">Leave Misuse</SelectItem>
                        <SelectItem value="BREAK_EXCEEDED">Break Exceeded</SelectItem>
                        <SelectItem value="WORK_QUALITY">Work Quality</SelectItem>
                        <SelectItem value="BEHAVIORAL">Behavioral</SelectItem>
                        <SelectItem value="SYSTEM_MISUSE">System Misuse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="severity">Severity *</Label>
                    <Select 
                      value={warningForm.severity} 
                      onValueChange={(value) => setWarningForm({...warningForm, severity: value})}
                    >
                      <SelectTrigger id="severity">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="warning-message">Warning Message *</Label>
                    <Textarea
                      id="warning-message"
                      placeholder="Describe the warning in detail..."
                      value={warningForm.warningMessage}
                      onChange={(e) => setWarningForm({...warningForm, warningMessage: e.target.value})}
                      rows={5}
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {isEditMode ? 'Updating...' : 'Issuing...'}
                        </>
                      ) : (
                        isEditMode ? 'Update Warning' : 'Issue Warning'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Penalty Form */}
          <TabsContent value="penalty">
            <Card>
              <CardHeader>
                <CardTitle>{isEditMode ? 'Edit Penalty' : 'Create Penalty'}</CardTitle>
                <CardDescription>
                  {isEditMode ? 'Update the penalty details' : 'Apply a penalty to an employee'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePenaltySubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="penalty-employee">Employee *</Label>
                    <Select 
                      value={penaltyForm.employeeId} 
                      onValueChange={(value) => setPenaltyForm({...penaltyForm, employeeId: value})}
                    >
                      <SelectTrigger id="penalty-employee">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                        {employees.map((emp: any) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.name} ({emp.employeeCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="penalty-type">Penalty Type *</Label>
                    <Select 
                      value={penaltyForm.penaltyType} 
                      onValueChange={(value) => setPenaltyForm({...penaltyForm, penaltyType: value})}
                    >
                      <SelectTrigger id="penalty-type">
                        <SelectValue placeholder="Select penalty type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNAUTHORIZED_ABSENCE">Unauthorized Absence</SelectItem>
                        <SelectItem value="POLICY_VIOLATION">Policy Violation</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={penaltyForm.amount}
                      onChange={(e) => setPenaltyForm({...penaltyForm, amount: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="penalty-date">Penalty Date *</Label>
                    <Input
                      id="penalty-date"
                      type="date"
                      value={penaltyForm.penaltyDate}
                      onChange={(e) => setPenaltyForm({...penaltyForm, penaltyDate: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="penalty-description">Description *</Label>
                    <Textarea
                      id="penalty-description"
                      placeholder="Describe the reason for this penalty..."
                      value={penaltyForm.description}
                      onChange={(e) => setPenaltyForm({...penaltyForm, description: e.target.value})}
                      rows={5}
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {isEditMode ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        isEditMode ? 'Update Penalty' : 'Create Penalty'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
