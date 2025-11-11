'use client'

import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'

export function EmployeeCodeDisplay() {
  const { data } = useQuery({
    queryKey: ['current-employee'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me')
      if (!res.ok) return null
      return res.json()
    }
  })

  if (!data?.employee) return null

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="font-mono">
        {data.employee.employeeCode}
      </Badge>
      {data.employee.role === 'ADMIN' && (
        <Badge variant="default" className="bg-blue-600">
          Admin
        </Badge>
      )}
    </div>
  )
}
