"use client"

import { useUser, useClerk } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import {
  ChevronsUpDown,
  LogOut,
  Coins,
  Star,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

import { supabase } from '@/lib/supabase'

export function NavUser() {
  const { isMobile } = useSidebar()
  const { user } = useUser()
  const { signOut } = useClerk()
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)

  // Fetch employee data including profile photo
  const { data: employeeData } = useQuery({
    queryKey: ['current-employee'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me')
      if (!res.ok) return null
      return res.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })

  // Fetch gamification data (points and coins)
  const { data: gamificationData } = useQuery({
    queryKey: ['gamification-data'],
    queryFn: async () => {
      const res = await fetch('/api/gamification/points')
      if (!res.ok) return null
      return res.json()
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
    enabled: !!employeeData?.employee?.id
  })

  const { data: profileData } = useQuery({
    queryKey: ['user-profile-photo'],
    queryFn: async () => {
      const res = await fetch('/api/profile/documents')
      if (!res.ok) return null
      return res.json()
    },
    staleTime: 30 * 1000, // 30 seconds (shorter cache for profile photo)
    refetchOnWindowFocus: true, // Refetch when window gains focus
  })

  // Load profile photo with signed URL
  useEffect(() => {
    const loadPhoto = async () => {
      if (profileData?.profilePhoto && typeof profileData.profilePhoto === 'string') {
        // If it's already a full URL, use it
        if (profileData.profilePhoto.startsWith('http')) {
          setProfilePhoto(profileData.profilePhoto)
          return
        }
        
        // Get signed URL from Supabase
        try {
          const { data, error } = await supabase.storage
            .from('employee-documents')
            .createSignedUrl(profileData.profilePhoto, 365 * 24 * 60 * 60) // 1 year
          
          if (!error && data?.signedUrl) {
            setProfilePhoto(data.signedUrl)
          } else {
            // Fallback to Clerk image
            setProfilePhoto(user?.imageUrl || null)
          }
        } catch (error) {
          console.error('Error loading profile photo:', error)
          setProfilePhoto(user?.imageUrl || null)
        }
      } else {
        // No custom photo, use Clerk image
        setProfilePhoto(user?.imageUrl || null)
      }
    }

    loadPhoto()
  }, [profileData, user])

  if (!user) {
    return null
  }

  const displayName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user.username || user.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User'

  const userInitials = user.firstName && user.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : displayName.slice(0, 2).toUpperCase()

  const handleSignOut = () => {
    signOut()
  }
  
  const avatarUrl = profilePhoto || user.imageUrl

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="rounded-lg">{userInitials}</AvatarFallback>
              </Avatar>
              
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs font-mono text-muted-foreground">
                    {employeeData?.employee?.employeeCode || user.primaryEmailAddress?.emailAddress}
                  </span>
                  {gamificationData?.employeePoints && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-medium">{gamificationData.employeePoints.points}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Coins className="h-3 w-3 text-amber-600 fill-amber-600" />
                        <span className="text-xs font-medium text-amber-600">{gamificationData.employeePoints.coins}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="rounded-lg">{userInitials}</AvatarFallback>
                </Avatar>
                
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs">{user.primaryEmailAddress?.emailAddress}</span>
                  
                  {employeeData?.employee?.employeeCode && (
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="outline" className="text-[10px] font-mono px-1 py-0">
                        {employeeData.employee.employeeCode}
                      </Badge>
                      
                      {employeeData.employee.role === 'ADMIN' && (
                        <Badge variant="default" className="text-[10px] px-1 py-0 bg-blue-600">
                          Admin
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {gamificationData?.employeePoints && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-0.5 text-xs">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{gamificationData.employeePoints.points}</span>
                      </div>
                      <div className="flex items-center gap-0.5 text-xs">
                        <Coins className="h-3 w-3 text-amber-600 fill-amber-600" />
                        <span className="font-medium text-amber-600">{gamificationData.employeePoints.coins}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
