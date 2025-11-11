'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Plus, UserPlus, MoreVertical, Pencil, Trash2 } from 'lucide-react';
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

export default function TagAssignmentsPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const assignmentsRes = await fetch('/api/assignments');
      const assignmentsData = await assignmentsRes.json();
      setAssignments(assignmentsData.assignments || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMandatory = async (assignment: Assignment) => {
    const newMandatoryStatus = !assignment.isMandatory;
    
    // Optimistically update the UI
    setAssignments(prev => 
      prev.map(a => 
        a.id === assignment.id 
          ? { ...a, isMandatory: newMandatoryStatus } 
          : a
      )
    );

    try {
      const response = await fetch(`/api/assignments?id=${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isMandatory: newMandatoryStatus
        })
      });

      if (response.ok) {
        toast.success(`Marked as ${newMandatoryStatus ? 'Mandatory' : 'Optional'}`);
      } else {
        // Revert on error
        setAssignments(prev => 
          prev.map(a => 
            a.id === assignment.id 
              ? { ...a, isMandatory: assignment.isMandatory } 
              : a
          )
        );
        toast.error('Failed to update assignment');
      }
    } catch (error) {
      // Revert on error
      setAssignments(prev => 
        prev.map(a => 
          a.id === assignment.id 
            ? { ...a, isMandatory: assignment.isMandatory } 
            : a
        )
      );
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment');
    }
  };

  const handleEditAssignment = (assignment: Assignment) => {
    router.push(`/tags/assignments/edit/${assignment.id}`);
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    try {
      const response = await fetch(`/api/assignments?id=${assignmentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Assignment deleted');
        fetchData();
      } else {
        toast.error('Failed to delete assignment');
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete assignment');
    }
  };

  const filteredAssignments = assignments.filter(assignment => 
    assignment.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assignment.tag.tagName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assignment.employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tag Assignments</h1>
          <p className="text-muted-foreground">
            Assign tags to employees for their work tracking
          </p>
        </div>
        
        <Button onClick={() => router.push('/tags/assignments/create')}>
          <Plus className="mr-2 h-4 w-4" />
          New Assignment
        </Button>
      </div>

      {/* Stats Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
          <UserPlus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{assignments.length}</div>
          <p className="text-xs text-muted-foreground">Active tag assignments</p>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Assignments</CardTitle>
              <CardDescription>
                Manage which tags are assigned to each employee
              </CardDescription>
            </div>
            <Input
              placeholder="Search by employee or tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading assignments...
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No assignments found</p>
              <p className="text-sm mt-2">
                {searchTerm ? 'No results match your search' : 'Create your first assignment by clicking the button above'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Tag</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{assignment.employee.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {assignment.employee.employeeCode}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {assignment.tag.tagName}
                    </TableCell>
                    <TableCell>{assignment.tag.timeMinutes} min</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={assignment.isMandatory}
                          onCheckedChange={() => handleToggleMandatory(assignment)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {assignment.isMandatory ? 'Mandatory' : 'Optional'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(assignment.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                          <DropdownMenuItem 
                            onClick={() => handleEditAssignment(assignment)}
                            className="text-sm cursor-pointer"
                          >
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            className="text-sm text-red-600 focus:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}