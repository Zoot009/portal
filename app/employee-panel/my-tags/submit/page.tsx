"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Send, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useUser } from "@clerk/nextjs"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"

interface TagEntry {
  id: number
  tagId: string
  tagName: string
  count: string
  minutes: string
}

interface AssignedTag {
  id: number
  tagId: number
  isMandatory: boolean
  tag: {
    id: number
    tagName: string
    timeMinutes: number
    category: string | null
    isActive: boolean
  }
}

export default function SubmitTagsPage() {
  const { user } = useUser()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [tagEntries, setTagEntries] = useState<TagEntry[]>([
    { id: 1, tagId: "", tagName: "", count: "", minutes: "" }
  ])
  


  // Calculate date restrictions (today and yesterday only)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const maxDate = today.toISOString().split('T')[0]
  const minDate = yesterday.toISOString().split('T')[0]

  // Fetch employee data to get employeeId
  const { data: employeeData, isLoading: employeeLoading, error: employeeError, refetch: refetchEmployee } = useQuery({
    queryKey: ['employee-profile', user?.id],
    queryFn: async () => {
      const clerkUserId = user?.id
      if (!clerkUserId) throw new Error('No user ID found')
      
      console.log('Fetching employee with Clerk User ID:', clerkUserId)
      console.log('User data:', { 
        id: user?.id, 
        username: user?.username, 
        email: user?.primaryEmailAddress?.emailAddress 
      })
      
      // First try by Clerk user ID
      let response = await fetch(`/api/employees?clerkUserId=${encodeURIComponent(clerkUserId)}`)
      if (!response.ok) throw new Error('Failed to fetch employee')
      let result = await response.json()
      
      console.log('Employee lookup by clerkUserId result:', result)
      
      // If found by Clerk ID, return it
      if (result.data && result.data.length > 0) {
        console.log('Found employee by Clerk ID:', result.data[0])
        return { data: result.data[0] }
      }
      
      // Fallback: try by email or username
      const searchTerm = user?.primaryEmailAddress?.emailAddress || user?.username
      if (searchTerm) {
        console.log('Fallback: searching by email/username:', searchTerm)
        response = await fetch(`/api/employees?search=${encodeURIComponent(searchTerm)}`)
        if (!response.ok) throw new Error('Failed to fetch employee')
        result = await response.json()
        
        console.log('Employee search result:', result)
        
        if (result.data && result.data.length > 0) {
          console.log('Found employee:', result.data[0])
          return { data: result.data[0] }
        }
      }
      
      throw new Error('Employee not found')
    },
    enabled: !!user?.id
  })

  // Fetch assigned tags for this employee
  const { data: assignedTagsData, isLoading: tagsLoading, error: tagsError, refetch: refetchTags } = useQuery({
    queryKey: ['assigned-tags', employeeData?.data?.id],
    queryFn: async () => {
      const employeeId = employeeData?.data?.id
      if (!employeeId) throw new Error('No employee ID')
      
      console.log('Fetching assignments for employee ID:', employeeId)
      console.log('Employee Code:', employeeData?.data?.employeeCode)
      const response = await fetch(`/api/assignments?employeeId=${employeeId}`)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to fetch assigned tags:', response.status, errorText)
        throw new Error('Failed to fetch assigned tags')
      }
      const result = await response.json()
      console.log('Assignments API response:', result)
      console.log('Number of assignments found:', result.assignments?.length || 0)
      if (result.assignments && result.assignments.length > 0) {
        console.log('First assignment:', result.assignments[0])
      }
      return result
    },
    enabled: !!employeeData?.data?.id
  })

  // Check submission status for the selected date
  const { data: submissionStatusData, isLoading: submissionLoading, refetch: refetchSubmission } = useQuery({
    queryKey: ['submission-status', employeeData?.data?.id, date],
    queryFn: async () => {
      const employeeId = employeeData?.data?.id
      if (!employeeId) throw new Error('No employee ID')
      
      const response = await fetch(`/api/logs/submission-status?employeeId=${employeeId}&date=${date}`)
      if (!response.ok) {
        throw new Error('Failed to check submission status')
      }
      const result = await response.json()
      return result
    },
    enabled: !!employeeData?.data?.id && !!date
  })

  const assignedTags: AssignedTag[] = assignedTagsData?.assignments || []
  
  // Debug: Log assigned tags
  useEffect(() => {
    if (assignedTags.length > 0) {
      console.log('✅ Assigned tags loaded successfully:', assignedTags.length)
      console.log('Tags:', assignedTags)
    } else if (employeeData?.data?.id && !tagsLoading) {
      console.log('⚠️ No assigned tags found for employee:', employeeData?.data)
    }
  }, [assignedTags, employeeData, tagsLoading])

  // Populate form with submitted data when date changes
  useEffect(() => {
    if (submissionStatusData?.logs && submissionStatusData.logs.length > 0) {
      const submittedLogs = submissionStatusData.logs
      const newEntries = submittedLogs.map((log: any) => ({
        id: log.id,
        tagId: log.tagId.toString(),
        tagName: log.tag.tagName,
        count: log.count.toString(),
        minutes: log.totalMinutes.toString(),
      }))
      setTagEntries(newEntries)
    } else {
      // Reset form when switching to an unsubmitted date
      setTagEntries([{ id: 1, tagId: "", tagName: "", count: "", minutes: "" }])
    }
  }, [submissionStatusData, date])

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isSubmitting) return

    // Validate date is within allowed range
    const selectedDate = new Date(date)
    const todayDate = new Date(today.toISOString().split('T')[0])
    const yesterdayDate = new Date(yesterday.toISOString().split('T')[0])
    
    if (selectedDate < yesterdayDate || selectedDate > todayDate) {
      toast.error("You can only submit work logs for today or yesterday")
      return
    }
    
    // Check if any tags have been filled
    const hasData = tagEntries.some(e => e.count && parseInt(e.count) > 0)
    if (!hasData) {
      toast.error("Please enter count for at least one task")
      return
    }

    // Check mandatory tags
    const mandatoryTags = assignedTags.filter(a => a.isMandatory)
    const submittedTagIds = tagEntries
      .filter(e => e.count && parseInt(e.count) > 0)
      .map(e => parseInt(e.tagId))
    
    const missingMandatory = mandatoryTags.filter(mt => !submittedTagIds.includes(mt.tagId))
    
    if (missingMandatory.length > 0) {
      const missingNames = missingMandatory.map(mt => mt.tag.tagName).join(', ')
      toast.error(`Mandatory tasks must be completed: ${missingNames}`)
      return
    }

    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/logs/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employeeData?.data?.id,
          date: date,
          tags: tagEntries
            .filter(e => e.count && parseInt(e.count) > 0)
            .map(e => ({
              tagId: e.tagId,
              count: e.count,
              minutes: e.minutes,
            })),
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success(result.message || 'Tags submitted successfully!')
        // Clear the form
        setTagEntries([{ id: 1, tagId: "", tagName: "", count: "", minutes: "" }])
        // Refetch submission status
        refetchSubmission()
      } else {
        toast.error(result.error || 'Failed to submit tags')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Failed to submit tags. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalCount = tagEntries.reduce((sum, entry) => sum + (parseInt(entry.count) || 0), 0)
  const totalMinutes = tagEntries.reduce((sum, entry) => sum + (parseInt(entry.minutes) || 0), 0)
  
  // Convert minutes to HH:MM format
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const timeFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`



  // Check if date is already submitted
  const isDateSubmitted = submissionStatusData?.isSubmitted || false

  // Show loading state
  if (employeeLoading || tagsLoading || submissionLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">
          {employeeLoading ? 'Loading employee data...' : submissionLoading ? 'Checking submission status...' : 'Loading assigned tags...'}
        </p>
      </div>
    )
  }

  // Auto-retry if employee not found (automatic linking should work)
  if (employeeError || !employeeData?.data) {
    // Automatically retry every 2 seconds - the auto-linking should fix it
    setTimeout(() => {
      refetchEmployee()
    }, 2000)

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Submit Logs</h2>
          <p className="text-muted-foreground">
            Log your daily work activities and time spent
          </p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <div className="space-y-2">
                <p className="text-lg font-semibold">Setting up your account...</p>
                <p className="text-sm text-muted-foreground">
                  We're automatically linking your account. This will just take a moment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show error or empty state for tags
  if (tagsError || !assignedTags || assignedTags.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Submit Logs</h2>
          <p className="text-muted-foreground">
            Log your daily work activities and time spent
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-muted-foreground mb-2">
              No tags have been assigned to you yet.
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Employee ID: <strong>{employeeData?.data?.id}</strong></p>
              <p>Employee Code: <strong>{employeeData?.data?.employeeCode}</strong></p>
              <p>Name: <strong>{employeeData?.data?.name}</strong></p>
            </div>
            {tagsError && (
              <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-800">
                <p className="font-semibold">Error loading tags:</p>
                <p>{(tagsError as Error).message}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-4">
              Please contact your administrator to assign tags to your account.
            </p>
            <Button 
              variant="outline" 
              onClick={() => refetchTags()}
              className="mt-4"
            >
              <Loader2 className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header with Date and Stats */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            {/* Date Display */}
            <div>
              <h2 className="text-3xl font-bold">
                {new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {new Date(date).toLocaleDateString('en-US', { weekday: 'long' })}
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Tasks</p>
                <p className="text-2xl font-bold">{assignedTags.length}</p>
              </div>
              <div className="h-10 w-px bg-border"></div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Time</p>
                <p className="text-2xl font-bold">{timeFormatted}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table Card */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Your Assigned Tasks</CardTitle>
                <CardDescription className="text-xs">
                  {isDateSubmitted 
                    ? `Already submitted for ${new Date(date).toLocaleDateString()}`
                    : 'Enter count for each task you completed'}
                </CardDescription>
              </div>
              {/* Date Toggle */}
              <div className="flex items-center gap-2 bg-muted rounded-full p-1">
                <button
                  type="button"
                  onClick={() => setDate(maxDate)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    date === maxDate
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setDate(minDate)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    date === minDate
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Yesterday
                </button>
              </div>
            </div>
            {isDateSubmitted && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm font-medium">
                    You have already submitted your work logs for this date. Below is your submitted data.
                  </p>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {assignedTags.map((assignment) => {
                const entry = tagEntries.find(e => e.tagId === assignment.tag.id.toString()) || {
                  id: assignment.tag.id,
                  tagId: assignment.tag.id.toString(),
                  tagName: assignment.tag.tagName,
                  count: "",
                  minutes: ""
                }
                
                const totalTime = entry.count && parseInt(entry.count) > 0 
                  ? parseInt(entry.count) * assignment.tag.timeMinutes
                  : 0
                
                return (
                  <div 
                    key={assignment.tag.id} 
                    className={`flex items-center gap-4 p-3 border rounded-md transition-colors ${
                      assignment.isMandatory 
                        ? 'bg-primary/5 border-primary/30 hover:bg-primary/10' 
                        : 'bg-card hover:bg-accent/30'
                    } ${isDateSubmitted ? 'opacity-75' : ''}`}
                  >
                    {/* Task Name and Badge */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm">{assignment.tag.tagName}</h3>
                        {assignment.isMandatory ? (
                          <Badge className="text-[10px] px-2 py-0.5 h-5 bg-primary/10 text-primary border border-primary/20">Mandatory</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5">Optional</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {assignment.tag.timeMinutes} minutes per count
                      </p>
                    </div>

                    {/* Count and Time - Better Aligned */}
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-center min-w-[80px]">
                        <Label htmlFor={`count-${assignment.tag.id}`} className="text-xs text-muted-foreground mb-1.5">
                          Count
                        </Label>
                        <Input
                          id={`count-${assignment.tag.id}`}
                          type="number"
                          placeholder="0"
                          value={entry.count}
                          onChange={(e) => {
                            const count = e.target.value
                            const calculatedMinutes = count ? (parseInt(count) * assignment.tag.timeMinutes).toString() : ""
                            
                            setTagEntries(prev => {
                              const exists = prev.find(t => t.tagId === assignment.tag.id.toString())
                              if (exists) {
                                return prev.map(t => 
                                  t.tagId === assignment.tag.id.toString() 
                                    ? { ...t, count, minutes: calculatedMinutes }
                                    : t
                                )
                              } else {
                                return [...prev, {
                                  id: assignment.tag.id,
                                  tagId: assignment.tag.id.toString(),
                                  tagName: assignment.tag.tagName,
                                  count,
                                  minutes: calculatedMinutes
                                }]
                              }
                            })
                          }}
                          min="0"
                          className="w-20 text-center h-9"
                          disabled={isDateSubmitted}
                        />
                      </div>

                      {/* Total Time Display */}
                      <div className="flex flex-col items-center min-w-[80px]">
                        <div className="text-xs text-muted-foreground mb-1.5">Total Time</div>
                        <div className={`text-lg font-bold h-9 flex items-center ${totalTime > 0 ? 'text-primary' : 'text-muted-foreground/50'}`}>
                          {totalTime}m
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Summary and Submit Section */}
        <Card className="mt-4">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Date:</span> <span className="font-semibold">{new Date(date).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Count:</span> <span className="font-semibold">{totalCount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Time:</span> <span className="font-semibold">{timeFormatted} ({totalMinutes}m)</span>
                </div>
              </div>
              <Button 
                type="submit" 
                className="h-9" 
                disabled={isSubmitting || isDateSubmitted}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Submitting...
                  </>
                ) : isDateSubmitted ? (
                  <>Already Submitted</>
                ) : (
                  <>
                    <Send className="mr-2 h-3.5 w-3.5" />
                    Submit Tags
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
