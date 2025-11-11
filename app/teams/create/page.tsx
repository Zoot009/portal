'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ArrowLeft, Save, Users, X, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Employee {
  id: number
  name: string
  employeeCode: string
  role: string
  department: string | null
  designation: string | null
}

interface TeamFormData {
  name: string
  description: string
  isActive: boolean
  teamLeaderId: number
  memberIds: number[]
}

export default function CreateTeamPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<TeamFormData>({
    name: '',
    description: '',
    isActive: true,
    teamLeaderId: 0,
    memberIds: []
  })

  // Fetch real employees from API
  const { data: employeesResponse, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await fetch('/api/employees')
      if (!response.ok) {
        throw new Error('Failed to fetch employees')
      }
      return response.json()
    }
  })

  const employees: Employee[] = employeesResponse?.data || []

  const createTeamMutation = useMutation({
    mutationFn: async (data: TeamFormData) => {
      // Step 1: Create the team
      const teamResponse = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          isActive: data.isActive,
        }),
      })

      if (!teamResponse.ok) {
        const error = await teamResponse.json()
        throw new Error(error.error || 'Failed to create team')
      }

      const teamResult = await teamResponse.json()
      const teamId = teamResult.data.id

      // Step 2: Add team members with the selected leader
      const membershipPromises = data.memberIds.map(async (employeeId) => {
        const response = await fetch('/api/teams/memberships', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            teamId: teamId,
            employeeId: employeeId,
            teamLeaderId: data.teamLeaderId,
            role: 'MEMBER',
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          console.error('Failed to add member:', error)
        }

        return response.json()
      })

      await Promise.all(membershipPromises)

      return { success: true, teamId }
    },
    onSuccess: () => {
      toast.success('Team created successfully!')
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      router.push('/teams')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create team')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Team name is required')
      return
    }

    if (!formData.teamLeaderId) {
      toast.error('Please select a team leader')
      return
    }

    if (formData.memberIds.length === 0) {
      toast.error('Please add at least one team member')
      return
    }

    createTeamMutation.mutate(formData)
  }

  const handleInputChange = (field: keyof TeamFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addMember = (employeeId: number) => {
    if (!formData.memberIds.includes(employeeId) && employeeId !== formData.teamLeaderId) {
      setFormData(prev => ({
        ...prev,
        memberIds: [...prev.memberIds, employeeId]
      }))
    }
  }

  const removeMember = (employeeId: number) => {
    setFormData(prev => ({
      ...prev,
      memberIds: prev.memberIds.filter(id => id !== employeeId)
    }))
  }

  const getEmployeeById = (id: number) => {
    return employees?.find(emp => emp.id === id)
  }

  const availableEmployees = employees?.filter(emp => 
    !formData.memberIds.includes(emp.id) && emp.id !== formData.teamLeaderId
  ) || []

  // Filter for employees with TEAMLEADER or ADMIN role
  const teamLeaders = employees?.filter(emp => 
    emp.role === 'TEAMLEADER' || emp.role === 'ADMIN'
  ) || []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Loading...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/teams">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Teams
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Create New Team</h2>
          <p className="text-muted-foreground">
            Set up a new team with members and team leader
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Team Information */}
        <Card>
          <CardHeader>
            <CardTitle>Team Information</CardTitle>
            <CardDescription>
              Enter the basic details for the new team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter team name (e.g., Frontend Development Team)"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the team's purpose and responsibilities..."
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Leader Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Team Leader</CardTitle>
            <CardDescription>
              Select a team leader to manage this team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teamLeader">Team Leader *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {formData.teamLeaderId > 0
                      ? getEmployeeById(formData.teamLeaderId)?.name
                      : "Select a team leader"}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[700px] p-4" align="start">
                  <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto">
                    {teamLeaders.map((leader) => (
                      <Badge
                        key={leader.id}
                        variant={formData.teamLeaderId === leader.id ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-3 py-1 text-xs"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            teamLeaderId: leader.id,
                            memberIds: prev.memberIds.filter(id => id !== leader.id)
                          }))
                        }}
                      >
                        {leader.name} ({leader.employeeCode})
                      </Badge>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            {formData.teamLeaderId > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback>
                        {getEmployeeById(formData.teamLeaderId)?.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{getEmployeeById(formData.teamLeaderId)?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {getEmployeeById(formData.teamLeaderId)?.employeeCode} • {getEmployeeById(formData.teamLeaderId)?.department}
                      </p>
                    </div>
                    <Badge variant="default">Team Leader</Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        teamLeaderId: 0
                      }))
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Add team members to this team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Member Dropdown */}
            <div className="space-y-2">
              <Label>Add Team Member</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    Select employees to add
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[700px] p-4" align="start">
                  <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto">
                    {availableEmployees.length > 0 ? (
                      availableEmployees.map((employee) => (
                        <Badge
                          key={employee.id}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-3 py-1 text-xs"
                          onClick={() => addMember(employee.id)}
                        >
                          {employee.name} ({employee.employeeCode})
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No employees available to add</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Selected Members */}
            <div className="space-y-2">
              <Label>Team Members ({formData.memberIds.length})</Label>
              {formData.memberIds.length === 0 ? (
                <div className="p-6 border-2 border-dashed border-muted-foreground/25 rounded-lg text-center">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No team members added yet</p>
                  <p className="text-sm text-muted-foreground">Select employees from the dropdown above</p>
                </div>
              ) : (
                <div className="border rounded-lg p-4 min-h-[60px]">
                  <div className="flex flex-wrap gap-2">
                    {formData.memberIds.map((memberId) => {
                      const member = getEmployeeById(memberId)
                      if (!member) return null
                      
                      return (
                        <Badge
                          key={memberId}
                          variant="secondary"
                          className="px-3 py-1 text-xs pr-1"
                        >
                          {member.name} ({member.employeeCode})
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 ml-2 hover:bg-transparent"
                            onClick={() => removeMember(memberId)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Team Summary</CardTitle>
            <CardDescription>
              Review the team configuration before creating
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium">Team Name</p>
                <p className="text-muted-foreground">{formData.name || 'Not set'}</p>
              </div>
              <div>
                <p className="font-medium">Team Leader</p>
                <p className="text-muted-foreground">
                  {formData.teamLeaderId > 0 
                    ? getEmployeeById(formData.teamLeaderId)?.name 
                    : 'Not selected'
                  }
                </p>
              </div>
              <div>
                <p className="font-medium">Total Members</p>
                <p className="text-muted-foreground">{formData.memberIds.length + 1} (including leader)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/teams">Cancel</Link>
          </Button>
          <Button 
            type="submit" 
            disabled={createTeamMutation.isPending}
            className="min-w-32"
          >
            {createTeamMutation.isPending ? (
              <>Creating...</>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Team
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}