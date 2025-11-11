import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/auth/me
 * Returns the current authenticated employee's information
 * Auto-links the account if not already linked
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

    // First, check if already linked (single fast query)
    let employee = await prisma.employee.findFirst({
      where: { clerkUserId: userId },
      select: {
        id: true,
        employeeCode: true,
        name: true,
        email: true,
        role: true,
        department: true,
        designation: true,
        isActive: true,
        fullName: true,
        passportPhoto: true,
        lastLogin: true
      }
    })

    // If linked, return immediately (fast path)
    if (employee) {
      // Only update lastLogin if it's been more than 1 hour (reduce writes)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      if (!employee.lastLogin || employee.lastLogin < oneHourAgo) {
        // Fire and forget - don't wait for this
        prisma.employee.update({
          where: { id: employee.id },
          data: { lastLogin: new Date() }
        }).catch(() => {}) // Ignore errors
      }

      return NextResponse.json({
        employee: {
          id: employee.id,
          employeeCode: employee.employeeCode,
          name: employee.name,
          email: employee.email,
          role: employee.role,
          department: employee.department,
          designation: employee.designation,
          isActive: employee.isActive,
          fullName: employee.fullName,
          passportPhoto: employee.passportPhoto,
        }
      })
    }

    // Not linked - try auto-linking (slower path, only runs once)
    const user = await currentUser()
    let foundEmployee = null

    // Strategy 1: Try to find by username (employee code) - case insensitive
    if (user?.username) {
      foundEmployee = await prisma.employee.findFirst({
        where: {
          employeeCode: {
            equals: user.username,
            mode: 'insensitive'
          },
          isActive: true
        }
      })

      if (foundEmployee) {
        console.log(`Found employee by username: ${user.username} -> ${foundEmployee.employeeCode}`)
      }
    }

    // Strategy 2: Try by email if username didn't work
    if (!foundEmployee && user?.emailAddresses?.[0]?.emailAddress) {
      const email = user.emailAddresses[0].emailAddress
      foundEmployee = await prisma.employee.findFirst({
        where: { 
          email: {
            equals: email,
            mode: 'insensitive'
          },
          isActive: true
        }
      })

      if (foundEmployee) {
        console.log(`Found employee by email: ${email} -> ${foundEmployee.employeeCode}`)
      }
    }

    // Strategy 3: Try partial match on employee code from email
    if (!foundEmployee && user?.emailAddresses?.[0]?.emailAddress) {
      const email = user.emailAddresses[0].emailAddress
      const emailPrefix = email.split('@')[0]
      
      foundEmployee = await prisma.employee.findFirst({
        where: {
          employeeCode: {
            equals: emailPrefix,
            mode: 'insensitive'
          },
          isActive: true
        }
      })

      if (foundEmployee) {
        console.log(`Found employee by email prefix: ${emailPrefix} -> ${foundEmployee.employeeCode}`)
      }
    }

    // If we found an employee, link them
    if (foundEmployee) {
      const clerkEmail = user?.emailAddresses?.[0]?.emailAddress
      
      employee = await prisma.employee.update({
        where: { id: foundEmployee.id },
        data: { 
          clerkUserId: userId,
          lastLogin: new Date(),
          ...(clerkEmail && { email: clerkEmail })
        }
      })
      
      console.log(`✅ Auto-linked: Clerk user ${userId} -> ${employee.employeeCode}`)
      
      return NextResponse.json({
        employee: {
          id: employee.id,
          employeeCode: employee.employeeCode,
          name: employee.name,
          email: employee.email,
          role: employee.role,
          department: employee.department,
          designation: employee.designation,
          isActive: employee.isActive,
          fullName: employee.fullName,
          passportPhoto: employee.passportPhoto,
        }
      })
    }

    // Not found
    const username = user?.username || 'unknown'
    const email = user?.emailAddresses?.[0]?.emailAddress || 'unknown'
    
    return NextResponse.json(
      { 
        error: 'Employee record not found. Please contact admin to link your account.',
        details: {
          clerkUsername: username,
          clerkEmail: email,
          message: 'No employee found with matching employee code or email.'
        }
      },
      { status: 404 }
    )

  } catch (error) {
    console.error('Error fetching current employee:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
