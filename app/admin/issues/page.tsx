'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertCircle, Loader2, Clock, CheckCircle2, Filter, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

interface Issue {
  id: number
  employeeId: number
  issueCategory: string
  issueDescription: string
  issueStatus: string
  raisedDate: string
  resolvedDate?: string | null
  adminResponse?: string | null
  daysElapsed: number
  employee: {
    id: number
    name: string
    employeeCode: string
    email: string
  }
}

export default function AdminIssuesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [responseDialog, setResponseDialog] = useState(false)
  const [adminResponse, setAdminResponse] = useState("")
  const [newStatus, setNewStatus] = useState("")
  const queryClient = useQueryClient()

  // Fetch all issues
  const { data: issuesData, isLoading } = useQuery({
    queryKey: ['admin-issues', statusFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      
      const response = await fetch(`/api/issues?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch issues')
      return response.json()
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const issues: Issue[] = issuesData?.data || []

  // Update issue mutation
  const updateIssueMutation = useMutation({
    mutationFn: async ({ id, status, response }: { id: number, status?: string, response?: string }) => {
      const res = await fetch(`/api/issues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueStatus: status,
          adminResponse: response,
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update issue')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Issue updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['admin-issues'] })
      setResponseDialog(false)
      setSelectedIssue(null)
      setAdminResponse("")
      setNewStatus("")
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update issue')
    },
  })

  const handleUpdateIssue = () => {
    if (!selectedIssue) return
    if (!newStatus && !adminResponse) {
      toast.error('Please provide a status or response')
      return
    }
    updateIssueMutation.mutate({
      id: selectedIssue.id,
      status: newStatus || undefined,
      response: adminResponse || undefined,
    })
  }

  const openResponseDialog = (issue: Issue) => {
    setSelectedIssue(issue)
    setAdminResponse(issue.adminResponse || "")
    setNewStatus(issue.issueStatus)
    setResponseDialog(true)
  }

  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toUpperCase()
    switch (normalizedStatus) {
      case "RESOLVED":
        return "bg-green-500/10 text-green-600 border-green-200"
      case "IN_PROGRESS":
      case "IN PROGRESS":
        return "bg-blue-500/10 text-blue-600 border-blue-200"
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-200"
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-200"
    }
  }

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      TECHNICAL: "bg-purple-500/10 text-purple-600 border-purple-200",
      HR: "bg-blue-500/10 text-blue-600 border-blue-200",
      FACILITY: "bg-green-500/10 text-green-600 border-green-200",
      ACCESS: "bg-orange-500/10 text-orange-600 border-orange-200",
      OTHER: "bg-gray-500/10 text-gray-600 border-gray-200",
    }
    return colors[category.toUpperCase()] || colors.OTHER
  }

  const filteredIssues = issues.filter(issue =>
    (issue.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.issueCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.issueDescription.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const stats = {
    total: issues.length,
    pending: issues.filter(i => i.issueStatus.toLowerCase() === "pending").length,
    inProgress: issues.filter(i => i.issueStatus.toLowerCase() === "in_progress" || i.issueStatus.toLowerCase() === "in progress").length,
    resolved: issues.filter(i => i.issueStatus.toLowerCase() === "resolved").length
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Issue Management</h2>
        <p className="text-muted-foreground">
          View and manage all employee issues
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search by employee, category, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="TECHNICAL">Technical</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="FACILITY">Facility</SelectItem>
                  <SelectItem value="ACCESS">Access</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      <Card>
        <CardHeader>
          <CardTitle>All Issues</CardTitle>
          <CardDescription>Manage and respond to employee issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredIssues.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'No issues found matching your filters.'
                  : 'No issues reported yet.'}
              </div>
            ) : (
              filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-base">{issue.employee.name}</span>
                          <span className="text-sm text-muted-foreground">({issue.employee.employeeCode})</span>
                          <Badge className={getCategoryBadge(issue.issueCategory)} variant="outline">
                            {issue.issueCategory}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{issue.issueDescription}</p>
                        {issue.adminResponse && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-xs font-semibold text-blue-900 mb-1">Admin Response:</p>
                            <p className="text-sm text-blue-800">{issue.adminResponse}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end flex-shrink-0 ml-4">
                      <Badge className={getStatusColor(issue.issueStatus)} variant="outline">
                        {issue.issueStatus.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openResponseDialog(issue)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Respond
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3 pl-13">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Created: {new Date(issue.raisedDate).toLocaleDateString()}</span>
                    </div>
                    {issue.issueStatus.toLowerCase() === "resolved" && issue.resolvedDate && (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Resolved: {new Date(issue.resolvedDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {issue.issueStatus.toLowerCase() !== "resolved" && (
                      <div className="flex items-center gap-1">
                        <span>{issue.daysElapsed} {issue.daysElapsed === 1 ? 'day' : 'days'} elapsed</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Response Dialog */}
      <Dialog open={responseDialog} onOpenChange={setResponseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Respond to Issue</DialogTitle>
            <DialogDescription>
              Update the issue status and provide a response to {selectedIssue?.employee.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedIssue && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold">{selectedIssue.employee.name}</span>
                  <Badge className={getCategoryBadge(selectedIssue.issueCategory)} variant="outline">
                    {selectedIssue.issueCategory}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{selectedIssue.issueDescription}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="response">Admin Response</Label>
                <Textarea
                  id="response"
                  placeholder="Provide your response to this issue..."
                  rows={6}
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResponseDialog(false)
                setSelectedIssue(null)
                setAdminResponse("")
                setNewStatus("")
              }}
              disabled={updateIssueMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateIssue}
              disabled={updateIssueMutation.isPending}
            >
              {updateIssueMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Issue'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
