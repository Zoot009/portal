import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Forward all query parameters to the external API
    const externalUrl = `https://crm.zootcloud.com/api/public/audit${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    
    console.log('Making request to:', externalUrl)
    
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
          error: `External API error: ${response.status} ${response.statusText}`,
          details: responseText.substring(0, 500) // Limit error details
        },
        { status: response.status }
      )
    }
    
    // Check if response is HTML instead of JSON (indicates auth required)
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.error('Received HTML response instead of JSON - API requires authentication.')
      
      return NextResponse.json(
        { 
          error: 'API requires authentication or is unavailable',
          details: 'The external CRM API returned an HTML response instead of JSON'
        },
        { status: 502 }
      )
    }
    
    let data
    try {
      data = JSON.parse(responseText)
      
      // Validate the response structure
      if (!Array.isArray(data.users)) {
        console.error('Invalid API response structure:', data)
        
        return NextResponse.json(
          { 
            error: 'Invalid API response format',
            details: 'Expected users array in response'
          },
          { status: 502 }
        )
      }
      
      console.log('Successfully fetched audit data for', data.totalUsers, 'users')
      
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError)
      
      return NextResponse.json(
        { 
          error: 'Failed to parse API response',
          details: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        },
        { status: 502 }
      )
    }
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Proxy API Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to connect to external CRM API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
