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
  const [isAppResumed, setIsAppResumed] = useState(false)
  const queryClient = useQueryClient()

  // Fetch employee info with proper error handling and cache busting
  const { data: authData } = useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch user data')
      return response.json()
    },
    staleTime: 0, // Always fetch fresh data on component mount
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  // Ensure employeeId is always a number and valid
  const employeeId = authData?.employee?.id ? Number(authData.employee.id) : null

  // Fetch active break session with enhanced validation
  const { data: activeBreakData, isLoading } = useQuery({
    queryKey: ['active-break', employeeId],
    queryFn: async () => {
      if (!employeeId || isNaN(employeeId)) {
        return null
      }
      const response = await fetch(`/api/breaks/active?employeeId=${employeeId}`, {
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch active break')
      }
      return response.json()
    },
    enabled: !!employeeId && !isNaN(Number(employeeId)),
    refetchInterval: 5000, // Refetch every 5 seconds to keep data fresh
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  // Fetch today's break history for stats with validation
  const { data: breakHistoryData } = useQuery({
    queryKey: ['break-history-today', employeeId],
    queryFn: async () => {
      if (!employeeId || isNaN(employeeId)) {
        return null
      }
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`/api/breaks/history?employeeId=${employeeId}&date=${today}`, {
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch break history')
      }
      return response.json()
    },
    enabled: !!employeeId && !isNaN(Number(employeeId)),
    refetchInterval: 10000, // Refetch every 10 seconds
    retry: 2,
  })

  const activeBreak = activeBreakData?.data
  const breakHistory = breakHistoryData?.data || []
  
  const totalBreakTime = breakHistory.reduce((sum: number, breakSession: BreakSession) => {
    return sum + (breakSession.duration || 0)
  }, 0)
  
  const completedBreaks = breakHistory.filter((b: BreakSession) => b.status === 'COMPLETED').length
  const avgBreakTime = completedBreaks > 0 ? Math.round(totalBreakTime / completedBreaks) : 0

  // Handle page visibility changes (when user reopens app on mobile)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && employeeId) {
        // When page becomes visible again, refetch auth and break data
        console.log('Page became visible, refreshing break data...')
        setIsAppResumed(true)
        queryClient.invalidateQueries({ queryKey: ['auth'] })
        queryClient.invalidateQueries({ queryKey: ['active-break', employeeId] })
        queryClient.refetchQueries({ queryKey: ['auth'] })
        queryClient.refetchQueries({ queryKey: ['active-break', employeeId] })
        
        // Reset the resumed flag after a short delay
        setTimeout(() => setIsAppResumed(false), 2000)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Also handle focus events for better mobile support
    const handleFocus = () => {
      if (employeeId) {
        console.log('Window focused, refreshing break data...')
        queryClient.refetchQueries({ queryKey: ['active-break', employeeId] })
      }
    }
    
    // Handle resume events (mobile browsers)
    const handleResume = () => {
      if (employeeId) {
        console.log('App resumed, clearing cache and refreshing...')
        setIsAppResumed(true)
        // Clear potential stale data
        queryClient.clear()
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: ['auth'] })
          setIsAppResumed(false)
        }, 100)
      }
    }
    
    window.addEventListener('focus', handleFocus)
    document.addEventListener('resume', handleResume)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('resume', handleResume)
    }
  }, [employeeId, queryClient])

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

  // Start break mutation with validation
  const startBreakMutation = useMutation({
    mutationFn: async () => {
      if (!employeeId || isNaN(employeeId)) {
        throw new Error('Invalid employee ID. Please refresh the page and try again.')
      }
      
      const response = await fetch('/api/breaks/start', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache' 
        },
        body: JSON.stringify({ employeeId: Number(employeeId) }),
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

  // End break mutation with enhanced validation
  const endBreakMutation = useMutation({
    mutationFn: async () => {
      if (!employeeId || isNaN(employeeId)) {
        throw new Error('Invalid employee ID. Please refresh the page and try again.')
      }
      
      const response = await fetch('/api/breaks/end', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache' 
        },
        body: JSON.stringify({ employeeId: Number(employeeId) }),
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

  if (isLoading || isAppResumed) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {isAppResumed ? 'Refreshing session data...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  // Show error state if employeeId is invalid
  if (!employeeId || isNaN(employeeId)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Coffee className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Session Error</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Unable to load your employee information.
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            size="sm"
          >
            Refresh Page
          </Button>
        </div>
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
          <CardContent className="p-6 md:p-12">
            {activeBreak ? (
              <div className="flex flex-col items-center justify-center py-8 md:py-16">
                <div className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold font-mono tracking-wider text-primary mb-4 md:mb-8">
                  {formatTime(elapsedTime)}
                </div>
                <Badge variant="default" className="text-sm md:text-base px-4 md:px-6 py-1.5 md:py-2 mb-2">
                  🔴 Break Active
                </Badge>
                <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8">
                  Started at {new Date(activeBreak.startTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </p>
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={() => {
                    if (!employeeId || isNaN(employeeId)) {
                      toast.error('Session error. Please refresh the page and try again.')
                      return
                    }
                    endBreakMutation.mutate()
                  }}
                  disabled={endBreakMutation.isPending || !employeeId || isNaN(employeeId) || isAppResumed}
                  className="h-12 md:h-14 px-8 md:px-12 text-base md:text-lg font-semibold"
                >
                  {endBreakMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 md:mr-3 h-4 md:h-5 w-4 md:w-5 animate-spin" />
                      Ending Break...
                    </>
                  ) : (
                    <>
                      <Square className="mr-2 md:mr-3 h-4 md:h-5 w-4 md:w-5" />
                      End Break
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 md:py-16">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 md:mb-6">
                  <Coffee className="h-12 w-12 md:h-16 md:w-16 text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3">Take a Break</h2>
                <p className="text-sm md:text-base text-muted-foreground max-w-lg text-center mb-6 md:mb-8 px-4">
                  Click the button below to start your break timer. Your break time will be tracked automatically.
                </p>
                <Button
                  size="lg"
                  onClick={() => {
                    if (!employeeId || isNaN(employeeId)) {
                      toast.error('Session error. Please refresh the page and try again.')
                      return
                    }
                    startBreakMutation.mutate()
                  }}
                  disabled={startBreakMutation.isPending || !employeeId || isNaN(employeeId) || isAppResumed}
                  className="h-12 md:h-14 px-8 md:px-12 text-base md:text-lg font-semibold"
                >
                  {startBreakMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 md:mr-3 h-4 md:h-5 w-4 md:w-5 animate-spin" />
                      Starting Break...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 md:mr-3 h-4 md:h-5 w-4 md:w-5" />
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
