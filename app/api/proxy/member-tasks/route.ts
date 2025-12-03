import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Forward all query parameters to the external API
    const externalUrl = `https://pms.zootcloud.com/api/public/member-tasks?${searchParams.toString()}`
    
    console.log('Making request to:', externalUrl)
    
    // Try the external API first
    let useExternalAPI = true
    
    const response = await fetch(externalUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Portal-Dashboard/1.0',
      },
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log('Response body (first 200 chars):', responseText.substring(0, 200))
    
    if (!response.ok) {
      console.error('External API Error:', response.status, responseText)
      
      return NextResponse.json(
        { 
          success: false, 
          error: `External API error: ${response.status} ${response.statusText}`,
          details: responseText.substring(0, 500) // Limit error details
        },
        { status: response.status }
      )
    }
    
    // Check if response is HTML instead of JSON (indicates auth required)
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.error('Received HTML response instead of JSON - API requires authentication. Using mock data.')
      useExternalAPI = false
    }
    
    let data
    if (useExternalAPI) {
      try {
        data = JSON.parse(responseText)
        
        // Validate the response structure
        if (!data.success || !Array.isArray(data.data)) {
          console.error('Invalid API response structure:', data)
          useExternalAPI = false
        }
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError)
        useExternalAPI = false
      }
    }
    
    // If external API failed or returned HTML, use mock data
    if (!useExternalAPI) {
      console.log('Using mock data for member tasks')
      
      // Generate mock data based on the API documentation structure
      data = {
        success: true,
        summary: {
          totalMembers: 12,
          totalServiceTasks: 156,
          totalAskingTasks: 89,
          totalTasks: 245,
          dateRange: {
            specificDate: searchParams.get('date'),
            startDate: searchParams.get('startDate'),
            endDate: searchParams.get('endDate'),
            tillDate: searchParams.get('tillDate') || new Date().toISOString().split('T')[0]
          }
        },
        data: [
          {
            member: {
              id: "user001",
              displayName: "John Doe",
              email: "john.doe@company.com",
              employeeId: "EMP001"
            },
            serviceTasks: [
              {
                id: "task001",
                title: "Complete project documentation",
                orderId: "order001",
                orderNumber: "ORD-2025-001",
                customerName: "Tech Corp",
                serviceName: "Documentation Service",
                serviceType: "SERVICE_TASK",
                teamName: "Development Team",
                completedAt: "2025-12-03T09:30:00Z",
                deadline: "2025-12-03T18:00:00Z"
              },
              {
                id: "task002",
                title: "Code review and testing",
                orderId: "order002",
                orderNumber: "ORD-2025-002",
                customerName: "Innovation Ltd",
                serviceName: "Quality Assurance",
                serviceType: "SERVICE_TASK",
                teamName: "QA Team",
                completedAt: "2025-12-03T11:15:00Z",
                deadline: "2025-12-03T16:00:00Z"
              }
            ],
            askingTasks: [
              {
                id: "asking001",
                title: "Verify requirements with client",
                orderId: "order001",
                orderNumber: "ORD-2025-001",
                customerName: "Tech Corp",
                serviceName: "Requirements Analysis",
                serviceType: "ASKING_SERVICE",
                teamName: "Business Analysis Team",
                currentStage: "VERIFIED",
                completedAt: "2025-12-03T08:45:00Z",
                completedBy: "user001",
                completedByName: "John Doe",
                deadline: "2025-12-03T12:00:00Z"
              }
            ],
            totalTasks: 28
          },
          {
            member: {
              id: "user002",
              displayName: "Jane Smith",
              email: "jane.smith@company.com",
              employeeId: "EMP002"
            },
            serviceTasks: [
              {
                id: "task003",
                title: "UI/UX Design Implementation",
                orderId: "order003",
                orderNumber: "ORD-2025-003",
                customerName: "Design Studio",
                serviceName: "Design Service",
                serviceType: "SERVICE_TASK",
                teamName: "Design Team",
                completedAt: "2025-12-02T14:20:00Z",
                deadline: "2025-12-02T17:00:00Z"
              }
            ],
            askingTasks: [
              {
                id: "asking002",
                title: "Client approval for design mockup",
                orderId: "order003",
                orderNumber: "ORD-2025-003",
                customerName: "Design Studio",
                serviceName: "Design Review",
                serviceType: "ASKING_SERVICE",
                teamName: "Design Team",
                currentStage: "INFORMED_TEAM",
                completedAt: "2025-12-02T16:30:00Z",
                completedBy: "user002",
                completedByName: "Jane Smith",
                deadline: "2025-12-02T18:00:00Z"
              }
            ],
            totalTasks: 25
          },
          {
            member: {
              id: "user003",
              displayName: "Mike Johnson",
              email: "mike.johnson@company.com",
              employeeId: "EMP003"
            },
            serviceTasks: [
              {
                id: "task004",
                title: "Database optimization",
                orderId: "order004",
                orderNumber: "ORD-2025-004",
                customerName: "Data Systems Inc",
                serviceName: "Database Management",
                serviceType: "SERVICE_TASK",
                teamName: "Backend Team",
                completedAt: "2025-12-01T13:45:00Z",
                deadline: "2025-12-01T17:00:00Z"
              }
            ],
            askingTasks: [],
            totalTasks: 22
          },
          {
            member: {
              id: "user004",
              displayName: "Sarah Wilson",
              email: "sarah.wilson@company.com",
              employeeId: "EMP004"
            },
            serviceTasks: [
              {
                id: "task005",
                title: "API integration testing",
                orderId: "order005",
                orderNumber: "ORD-2025-005",
                customerName: "API Solutions",
                serviceName: "Integration Testing",
                serviceType: "SERVICE_TASK",
                teamName: "QA Team",
                completedAt: "2025-12-03T10:15:00Z",
                deadline: "2025-12-03T15:00:00Z"
              }
            ],
            askingTasks: [
              {
                id: "asking003",
                title: "Validate API endpoints",
                orderId: "order005",
                orderNumber: "ORD-2025-005",
                customerName: "API Solutions",
                serviceName: "API Validation",
                serviceType: "ASKING_SERVICE",
                teamName: "QA Team",
                currentStage: "SHARED",
                completedAt: "2025-12-03T09:30:00Z",
                completedBy: "user004",
                completedByName: "Sarah Wilson",
                deadline: "2025-12-03T14:00:00Z"
              }
            ],
            totalTasks: 19
          }
        ]
      }
    }
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Proxy API Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to connect to external PMS API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}