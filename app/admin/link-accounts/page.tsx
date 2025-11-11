'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, CheckCircle2, AlertCircle, Users, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'

interface EmployeeLink {
  id: number
  employeeCode: string
  name: string
  email: string
  role: string
  designation: string | null
  clerkUserId: string | null
  lastLogin: string | null
}

export default function LinkAccountsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'linked' | 'unlinked'>('unlinked')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Fetch all employees with their link status
  const { data: employeeData, isLoading } = useQuery({
    queryKey: ['employee-links'],
    queryFn: async () => {
      const response = await fetch('/api/admin/employee-links')
      if (!response.ok) throw new Error('Failed to fetch employee links')
      return response.json()
    }
  })

  const allEmployees: EmployeeLink[] = employeeData?.employees || []
  const unlinkedCount = employeeData?.unlinkedCount || 0
  const linkedCount = employeeData?.linkedCount || 0

  // Filter employees based on status and search
  const filteredEmployees = allEmployees
    .filter(emp => {
      if (filterStatus === 'linked') return emp.clerkUserId !== null
      if (filterStatus === 'unlinked') return emp.clerkUserId === null
      return true
    })
    .filter(emp =>
      emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase())
    )

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  const handleFilterChange = (value: any) => {
    setFilterStatus(value)
    setCurrentPage(1)
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Account Link Status</h2>
        <p className="text-muted-foreground">
          Monitor and manage Clerk authentication links for employees. Accounts are automatically linked on first login.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : employeeData?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active employees in system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Linked Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? '...' : linkedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Employees with Clerk links
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              Unlinked Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {isLoading ? '...' : unlinkedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Employees needing links
            </p>
          </CardContent>
        </Card>
      </div>



      {/* Employees List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Employee Account Links</CardTitle>
              <CardDescription>Manage Clerk authentication links for all employees</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select value={filterStatus} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="linked">Linked</SelectItem>
                  <SelectItem value="unlinked">Unlinked</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-lg font-medium">
                {searchTerm || filterStatus !== 'all' ? 'No matching employees found' : 'No employees found'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your filters or search terms
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-center">Link Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmployees.map((employee) => {
                    const isLinked = !!employee.clerkUserId
                    
                    return (
                      <TableRow key={employee.id}>
                        <TableCell className="font-mono font-medium">
                          {employee.employeeCode}
                        </TableCell>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {employee.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            employee.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            employee.role === 'TEAMLEADER' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-gray-50 text-gray-700 border-gray-200'
                          }>
                            {employee.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{employee.designation || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {employee.lastLogin ? format(new Date(employee.lastLogin), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <Badge variant={isLinked ? "default" : "secondary"} className={
                              isLinked 
                                ? 'bg-green-100 text-green-800 border-green-200' 
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }>
                              {isLinked ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Linked
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Unlinked
                                </>
                              )}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredEmployees.length)} of {filteredEmployees.length} employees
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-10"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
