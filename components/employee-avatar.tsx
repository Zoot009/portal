'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createSupabaseClient } from '@/lib/supabase'
import { useState, useEffect } from 'react'

interface EmployeeAvatarProps {
  name: string
  passportPhoto?: string | null
  className?: string
}

export function EmployeeAvatar({ name, passportPhoto, className }: EmployeeAvatarProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPhoto = async () => {
      if (!passportPhoto) {
        setLoading(false)
        return
      }

      try {
        const supabase = createSupabaseClient()
        
        // Try to get signed URL first
        const { data, error } = await supabase.storage
          .from('employee-documents')
          .createSignedUrl(passportPhoto, 3600)

        if (error) {
          // If signed URL fails, try public URL
          const { data: publicData } = supabase.storage
            .from('employee-documents')
            .getPublicUrl(passportPhoto)
          
          if (publicData?.publicUrl) {
            setPhotoUrl(publicData.publicUrl)
          }
        } else if (data?.signedUrl) {
          setPhotoUrl(data.signedUrl)
        }
      } catch (error) {
        console.error('Error loading employee photo:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPhoto()
  }, [passportPhoto])

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <Avatar className={className}>
      {!loading && photoUrl && <AvatarImage src={photoUrl} alt={name} />}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  )
}
