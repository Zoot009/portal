'use client'

import React from 'react'
import { useAuth } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { ChevronRight } from "lucide-react"
import { AdminPenaltyReminder } from "@/components/admin-penalty-reminder"

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth()
  const pathname = usePathname()

  // If on employee panel routes, don't apply this layout (employee panel has its own layout)
  if (pathname?.startsWith('/employee-panel')) {
    return <>{children}</>
  }

  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = () => {
    if (pathname === '/' || pathname === '/dashboard') {
      return [{ label: 'Dashboard', href: '/dashboard', isCurrentPage: true }]
    }

    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs = [{ label: 'Dashboard', href: '/dashboard', isCurrentPage: false }]
    
    let currentPath = ''
    segments.forEach((segment, index) => {
      // Skip adding "dashboard" as a separate breadcrumb since it's already the root
      if (segment.toLowerCase() === 'dashboard') {
        return
      }
      
      currentPath += `/${segment}`
      
      // Skip numeric IDs (like team IDs) in breadcrumbs
      if (/^\d+$/.test(segment)) {
        return
      }
      
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      
      breadcrumbs.push({
        label,
        href: currentPath,
        isCurrentPage: index === segments.length - 1
      })
    })
    
    return breadcrumbs
  }

  // Show loading while auth is being determined
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  // If user is signed in, show the full dashboard layout
  if (isSignedIn) {
    const breadcrumbs = generateBreadcrumbs()

    return (
      <SidebarProvider>
        <AppSidebar />
        <AdminPenaltyReminder />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="!h-3.5 mx-2" />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.href}>
                    <BreadcrumbItem>
                      {crumb.isCurrentPage ? (
                        <BreadcrumbPage className="font-medium">{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={crumb.href} className="text-muted-foreground hover:text-foreground">
                          {crumb.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {index < breadcrumbs.length - 1 && (
                      <BreadcrumbSeparator>
                        <ChevronRight className="h-4 w-4" />
                      </BreadcrumbSeparator>
                    )}
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  // If user is not signed in, show clean layout
  return <>{children}</>
}