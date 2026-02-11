export interface AnalyticsFilters {
  startDate?: string
  endDate?: string
  searchTerm?: string
}

export interface PMSActivities {
  ordersCreated: number
  tasksCreated: number
  tasksCompleted: number
  folderLinksAdded: number
  ordersDelivered: number
  askingTasksCreated: number
  askingTasksCompleted: number
  totalTaskCount: number
  total: number
}

export interface CRMActivities {
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
  total: number
}

export interface EmployeeAnalytics {
  employeeId: string
  displayName: string
  email?: string
  pms: PMSActivities
  crm: CRMActivities
  totalActivities: number
}

export interface AnalyticsSummary {
  totalEmployees: number
  pmsOnly: number
  crmOnly: number
  both: number
  totalPmsActivities: number
  totalCrmActivities: number
  totalActivities: number
}

export interface AnalyticsResponse {
  success: boolean
  summary: AnalyticsSummary
  data: EmployeeAnalytics[]
  sources: {
    pms: 'success' | 'failed'
    crm: 'success' | 'failed'
  }
  filters: {
    startDate: string | null
    endDate: string | null
  }
}
