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
import { ShieldAlert } from 'lucide-react'

export function AdminPenaltyReminder() {
  const router = useRouter()
  const [showDialog, setShowDialog] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdminAndShowReminder = async () => {
      try {
        // Ensure we're on the client side
        if (typeof window === 'undefined') return
        
        // Fetch current user info
        const response = await fetch('/api/auth/me')
        if (!response.ok) return
        
        const data = await response.json()
        const employee = data.employee
        
        // Check if user is admin
        if (employee?.role !== 'ADMIN') return
        
        setIsAdmin(true)
        
        // Check if snoozed (15 min delay)
        const snoozeUntil = sessionStorage.getItem('admin-penalty-reminder-snooze-until')
        if (snoozeUntil) {
          const snoozeTime = new Date(snoozeUntil).getTime()
          const now = new Date().getTime()
          
          if (now < snoozeTime) {
            // Still in snooze period, set timer to show after snooze ends
            const remainingTime = snoozeTime - now
            const timer = setTimeout(() => {
              sessionStorage.removeItem('admin-penalty-reminder-snooze-until')
              setShowDialog(true)
            }, remainingTime)
            
            return () => clearTimeout(timer)
          } else {
            // Snooze period expired, clear it
            sessionStorage.removeItem('admin-penalty-reminder-snooze-until')
          }
        }
        
        // Check if already dismissed in current session (permanent dismiss)
        const dismissed = sessionStorage.getItem('admin-penalty-reminder-dismissed')
        if (dismissed) {
          return // Already dismissed in this session
        }
        
        // Show dialog after a delay
        const timer = setTimeout(() => {
          setShowDialog(true)
        }, 2000) // 2 seconds delay for better UX
        
        return () => clearTimeout(timer)
      } catch (error) {
        console.error('Error checking admin status:', error)
      }
    }
    
    checkAdminAndShowReminder()
  }, [])

  const handleYes = () => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') return
    
    // Mark as dismissed for this session (won't show again)
    sessionStorage.setItem('admin-penalty-reminder-dismissed', 'true')
    sessionStorage.removeItem('admin-penalty-reminder-snooze-until')
    setShowDialog(false)
    // Navigate to admin penalties page
    router.push('/admin?tab=penalties')
  }

  const handleLater = () => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') return
    
    // Set snooze for 10 minutes
    const snoozeUntil = new Date()
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + 10)
    sessionStorage.setItem('admin-penalty-reminder-snooze-until', snoozeUntil.toISOString())
    
    setShowDialog(false)
    
    // Dismiss any existing penalty reminder toasts first
    toast.dismiss('penalty-reminder-snooze')
    
    // Small delay to ensure dismiss completes, then show toast
    setTimeout(() => {
      toast.info('Penalty Reminder Snoozed', {
        id: 'penalty-reminder-snooze',
        description: 'This reminder will appear again in 10 minutes.',
        duration: 5000,
        className: '[&_.sonner-description]:text-black [&_.sonner-description]:font-medium',
      })
    }, 100)
    
    // Set timer to show dialog again after 10 minutes
    setTimeout(() => {
      sessionStorage.removeItem('admin-penalty-reminder-snooze-until')
      setShowDialog(true)
    }, 10 * 60 * 1000) // 10 minutes in milliseconds
  }

  if (!isAdmin) return null

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-white" />
            </div>
            <AlertDialogTitle className="text-xl">
              Update Penalties
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            As an admin, it's important to review and update employee penalties regularly. 
            Would you like to go to the penalties section now?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleLater}>
            I'll do it later
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleYes}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
          >
            Yes, take me there
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
