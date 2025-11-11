'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Tag {
  id: number;
  tagName: string;
  timeMinutes: number;
  category: string | null;
  isActive: boolean;
}

interface Employee {
  id: number;
  employeeCode: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
}

interface Assignment {
  id: number;
  employeeId: number;
  tagId: number;
  isMandatory: boolean;
  employee: Employee;
  tag: Tag;
  createdAt: string;
}

export default function EditAssignmentPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.id as string;

  const [tags, setTags] = useState<Tag[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [isMandatory, setIsMandatory] = useState(false);

  useEffect(() => {
    fetchData();
  }, [assignmentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tagsRes, employeesRes, assignmentRes] = await Promise.all([
        fetch('/api/tags'),
        fetch('/api/employees'),
        fetch(`/api/assignments?id=${assignmentId}`)
      ]);

      const tagsData = await tagsRes.json();
      const employeesData = await employeesRes.json();
      const assignmentData = await assignmentRes.json();

      setTags(tagsData.data?.filter((t: Tag) => t.isActive) || []);
      setEmployees(employeesData.data || []);

      // Find the specific assignment
      const assignment = assignmentData.assignments?.find(
        (a: Assignment) => a.id === parseInt(assignmentId)
      );

      if (assignment) {
        setSelectedEmployee(assignment.employeeId.toString());
        setSelectedTag(assignment.tagId.toString());
        setIsMandatory(assignment.isMandatory);
      } else {
        toast.error('Assignment not found');
        router.push('/tags/assignments');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployee || !selectedTag) {
      toast.error('Please select employee and tag');
      return;
    }

    try {
      setSubmitting(true);

      // Delete old assignment
      await fetch(`/api/assignments?id=${assignmentId}`, {
        method: 'DELETE'
      });

      // Create new assignment with updated values
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: parseInt(selectedEmployee),
          tagId: parseInt(selectedTag),
          isMandatory
        })
      });

      if (response.ok) {
        toast.success('Assignment updated successfully');
        router.push('/tags/assignments');
      } else {
        toast.error('Failed to update assignment');
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Assignment</h1>
          <p className="text-muted-foreground">
            Update tag assignment details
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Main Card */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Details</CardTitle>
              <CardDescription>
                Modify employee, tag, or assignment type
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Employee Selection */}
              <div className="space-y-3">
                <Label htmlFor="employee" className="text-base font-semibold">
                  Employee
                </Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger id="employee" className="w-full">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No employees found
                      </div>
                    ) : (
                      employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.name} ({emp.employeeCode})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Tag Selection */}
              <div className="space-y-3">
                <Label htmlFor="tag" className="text-base font-semibold">
                  Tag
                </Label>
                <Select value={selectedTag} onValueChange={setSelectedTag}>
                  <SelectTrigger id="tag" className="w-full">
                    <SelectValue placeholder="Select tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {tags.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No tags available
                      </div>
                    ) : (
                      tags.map((tag) => (
                        <SelectItem key={tag.id} value={tag.id.toString()}>
                          {tag.tagName} ({tag.timeMinutes} min)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Mandatory Checkbox */}
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="mandatory" 
                  checked={isMandatory}
                  onCheckedChange={(checked) => setIsMandatory(checked as boolean)}
                />
                <Label 
                  htmlFor="mandatory" 
                  className="text-sm font-normal cursor-pointer"
                >
                  Mark as mandatory
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitting || !selectedEmployee || !selectedTag}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Assignment'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
