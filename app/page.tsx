'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'

export default function HomePage() {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const redirectBasedOnRole = async () => {
      if (!isLoaded) return

      if (!isSignedIn) {
        router.push('/sign-in')
        return
      }

      try {
        console.log('Fetching employee data...')
        const response = await fetch('/api/auth/me')
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error('Failed to fetch employee:', errorData)
          setError(errorData.error || 'Failed to load employee data')
          // Wait 2 seconds then redirect to sign-in
          setTimeout(() => {
            router.push('/sign-in')
          }, 2000)
          return
        }

        const data = await response.json()
        console.log('Employee data:', data)
        const role = data.employee?.role

        if (role === 'EMPLOYEE') {
          console.log('Redirecting to employee panel')
          router.push('/employee-panel')
        } else if (role === 'ADMIN' || role === 'TEAMLEADER') {
          console.log('Redirecting to dashboard')
          router.push('/dashboard')
        } else {
          console.log('Unknown role, redirecting to employee panel')
          router.push('/employee-panel')
        }
      } catch (error: any) {
        console.error('Error during redirect:', error)
        setError(error.message || 'An error occurred')
        setTimeout(() => {
          router.push('/sign-in')
        }, 2000)
      }
    }

    redirectBasedOnRole()
  }, [router, isLoaded, isSignedIn])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      {error && (
        <div className="max-w-md p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 text-center">{error}</p>
          <p className="text-xs text-red-600 text-center mt-2">Redirecting to sign in...</p>
        </div>
      )}
    </div>
  )
}

