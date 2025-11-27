'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface DayRequirement {
  id: number;
  assignmentId: number;
  employeeId: number;
  tagId: number;
  dayOfWeek: number;
  isRequired: boolean;
}

interface Assignment {
  id: number;
  employeeId: number;
  tagId: number;
  employee: {
    name: string;
    employeeCode: string;
  };
  tag: {
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

interface DayScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: Assignment | null;
}

export function DayScheduleDialog({ open, onOpenChange, assignment }: DayScheduleDialogProps) {
  const [requirements, setRequirements] = useState<DayRequirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && assignment) {
      fetchRequirements();
    }
  }, [open, assignment]);

  const fetchRequirements = async () => {
    if (!assignment) return;
    
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/tag-calendar?employeeId=${assignment.employeeId}&tagId=${assignment.tagId}`
      );
      const data = await res.json();
      setRequirements(data.data || []);
    } catch (error) {
      console.error('Error fetching requirements:', error);
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const isTagRequiredOnDay = (dayOfWeek: number) => {
    return requirements.some((req) => req.dayOfWeek === dayOfWeek && req.isRequired);
  };

  const handleToggleDay = async (dayOfWeek: number) => {
    if (!assignment) return;
    
    const isCurrentlyRequired = isTagRequiredOnDay(dayOfWeek);
    setSaving(true);

    try {
      if (isCurrentlyRequired) {
        await fetch(
          `/api/admin/tag-calendar?employeeId=${assignment.employeeId}&tagId=${assignment.tagId}&dayOfWeek=${dayOfWeek}`,
          { method: 'DELETE' }
        );
      } else {
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
      }
      
      await fetchRequirements();
    } catch (error) {
      console.error('Error toggling day:', error);
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectWeekdays = async () => {
    if (!assignment) return;
    setSaving(true);

    try {
      await fetch('/api/admin/tag-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: assignment.employeeId,
          tagId: assignment.tagId,
          daysOfWeek: [1, 2, 3, 4, 5],
          isRequired: true,
        }),
      });
      
      await fetchRequirements();
      toast.success('Weekdays selected');
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
      await fetchRequirements();
      toast.success('Schedule cleared');
    } catch (error) {
      console.error('Error clearing all:', error);
      toast.error('Failed to clear');
    } finally {
      setSaving(false);
    }
  };

  if (!assignment) return null;

  const requiredDays = requirements.filter(r => r.isRequired).map(r => r.dayOfWeek);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Day Schedule</DialogTitle>
          <DialogDescription>
            Configure which days {assignment.employee.name} needs to submit {assignment.tag.tagName}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick Actions */}
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

            {/* Day Selector */}
            <div className="grid grid-cols-7 gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const isRequired = isTagRequiredOnDay(day.value);
                return (
                  <button
                    key={day.value}
                    onClick={() => handleToggleDay(day.value)}
                    disabled={saving}
                    className={`
                      p-3 rounded-lg border-2 transition-all text-center
                      ${isRequired 
                        ? 'bg-primary text-primary-foreground border-primary font-semibold' 
                        : 'bg-background hover:bg-muted border-border'
                      }
                      ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="text-xs font-medium">{day.short}</div>
                    <div className="text-base mt-1">
                      {isRequired ? '✓' : '—'}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Summary */}
            {requiredDays.length > 0 ? (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Required every:</strong>{' '}
                  {requiredDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(', ')}
                </p>
              </div>
            ) : (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  No days selected - tag not required on any specific day
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
