'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AuditResponse } from "../types/audit"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface ActivityBreakdownChartProps {
  data?: AuditResponse
  isLoading: boolean
}

export function ActivityBreakdownChart({ data, isLoading }: ActivityBreakdownChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Type Breakdown</CardTitle>
          <CardDescription>
            Distribution of activities by type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const activityData = [
    {
      name: "Clients",
      Created: data?.users.reduce((sum, user) => sum + user.summary.clientsCreated, 0) || 0,
      Updated: data?.users.reduce((sum, user) => sum + user.summary.clientsUpdated, 0) || 0,
    },
    {
      name: "Tags",
      Created: data?.users.reduce((sum, user) => sum + user.summary.tagsCreated, 0) || 0,
      Updated: data?.users.reduce((sum, user) => sum + user.summary.tagsUpdated, 0) || 0,
    },
    {
      name: "Maintenance",
      Created: data?.users.reduce((sum, user) => sum + user.summary.maintenanceClientsCreated, 0) || 0,
      Updated: data?.users.reduce((sum, user) => sum + user.summary.maintenanceClientsUpdated, 0) || 0,
    },
    {
      name: "Warnings",
      Created: data?.users.reduce((sum, user) => sum + user.summary.warningsCreated, 0) || 0,
      Reviewed: data?.users.reduce((sum, user) => sum + user.summary.warningsReviewed, 0) || 0,
    },
    {
      name: "Other",
      "Quality Checks": data?.users.reduce((sum, user) => sum + user.summary.qualityChecksPerformed, 0) || 0,
      "Tag Definitions": data?.users.reduce((sum, user) => sum + user.summary.tagDefinitionsCreated, 0) || 0,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Type Breakdown</CardTitle>
        <CardDescription>
          Distribution of activities by type
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={activityData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Created" fill="#3b82f6" />
            <Bar dataKey="Updated" fill="#10b981" />
            <Bar dataKey="Reviewed" fill="#f59e0b" />
            <Bar dataKey="Quality Checks" fill="#8b5cf6" />
            <Bar dataKey="Tag Definitions" fill="#ec4899" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
