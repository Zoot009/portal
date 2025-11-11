import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/auth/link-account
 * Link the current Clerk user to an employee record by employee code or email
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated with Clerk' },
        { status: 401 }
      )
    }

    // Get the request body to check for employee code
    const body = await request.json().catch(() => ({}))
    const { employeeCode } = body

    // Get the Clerk user details
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Could not fetch user details' },
        { status: 400 }
      )
    }

    let employee = null

    // Try to find employee by employee code if provided (case-insensitive)
    if (employeeCode) {
      employee = await prisma.employee.findFirst({
        where: { 
          employeeCode: {
            equals: employeeCode,
            mode: 'insensitive'
          }
        }
      })
      console.log('Trying to link by provided code:', employeeCode, 'Found:', !!employee)
    }

    // If no employee code provided or not found, try by Clerk username (case-insensitive)
    if (!employee && user.username) {
      employee = await prisma.employee.findFirst({
        where: { 
          employeeCode: {
            equals: user.username,
            mode: 'insensitive'
          }
        }
      })
      console.log('Trying to link by username:', user.username, 'Found:', !!employee)
    }

    // Try by email
    if (!employee && user.emailAddresses && user.emailAddresses.length > 0) {
      const email = user.emailAddresses[0].emailAddress
      employee = await prisma.employee.findFirst({
        where: { email }
      })
      console.log('Trying to link by email:', email, 'Found:', !!employee)
    }

    // Try to find by matching publicMetadata employeeCode (case-insensitive)
    if (!employee && user.publicMetadata?.employeeCode) {
      employee = await prisma.employee.findFirst({
        where: { 
          employeeCode: {
            equals: user.publicMetadata.employeeCode as string,
            mode: 'insensitive'
          }
        }
      })
      console.log('Trying to link by metadata:', user.publicMetadata.employeeCode, 'Found:', !!employee)
    }

    if (!employee) {
      const email = user.emailAddresses?.[0]?.emailAddress || 'unknown'
      const username = user.username || 'not set'
      const metadata = user.publicMetadata?.employeeCode || 'not set'
      
      console.error('Employee not found. Tried:', {
        providedCode: employeeCode,
        clerkUsername: username,
        clerkEmail: email,
        clerkMetadata: metadata
      })
      
      return NextResponse.json(
        { 
          error: `No employee found with code "${employeeCode || username}". Please check your employee code.`,
          needsEmployeeCode: true,
          clerkEmail: email,
          debug: {
            username,
            email,
            metadata,
            providedCode: employeeCode
          }
        },
        { status: 404 }
      )
    }

    // Check if employee is already linked to another account
    if (employee.clerkUserId && employee.clerkUserId !== userId) {
      return NextResponse.json(
        { error: 'This employee is already linked to another account' },
        { status: 409 }
      )
    }

    // Extract the user's actual email from Clerk
    const userEmail = user?.emailAddresses?.[0]?.emailAddress
    
    // Link the Clerk user to the employee and update email if needed
    const updatedEmployee = await prisma.employee.update({
      where: { id: employee.id },
      data: { 
        clerkUserId: userId,
        // Only update email if we have a real email from Clerk and current email is default format
        ...(userEmail && employee.email?.includes('@company.com') ? { email: userEmail } : {})
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully linked account to employee ${employee.employeeCode}`,
      employee: {
        id: updatedEmployee.id,
        employeeCode: updatedEmployee.employeeCode,
        name: updatedEmployee.name,
        email: updatedEmployee.email,
        role: updatedEmployee.role,
      },
      emailUpdated: userEmail && employee.email?.includes('@company.com')
    })

  } catch (error: any) {
    console.error('Error linking account:', error)
    return NextResponse.json(
      { error: `Failed to link account: ${error.message}` },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/link-account
 * Check if the current user needs to link their account
 */
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { needsLink: true, reason: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if already linked
    const employee = await prisma.employee.findFirst({
      where: { clerkUserId: userId }
    })

    if (employee) {
      return NextResponse.json({
        needsLink: false,
        employee: {
          employeeCode: employee.employeeCode,
          name: employee.name,
          email: employee.email,
          role: employee.role,
        }
      })
    }

    // Get user email to check if employee exists
    const user = await currentUser()
    const email = user?.emailAddresses?.[0]?.emailAddress

    const employeeByEmail = await prisma.employee.findFirst({
      where: { email }
    })

    return NextResponse.json({
      needsLink: true,
      canAutoLink: !!employeeByEmail,
      email,
      employeeFound: employeeByEmail ? {
        employeeCode: employeeByEmail.employeeCode,
        name: employeeByEmail.name,
      } : null
    })

  } catch (error: any) {
    console.error('Error checking link status:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
