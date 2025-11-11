import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * Setup user with employee code
 * Admin calls this after user signs up with username=employeeCode
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { clerkUserId } = body // The user ID to setup

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Clerk user ID required' }, { status: 400 })
    }

    // Get the user from Clerk
    const client = await clerkClient()
    const user = await client.users.getUser(clerkUserId)

    if (!user.username) {
      return NextResponse.json({ 
        error: 'User must have username set to employee code' 
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
        email: true,
        clerkUserId: true,
      }
    })

    if (!employee) {
      return NextResponse.json({ 
        error: `Employee code '${employeeCode}' not found in database` 
      }, { status: 404 })
    }

    // Check if already linked to another user
    if (employee.clerkUserId && employee.clerkUserId !== clerkUserId) {
      return NextResponse.json({ 
        error: 'This employee code is already linked to another account' 
      }, { status: 409 })
    }

    // Extract the user's actual email from Clerk
    const userEmail = user.emailAddresses?.[0]?.emailAddress
    
    // Link employee to Clerk user and update email if needed
    await prisma.employee.update({
      where: { id: employee.id },
      data: { 
        clerkUserId,
        // Only update email if we have a real email from Clerk and current email is default format
        ...(userEmail && employee.email?.includes('@company.com') ? { email: userEmail } : {})
      }
    })

    // Update Clerk metadata
    await client.users.updateUserMetadata(clerkUserId, {
      publicMetadata: {
        role: employee.role,
        employeeCode: employee.employeeCode,
        isActive: employee.isActive,
      }
    })

    return NextResponse.json({ 
      success: true,
      employee: {
        code: employee.employeeCode,
        name: employee.name,
        role: employee.role,
      },
      emailUpdated: userEmail && employee.email?.includes('@company.com')
    })

  } catch (error) {
    console.error('Error setting up user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Get all Clerk users that need setup (have username but no metadata)
 */
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user is admin
    const currentEmployee = await prisma.employee.findUnique({
      where: { clerkUserId: userId },
      select: { role: true }
    })

    if (currentEmployee?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const client = await clerkClient()
    const users = await client.users.getUserList({ limit: 100 })

    const needsSetup = users.data
      .filter(user => {
        const metadata = user.publicMetadata as EmployeeMetadata | undefined
        return user.username && (!metadata?.role || !metadata?.employeeCode)
      })
      .map(user => ({
        id: user.id,
        username: user.username,
        email: user.emailAddresses[0]?.emailAddress,
        createdAt: user.createdAt,
      }))

    return NextResponse.json({ users: needsSetup })

  } catch (error) {
    console.error('Error getting users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

interface EmployeeMetadata {
  role?: string
  employeeCode?: string
  isActive?: boolean
}
