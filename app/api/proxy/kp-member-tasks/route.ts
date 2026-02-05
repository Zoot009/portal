import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // TODO: Update this external URL to your actual KP endpoint
    // Forward all query parameters to the external API
    const externalUrl = `https://pmskp.zootcloud.com/api/public/member-tasks?${searchParams.toString()}`
    
    console.log('Making request to:', externalUrl)
    
    // Try the external API first
    let useExternalAPI = true
    let assignedTasksData: any = null
    
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
    
    // Fetch assigned tasks separately
    try {
      const assignedUrl = `https://pms.zootcloud.com/api/public/assigned-tasks`
      console.log('Fetching assigned tasks from:', assignedUrl)
      
      const assignedResponse = await fetch(assignedUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Portal-Dashboard/1.0',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })
      
      if (assignedResponse.ok) {
        const assignedText = await assignedResponse.text()
        if (!assignedText.trim().startsWith('<!DOCTYPE') && !assignedText.trim().startsWith('<html')) {
          assignedTasksData = JSON.parse(assignedText)
          console.log('Successfully fetched assigned tasks')
        }
      }
    } catch (assignedError) {
      console.log('Failed to fetch assigned tasks, will calculate from response:', assignedError)
    }
    
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
        } else {
          console.log('Processing API data. Sample member:', JSON.stringify(data.data[0], null, 2))
          
          // Process the external API data to add assignedTasksCount
          let totalAssignedTasks = 0
          
          data.data = data.data.map((memberData: any) => {
            let assignedTasksCount = 0
            
            // Check if API already provides assignedTasksCount
            if (typeof memberData.assignedTasksCount === 'number') {
              assignedTasksCount = memberData.assignedTasksCount
              console.log(`Member ${memberData.member?.displayName}: using API assignedTasksCount = ${assignedTasksCount}`)
            } 
            // Try to use the assigned tasks data from separate endpoint
            else if (assignedTasksData?.success && Array.isArray(assignedTasksData.data)) {
              const memberAssigned = assignedTasksData.data.find(
                (m: any) => m.memberId === memberData.member.id || m.member?.id === memberData.member.id
              )
              if (memberAssigned) {
                assignedTasksCount = memberAssigned.assignedTasksCount || 
                                    (memberAssigned.assignedTasks?.length || 0)
                console.log(`Member ${memberData.member?.displayName}: using separate endpoint assignedTasksCount = ${assignedTasksCount}`)
              }
            }
            
            // Fallback: count non-completed tasks from the main response
            if (assignedTasksCount === 0) {
              const assignedServiceTasks = memberData.serviceTasks?.filter(
                (task: any) => !task.completedAt || task.completedAt === null
              ).length || 0
              
              const assignedAskingTasks = memberData.askingTasks?.filter(
                (task: any) => !task.completedAt || task.completedAt === null
              ).length || 0
              
              assignedTasksCount = assignedServiceTasks + assignedAskingTasks
              
              if (assignedTasksCount === 0) {
                console.log(`Member ${memberData.member?.displayName}: no assigned tasks found (all ${memberData.serviceTasks?.length || 0} service + ${memberData.askingTasks?.length || 0} asking tasks are completed)`)
              } else {
                console.log(`Member ${memberData.member?.displayName}: calculated assignedTasksCount = ${assignedTasksCount}`)
              }
            }
            
            totalAssignedTasks += assignedTasksCount
            
            return {
              ...memberData,
              assignedTasksCount
            }
          })
          
          console.log(`Total assigned tasks across all members: ${totalAssignedTasks}`)
          
          // Add totalAssignedTasks to summary
          if (data.summary) {
            data.summary.totalAssignedTasks = totalAssignedTasks
          }
        }
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError)
        useExternalAPI = false
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
