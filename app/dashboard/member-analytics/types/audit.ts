export interface AuditFilterParams {
  name?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export interface UserAudit {
  user: {
    id: string
    name: string
    email: string
    role: string
    createdAt: string
  }
  summary: {
    clientsCreated: number
    clientsUpdated: number
    tagsCreated: number
    tagsUpdated: number
    problematicClientsCreated: number
    maintenanceClientsCreated: number
    maintenanceClientsUpdated: number
    maintenanceFollowUpsCreated: number
    tagDefinitionsCreated: number
    qualityChecksPerformed: number
    warningsCreated: number
    warningsReviewed: number
    totalActivities: number
  }
}

export interface AuditResponse {
  totalUsers: number
  users: UserAudit[]
  filters: {
    name: string | null
    dateRange: {
      startDate: string | null
      endDate: string | null
    } | null
  }
  pagination: {
    limit: number
    offset: number
  }
}
