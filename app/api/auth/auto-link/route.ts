import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/auth/auto-link
 * Automatically link Clerk user to employee by matching Clerk metadata or creating link
 */
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if already linked
    const existingEmployee = await prisma.employee.findFirst({
      where: { clerkUserId: userId }
    })

    if (existingEmployee) {
      return NextResponse.json({
        success: true,
        alreadyLinked: true,
        employee: {
          employeeCode: existingEmployee.employeeCode,
          name: existingEmployee.name,
          role: existingEmployee.role
        }
      })
    }

    // Get Clerk user to check for employee code in metadata
    const user = await currentUser()
    const employeeCodeFromMetadata = user?.publicMetadata?.employeeCode as string | undefined

    if (employeeCodeFromMetadata) {
      // Link using employee code from Clerk metadata
      const employee = await prisma.employee.findUnique({
        where: { employeeCode: employeeCodeFromMetadata }
      })

      if (employee && !employee.clerkUserId) {
        // Extract the user's actual email from Clerk
        const userEmail = user?.emailAddresses?.[0]?.emailAddress
        
        // Update employee with Clerk user ID and real email
        await prisma.employee.update({
          where: { id: employee.id },
          data: { 
            clerkUserId: userId,
            // Only update email if we have a real email from Clerk and current email is default format
            ...(userEmail && employee.email?.includes('@company.com') ? { email: userEmail } : {})
          }
        })

        return NextResponse.json({
          success: true,
          linked: true,
          employee: {
            employeeCode: employee.employeeCode,
            name: employee.name,
            role: employee.role,
            emailUpdated: userEmail && employee.email?.includes('@company.com')
          }
        })
      }
    }

    // If no metadata, suggest manual linking needed
    return NextResponse.json({
      success: false,
      needsSetup: true,
      message: 'Account needs to be linked. Please contact your administrator or use the setup page.'
    })

  } catch (error: any) {
    console.error('Error auto-linking:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
