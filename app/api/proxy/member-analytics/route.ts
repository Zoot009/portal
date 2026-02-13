import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy API to combine PMS and CRM analytics data
 * GET /api/proxy/member-analytics?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */

// PMS API URLs (try in order)
const PMS_URLS = [
  'https://pms.zootcloud.com/api/public/member-tasks',
  'https://pmskp.zootcloud.com/api/public/member-tasks',
]

// CRM API URLs (try in order)
const CRM_URLS = [
  'https://crm.zootcloud.com/api/public/audit',
  'https://kpcrm.zootcloud.com/api/public/audit',
  'https://smm-crm-rho.vercel.app/api/public/audit',
]

interface PMSUser {
  user: {
    employeeId: string
    displayName: string
    email?: string
  }
  activities?: {
    orders?: any[]
    tasks?: any[]
    completedTasks?: any[]
    folderLinksAdded?: any[]
    deliveredOrders?: any[]
    askingTasks?: any[]
    completedAskingTasks?: any[]
  }
  counts: {
    totalActivities: number
    ordersCreated?: number
    tasksCreated?: number
    tasksCompleted?: number
    folderLinksAdded?: number
    ordersDelivered?: number
    askingTasksCreated?: number
    askingTasksCompleted?: number
    totalTaskCount?: number
  }
}

interface CRMUser {
  userName: string
  employeeId: string | null
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

interface CombinedUser {
  employeeId: string
  displayName: string
  email?: string
  pms: {
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
  crm: {
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
  totalActivities: number
}

async function fetchWithFallback(urls: string[], params: URLSearchParams): Promise<any> {
  let lastError: Error | null = null

  for (const baseUrl of urls) {
    try {
      const url = `${baseUrl}?${params.toString()}`
      console.log(`Attempting to fetch: ${url}`)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`Successfully fetched from: ${baseUrl}`)
        return data
      }

      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      console.error(`Failed to fetch from ${baseUrl}:`, lastError.message)
    }
  }

  throw lastError || new Error('All URLs failed')
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build query parameters
    const pmsParams = new URLSearchParams()
    const crmParams = new URLSearchParams()

    if (startDate) {
      pmsParams.set('startDate', startDate)
      crmParams.set('startDate', startDate)
    }
    if (endDate) {
      pmsParams.set('endDate', endDate)
      crmParams.set('endDate', endDate)
    }

    // Fetch from all PMS URLs to merge data from multiple sources
    const pmsResults = await Promise.allSettled(
      PMS_URLS.map(url => 
        fetch(`${url}?${pmsParams.toString()}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        }).then(res => res.ok ? res.json() : null)
      )
    )

    // Fetch from CRM with fallback
    const crmData = await Promise.allSettled([
      fetchWithFallback(CRM_URLS, crmParams),
    ])

    // Process and merge PMS data from all sources
    const pmsUsers = new Map<string, PMSUser>()
    pmsResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value?.success && Array.isArray(result.value.data)) {
        console.log(`Processing PMS data from ${PMS_URLS[index]}: ${result.value.data.length} users`)
        result.value.data.forEach((user: PMSUser) => {
          if (user.user?.employeeId) {
            const existingUser = pmsUsers.get(user.user.employeeId)
            if (existingUser) {
              // Merge activities by summing counts
              existingUser.counts.totalActivities += user.counts.totalActivities || 0
              existingUser.counts.ordersCreated = (existingUser.counts.ordersCreated || 0) + (user.counts.ordersCreated || 0)
              existingUser.counts.tasksCreated = (existingUser.counts.tasksCreated || 0) + (user.counts.tasksCreated || 0)
              existingUser.counts.tasksCompleted = (existingUser.counts.tasksCompleted || 0) + (user.counts.tasksCompleted || 0)
              existingUser.counts.folderLinksAdded = (existingUser.counts.folderLinksAdded || 0) + (user.counts.folderLinksAdded || 0)
              existingUser.counts.ordersDelivered = (existingUser.counts.ordersDelivered || 0) + (user.counts.ordersDelivered || 0)
              existingUser.counts.askingTasksCreated = (existingUser.counts.askingTasksCreated || 0) + (user.counts.askingTasksCreated || 0)
              existingUser.counts.askingTasksCompleted = (existingUser.counts.askingTasksCompleted || 0) + (user.counts.askingTasksCompleted || 0)
              existingUser.counts.totalTaskCount = (existingUser.counts.totalTaskCount || 0) + (user.counts.totalTaskCount || 0)
            } else {
              pmsUsers.set(user.user.employeeId, user)
            }
          }
        })
      } else {
        console.log(`Failed to fetch PMS data from ${PMS_URLS[index]}`)
      }
    })

    // Process CRM data
    const crmUsers = new Map<string, CRMUser>()
    if (crmData[0]?.status === 'fulfilled' && Array.isArray(crmData[0].value?.users)) {
      console.log(`Processing CRM data: ${crmData[0].value.users.length} users`)
      crmData[0].value.users.forEach((user: CRMUser) => {
        if (user.employeeId) {
          crmUsers.set(user.employeeId, user)
        }
      })
    } else {
      console.log('Failed to fetch CRM data')
    }

    console.log(`Total unique PMS users after merging: ${pmsUsers.size}`)
    console.log(`Total CRM users: ${crmUsers.size}`)

    // Combine data
    const employeeIds = new Set([...pmsUsers.keys(), ...crmUsers.keys()])
    const combinedData: CombinedUser[] = []

    employeeIds.forEach((employeeId) => {
      const pmsUser = pmsUsers.get(employeeId)
      const crmUser = crmUsers.get(employeeId)

      const pmsActivities = {
        ordersCreated: pmsUser?.counts.ordersCreated || pmsUser?.activities?.orders?.length || 0,
        tasksCreated: pmsUser?.counts.tasksCreated || pmsUser?.activities?.tasks?.length || 0,
        tasksCompleted: pmsUser?.counts.tasksCompleted || pmsUser?.activities?.completedTasks?.length || 0,
        folderLinksAdded: pmsUser?.counts.folderLinksAdded || pmsUser?.activities?.folderLinksAdded?.length || 0,
        ordersDelivered: pmsUser?.counts.ordersDelivered || pmsUser?.activities?.deliveredOrders?.length || 0,
        askingTasksCreated: pmsUser?.counts.askingTasksCreated || pmsUser?.activities?.askingTasks?.length || 0,
        askingTasksCompleted: pmsUser?.counts.askingTasksCompleted || pmsUser?.activities?.completedAskingTasks?.length || 0,
        totalTaskCount: pmsUser?.counts.totalTaskCount || 0,
        total: pmsUser?.counts.totalActivities || 0,
      }

      const crmActivities = {
        clientsCreated: crmUser?.summary.clientsCreated || 0,
        clientsUpdated: crmUser?.summary.clientsUpdated || 0,
        tagsCreated: crmUser?.summary.tagsCreated || 0,
        tagsUpdated: crmUser?.summary.tagsUpdated || 0,
        problematicClientsCreated: crmUser?.summary.problematicClientsCreated || 0,
        maintenanceClientsCreated: crmUser?.summary.maintenanceClientsCreated || 0,
        maintenanceClientsUpdated: crmUser?.summary.maintenanceClientsUpdated || 0,
        maintenanceFollowUpsCreated: crmUser?.summary.maintenanceFollowUpsCreated || 0,
        tagDefinitionsCreated: crmUser?.summary.tagDefinitionsCreated || 0,
        qualityChecksPerformed: crmUser?.summary.qualityChecksPerformed || 0,
        warningsCreated: crmUser?.summary.warningsCreated || 0,
        warningsReviewed: crmUser?.summary.warningsReviewed || 0,
        total: crmUser?.summary.totalActivities || 0,
      }

      combinedData.push({
        employeeId,
        displayName: pmsUser?.user.displayName || crmUser?.userName || 'Unknown',
        email: pmsUser?.user.email,
        pms: pmsActivities,
        crm: crmActivities,
        totalActivities: pmsActivities.total + crmActivities.total,
      })
    })

    // Sort by total activities descending
    combinedData.sort((a, b) => b.totalActivities - a.totalActivities)

    console.log(`Total combined employees: ${combinedData.length}`)

    // Calculate summary
    const summary = {
      totalEmployees: combinedData.length,
      pmsOnly: combinedData.filter((u) => u.pms.total > 0 && u.crm.total === 0).length,
      crmOnly: combinedData.filter((u) => u.crm.total > 0 && u.pms.total === 0).length,
      both: combinedData.filter((u) => u.pms.total > 0 && u.crm.total > 0).length,
      totalPmsActivities: combinedData.reduce((sum, u) => sum + u.pms.total, 0),
      totalCrmActivities: combinedData.reduce((sum, u) => sum + u.crm.total, 0),
      totalActivities: combinedData.reduce((sum, u) => sum + u.totalActivities, 0),
    }

    // Check if at least one PMS source succeeded
    const pmsSuccess = pmsResults.some(r => r.status === 'fulfilled' && r.value?.success)
    const crmSuccess = crmData[0]?.status === 'fulfilled'

    return NextResponse.json({
      success: true,
      summary,
      data: combinedData,
      sources: {
        pms: pmsSuccess ? 'success' : 'failed',
        crm: crmSuccess ? 'success' : 'failed',
        pmsSourcesCount: pmsResults.filter(r => r.status === 'fulfilled' && r.value?.success).length,
      },
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    })
  } catch (error) {
    console.error('Proxy API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
