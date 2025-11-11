import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * One-time sync for current logged-in user
 * Call this to fix your account right now
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const user = await currentUser()
    
    if (!user || !user.username) {
      return NextResponse.json({ 
        error: 'No username set. Please set your username to your employee code in Clerk.' 
      }, { status: 400 })
    }

    const employeeCode = user.username.toLowerCase()

    // Find employee in database (case-insensitive)
    const employee = await prisma.employee.findFirst({
      where: { 
        employeeCode: {
          equals: employeeCode,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        employeeCode: true,
        role: true,
        isActive: true,
        name: true,
      }
    })

    if (!employee) {
      return NextResponse.json({ 
        error: `Employee code '${employeeCode}' not found in database` 
      }, { status: 404 })
    }

    // Update database link
    await prisma.employee.update({
      where: { id: employee.id },
      data: { clerkUserId: userId }
    })

    // Update Clerk metadata
    const client = await clerkClient()
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: employee.role,
        employeeCode: employee.employeeCode,
        isActive: employee.isActive,
      }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Setup complete! Please sign out and sign in again.',
      employee: {
        code: employee.employeeCode,
        name: employee.name,
        role: employee.role,
      }
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
