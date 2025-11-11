'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { EmployeeAppSidebar } from "@/components/employee-app-sidebar"
import { EmployeePenaltyReminder } from "@/components/employee-penalty-reminder"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ChevronRight } from "lucide-react"

export default function EmployeePanelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = () => {
    if (pathname === '/employee-panel') {
      return [{ label: 'Dashboard', href: '/employee-panel', isCurrentPage: true }]
    }

    // Special handling for attendance routes
    if (pathname === '/employee-panel/attendance' || pathname === '/employee-panel/attendance/records') {
      return [
        { label: 'Dashboard', href: '/employee-panel', isCurrentPage: false },
        { label: 'Attendance', href: '/employee-panel/attendance', isCurrentPage: true }
      ]
    }

    // Special handling for my-tags routes (Work & Tasks)
    if (pathname.startsWith('/employee-panel/my-tags')) {
      const breadcrumbs = [
        { label: 'Dashboard', href: '/employee-panel', isCurrentPage: false },
      ]
      
      // Check if we're on history page
      if (pathname.includes('/history')) {
        breadcrumbs.push({ label: 'Work & Tasks', href: '/employee-panel/my-tags', isCurrentPage: false })
        breadcrumbs.push({ label: 'View History', href: '/employee-panel/my-tags/history', isCurrentPage: true })
      } else {
        // For submit or base my-tags page, just show "Work & Tasks"
        breadcrumbs.push({ label: 'Work & Tasks', href: '/employee-panel/my-tags', isCurrentPage: true })
      }
      
      return breadcrumbs
    }

    // Default breadcrumb generation for other routes
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs = [{ label: 'Dashboard', href: '/employee-panel', isCurrentPage: false }]
    
    let currentPath = ''
    
    segments.forEach((segment, index) => {
      if (segment === 'employee-panel') return
      
      currentPath += `/${segment}`
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      
      breadcrumbs.push({
        label,
        href: `/employee-panel${currentPath}`,
        isCurrentPage: index === segments.length - 1
      })
    })
    
    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  return (
    <SidebarProvider>
      <EmployeePenaltyReminder />
      <EmployeeAppSidebar />
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
