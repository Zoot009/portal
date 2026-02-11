import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/public(.*)',
])

// Define routes that require specific roles
const adminOnlyRoutes = createRouteMatcher([
  '/admin(.*)',
  '/employees(.*)', 
  '/reports(.*)',
  '/attendance(.*)',
  '/tags(.*)',
  '/teams(.*)',
  '/assets(.*)',
  '/flowace(.*)',
])

const employeeOnlyRoutes = createRouteMatcher([
  '/employee-panel(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  // Don't protect public routes
  if (!isPublicRoute(request)) {
    const { userId } = await auth.protect()
    
    // Get user role from API for protected routes
    if (adminOnlyRoutes(request) || employeeOnlyRoutes(request)) {
      try {
        // Get the full URL for the API call
        const baseUrl = request.nextUrl.origin
        const response = await fetch(`${baseUrl}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${userId}`,
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          const userRole = data.employee?.role
          
          // Block employees from accessing admin routes
          if (adminOnlyRoutes(request) && userRole === 'EMPLOYEE') {
            return NextResponse.redirect(new URL('/employee-panel', request.url))
          }
          
          // Block non-employees from accessing employee panel
          if (employeeOnlyRoutes(request) && userRole !== 'EMPLOYEE') {
            return NextResponse.redirect(new URL('/dashboard', request.url))
          }
        }
      } catch (error) {
        console.error('Error checking user role in middleware:', error)
      }
    }
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}