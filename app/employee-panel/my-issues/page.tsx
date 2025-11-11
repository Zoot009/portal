"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertCircle, Plus, Clock, CheckCircle2, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

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
  employee?: {
    id: number
    name: string
    employeeCode: string
    email: string
  }
}

interface IssueFormData {
  category: string
  description: string
}

export default function MyIssuesPage() {
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [newIssue, setNewIssue] = useState<IssueFormData>({
    category: "",
    description: ""
  })
  const queryClient = useQueryClient()

  // Fetch employee info
  const { data: authData } = useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me')
      if (!response.ok) throw new Error('Failed to fetch user data')
      return response.json()
    },
  })

  const employeeId = authData?.employee?.id

  // Fetch issues for the current employee
  const { data: issuesData, isLoading } = useQuery({
    queryKey: ['my-issues', employeeId],
    queryFn: async () => {
      if (!employeeId) return null
      const response = await fetch(`/api/issues?employeeId=${employeeId}`)
      if (!response.ok) throw new Error('Failed to fetch issues')
      return response.json()
    },
    enabled: !!employeeId,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const issues: Issue[] = issuesData?.data || []

  // Create issue mutation
  const createIssueMutation = useMutation({
    mutationFn: async (data: IssueFormData) => {
      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          issueCategory: data.category,
          issueDescription: data.description,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create issue')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Issue reported successfully!')
      queryClient.invalidateQueries({ queryKey: ['my-issues', employeeId] })
      setShowForm(false)
      setNewIssue({ category: "", description: "" })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to report issue')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newIssue.category || !newIssue.description) {
      toast.error('Please fill in all fields')
      return
    }
    if (!employeeId) {
      toast.error('Employee ID not found')
      return
    }
    createIssueMutation.mutate(newIssue)
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
    issue.issueCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.issueDescription.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Issues</h2>
          <p className="text-muted-foreground">
            Report and track your workplace issues
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Report Issue
        </Button>
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

      {/* Issue Reporting Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report New Issue</DialogTitle>
            <DialogDescription>
              Describe your issue and we'll help resolve it
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={newIssue.category}
                onValueChange={(value) => setNewIssue({...newIssue, category: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TECHNICAL">Technical</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="FACILITY">Facility</SelectItem>
                  <SelectItem value="ACCESS">Access</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the issue in detail..."
                rows={5}
                value={newIssue.description}
                onChange={(e) => setNewIssue({...newIssue, description: e.target.value})}
                className="resize-none"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowForm(false)
                  setNewIssue({ category: "", description: "" })
                }}
                disabled={createIssueMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createIssueMutation.isPending || !newIssue.category || !newIssue.description}>
                {createIssueMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Issue'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Issues List */}
      <Card>
        <CardHeader>
          <CardTitle>All Issues</CardTitle>
          <CardDescription>Track the status of your reported issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              placeholder="Search issues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="space-y-3">
              {filteredIssues.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {searchTerm ? 'No issues found matching your search.' : 'No issues reported yet.'}
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
                            <Badge className={getCategoryBadge(issue.issueCategory)} variant="outline">
                              {issue.issueCategory}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{issue.issueDescription}</p>
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
