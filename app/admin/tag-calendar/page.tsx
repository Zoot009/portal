'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RoleGuard } from '@/components/role-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Employee {
  id: number;
  name: string;
  employeeCode: string;
  email: string;
}

interface Tag {
  id: number;
  tagName: string;
  timeMinutes: number;
  category: string;
}

interface Assignment {
  id: number;
  employeeId: number;
  tagId: number;
  isMandatory: boolean;
  tag: Tag;
}

interface DayRequirement {
  id: number;
  assignmentId: number;
  employeeId: number;
  tagId: number;
  dayOfWeek: number;
  isRequired: boolean;
  notes: string | null;
  createdAt: string;
  assignment: {
    tag: Tag;
    employee: Employee;
  };
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

export default function TagCalendarPage() {
  const queryClient = useQueryClient();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  // Fetch all employees
  const { data: employeesResponse } = useQuery({
    queryKey: ['employees-all'],
    queryFn: async () => {
      const response = await fetch('/api/employees');
      if (!response.ok) throw new Error('Failed to fetch employees');
      return response.json();
    },
  });

  const employees = employeesResponse?.data || [];

  // Fetch employee's mandatory tag assignments
  const { data: assignmentsResponse, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['assignments', selectedEmployeeId],
    queryFn: async () => {
      if (!selectedEmployeeId) return { data: [] };
      const response = await fetch(`/api/assignments?employeeId=${selectedEmployeeId}&mandatoryOnly=true`);
      if (!response.ok) throw new Error('Failed to fetch assignments');
      return response.json();
    },
    enabled: !!selectedEmployeeId,
  });

  const assignments: Assignment[] = assignmentsResponse?.data || [];

  // Fetch existing day requirements for selected employee
  const { data: requirementsResponse, isLoading: requirementsLoading } = useQuery({
    queryKey: ['tag-calendar', selectedEmployeeId],
    queryFn: async () => {
      if (!selectedEmployeeId) return { data: [] };
      const response = await fetch(`/api/admin/tag-calendar?employeeId=${selectedEmployeeId}`);
      if (!response.ok) throw new Error('Failed to fetch requirements');
      return response.json();
    },
    enabled: !!selectedEmployeeId,
  });

  const requirements: DayRequirement[] = requirementsResponse?.data || [];

  // Create/update day requirements mutation
  const saveDayRequirementsMutation = useMutation({
    mutationFn: async ({
      tagId,
      daysOfWeek,
      isRequired,
    }: {
      tagId: number;
      daysOfWeek: number[];
      isRequired: boolean;
    }) => {
      const response = await fetch('/api/admin/tag-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: parseInt(selectedEmployeeId),
          tagId,
          daysOfWeek,
          isRequired,
        }),
      });
      if (!response.ok) throw new Error('Failed to save requirements');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tag-calendar', selectedEmployeeId] });
      toast.success('Tag requirements saved');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save requirements');
    },
  });

  // Delete requirement mutation
  const deleteRequirementMutation = useMutation({
    mutationFn: async ({ tagId, dayOfWeek }: { tagId: number; dayOfWeek: number }) => {
      const response = await fetch(
        `/api/admin/tag-calendar?employeeId=${selectedEmployeeId}&tagId=${tagId}&dayOfWeek=${dayOfWeek}`,
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error('Failed to delete requirement');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tag-calendar', selectedEmployeeId] });
      toast.success('Requirement removed');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete requirement');
    },
  });

  // Check if a tag is required on a specific day
  const isTagRequiredOnDay = (tagId: number, dayOfWeek: number) => {
    return requirements.some(
      (req) => req.tagId === tagId && req.dayOfWeek === dayOfWeek && req.isRequired
    );
  };

  // Get requirements for a specific tag
  const getRequirementsForTag = (tagId: number) => {
    return requirements.filter((req) => req.tagId === tagId);
  };

  // Handle toggle day for a tag
  const handleToggleDay = (tagId: number, dayOfWeek: number) => {
    const isCurrentlyRequired = isTagRequiredOnDay(tagId, dayOfWeek);
    
    if (isCurrentlyRequired) {
      deleteRequirementMutation.mutate({ tagId, dayOfWeek });
    } else {
      saveDayRequirementsMutation.mutate({
        tagId,
        daysOfWeek: [dayOfWeek],
        isRequired: true,
      });
    }
  };

  // Handle select all weekdays for a tag
  const handleSelectWeekdays = (tagId: number) => {
    const weekdays = [1, 2, 3, 4, 5]; // Mon-Fri
    saveDayRequirementsMutation.mutate({
      tagId,
      daysOfWeek: weekdays,
      isRequired: true,
    });
  };

  // Handle clear all for a tag
  const handleClearAll = (tagId: number) => {
    const tagRequirements = getRequirementsForTag(tagId);
    tagRequirements.forEach((req) => {
      deleteRequirementMutation.mutate({ tagId, dayOfWeek: req.dayOfWeek });
    });
  };

  const isLoading = assignmentsLoading || requirementsLoading;

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tag Day Schedule</h1>
          <p className="text-muted-foreground">
            Assign mandatory tags to specific days of the week for employees
          </p>
        </div>

        {/* Employee Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Employee</CardTitle>
            <CardDescription>Choose an employee to manage their tag schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an employee..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp: Employee) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.name} ({emp.employeeCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedEmployeeId && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : assignments.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <p className="text-center text-muted-foreground">
                    This employee has no mandatory tags assigned
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Instructions */}
                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
                  <CardContent className="pt-6">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      💡 <strong>How it works:</strong> Click on a day to toggle whether that tag is required. 
                      Once set, the requirement stays until you change it. For example, if you mark "Research" 
                      for Monday, it will be required every Monday going forward.
                    </p>
                  </CardContent>
                </Card>

                {/* Tag Schedule Cards */}
                {assignments.map((assignment) => {
                  const tagReqs = getRequirementsForTag(assignment.tagId);
                  const requiredDays = tagReqs.filter(r => r.isRequired).map(r => r.dayOfWeek);

                  return (
                    <Card key={assignment.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{assignment.tag.tagName}</CardTitle>
                            <CardDescription>
                              {assignment.tag.timeMinutes} minutes • 
                              {requiredDays.length === 0 ? ' Not required on any day' : ` Required on ${requiredDays.length} day(s)`}
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectWeekdays(assignment.tagId)}
                            >
                              Weekdays
                            </Button>
                            {requiredDays.length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleClearAll(assignment.tagId)}
                              >
                                Clear All
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-7 gap-2">
                          {DAYS_OF_WEEK.map((day) => {
                            const isRequired = isTagRequiredOnDay(assignment.tagId, day.value);
                            return (
                              <button
                                key={day.value}
                                onClick={() => handleToggleDay(assignment.tagId, day.value)}
                                className={`
                                  p-4 rounded-lg border-2 transition-all text-center
                                  ${isRequired 
                                    ? 'bg-primary text-primary-foreground border-primary font-semibold' 
                                    : 'bg-background hover:bg-muted border-border'
                                  }
                                `}
                              >
                                <div className="text-xs font-medium">{day.short}</div>
                                <div className="text-lg mt-1">
                                  {isRequired ? '✓' : '—'}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {requiredDays.length > 0 && (
                          <div className="mt-4 p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">
                              <strong>Summary:</strong> Required every{' '}
                              {requiredDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(', ')}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Overall Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Summary</CardTitle>
                    <CardDescription>Overview of all tag requirements by day</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {DAYS_OF_WEEK.map((day) => {
                        const dayReqs = requirements.filter(r => r.dayOfWeek === day.value && r.isRequired);
                        return (
                          <div key={day.value} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="font-medium">{day.label}</div>
                            <div className="flex flex-wrap gap-1">
                              {dayReqs.length === 0 ? (
                                <span className="text-sm text-muted-foreground">No tags required</span>
                              ) : (
                                dayReqs.map((req) => (
                                  <Badge key={req.id} variant="secondary">
                                    {req.assignment.tag.tagName}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </RoleGuard>
  );
}
