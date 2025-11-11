'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmployeeAvatar } from '@/components/employee-avatar'
import { Separator } from '@/components/ui/separator'
import { Search, Mail, Briefcase, Award, Eye, User } from 'lucide-react'

interface Employee {
  id: number
  name: string
  email: string
  employeeCode: string
  role: string
  department?: string
  designation?: string
  isActive: boolean
  passportPhoto?: string
}

export default function EmployeeDetailsPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const { data: employeesResponse, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await fetch('/api/employees')
      if (!response.ok) throw new Error('Failed to fetch employees')
      const result = await response.json()
      return result.data || []
    }
  })

  const employees = employeesResponse || []

  const filteredEmployees = employees.filter((employee: Employee) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      employee.name.toLowerCase().includes(searchLower) ||
      employee.email.toLowerCase().includes(searchLower) ||
      employee.employeeCode.toLowerCase().includes(searchLower) ||
      employee.designation?.toLowerCase().includes(searchLower)
    )
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading employee details...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Employee Details</h2>
        <p className="text-muted-foreground">
          View detailed profiles and information submitted by employees
        </p>
      </div>

      <div className="flex items-center space-x-2 bg-white p-4 rounded-lg border">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, code, or designation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 border-0 focus-visible:ring-0"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredEmployees.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No employees found</p>
          </div>
        ) : (
          filteredEmployees.map((employee: Employee) => (
            <Card key={employee.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <EmployeeAvatar 
                      name={employee.name}
                      passportPhoto={employee.passportPhoto}
                      className="h-12 w-12"
                    />
                    <div>
                      <CardTitle className="text-lg">{employee.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{employee.employeeCode}</p>
                    </div>
                  </div>
                  <Badge variant={employee.isActive ? 'default' : 'secondary'} className="text-xs">
                    {employee.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{employee.designation || 'No designation'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{employee.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Award className="h-4 w-4" />
                    <span>{employee.department || 'No department'}</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {employee.role}
                  </Badge>
                  <Link href={`/employees/details/${employee.id}`}>
                    <Button 
                      size="sm" 
                      variant="outline"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Profile
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}