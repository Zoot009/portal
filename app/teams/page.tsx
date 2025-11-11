'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { Search, Plus, Users, Crown, Edit, Eye, UserCheck, Save, X, ChevronDown, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface TeamMember {
  id: number
  name: string
  employeeCode: string
  role: string
  department?: string
}

interface TeamLeader {
  id: number
  name: string
  employeeCode: string
}

interface TeamData {
  id: number
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  memberCount: number
  teamLeader: TeamLeader | null
  members: TeamMember[]
}

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

export default function TeamsPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Fetch teams from API
  const { data: teamsResponse, isLoading, error } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await fetch('/api/teams')
      if (!response.ok) {
        throw new Error('Failed to fetch teams')
      }
      return response.json()
    }
  })

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: number) => {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete team')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Team deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      handleCloseDialog()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete team')
    }
  })

  const handleViewClick = (team: TeamData) => {
    setSelectedTeam(team)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setSelectedTeam(null)
  }

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!selectedTeam) return
    deleteTeamMutation.mutate(selectedTeam.id)
    setIsDeleteDialogOpen(false)
  }

  // Transform API data to match the component's expected structure
  const teams: TeamData[] = teamsResponse?.data?.map((team: any) => {
    // Group memberships by team leader
    const membershipsByLeader = team.memberships.reduce((acc: any, membership: any) => {
      const leaderId = membership.teamLeaderId
      if (!acc[leaderId]) {
        acc[leaderId] = {
          teamLeader: membership.teamLeader,
          members: []
        }
      }
      acc[leaderId].members.push({
        id: membership.employee.id,
        name: membership.employee.name,
        employeeCode: membership.employee.employeeCode,
        department: membership.employee.department,
        role: membership.role
      })
      return acc
    }, {})

    // Get the first team leader (you can modify this logic as needed)
    const firstLeaderGroup = Object.values(membershipsByLeader)[0] as any
    
    return {
      id: team.id,
      name: team.name,
      description: team.description,
      isActive: team.isActive,
      createdAt: team.createdAt,
      memberCount: team._count.memberships,
      teamLeader: firstLeaderGroup?.teamLeader || null,
      members: firstLeaderGroup?.members || []
    }
  }) || []

  const filteredTeams = teams?.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (team.description && team.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (team.teamLeader && team.teamLeader.name.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || []

  const totalMembers = teams?.reduce((sum, team) => sum + team.memberCount, 0) || 0
  const activeTeams = teams?.filter(team => team.isActive).length || 0

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Loading teams...</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold">Failed to load teams</h3>
            <p className="text-muted-foreground text-center">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Teams</h2>
          <p className="text-muted-foreground">
            Manage your teams and collaborate effectively
          </p>
        </div>
        <Button asChild size="lg" className="shadow-md">
          <Link href="/teams/create">
            <Plus className="mr-2 h-5 w-5" />
            Create Team
          </Link>
        </Button>
      </div>

      {/* Team Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teams?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeTeams} active • {teams?.length - activeTeams} inactive
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all teams
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Team Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teams?.length ? Math.round(totalMembers / teams.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Members per team
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search teams by name, description, or team leader..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12 text-base"
        />
      </div>

      {/* Teams Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTeams.map((team) => (
          <Card 
            key={team.id} 
            className="hover:shadow-md transition-all hover:border-primary/50 cursor-pointer"
            onClick={() => handleViewClick(team)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 flex-1 min-w-0">
                  <h3 className="text-lg font-semibold leading-none truncate">
                    {team.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{team.memberCount} member{team.memberCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <Badge variant={team.isActive ? 'default' : 'secondary'} className="text-xs shrink-0">
                  {team.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {team.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {team.description}
                </p>
              )}
            </CardHeader>
            
            <CardContent className="space-y-3 pt-0">
              {/* Team Leader */}
              {team.teamLeader ? (
                <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg border">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-muted text-foreground text-xs">
                      {team.teamLeader.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">
                      {team.teamLeader.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {team.teamLeader.employeeCode}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">Leader</Badge>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg border border-dashed">
                  <Crown className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">No leader assigned</p>
                </div>
              )}
              
              {/* Team Members Preview */}
              {team.members && team.members.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-2">
                      {team.members.slice(0, 4).map((member, idx) => (
                        <div
                          key={member.id}
                          className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-xs font-semibold text-primary-foreground ring-2 ring-background"
                          style={{ zIndex: 4 - idx }}
                        >
                          {member.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                      ))}
                      {team.memberCount > 4 && (
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium ring-2 ring-background">
                          +{team.memberCount - 4}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3">
                  <Users className="h-8 w-8 text-muted-foreground/20 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">No members yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>    {/* Team Details Dialog */}
    <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" showCloseButton={false}>
        <DialogHeader>
          <div>
            <DialogTitle className="text-2xl">{selectedTeam?.name}</DialogTitle>
            {selectedTeam?.description && (
              <DialogDescription className="text-base mt-2">
                {selectedTeam.description}
              </DialogDescription>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
            {/* Team Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{selectedTeam?.memberCount} member{selectedTeam?.memberCount !== 1 ? 's' : ''}</span>
              </div>
              {selectedTeam?.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedTeam.description}
                </p>
              )}
            </div>

            {/* Team Leader */}
            {selectedTeam?.teamLeader && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Team Leader</Label>
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-muted text-foreground font-medium">
                      {selectedTeam.teamLeader.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{selectedTeam.teamLeader.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedTeam.teamLeader.employeeCode}
                    </p>
                  </div>
                  <Badge variant="outline">Leader</Badge>
                </div>
              </div>
            )}

            {/* Team Members */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Team Members</Label>
                <span className="text-xs text-muted-foreground">
                  {selectedTeam?.members.length || 0} member{selectedTeam?.members.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              {selectedTeam && selectedTeam.members.length > 0 ? (
                <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                  {selectedTeam.members.map((member) => (
                    <div 
                      key={member.id} 
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-muted text-foreground text-xs">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.employeeCode}
                          {member.department && ` • ${member.department}`}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Member
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 border border-dashed rounded-lg text-center">
                  <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No team members</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                className="flex-1 h-11"
                asChild
              >
                <Link href={`/teams/${selectedTeam?.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Team
                </Link>
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteClick}
                disabled={deleteTeamMutation.isPending}
                className="h-11"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCloseDialog}
                className="h-11"
              >
                Close
              </Button>
            </div>
          </div>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Team</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <span className="font-semibold text-foreground">"{selectedTeam?.name}"</span>? 
            This action cannot be undone and will remove all team data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDeleteConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Team
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

      {filteredTeams.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No teams found</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {searchTerm 
                ? "No teams match your search criteria. Try a different search term."
                : "Get started by creating your first team to organize your workforce."
              }
            </p>
            {!searchTerm && (
              <Button asChild size="lg" className="shadow-md">
                <Link href="/teams/create">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Your First Team
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}