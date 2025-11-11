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
  Trophy,
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
      title: "Teams",
      url: "/teams",
      icon: Layers,
      items: [
        {
          title: "Create Team",
          url: "/teams/create",
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
      ],
    },
    {
      title: "Gamification",
      url: "/admin/gamification",
      icon: Trophy,
      items: [
        {
          title: "Overview",
          url: "/admin/gamification",
        },
        {
          title: "Achievements",
          url: "/admin/gamification/achievements",
        },
        {
          title: "Rewards",
          url: "/admin/gamification/rewards",
        },
        {
          title: "Leaderboard",
          url: "/admin/gamification/leaderboard",
        },
        {
          title: "Coin Redemptions",
          url: "/admin/gamification/redemptions",
        },
        {
          title: "Employee Progress",
          url: "/admin/gamification/employee-progress",
        },
      ],
    },
    {
      title: "Admin Management",
      url: "/admin",
      icon: Shield,
      items: [
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
  // Fetch current user role
  const { data: userData } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me')
      if (!response.ok) return null
      return response.json()
    },
    // Show full menu immediately while loading
    placeholderData: { employee: { role: 'ADMIN' } },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  const userRole = userData?.employee?.role || 'ADMIN'

  // Filter navigation items based on role
  const getFilteredNavMain = React.useMemo(() => {
    if (userRole === 'EMPLOYEE') {
      // Employees should not see admin features
      return data.navMain.filter(item => 
        !['Admin Management', 'Employees', 'Break Management'].includes(item.title)
      )
    }
    // ADMIN and TEAMLEADER see everything
    return data.navMain
  }, [userRole])

  // Get secondary nav items based on role
  const getSecondaryNav = React.useMemo(() => {
    if (userRole === 'ADMIN' || userRole === 'TEAMLEADER') {
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
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg border border-gray-200 bg-white">
                  <Building2 className="text-gray-900" size={18} strokeWidth={1.5} />
                </div>
                <span className="text-base font-semibold text-gray-900">
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
