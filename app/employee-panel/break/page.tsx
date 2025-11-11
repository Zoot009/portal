'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Coffee, Play, Square, Loader2, Calendar, Clock, TrendingUp, Timer } from 'lucide-react'
import { toast } from 'sonner'

interface BreakSession {
  id: number
  employeeId: number
  startTime: string
  endTime: string | null
  duration: number | null
  breakDate: string
  status: 'ACTIVE' | 'COMPLETED'
  createdAt: string
}

export default function BreakPage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [elapsedTime, setElapsedTime] = useState(0)
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

  // Fetch active break session
  const { data: activeBreakData, isLoading } = useQuery({
    queryKey: ['active-break', employeeId],
    queryFn: async () => {
      if (!employeeId) return null
      const response = await fetch(`/api/breaks/active?employeeId=${employeeId}`)
      if (!response.ok) throw new Error('Failed to fetch active break')
      return response.json()
    },
    enabled: !!employeeId,
    refetchInterval: 5000, // Refetch every 5 seconds to keep data fresh
  })

  // Fetch today's break history for stats
  const { data: breakHistoryData } = useQuery({
    queryKey: ['break-history-today', employeeId],
    queryFn: async () => {
      if (!employeeId) return null
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`/api/breaks/history?employeeId=${employeeId}&date=${today}`)
      if (!response.ok) throw new Error('Failed to fetch break history')
      return response.json()
    },
    enabled: !!employeeId,
    refetchInterval: 10000, // Refetch every 10 seconds
  })

  const activeBreak = activeBreakData?.data
  const breakHistory = breakHistoryData?.data || []
  
  const totalBreakTime = breakHistory.reduce((sum: number, breakSession: BreakSession) => {
    return sum + (breakSession.duration || 0)
  }, 0)
  
  const completedBreaks = breakHistory.filter((b: BreakSession) => b.status === 'COMPLETED').length
  const avgBreakTime = completedBreaks > 0 ? Math.round(totalBreakTime / completedBreaks) : 0

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Calculate elapsed time for active break
  useEffect(() => {
    if (activeBreak) {
      const startTime = new Date(activeBreak.startTime).getTime()
      const elapsed = Math.floor((currentTime.getTime() - startTime) / 1000)
      setElapsedTime(elapsed)
    } else {
      setElapsedTime(0)
    }
  }, [activeBreak, currentTime])

  // Start break mutation
  const startBreakMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/breaks/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start break')
      }
      return response.json()
    },
    onSuccess: (data) => {
      // Immediately refetch both queries
      queryClient.invalidateQueries({ queryKey: ['active-break', employeeId] })
      queryClient.invalidateQueries({ queryKey: ['break-history-today', employeeId] })
      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ['active-break', employeeId] })
      queryClient.refetchQueries({ queryKey: ['break-history-today', employeeId] })
      toast.success('Break started')
    },
    onError: (error: any) => {
      toast.error(error.message)
    },
  })

  // End break mutation
  const endBreakMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/breaks/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to end break')
      }
      return response.json()
    },
    onSuccess: (data) => {
      // Immediately refetch both queries
      queryClient.invalidateQueries({ queryKey: ['active-break', employeeId] })
      queryClient.invalidateQueries({ queryKey: ['break-history-today', employeeId] })
      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ['active-break', employeeId] })
      queryClient.refetchQueries({ queryKey: ['break-history-today', employeeId] })
      toast.success('Break ended')
    },
    onError: (error: any) => {
      toast.error(error.message)
    },
  })

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="space-y-6 p-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card className="border-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Date</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Breaks Taken</CardTitle>
              <Coffee className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{completedBreaks}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {activeBreak ? 'One in progress' : 'Completed today'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Time</CardTitle>
              <Clock className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatDuration(totalBreakTime)}</div>
              <p className="text-xs text-muted-foreground mt-1">{totalBreakTime} minutes</p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Break</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatDuration(avgBreakTime)}</div>
              <p className="text-xs text-muted-foreground mt-1">Per session</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Break Timer Card */}
        <Card className="border-2 shadow-none">
          <CardContent className="p-12">
            {activeBreak ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="text-8xl font-bold font-mono tracking-wider text-primary mb-8">
                  {formatTime(elapsedTime)}
                </div>
                <Badge variant="default" className="text-base px-6 py-2 mb-2">
                  🔴 Break Active
                </Badge>
                <p className="text-base text-muted-foreground mb-8">
                  Started at {new Date(activeBreak.startTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </p>
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={() => endBreakMutation.mutate()}
                  disabled={endBreakMutation.isPending}
                  className="h-14 px-12 text-lg font-semibold"
                >
                  {endBreakMutation.isPending ? (
                    <>
                      <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                      Ending Break...
                    </>
                  ) : (
                    <>
                      <Square className="mr-3 h-5 w-5" />
                      End Break
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
                  <Coffee className="h-16 w-16 text-primary" />
                </div>
                <h2 className="text-3xl font-bold mb-3">Take a Break</h2>
                <p className="text-base text-muted-foreground max-w-lg text-center mb-8">
                  Click the button below to start your break timer. Your break time will be tracked automatically.
                </p>
                <Button
                  size="lg"
                  onClick={() => startBreakMutation.mutate()}
                  disabled={startBreakMutation.isPending}
                  className="h-14 px-12 text-lg font-semibold"
                >
                  {startBreakMutation.isPending ? (
                    <>
                      <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                      Starting Break...
                    </>
                  ) : (
                    <>
                      <Play className="mr-3 h-5 w-5" />
                      Start Break
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
