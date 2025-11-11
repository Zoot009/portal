'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ArrowLeft, Save, Users, X, ChevronDown, Loader2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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

export default function EditTeamPage() {
  const router = useRouter()
  const params = useParams()
  const queryClient = useQueryClient()
  const teamId = parseInt(params.id as string)

  const [formData, setFormData] = useState<TeamFormData>({
    name: '',
    description: '',
    isActive: true,
    teamLeaderId: 0,
    memberIds: []
  })

  // Fetch team data
  const { data: teamResponse, isLoading: isLoadingTeam } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const response = await fetch(`/api/teams/${teamId}`)
      if (!response.ok) throw new Error('Failed to fetch team')
      return response.json()
    }
  })

  // Fetch employees
  const { data: employeesResponse, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await fetch('/api/employees')
      if (!response.ok) throw new Error('Failed to fetch employees')
      return response.json()
    }
  })

  const employees: Employee[] = employeesResponse?.data || []
  const teamLeaders = employees?.filter(emp => 
    emp.role === 'TEAMLEADER' || emp.role === 'ADMIN'
  ) || []

  // Initialize form data when team loads
  useEffect(() => {
    if (teamResponse?.data) {
      const team = teamResponse.data
      const membershipsByLeader = team.memberships?.reduce((acc: any, membership: any) => {
        const leaderId = membership.teamLeaderId
        if (!acc[leaderId]) {
          acc[leaderId] = {
            teamLeader: membership.teamLeader,
            members: []
          }
        }
        acc[leaderId].members.push(membership.employee.id)
        return acc
      }, {})

      const firstLeaderGroup = Object.values(membershipsByLeader || {})[0] as any

      setFormData({
        name: team.name,
        description: team.description || '',
        isActive: team.isActive,
        teamLeaderId: firstLeaderGroup?.teamLeader?.id || 0,
        memberIds: firstLeaderGroup?.members || []
      })
    }
  }, [teamResponse])

  const updateTeamMutation = useMutation({
    mutationFn: async (data: TeamFormData) => {
      // Update team basic info
      const teamResponse = await fetch(`/api/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          isActive: data.isActive,
        }),
      })

      if (!teamResponse.ok) {
        const error = await teamResponse.json()
        throw new Error(error.error || 'Failed to update team')
      }

      // Delete existing memberships
      await fetch(`/api/teams/${teamId}/memberships`, {
        method: 'DELETE',
      })

      // Add new team members
      const membershipPromises = data.memberIds.map(async (employeeId) => {
        const response = await fetch('/api/teams/memberships', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

      return { success: true }
    },
    onSuccess: () => {
      toast.success('Team updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['team', teamId] })
      router.push('/teams')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update team')
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

    updateTeamMutation.mutate(formData)
  }

  const getEmployeeById = (id: number) => {
    return employees?.find(emp => emp.id === id)
  }

  const toggleMember = (employeeId: number) => {
    setFormData(prev => {
      const isSelected = prev.memberIds.includes(employeeId)
      if (isSelected) {
        return {
          ...prev,
          memberIds: prev.memberIds.filter(id => id !== employeeId)
        }
      } else {
        return {
          ...prev,
          memberIds: [...prev.memberIds, employeeId]
        }
      }
    })
  }

  const selectTeamLeader = (leaderId: number) => {
    setFormData(prev => ({
      ...prev,
      teamLeaderId: leaderId,
      memberIds: prev.memberIds.filter(id => id !== leaderId)
    }))
  }

  const availableEmployees = employees?.filter(emp => 
    !formData.memberIds.includes(emp.id) && emp.id !== formData.teamLeaderId
  ) || []

  if (isLoadingTeam || isLoadingEmployees) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading team...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/teams">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Teams
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Team</h2>
          <p className="text-muted-foreground">
            Update team information and members
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Team Information</CardTitle>
            <CardDescription>
              Update the basic details for this team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter team name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the team's purpose and responsibilities..."
                rows={3}
              />
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
                        onClick={() => selectTeamLeader(leader.id)}
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
                    onClick={() => setFormData(prev => ({ ...prev, teamLeaderId: 0 }))}
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
                          onClick={() => toggleMember(employee.id)}
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
                            onClick={() => toggleMember(memberId)}
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

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/teams">Cancel</Link>
          </Button>
          <Button 
            type="submit" 
            disabled={updateTeamMutation.isPending}
            className="min-w-32"
          >
            {updateTeamMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
