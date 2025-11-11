'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

interface PenaltyReminderDialogProps {
  autoShow?: boolean
  storageKey?: string
}

export function PenaltyReminderDialog({ 
  autoShow = true,
  storageKey = 'admin-penalty-reminder-dismissed'
}: PenaltyReminderDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted before accessing sessionStorage
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!autoShow || !mounted) return

    // Check if the dialog was already dismissed in this session
    try {
      const dismissed = sessionStorage.getItem(storageKey)
      
      if (!dismissed) {
        // Show dialog after a short delay for better UX
        const timer = setTimeout(() => {
          setOpen(true)
        }, 1500) // Increased delay to ensure page is fully loaded

        return () => clearTimeout(timer)
      }
    } catch (error) {
      console.error('[PenaltyReminder] Error accessing sessionStorage:', error)
    }
  }, [autoShow, storageKey, mounted])

  const handleContinue = () => {
    // Mark as dismissed for this session
    try {
      sessionStorage.setItem(storageKey, 'true')
    } catch (error) {
      console.error('[PenaltyReminder] Error setting sessionStorage:', error)
    }
    setOpen(false)
    // Navigate to penalties tab
    router.push('/admin?tab=penalties')
  }

  const handleDismiss = () => {
    // Mark as dismissed for this session
    try {
      sessionStorage.setItem(storageKey, 'true')
    } catch (error) {
      console.error('[PenaltyReminder] Error setting sessionStorage:', error)
    }
    setOpen(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
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
            Would you like to go to the penalties page now to check for any pending updates?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDismiss}>
            No, I'll do it later
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleContinue}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
          >
            Yes, take me to penalties
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
