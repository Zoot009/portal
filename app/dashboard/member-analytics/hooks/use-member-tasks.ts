'use client'

import { useQuery } from '@tanstack/react-query'
import { FilterParams, MemberTasksResponse } from '../types/member-tasks'

async function fetchMemberTasks(filters: FilterParams): Promise<MemberTasksResponse> {
  const params = new URLSearchParams()
  
  if (filters.date) params.append('date', filters.date)
  if (filters.startDate) params.append('startDate', filters.startDate)
  if (filters.endDate) params.append('endDate', filters.endDate)
  if (filters.tillDate) params.append('tillDate', filters.tillDate)

  const url = `/api/proxy/member-tasks${params.toString() ? `?${params.toString()}` : ''}`
  
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
        if (errorData.details) {
          errorMessage += `: ${errorData.details}`
        }
      } catch {
        // If JSON parsing fails, use status text
        errorMessage = `${errorMessage}: ${response.statusText || 'Failed to fetch member tasks'}`
      }
      
      throw new Error(errorMessage)
    }
    
    const data = await response.json()
    
    // Handle error responses from our proxy
    if (!data.success) {
      throw new Error(data.error || 'API returned unsuccessful response')
    }
    
    // Validate response structure
    if (!Array.isArray(data.data)) {
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

export function useMemberTasks(filters: FilterParams) {
  return useQuery({
    queryKey: ['member-tasks', filters],
    queryFn: () => fetchMemberTasks(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  })
}