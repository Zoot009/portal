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
  counts: {
    totalActivities: number
    ordersCreated: number
    tasksCreated: number
    tasksCompleted: number
    folderLinksAdded: number
    ordersDelivered: number
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

    // Fetch from both APIs in parallel
    const [pmsData, crmData] = await Promise.allSettled([
      fetchWithFallback(PMS_URLS, pmsParams),
      fetchWithFallback(CRM_URLS, crmParams),
    ])

    // Process PMS data
    const pmsUsers = new Map<string, PMSUser>()
    if (pmsData.status === 'fulfilled' && pmsData.value?.success && Array.isArray(pmsData.value.data)) {
      pmsData.value.data.forEach((user: PMSUser) => {
        if (user.user?.employeeId) {
          pmsUsers.set(user.user.employeeId, user)
        }
      })
    }

    // Process CRM data
    const crmUsers = new Map<string, CRMUser>()
    if (crmData.status === 'fulfilled' && Array.isArray(crmData.value?.users)) {
      crmData.value.users.forEach((user: CRMUser) => {
        if (user.employeeId) {
          crmUsers.set(user.employeeId, user)
        }
      })
    }

    // Combine data
    const employeeIds = new Set([...pmsUsers.keys(), ...crmUsers.keys()])
    const combinedData: CombinedUser[] = []

    employeeIds.forEach((employeeId) => {
      const pmsUser = pmsUsers.get(employeeId)
      const crmUser = crmUsers.get(employeeId)

      const pmsActivities = {
        ordersCreated: pmsUser?.counts.ordersCreated || 0,
        tasksCreated: pmsUser?.counts.tasksCreated || 0,
        tasksCompleted: pmsUser?.counts.tasksCompleted || 0,
        folderLinksAdded: pmsUser?.counts.folderLinksAdded || 0,
        ordersDelivered: pmsUser?.counts.ordersDelivered || 0,
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

    return NextResponse.json({
      success: true,
      summary,
      data: combinedData,
      sources: {
        pms: pmsData.status === 'fulfilled' ? 'success' : 'failed',
        crm: crmData.status === 'fulfilled' ? 'success' : 'failed',
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
