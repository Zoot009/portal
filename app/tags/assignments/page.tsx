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
import { Plus, UserPlus, MoreVertical, Pencil, Trash2, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { DayScheduleDialog } from '@/components/day-schedule-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface DayRequirement {
  dayOfWeek: number;
  isRequired: boolean;
  employeeId: number;
  tagId: number;
}

export default function TagAssignmentsPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [dayRequirements, setDayRequirements] = useState<DayRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // Fetch data with caching
  useEffect(() => {
    fetchData();
  }, []);

  // Refetch data every 5 minutes to keep it fresh
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        fetchData();
      }
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [loading]);

  const fetchData = async (useCache = true) => {
    try {
      setLoading(true);
      
      // Add cache control headers for client-side caching
      const fetchOptions: RequestInit = {
        cache: useCache ? 'default' : 'no-cache',
        next: useCache ? { revalidate: 120 } : { revalidate: 0 },
      };
      
      const assignmentsRes = await fetch('/api/assignments', fetchOptions);
      const assignmentsData = await assignmentsRes.json();
      const assignmentsArray = assignmentsData.data || assignmentsData.assignments || [];
      setAssignments(assignmentsArray);

      // Fetch day requirements for all employees who have assignments with caching
      const employeeIds = [...new Set(assignmentsArray.map((a: Assignment) => a.employeeId))];
      const allRequirements: DayRequirement[] = [];
      
      for (const employeeId of employeeIds) {
        try {
          const reqRes = await fetch(`/api/admin/tag-calendar?employeeId=${employeeId}`, fetchOptions);
          if (reqRes.ok) {
            const reqData = await reqRes.json();
            const requirements = reqData.data || reqData.requirements || [];
            allRequirements.push(...requirements);
          }
        } catch (err) {
          console.error(`Error fetching requirements for employee ${employeeId}:`, err);
        }
      }
      
      setDayRequirements(allRequirements);
      setLastUpdated(new Date());
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
        // Force fresh data after deletion
        fetchData(false);
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAssignments = filteredAssignments.slice(startIndex, endIndex);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  // Helper function to get day schedule for an assignment
  const getDaySchedule = (assignment: Assignment) => {
    const requirements = dayRequirements.filter(
      req => req.employeeId === assignment.employeeId && 
             req.tagId === assignment.tagId && 
             req.isRequired
    );
    
    if (requirements.length === 0) {
      return null;
    }
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = requirements
      .map(req => dayNames[req.dayOfWeek])
      .sort((a, b) => {
        const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return order.indexOf(a) - order.indexOf(b);
      });
    
    return days;
  };

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
                  <TableHead>Schedule</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAssignments.map((assignment) => {
                  const daySchedule = getDaySchedule(assignment);
                  
                  return (
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
                    <TableCell>
                      {assignment.isMandatory && daySchedule && daySchedule.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {daySchedule.map((day, idx) => (
                            <Badge 
                              key={idx} 
                              variant="secondary" 
                              className="text-[10px] px-1.5 py-0 h-5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-0"
                            >
                              {day}
                            </Badge>
                          ))}
                        </div>
                      ) : assignment.isMandatory ? (
                        <span className="text-xs text-muted-foreground">All days</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem 
                            onClick={() => handleEditAssignment(assignment)}
                            className="text-sm cursor-pointer"
                          >
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Edit
                          </DropdownMenuItem>
                          {assignment.isMandatory && (
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedAssignment(assignment);
                                setScheduleDialogOpen(true);
                              }}
                              className="text-sm cursor-pointer"
                            >
                              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                              Day Schedule
                            </DropdownMenuItem>
                          )}
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
                )}
                )}
              </TableBody>
            </Table>
          )}

          {/* Pagination Controls */}
          {!loading && filteredAssignments.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredAssignments.length)} of {filteredAssignments.length} assignments
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Items per page:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
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
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first page, last page, current page, and pages around current
                        return (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        );
                      })
                      .map((page, index, array) => (
                        <React.Fragment key={page}>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className="px-2 text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="icon"
                            onClick={() => handlePageChange(page)}
                            className="w-9"
                          >
                            {page}
                          </Button>
                        </React.Fragment>
                      ))}
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day Schedule Dialog */}
      <DayScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        assignment={selectedAssignment}
      />
    </div>
  );
}