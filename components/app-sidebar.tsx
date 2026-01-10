"use client"

import * as React from "react"
import Image from "next/image"
import { useQuery } from "@tanstack/react-query"
import {
  Building2,
  Calendar,
  Clock,
  Home,
  Users,
  Briefcase,
  BarChart3,
  Shield,
  Tag,
  Layers,
  LifeBuoy,
  Send,
  Settings2,
  Package,
  UserCircle,
  Coffee,
  Award,
  Gift,
  TrendingUp,
  Coins,
  FileText,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { ZootLogo } from "@/components/zoot-logo"
import { useAuth } from "@/lib/auth-context"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Admin User",
    email: "admin@portal.com",
    avatar: "/avatars/admin.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: Home,
      isActive: true,
    },
     {
      title: "PMS Analytics",
      url: "/dashboard/member-analytics", 
      icon: TrendingUp,
    },
    {
      title: "Employees",
      url: "/employees",
      icon: Users,
      items: [
        {
          title: "Details",
          url: "/employees/details",
        },
      ],
    },
    {
      title: "Attendance",
      url: "/attendance",
      icon: Clock,
      items: [
        {
          title: "Edited Records",
          url: "/attendance/edited-records-list",
        },
        {
          title: "Upload History",
          url: "/attendance/upload-history",
        },
        {
          title: "Employee Analytics",
          url: "/attendance/employee-analytics",
        },
      ],
    },
    {
      title: "Flowace",
      url: "/flowace",
      icon: BarChart3,
      items: [
        {
          title: "Leaderboard",
          url: "/flowace/leaderboard",
        },
        {
          title: "Edited Records",
          url: "/flowace/edited-records",
        },
        {
          title: "Upload History",
          url: "/flowace/upload-history",
        },
        {
          title: "Employee Analytics",
          url: "/flowace/employee-analytics",
        },
      ],
    },
    {
      title: "Tags & Work",
      url: "/tags",
      icon: Tag,
      items: [
        {
          title: "Tag Assignments",
          url: "/tags/assignments",
        },
        {
          title: "Work Logs",
          url: "/tags/logs",
        },
      ],
    },
    {
      title: "Asset Management",
      url: "/assets",
      icon: Briefcase,
      items: [
        {
          title: "Asset Assignments",
          url: "/assets/assignments",
        },
        {
          title: "Maintenance Log",
          url: "/assets/maintenance",
        },
      ],
    },
    {
      title: "Break Management",
      url: "/admin/breaks",
      icon: Coffee,
      items: [
        {
          title: "Employee Breaks",
          url: "/admin/breaks/employees",
        },
        {
          title: "Edited Breaks",
          url: "/admin/breaks/edited-records",
        },
        {
          title: "Deleted Breaks",
          url: "/admin/breaks/deleted-records",
        },
      ],
    },

    {
      title: "Admin Management",
      url: "/admin",
      icon: Shield,
      items: [
        {
          title: "Penalty Management",
          url: "/admin/penalty-management",
        },
        {
          title: "Account Link Status",
          url: "/admin/link-accounts",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "My Attendance",
      url: "/employee-panel/my-attendance/records",
      icon: Clock,
    },
    {
      title: "Issues",
      url: "/issues",
      icon: LifeBuoy,
    },
    {
      title: "Profile",
      url: "/profile",
      icon: Settings2,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Use shared auth context instead of separate query
  const { employee } = useAuth()
  const userRole = employee?.role || 'ADMIN'

  // Filter navigation items based on role
  const getFilteredNavMain = React.useMemo(() => {
    if (userRole === 'EMPLOYEE') {
      // Employees should not see admin features
      return data.navMain.filter(item => 
        !['Admin Management', 'Employees', 'Break Management'].includes(item.title)
      )
    }
    // ADMIN sees everything
    return data.navMain
  }, [userRole])

  // Get secondary nav items based on role
  const getSecondaryNav = React.useMemo(() => {
    if (userRole === 'ADMIN') {
      return [
        {
          title: "Issue Management",
          url: "/admin/issues",
          icon: LifeBuoy,
        },
        {
          title: "My Employee Panel",
          url: "/employee-panel",
          icon: UserCircle,
        },
        {
          title: "My Attendance",
          url: "/employee-panel/attendance/records",
          icon: Clock,
        },
        {
          title: "Profile",
          url: "/profile",
          icon: Settings2,
        },
      ]
    }
    return data.navSecondary
  }, [userRole])

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/" className="flex items-center gap-2 py-2">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg border bg-card">
                  <Building2 className="text-foreground" size={18} strokeWidth={1.5} />
                </div>
                <span className="text-base font-semibold text-foreground">
                  Employee Portal
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={getFilteredNavMain} />
        <NavSecondary items={getSecondaryNav} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
