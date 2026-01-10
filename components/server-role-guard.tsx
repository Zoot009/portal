import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

interface ServerRoleGuardProps {
  children: React.ReactNode
  allowedRoles: string[]
  fallbackPath?: string
}

export async function ServerRoleGuard({ 
  children, 
  allowedRoles, 
  fallbackPath = '/employee-panel' 
}: ServerRoleGuardProps) {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  try {
    // Get user's role from the database
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${userId}`,
      },
    })

    if (!response.ok) {
      redirect('/sign-in')
    }

    const data = await response.json()
    const userRole = data.employee?.role

    if (!userRole) {
      redirect('/sign-in')
    }

    // Check if user has the required role
    if (!allowedRoles.includes(userRole)) {
      // Redirect based on their actual role
      if (userRole === 'EMPLOYEE') {
        redirect('/employee-panel')
      } else if (userRole === 'ADMIN') {
        redirect('/dashboard')
      } else {
        redirect(fallbackPath)
      }
    }

    // User has the correct role, render children
    return <>{children}</>
  } catch (error) {
    console.error('Error checking role in ServerRoleGuard:', error)
    redirect('/sign-in')
  }
}