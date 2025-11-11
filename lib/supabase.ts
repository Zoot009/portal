import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Legacy client for compatibility (keep existing code working)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client-side Supabase client for App Router
export function createSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Server-side Supabase client for App Router
export async function createSupabaseServerClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

// Supabase client - keeping only database functionality

// Database Types
export interface AttendanceRecord {
  id: string
  employee_id: number
  employee_code: string
  employee_name: string
  date: string
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'WFH_APPROVED'
  check_in_time: string | null
  break_in_time: string | null
  break_out_time: string | null
  check_out_time: string | null
  total_hours: number
  shift_time: string
  created_at?: string
  updated_at?: string
}

export interface UploadHistory {
  id: string
  file_name: string
  upload_date: string
  record_count: number
  uploaded_at: string
  file_content: string
  created_at?: string
}