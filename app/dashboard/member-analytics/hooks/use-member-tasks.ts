'use client'

import { useQuery } from '@tanstack/react-query'
import { FilterParams, MemberTasksResponse } from '../types/member-tasks'

async function fetchFromEndpoint(url: string, endpointName: string): Promise<MemberTasksResponse> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      let errorMessage = `API Error (${response.status}) from ${endpointName}`
      
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
      throw new Error(data.error || `API returned unsuccessful response from ${endpointName}`)
    }
    
    // Validate response structure
    if (!Array.isArray(data.data)) {
      throw new Error(`Invalid API response format from ${endpointName}`)
    }
    
    return data
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Network error from ${endpointName}: Unable to connect to the server. Please check your internet connection or try again later.`)
    }
    throw error
  }
}

function combineResponses(response1: MemberTasksResponse, response2: MemberTasksResponse): MemberTasksResponse {
  // Create a map to combine member data by member ID
  const memberMap = new Map<string, any>()
  
  // Process first response
  response1.data.forEach(memberData => {
    memberMap.set(memberData.member.id, {
      ...memberData,
      serviceTasks: [...memberData.serviceTasks],
      askingTasks: [...memberData.askingTasks],
    })
  })
  
  // Process second response and merge
  response2.data.forEach(memberData => {
    if (memberMap.has(memberData.member.id)) {
      const existing = memberMap.get(memberData.member.id)
      existing.serviceTasks.push(...memberData.serviceTasks)
      existing.askingTasks.push(...memberData.askingTasks)
      existing.totalTasks = existing.serviceTasks.length + existing.askingTasks.length
      existing.assignedTasksCount += memberData.assignedTasksCount
    } else {
      memberMap.set(memberData.member.id, {
        ...memberData,
        serviceTasks: [...memberData.serviceTasks],
        askingTasks: [...memberData.askingTasks],
      })
    }
  })
  
  const combinedData = Array.from(memberMap.values())
  
  // Combine summaries
  const combinedSummary = {
    totalMembers: memberMap.size,
    totalServiceTasks: response1.summary.totalServiceTasks + response2.summary.totalServiceTasks,
    totalAskingTasks: response1.summary.totalAskingTasks + response2.summary.totalAskingTasks,
    totalTasks: response1.summary.totalTasks + response2.summary.totalTasks,
    totalAssignedTasks: response1.summary.totalAssignedTasks + response2.summary.totalAssignedTasks,
    dateRange: response1.summary.dateRange, // Use dateRange from first response
  }
  
  return {
    success: true,
    summary: combinedSummary,
    data: combinedData,
  }
}

async function fetchMemberTasks(filters: FilterParams): Promise<MemberTasksResponse> {
  const params = new URLSearchParams()
  
  if (filters.date) params.append('date', filters.date)
  if (filters.startDate) params.append('startDate', filters.startDate)
  if (filters.endDate) params.append('endDate', filters.endDate)
  if (filters.tillDate) params.append('tillDate', filters.tillDate)

  const queryString = params.toString() ? `?${params.toString()}` : ''
  const url1 = `/api/proxy/member-tasks${queryString}`
  const url2 = `/api/proxy/kp-member-tasks${queryString}`
  
  try {
    // Fetch from both endpoints in parallel
    const [response1, response2] = await Promise.all([
      fetchFromEndpoint(url1, 'member-tasks'),
      fetchFromEndpoint(url2, 'kp-member-tasks'),
    ])
    
    // Combine the responses
    return combineResponses(response1, response2)
  } catch (error) {
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