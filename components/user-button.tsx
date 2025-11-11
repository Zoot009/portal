'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { LogOut, User, Settings, Shield, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

export function UserButton() {
  const { user } = useUser()
  const { signOut } = useClerk()

  if (!user) {
    return null
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Signed out successfully')
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  const userInitials = user.firstName && user.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user.primaryEmailAddress?.emailAddress?.slice(0, 2).toUpperCase() || 'U'

  const displayName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user.username || user.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align="end" forceMount>
        <div className="flex items-start gap-3 p-4">
          <Avatar className="h-12 w-12">
            {user.imageUrl && (
              <AvatarImage src={user.imageUrl} alt={displayName} />
            )}
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-lg">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-1 leading-none min-w-0 flex-1">
            <p className="font-semibold text-base">{displayName}</p>
            <p className="text-sm text-muted-foreground truncate">
              {user.primaryEmailAddress?.emailAddress}
            </p>
            {user.primaryPhoneNumber && (
              <p className="text-sm text-muted-foreground">
                {user.primaryPhoneNumber.phoneNumber}
              </p>
            )}
            <div className="flex gap-2 mt-2">
              <Badge 
                variant={user.primaryEmailAddress?.verification?.status === 'verified' ? "default" : "destructive"} 
                className="text-xs"
              >
                {user.primaryEmailAddress?.verification?.status === 'verified' ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                Email {user.primaryEmailAddress?.verification?.status === 'verified' ? 'Verified' : 'Unverified'}
              </Badge>
              {user.primaryPhoneNumber && (
                <Badge 
                  variant={user.primaryPhoneNumber.verification?.status === 'verified' ? "default" : "secondary"} 
                  className="text-xs"
                >
                  {user.primaryPhoneNumber.verification?.status === 'verified' ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  Phone {user.primaryPhoneNumber.verification?.status === 'verified' ? 'Verified' : 'Unverified'}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          Account Settings
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Shield className="mr-2 h-4 w-4" />
          Security & Verification
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}