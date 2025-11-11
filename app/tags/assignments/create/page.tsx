'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Loader2, Users, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

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

export default function CreateAssignmentPage() {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isMandatory, setIsMandatory] = useState(false);
  const [searchTag, setSearchTag] = useState('');

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tagsRes, employeesRes] = await Promise.all([
        fetch('/api/tags'),
        fetch('/api/employees')
      ]);

      const tagsData = await tagsRes.json();
      const employeesData = await employeesRes.json();

      setTags(tagsData.data?.filter((t: Tag) => t.isActive) || []);
      setEmployees(employeesData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployee || selectedTags.length === 0) {
      toast.error('Please select employee and at least one tag');
      return;
    }

    try {
      setSubmitting(true);
      
      // Create multiple assignments - one for each tag
      const promises = selectedTags.map(tagId =>
        fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: parseInt(selectedEmployee),
            tagId: parseInt(tagId),
            isMandatory
          })
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.ok).length;

      if (successCount > 0) {
        toast.success(`Successfully assigned ${successCount} tag${successCount > 1 ? 's' : ''}`);
        router.push('/tags/assignments');
      } else {
        toast.error('Failed to assign tags');
      }
    } catch (error) {
      console.error('Error creating assignments:', error);
      toast.error('Failed to assign tags');
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedEmployees = () => {
    return employees.filter(emp => 
      selectedEmployee.split(',').includes(emp.id.toString())
    );
  };

  const filteredTags = tags.filter(tag => 
    tag.tagName.toLowerCase().includes(searchTag.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold tracking-tight">Create Assignment</h1>
          <p className="text-muted-foreground">
            Assign tags to employees for their work tracking
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
                Select employee and tag to create a new assignment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Employee Selection */}
              <div className="space-y-3">
                <Label htmlFor="employee" className="text-base font-semibold">
                  Select Employee
                </Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger id="employee" className="w-full">
                    <SelectValue placeholder="Select employees to add" />
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
                <Label className="text-base font-semibold">
                  Select Tags
                  {selectedTags.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({selectedTags.length} selected)
                    </span>
                  )}
                </Label>
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search tags..."
                    value={searchTag}
                    onChange={(e) => setSearchTag(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <div className="flex flex-wrap gap-1.5 p-4 border rounded-md min-h-[120px] bg-background">
                  {filteredTags.length === 0 ? (
                    <div className="w-full text-center text-sm text-muted-foreground py-8">
                      {searchTag ? 'No tags found matching your search' : 'No tags available'}
                    </div>
                  ) : (
                    filteredTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id.toString())}
                        className={`
                          px-2 py-1 rounded text-xs font-medium transition-colors
                          ${selectedTags.includes(tag.id.toString())
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                          }
                        `}
                      >
                        {tag.tagName} ({tag.timeMinutes}min)
                      </button>
                    ))
                  )}
                </div>
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

          {/* Selected Employee Display */}
          {selectedEmployee && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">Assigned Employee</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {getSelectedEmployees().length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-muted-foreground">No employee selected yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select employee from the dropdown above
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getSelectedEmployees().map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">
                              {emp.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{emp.name}</p>
                            <p className="text-sm text-muted-foreground">{emp.employeeCode}</p>
                          </div>
                        </div>
                        <Badge variant="secondary">{emp.role}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
              disabled={submitting || !selectedEmployee || selectedTags.length === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                `Assign ${selectedTags.length > 0 ? selectedTags.length : ''} Tag${selectedTags.length !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
