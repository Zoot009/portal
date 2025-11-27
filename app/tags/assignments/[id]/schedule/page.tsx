'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';

interface DayRequirement {
  id: number;
  assignmentId: number;
  employeeId: number;
  tagId: number;
  dayOfWeek: number;
  isRequired: boolean;
  notes: string | null;
  createdAt: string;
}

interface Assignment {
  id: number;
  employeeId: number;
  tagId: number;
  isMandatory: boolean;
  employee: {
    id: number;
    name: string;
    employeeCode: string;
  };
  tag: {
    id: number;
    tagName: string;
    timeMinutes: number;
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

export default function TagDaySchedulePage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.id as string;
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [requirements, setRequirements] = useState<DayRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [assignmentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch assignment details
      const assignmentRes = await fetch(`/api/assignments`);
      const assignmentData = await assignmentRes.json();
      const foundAssignment = (assignmentData.data || []).find(
        (a: Assignment) => a.id === parseInt(assignmentId)
      );
      
      if (!foundAssignment) {
        toast.error('Assignment not found');
        router.push('/tags/assignments');
        return;
      }
      
      setAssignment(foundAssignment);

      // Fetch day requirements
      const reqRes = await fetch(
        `/api/admin/tag-calendar?employeeId=${foundAssignment.employeeId}&tagId=${foundAssignment.tagId}`
      );
      const reqData = await reqRes.json();
      setRequirements(reqData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const isTagRequiredOnDay = (dayOfWeek: number) => {
    return requirements.some(
      (req) => req.dayOfWeek === dayOfWeek && req.isRequired
    );
  };

  const handleToggleDay = async (dayOfWeek: number) => {
    if (!assignment) return;
    
    const isCurrentlyRequired = isTagRequiredOnDay(dayOfWeek);
    setSaving(true);

    try {
      if (isCurrentlyRequired) {
        // Remove requirement
        await fetch(
          `/api/admin/tag-calendar?employeeId=${assignment.employeeId}&tagId=${assignment.tagId}&dayOfWeek=${dayOfWeek}`,
          { method: 'DELETE' }
        );
        toast.success('Day requirement removed');
      } else {
        // Add requirement
        await fetch('/api/admin/tag-calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: assignment.employeeId,
            tagId: assignment.tagId,
            daysOfWeek: [dayOfWeek],
            isRequired: true,
          }),
        });
        toast.success('Day requirement added');
      }
      
      await fetchData();
    } catch (error) {
      console.error('Error toggling day:', error);
      toast.error('Failed to update requirement');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectWeekdays = async () => {
    if (!assignment) return;
    setSaving(true);

    try {
      const weekdays = [1, 2, 3, 4, 5];
      await fetch('/api/admin/tag-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: assignment.employeeId,
          tagId: assignment.tagId,
          daysOfWeek: weekdays,
          isRequired: true,
        }),
      });
      
      toast.success('Weekdays selected');
      await fetchData();
    } catch (error) {
      console.error('Error selecting weekdays:', error);
      toast.error('Failed to select weekdays');
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = async () => {
    if (!assignment) return;
    setSaving(true);

    try {
      const deletePromises = requirements.map((req) =>
        fetch(
          `/api/admin/tag-calendar?employeeId=${assignment.employeeId}&tagId=${assignment.tagId}&dayOfWeek=${req.dayOfWeek}`,
          { method: 'DELETE' }
        )
      );
      
      await Promise.all(deletePromises);
      toast.success('All requirements cleared');
      await fetchData();
    } catch (error) {
      console.error('Error clearing all:', error);
      toast.error('Failed to clear requirements');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!assignment) {
    return null;
  }

  const requiredDays = requirements.filter(r => r.isRequired).map(r => r.dayOfWeek);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          onClick={() => router.push('/tags/assignments')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assignments
        </Button>
        
        <h1 className="text-3xl font-bold tracking-tight">Day Schedule</h1>
        <p className="text-muted-foreground">
          Configure which days {assignment.employee.name} needs to submit {assignment.tag.tagName}
        </p>
      </div>

      {/* Assignment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Employee:</span>
            <span className="font-medium">{assignment.employee.name} ({assignment.employee.employeeCode})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tag:</span>
            <span className="font-medium">{assignment.tag.tagName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Time Required:</span>
            <span className="font-medium">{assignment.tag.timeMinutes} minutes</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Required Days:</span>
            <span className="font-medium">{requiredDays.length} day(s) per week</span>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            💡 <strong>How it works:</strong> Click on a day to toggle whether this tag is required. 
            Once set, the requirement stays until you change it. For example, if you select Monday, 
            this tag will be required every Monday going forward.
          </p>
        </CardContent>
      </Card>

      {/* Day Schedule */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Weekly Schedule</CardTitle>
              <CardDescription>
                {requiredDays.length === 0 
                  ? 'No days selected - tag not required on any specific day' 
                  : `Required every ${requiredDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(', ')}`
                }
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectWeekdays}
                disabled={saving}
              >
                Select Weekdays
              </Button>
              {requiredDays.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={saving}
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
              const isRequired = isTagRequiredOnDay(day.value);
              return (
                <button
                  key={day.value}
                  onClick={() => handleToggleDay(day.value)}
                  disabled={saving}
                  className={`
                    p-4 rounded-lg border-2 transition-all text-center
                    ${isRequired 
                      ? 'bg-primary text-primary-foreground border-primary font-semibold' 
                      : 'bg-background hover:bg-muted border-border'
                    }
                    ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
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
              <p className="text-sm">
                <strong>Summary:</strong> {assignment.tag.tagName} is required every{' '}
                {requiredDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(', ')} for {assignment.employee.name}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
