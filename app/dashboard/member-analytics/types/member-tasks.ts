export interface FilterParams {
  date?: string;          // YYYY-MM-DD
  startDate?: string;     // YYYY-MM-DD
  endDate?: string;       // YYYY-MM-DD
  tillDate?: string;      // YYYY-MM-DD
}

export interface MemberTasksResponse {
  success: boolean
  summary: {
    totalMembers: number
    totalServiceTasks: number
    totalAskingTasks: number
    totalTasks: number
    totalAssignedTasks: number
    dateRange: {
      specificDate: string | null
      startDate: string | null
      endDate: string | null
      tillDate: string | null
    }
  }
  data: MemberData[]
}

export interface MemberData {
  member: {
    id: string
    displayName: string
    email: string
    employeeId: string
  }
  serviceTasks: ServiceTask[]
  askingTasks: AskingTask[]
  totalTasks: number
  assignedTasksCount: number
}

export interface ServiceTask {
  id: string
  title: string
  orderId: string
  orderNumber: string
  customerName: string
  serviceName: string
  serviceType: 'SERVICE_TASK'
  teamName: string
  completedAt: string
  deadline: string
}

export interface AskingTask {
  id: string
  title: string
  orderId: string
  orderNumber: string
  customerName: string
  serviceName: string
  serviceType: 'ASKING_SERVICE'
  teamName: string
  currentStage: 'ASKED' | 'SHARED' | 'VERIFIED' | 'INFORMED_TEAM'
  completedAt: string
  completedBy: string
  completedByName: string
  deadline: string
}

export type TaskTypeFilter = 'all' | 'service' | 'asking'
export type SortField = 'totalTasks' | 'name' | 'serviceTasks' | 'askingTasks'
export type SortOrder = 'asc' | 'desc'