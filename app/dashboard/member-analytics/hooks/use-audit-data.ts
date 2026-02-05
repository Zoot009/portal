'use client'

import { useQuery } from '@tanstack/react-query'
import { AuditFilterParams, AuditResponse } from '../types/audit'

async function fetchAuditData(filters: AuditFilterParams): Promise<AuditResponse> {
  const params = new URLSearchParams()
  
  if (filters.name) params.append('name', filters.name)
  if (filters.startDate) params.append('startDate', filters.startDate)
  if (filters.endDate) params.append('endDate', filters.endDate)
  if (filters.limit) params.append('limit', filters.limit.toString())
  if (filters.offset) params.append('offset', filters.offset.toString())

  const url = `/api/proxy/audit${params.toString() ? `?${params.toString()}` : ''}`
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      let errorMessage = `API Error (${response.status})`
      
      try {
        const errorData = await response.json()
        if (errorData.error) {
          errorMessage = errorData.error
        }
      } catch {
        errorMessage = `${errorMessage}: ${response.statusText || 'Failed to fetch audit data'}`
      }
      
      throw new Error(errorMessage)
    }
    
    const data = await response.json()
    
    // Validate response structure
    if (!Array.isArray(data.users)) {
      throw new Error('Invalid API response format')
    }
    
    return data
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the server. Please check your internet connection or try again later.')
    }
    throw error
  }
}

export function useAuditData(filters: AuditFilterParams) {
  return useQuery({
    queryKey: ['audit-data', filters],
    queryFn: () => fetchAuditData(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  })
}
