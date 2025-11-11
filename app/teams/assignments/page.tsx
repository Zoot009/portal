'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Users, Plus, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

interface TeamMembership {
  id: number
  teamId: number
  teamName: string
  employeeId: number
  employeeName: string
  employeeCode: string
  teamLeaderId: number
  teamLeaderName: string
  role: 'MEMBER' | 'LEAD'
  assignedAt: string
}

const mockMemberships: TeamMembership[] = [
  {
    id: 1,
    teamId: 1,
    teamName: 'Frontend Development',
    employeeId: 1,
    employeeName: 'John Doe',
    employeeCode: 'EMP001',
    teamLeaderId: 2,
    teamLeaderName: 'Jane Smith',
    role: 'MEMBER',
    assignedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: 2,
    teamId: 1,
    teamName: 'Frontend Development',
    employeeId: 3,
    employeeName: 'Mike Johnson',
    employeeCode: 'EMP003',
    teamLeaderId: 2,
    teamLeaderName: 'Jane Smith',
    role: 'MEMBER',
    assignedAt: '2024-02-01T00:00:00Z'
  }
]

const mockTeams = [
  { id: 1, name: 'Frontend Development' },
  { id: 2, name: 'Backend Development' },
  { id: 3, name: 'Mobile App Team' }
]

const mockEmployees = [
  { id: 1, name: 'John Doe', code: 'EMP001' },
  { id: 2, name: 'Jane Smith', code: 'EMP002' },
  { id: 3, name: 'Mike Johnson', code: 'EMP003' }
]

export default function TeamAssignmentsPage() {
  const [selectedTeam, setSelectedTeam] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newAssignment, setNewAssignment] = useState({
    teamId: '',
    employeeId: '',
    teamLeaderId: '',
    role: 'MEMBER'
  })

  const { data: memberships, isLoading } = useQuery({
    queryKey: ['team-memberships', selectedTeam],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return mockMemberships
    }
  })

  const addMemberMutation = useMutation({
    mutationFn: async (data: typeof newAssignment) => {
      await new Promise(resolve => setTimeout(resolve, 1500))
      return { success: true }
    },
    onSuccess: () => {
      toast.success('Member assigned successfully!')
      setIsDialogOpen(false)
      setNewAssignment({ teamId: '', employeeId: '', teamLeaderId: '', role: 'MEMBER' })
    },
    onError: () => {
      toast.error('Failed to assign member')
    }
  })

  const removeMemberMutation = useMutation({
    mutationFn: async (id: number) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { success: true }
    },
    onSuccess: () => {
      toast.success('Member removed from team')
    },
    onError: () => {
      toast.error('Failed to remove member')
    }
  })

  const filteredMemberships = memberships?.filter(m =>
    selectedTeam === 'all' || m.teamId === Number(selectedTeam)
  ) || []

  const handleAddMember = () => {
    if (!newAssignment.teamId || !newAssignment.employeeId || !newAssignment.teamLeaderId) {
      toast.error('Please fill in all fields')
      return
    }
    addMemberMutation.mutate(newAssignment)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Team Assignments</h2>
          <p className="text-muted-foreground">
            Manage employee assignments to teams
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Assign Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Employee to Team</DialogTitle>
              <DialogDescription>
                Add a new member to a team with a designated team leader
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Team</Label>
                <Select
                  value={newAssignment.teamId}
                  onValueChange={(value) => setNewAssignment({...newAssignment, teamId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockTeams.map(team => (
                      <SelectItem key={team.id} value={String(team.id)}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select Employee</Label>
                <Select
                  value={newAssignment.employeeId}
                  onValueChange={(value) => setNewAssignment({...newAssignment, employeeId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockEmployees.map(emp => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.name} ({emp.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select Team Leader</Label>
                <Select
                  value={newAssignment.teamLeaderId}
                  onValueChange={(value) => setNewAssignment({...newAssignment, teamLeaderId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose team leader" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockEmployees.map(emp => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.name} ({emp.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={newAssignment.role}
                  onValueChange={(value: 'MEMBER' | 'LEAD') => setNewAssignment({...newAssignment, role: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="LEAD">Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddMember} disabled={addMemberMutation.isPending}>
                {addMemberMutation.isPending ? 'Assigning...' : 'Assign Member'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter by Team</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {mockTeams.map(team => (
                <SelectItem key={team.id} value={String(team.id)}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredMemberships.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {filteredMemberships.filter(m => m.role === 'MEMBER').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Leads</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {filteredMemberships.filter(m => m.role === 'LEAD').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Memberships</CardTitle>
          <CardDescription>
            All employee assignments across teams
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Team Leader</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMemberships.map((membership) => (
                <TableRow key={membership.id}>
                  <TableCell className="font-medium">{membership.teamName}</TableCell>
                  <TableCell>{membership.employeeName}</TableCell>
                  <TableCell>{membership.employeeCode}</TableCell>
                  <TableCell>{membership.teamLeaderName}</TableCell>
                  <TableCell>
                    <Badge variant={membership.role === 'LEAD' ? 'default' : 'outline'}>
                      {membership.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(membership.assignedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeMemberMutation.mutate(membership.id)}
                      disabled={removeMemberMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
