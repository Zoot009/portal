'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RoleGuard } from '@/components/role-guard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Search, Plus, Edit, Eye, Users, Download, Upload, MoreVertical, Trash2, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface Employee {
  id: number
  name: string
  email: string
  employeeCode: string
  role: string
  department?: string
  designation?: string
  isActive: boolean
  joinDate?: string
  baseSalary?: number
  hourlyRate?: number
  salaryType?: string
  profileCompleted?: boolean
  lastLogin?: string
}

export default function EmployeesPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isExtractDialogOpen, setIsExtractDialogOpen] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [isDeleteTestUsersDialogOpen, setIsDeleteTestUsersDialogOpen] = useState(false)
  const [deletingTestUsers, setDeletingTestUsers] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage, setRecordsPerPage] = useState(10)
  
  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    employeeCode: '',
    role: '',
    designation: '',
    isActive: true
  })

  // Fetch employees from API (fetch all once, filter on client side)
  const { data: employeesResponse, isLoading, refetch } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await fetch('/api/employees')
      if (!response.ok) throw new Error('Failed to fetch employees')
      const result = await response.json()
      return result.data || []
    }
  })

  const employees = employeesResponse || []

  const filteredEmployees = employees?.filter((employee: Employee) => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter
    const matchesRole = roleFilter === 'all' || employee.role === roleFilter
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? employee.isActive : !employee.isActive)

    return matchesSearch && matchesDepartment && matchesRole && matchesStatus
  }) || []

  // Pagination logic
  const totalRecords = filteredEmployees.length
  const totalPages = Math.ceil(totalRecords / recordsPerPage)
  const startIndex = (currentPage - 1) * recordsPerPage
  const endIndex = startIndex + recordsPerPage
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex)

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(parseInt(value))
    setCurrentPage(1)
  }

  const getRoleBadge = (role: string) => {
    const roleColors = {
      ADMIN: 'bg-red-500 text-white',
      TEAMLEADER: 'bg-blue-500 text-white',
      EMPLOYEE: 'bg-gray-500 text-white',
    }
    return (
      <Badge className={roleColors[role as keyof typeof roleColors] || roleColors.EMPLOYEE}>
        {role}
      </Badge>
    )
  }

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge className={isActive ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    )
  }

  const handleRoleChange = async (employeeId: number, employeeName: string, newRole: string) => {
    // Optimistically update the UI
    queryClient.setQueryData(['employees'], (old: Employee[] | undefined) => {
      if (!old) return old
      return old.map(emp => 
        emp.id === employeeId ? { ...emp, role: newRole } : emp
      )
    })
    
    // Show immediate feedback
    toast.loading(`Updating ${employeeName}'s role...`, { id: `role-${employeeId}` })
    
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update role')
      }

      toast.success(`${employeeName}'s role updated to ${newRole}`, { id: `role-${employeeId}` })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update role', { id: `role-${employeeId}` })
      // Revert optimistic update on error
      refetch()
    }
  }

  const handleDeleteEmployee = async (employeeId: number, employeeName: string) => {
    if (window.confirm(`Are you sure you want to delete ${employeeName}? This will deactivate the employee account.`)) {
      try {
        const response = await fetch(`/api/employees/${employeeId}`, {
          method: 'DELETE'
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to delete employee')
        }

        toast.success(`${employeeName} has been deactivated successfully`)
        refetch()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete employee')
      }
    }
  }

  // Handle extract employees from attendance records
  const handleExtractEmployees = async () => {
    setExtracting(true)
    try {
      const response = await fetch('/api/employees/extract-from-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to extract employees')
      }

      toast.success(result.message || `Successfully extracted ${result.extractedCount} employees`)
      setIsExtractDialogOpen(false)
      
      // Refresh the employees list
      refetch()
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to extract employees')
    } finally {
      setExtracting(false)
    }
  }

  // Handle delete test users
  const handleDeleteTestUsers = async () => {
    setDeletingTestUsers(true)
    try {
      const response = await fetch('/api/employees/delete-test-users', {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete test users')
      }

      toast.success(result.message || `Successfully deleted ${result.deletedCount} test user(s)`)
      setIsDeleteTestUsersDialogOpen(false)
      
      // Refresh the employees list
      refetch()
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete test users')
    } finally {
      setDeletingTestUsers(false)
    }
  }

  // Handle edit employee
  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee)
    setEditForm({
      name: employee.name,
      email: employee.email,
      employeeCode: employee.employeeCode,
      role: employee.role,
      designation: employee.designation || '',
      isActive: employee.isActive
    })
    setIsEditDialogOpen(true)
  }

  // Handle save edited employee
  const handleSaveEmployee = async () => {
    if (!editingEmployee) return

    try {
      const response = await fetch(`/api/employees/${editingEmployee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to update employee')
      }

      toast.success('Employee updated successfully!')
      setIsEditDialogOpen(false)
      setEditingEmployee(null)
      refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update employee')
    }
  }

  if (isLoading) {
    return (
      <RoleGuard allowedRoles={['ADMIN', 'TEAMLEADER']}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl">Loading...</div>
        </div>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['ADMIN', 'TEAMLEADER']}>
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Employee Management</h2>
          <p className="text-muted-foreground">
            {filteredEmployees.length} employees
          </p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isDeleteTestUsersDialogOpen} onOpenChange={setIsDeleteTestUsersDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Test Users
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Test Users</DialogTitle>
                <DialogDescription>
                  This will permanently delete all test users (Test Employee, Jane Smith, Admin User) and their related data including attendance records, leave requests, warnings, penalties, and assignments. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsDeleteTestUsersDialogOpen(false)}
                  disabled={deletingTestUsers}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleDeleteTestUsers}
                  disabled={deletingTestUsers}
                >
                  {deletingTestUsers ? 'Deleting...' : 'Delete Test Users'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isExtractDialogOpen} onOpenChange={setIsExtractDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Extract from Attendance
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Extract Employees from Attendance Records</DialogTitle>
                <DialogDescription>
                  This will extract employee information from uploaded attendance records and populate the employee master data with random values for missing fields like department, designation, and salary.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsExtractDialogOpen(false)}
                  disabled={extracting}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleExtractEmployees}
                  disabled={extracting}
                >
                  {extracting ? 'Extracting...' : 'Extract Employees'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button asChild>
            <Link href="/employees/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Employees</p>
              <p className="text-2xl font-bold">{employees?.length || 0}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Team Leaders</p>
              <p className="text-2xl font-bold text-blue-600">
                {employees?.filter((e: Employee) => e.role === 'TEAMLEADER').length || 0}
              </p>
            </div>
            <Users className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Admins</p>
              <p className="text-2xl font-bold text-red-600">
                {employees?.filter((e: Employee) => e.role === 'ADMIN').length || 0}
              </p>
            </div>
            <Users className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg border">
        <div className="flex items-center space-x-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or employee code..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1) // Reset to first page when searching
            }}
            className="flex-1"
          />
        </div>

        <Select value={departmentFilter} onValueChange={(value) => {
          setDepartmentFilter(value)
          setCurrentPage(1)
        }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="Development">Development</SelectItem>
            <SelectItem value="Marketing">Marketing</SelectItem>
            <SelectItem value="HR">HR</SelectItem>
            <SelectItem value="Sales">Sales</SelectItem>
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={(value) => {
          setRoleFilter(value)
          setCurrentPage(1)
        }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="TEAMLEADER">Team Leader</SelectItem>
            <SelectItem value="EMPLOYEE">Employee</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(value) => {
          setStatusFilter(value)
          setCurrentPage(1)
        }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">EMPLOYEE CODE</TableHead>
              <TableHead className="font-semibold">NAME</TableHead>
              <TableHead className="font-semibold">EMAIL</TableHead>
              <TableHead className="font-semibold">DESIGNATION</TableHead>
              <TableHead className="font-semibold">ROLE</TableHead>
              <TableHead className="font-semibold">JOIN DATE</TableHead>
              <TableHead className="font-semibold">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No employees found</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedEmployees.map((employee: Employee) => (
                <TableRow key={employee.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-blue-600">
                    {employee.employeeCode}
                  </TableCell>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell className="text-muted-foreground">{employee.email}</TableCell>
                  <TableCell>{employee.designation}</TableCell>
                  <TableCell>
                    <Select 
                      value={employee.role} 
                      onValueChange={(newRole) => handleRoleChange(employee.id, employee.name, newRole)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue>
                          {getRoleBadge(employee.role)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">
                          <Badge className="bg-red-500 text-white">ADMIN</Badge>
                        </SelectItem>
                        <SelectItem value="TEAMLEADER">
                          <Badge className="bg-blue-500 text-white">TEAMLEADER</Badge>
                        </SelectItem>
                        <SelectItem value="EMPLOYEE">
                          <Badge className="bg-gray-500 text-white">EMPLOYEE</Badge>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {employee.joinDate ? format(new Date(employee.joinDate), 'dd MMM yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => handleEditEmployee(employee)}
                          className="flex items-center cursor-pointer"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                          className="flex items-center cursor-pointer text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalRecords > 0 && (
        <div className="flex items-center justify-between bg-white border rounded-lg px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select value={recordsPerPage.toString()} onValueChange={handleRecordsPerPageChange}>
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
              <span className="text-sm text-muted-foreground">entries</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, totalRecords)} of {totalRecords} entries
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  const distance = Math.abs(page - currentPage)
                  return distance <= 2 || page === 1 || page === totalPages
                })
                .map((page, index, array) => {
                  const showEllipsis = index > 0 && page - array[index - 1] > 1
                  return (
                    <div key={page} className="flex items-center">
                      {showEllipsis && (
                        <span className="px-2 py-1 text-sm text-muted-foreground">...</span>
                      )}
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    </div>
                  )
                })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information and settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">
                    Full Name *
                  </Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-email">
                    Email *
                  </Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-code">
                    Employee Code *
                  </Label>
                  <Input
                    id="edit-code"
                    value={editForm.employeeCode}
                    onChange={(e) => setEditForm({ ...editForm, employeeCode: e.target.value })}
                    placeholder="e.g., EMP001"
                  />
                </div>
              </div>
            </div>

            {/* Role & Designation */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Role & Designation</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-role">
                    Role
                  </Label>
                  <Select
                    value={editForm.role}
                    onValueChange={(value) => setEditForm({ ...editForm, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      <SelectItem value="TEAMLEADER">Team Leader</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-designation">
                    Designation
                  </Label>
                  <Input
                    id="edit-designation"
                    value={editForm.designation}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                    placeholder="e.g., SEO Specialist, Developer"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEmployee}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </RoleGuard>
  )
}
