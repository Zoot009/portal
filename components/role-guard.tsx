'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: string[]
  fallbackPath?: string
}

export function RoleGuard({ children, allowedRoles, fallbackPath = '/employee-panel' }: RoleGuardProps) {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useAuth()
  const [employee, setEmployee] = useState<any>(null)
  const [isChecking, setIsChecking] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    const checkRole = async () => {
      if (!isLoaded) return
      
      if (!isSignedIn) {
        router.push('/sign-in')
        return
      }

      try {
        const response = await fetch('/api/auth/me')
        if (!response.ok) {
          // Employee not found or not linked
          router.push('/sign-in')
          return
        }

        const data = await response.json()
        const currentEmployee = data.employee

        if (!currentEmployee) {
          router.push('/sign-in')
          return
        }

        setEmployee(currentEmployee)

        // Check if user has the required role
        if (!allowedRoles.includes(currentEmployee.role)) {
          // Redirect based on their actual role - don't allow access
          if (currentEmployee.role === 'EMPLOYEE') {
            router.push('/employee-panel')
          } else if (currentEmployee.role === 'ADMIN' || currentEmployee.role === 'TEAMLEADER') {
            router.push('/dashboard')
          } else {
            router.push(fallbackPath)
          }
          setHasAccess(false)
        } else {
          // User has the correct role
          setHasAccess(true)
          setIsChecking(false)
        }
      } catch (error) {
        console.error('Error checking role:', error)
        router.push('/sign-in')
      }
    }

    checkRole()
  }, [isLoaded, isSignedIn, router, allowedRoles, fallbackPath])

  // Show loading while checking or if no access
  if (!isLoaded || isChecking || !hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  // Only render children if user has access
  return <>{children}</>
}
