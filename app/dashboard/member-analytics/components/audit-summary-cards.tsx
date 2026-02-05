'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AuditResponse } from "../types/audit"
import { Skeleton } from "@/components/ui/skeleton"

interface AuditSummaryCardsProps {
  data?: AuditResponse
  isLoading: boolean
}

export function AuditSummaryCards({ data, isLoading }: AuditSummaryCardsProps) {
  const totalActivities = data?.users.reduce((sum, user) => sum + user.summary.totalActivities, 0) || 0
  const totalClients = data?.users.reduce((sum, user) => sum + user.summary.clientsCreated, 0) || 0
  const totalTags = data?.users.reduce((sum, user) => sum + user.summary.tagsCreated, 0) || 0
  const totalWarnings = data?.users.reduce((sum, user) => sum + user.summary.warningsCreated, 0) || 0

  const cards = [
    {
      title: "Total Users",
      value: data?.totalUsers || 0,
      description: "Active users in the system",
    },
    {
      title: "Total Activities",
      value: totalActivities,
      description: "All activities tracked",
    },
    {
      title: "Clients Created",
      value: totalClients,
      description: "New clients added",
    },
    {
      title: "Tags Created",
      value: totalTags,
      description: "Tags applied to clients",
    },
    {
      title: "Warnings Issued",
      value: totalWarnings,
      description: "Warnings created",
    },
  ]

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {cards.map((_, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[60px] mb-2" />
              <Skeleton className="h-3 w-[120px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
