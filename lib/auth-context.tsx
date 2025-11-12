'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'

interface Employee {
  id: number
  name: string
  email: string
  employeeCode: string
  role: string
  department?: string
  designation?: string
  isActive: boolean
}

interface AuthData {
  employee: Employee | null
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

const AuthContext = createContext<AuthData | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me')
      if (!response.ok) {
        if (response.status === 401) return null
        throw new Error('Failed to fetch auth data')
      }
      const data = await response.json()
      return data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  })

  return (
    <AuthContext.Provider
      value={{
        employee: data?.employee || null,
        isLoading,
        isError,
        refetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
