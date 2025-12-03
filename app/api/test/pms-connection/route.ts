import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test basic connectivity to the domain
    const testUrl = 'https://pms.zootcloud.com'
    
    console.log('Testing connectivity to:', testUrl)
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/json,*/*',
        'User-Agent': 'Portal-Dashboard-Test/1.0',
      },
    })
    
    console.log('Test response status:', response.status)
    console.log('Test response headers:', Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log('Test response body (first 300 chars):', responseText.substring(0, 300))
    
    // Now test the actual API endpoint
    const apiUrl = 'https://pms.zootcloud.com/api/public/member-tasks'
    console.log('Testing API endpoint:', apiUrl)
    
    const apiResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Portal-Dashboard-Test/1.0',
      },
    })
    
    console.log('API response status:', apiResponse.status)
    console.log('API response headers:', Object.fromEntries(apiResponse.headers.entries()))
    
    const apiResponseText = await apiResponse.text()
    console.log('API response body (first 300 chars):', apiResponseText.substring(0, 300))
    
    return NextResponse.json({
      success: true,
      tests: {
        domain: {
          url: testUrl,
          status: response.status,
          contentType: response.headers.get('content-type'),
          isHTML: responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html'),
        },
        api: {
          url: apiUrl,
          status: apiResponse.status,
          contentType: apiResponse.headers.get('content-type'),
          isHTML: apiResponseText.trim().startsWith('<!DOCTYPE') || apiResponseText.trim().startsWith('<html'),
          isJSON: (() => {
            try {
              JSON.parse(apiResponseText)
              return true
            } catch {
              return false
            }
          })(),
        }
      }
    })
    
  } catch (error) {
    console.error('Test API Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to test external PMS API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}