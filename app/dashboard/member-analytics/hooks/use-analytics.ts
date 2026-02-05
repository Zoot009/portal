'use client'

import { useQuery } from '@tanstack/react-query'
import { AnalyticsFilters, AnalyticsResponse } from '../types'

export function useAnalytics(filters: AnalyticsFilters) {
  return useQuery<AnalyticsResponse>({
    queryKey: ['member-analytics', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)

      const response = await fetch(`/api/proxy/member-analytics?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }

      return response.json()
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
