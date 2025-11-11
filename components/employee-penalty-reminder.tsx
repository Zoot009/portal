'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertTriangle, ShieldAlert } from 'lucide-react'

export function EmployeePenaltyReminder() {
  const router = useRouter()
  const [showDialog, setShowDialog] = useState(false)
  const [employeeId, setEmployeeId] = useState<number | null>(null)
  const [unviewedData, setUnviewedData] = useState<{
    penaltyCount: number
    warningCount: number
    hasUnviewed: boolean
  }>({ penaltyCount: 0, warningCount: 0, hasUnviewed: false })

  useEffect(() => {
    const checkEmployeeAndShowReminder = async () => {
      try {
        // Ensure we're on the client side
        if (typeof window === 'undefined') return
        
        // Fetch current user info
        const response = await fetch('/api/auth/me')
        if (!response.ok) return
        
        const data = await response.json()
        const employee = data.employee
        
        // Only show for non-admin employees
        if (!employee || employee.role === 'ADMIN') return
        
        setEmployeeId(employee.id)
        
        // Check if snoozed (10 min delay)
        const snoozeUntil = sessionStorage.getItem('employee-penalty-reminder-snooze-until')
        if (snoozeUntil) {
          const snoozeTime = new Date(snoozeUntil).getTime()
          const now = new Date().getTime()
          
          if (now < snoozeTime) {
            // Still in snooze period, set timer to show after snooze ends
            const remainingTime = snoozeTime - now
            const timer = setTimeout(() => {
              sessionStorage.removeItem('employee-penalty-reminder-snooze-until')
              checkForUnviewedItems(employee.id)
            }, remainingTime)
            
            return () => clearTimeout(timer)
          } else {
            // Snooze period expired, clear it
            sessionStorage.removeItem('employee-penalty-reminder-snooze-until')
          }
        }
        
        // Check if already dismissed in current session (permanent dismiss)
        const dismissed = sessionStorage.getItem('employee-penalty-reminder-dismissed')
        if (dismissed) {
          return // Already dismissed in this session
        }
        
        // Check for unviewed penalties/warnings
        const timer = setTimeout(() => {
          checkForUnviewedItems(employee.id)
        }, 2000) // 2 seconds delay for better UX
        
        return () => clearTimeout(timer)
      } catch (error) {
        console.error('Error checking employee status:', error)
      }
    }
    
    checkEmployeeAndShowReminder()
  }, [])

  const checkForUnviewedItems = async (empId: number) => {
    try {
      const response = await fetch(`/api/employee/unviewed-penalties?employeeId=${empId}`)
      if (!response.ok) return
      
      const result = await response.json()
      
      if (result.success && result.hasUnviewed) {
        setUnviewedData({
          penaltyCount: result.data.penaltyCount,
          warningCount: result.data.warningCount,
          hasUnviewed: true,
        })
        setShowDialog(true)
      }
    } catch (error) {
      console.error('Error checking unviewed items:', error)
    }
  }

  const handleViewNow = async () => {
    // Ensure we're on the client side
    if (typeof window === 'undefined' || !employeeId) return
    
    // Mark as viewed in the database
    try {
      await fetch('/api/employee/unviewed-penalties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, type: 'both' }),
      })
    } catch (error) {
      console.error('Error marking items as viewed:', error)
    }
    
    // Mark as dismissed for this session (won't show again)
    sessionStorage.setItem('employee-penalty-reminder-dismissed', 'true')
    sessionStorage.removeItem('employee-penalty-reminder-snooze-until')
    setShowDialog(false)
    
    // Navigate to penalties page
    router.push('/employee-panel/my-penalties')
  }

  const handleLater = () => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') return
    
    // Set snooze for 10 minutes
    const snoozeUntil = new Date()
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + 10)
    sessionStorage.setItem('employee-penalty-reminder-snooze-until', snoozeUntil.toISOString())
    
    setShowDialog(false)
    
    // Dismiss any existing penalty reminder toasts first
    toast.dismiss('employee-penalty-reminder-snooze')
    
    // Small delay to ensure dismiss completes, then show toast
    setTimeout(() => {
      toast.info('Reminder Snoozed', {
        id: 'employee-penalty-reminder-snooze',
        description: 'This reminder will appear again in 10 minutes.',
        duration: 5000,
        className: '[&_.sonner-description]:text-black [&_.sonner-description]:font-medium',
      })
    }, 100)
    
    // Set timer to show dialog again after 10 minutes
    if (employeeId) {
      setTimeout(() => {
        sessionStorage.removeItem('employee-penalty-reminder-snooze-until')
        checkForUnviewedItems(employeeId)
      }, 10 * 60 * 1000) // 10 minutes in milliseconds
    }
  }

  if (!unviewedData.hasUnviewed) return null

  const getMessage = () => {
    if (unviewedData.penaltyCount > 0 && unviewedData.warningCount > 0) {
      return `You have ${unviewedData.penaltyCount} new ${unviewedData.penaltyCount === 1 ? 'penalty' : 'penalties'} and ${unviewedData.warningCount} new ${unviewedData.warningCount === 1 ? 'warning' : 'warnings'}. Please review them in your profile section.`
    } else if (unviewedData.penaltyCount > 0) {
      return `You have received ${unviewedData.penaltyCount} new ${unviewedData.penaltyCount === 1 ? 'penalty' : 'penalties'}. Please review ${unviewedData.penaltyCount === 1 ? 'it' : 'them'} in your profile section.`
    } else {
      return `You have received ${unviewedData.warningCount} new ${unviewedData.warningCount === 1 ? 'warning' : 'warnings'}. Please review ${unviewedData.warningCount === 1 ? 'it' : 'them'} in your profile section.`
    }
  }

  const getIcon = () => {
    if (unviewedData.penaltyCount > 0) {
      return <ShieldAlert className="h-6 w-6 text-white" />
    }
    return <AlertTriangle className="h-6 w-6 text-white" />
  }

  const getColor = () => {
    if (unviewedData.penaltyCount > 0) {
      return 'from-red-500 to-red-600'
    }
    return 'from-orange-500 to-orange-600'
  }

  const getHoverColor = () => {
    if (unviewedData.penaltyCount > 0) {
      return 'hover:from-red-600 hover:to-red-700'
    }
    return 'hover:from-orange-600 hover:to-orange-700'
  }

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-12 h-12 bg-gradient-to-r ${getColor()} rounded-full flex items-center justify-center`}>
              {getIcon()}
            </div>
            <AlertDialogTitle className="text-xl">
              {unviewedData.penaltyCount > 0 ? 'New Penalty Alert' : 'New Warning Alert'}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            {getMessage()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleLater}>
            I'll check later
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleViewNow}
            className={`bg-gradient-to-r ${getColor()} ${getHoverColor()}`}
          >
            View now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
