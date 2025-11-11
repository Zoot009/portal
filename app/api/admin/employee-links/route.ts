import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentEmployee } from '@/lib/auth-utils'
import { auth } from '@clerk/nextjs/server'

/**
 * GET /api/admin/employee-links
 * Get ALL employees with their linking status
 */
export async function GET() {
  try {
    // Check if current user is admin
    const currentEmployee = await getCurrentEmployee()
    
    if (!currentEmployee || currentEmployee.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    // Get all active employees
    const allEmployees = await prisma.employee.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        employeeCode: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        clerkUserId: true,
        lastLogin: true
      },
      orderBy: {
        employeeCode: 'asc'
      }
    })

    const unlinkedEmployees = allEmployees.filter(emp => !emp.clerkUserId)
    const linkedEmployees = allEmployees.filter(emp => emp.clerkUserId)

    return NextResponse.json({
      success: true,
      total: allEmployees.length,
      unlinkedCount: unlinkedEmployees.length,
      linkedCount: linkedEmployees.length,
      employees: allEmployees
    })

  } catch (error: any) {
    console.error('Error fetching employee links:', error)
    return NextResponse.json(
      { error: `Failed to fetch employee links: ${error.message}` },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/employee-links
 * Update/force relink an employee account
 */
export async function PATCH(request: NextRequest) {
  try {
    // Check if current user is admin
    const currentEmployee = await getCurrentEmployee()
    
    if (!currentEmployee || currentEmployee.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { employeeCode, forceRelink } = body

    if (!employeeCode) {
      return NextResponse.json(
        { error: 'Employee code is required' },
        { status: 400 }
      )
    }

    // Get the current Clerk user ID (the one being linked)
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated with Clerk' },
        { status: 401 }
      )
    }

    // Find the employee
    const employee = await prisma.employee.findUnique({
      where: { employeeCode }
    })

    if (!employee) {
      return NextResponse.json(
        { error: `Employee with code ${employeeCode} not found` },
        { status: 404 }
      )
    }

    // Check if already linked and not forcing relink
    if (employee.clerkUserId && !forceRelink) {
      return NextResponse.json(
        { 
          error: `Employee ${employeeCode} is already linked to Clerk account: ${employee.clerkUserId}`,
          alreadyLinked: true,
          currentClerkUserId: employee.clerkUserId
        },
        { status: 400 }
      )
    }

    // Check if the Clerk user ID is already linked to another employee
    const existingLink = await prisma.employee.findUnique({
      where: { clerkUserId: userId }
    })

    // If the Clerk user is already linked to a different employee, unlink it first
    // This allows admins to manually reassign links if needed (case-insensitive comparison)
    if (existingLink && existingLink.employeeCode.toLowerCase() !== employeeCode.toLowerCase()) {
      await prisma.employee.update({
        where: { id: existingLink.id },
        data: { clerkUserId: null }
      })
      console.log(`Admin override: Unlinked ${existingLink.employeeCode} from Clerk user ${userId} to link ${employeeCode}`)
    }

    // Link or relink the account
    const updatedEmployee = await prisma.employee.update({
      where: { employeeCode },
      data: { 
        clerkUserId: userId,
        lastLogin: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: forceRelink 
        ? `Successfully relinked ${employeeCode} to new Clerk account`
        : `Successfully linked ${employeeCode} to Clerk account`,
      employee: {
        id: updatedEmployee.id,
        employeeCode: updatedEmployee.employeeCode,
        name: updatedEmployee.name,
        email: updatedEmployee.email,
        clerkUserId: updatedEmployee.clerkUserId
      }
    })

  } catch (error: any) {
    console.error('Error linking/relinking account:', error)
    return NextResponse.json(
      { error: `Failed to link account: ${error.message}` },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/employee-links
 * Unlink an employee account
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check if current user is admin
    const currentEmployee = await getCurrentEmployee()
    
    if (!currentEmployee || currentEmployee.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const employeeCode = searchParams.get('employeeCode')

    if (!employeeCode) {
      return NextResponse.json(
        { error: 'Employee code is required' },
        { status: 400 }
      )
    }

    // Find the employee
    const employee = await prisma.employee.findUnique({
      where: { employeeCode }
    })

    if (!employee) {
      return NextResponse.json(
        { error: `Employee with code ${employeeCode} not found` },
        { status: 404 }
      )
    }

    if (!employee.clerkUserId) {
      return NextResponse.json(
        { error: `Employee ${employeeCode} is not linked to any Clerk account` },
        { status: 400 }
      )
    }

    // Unlink the account
    const updatedEmployee = await prisma.employee.update({
      where: { employeeCode },
      data: { 
        clerkUserId: null
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully unlinked ${employeeCode} from Clerk account`,
      employee: {
        id: updatedEmployee.id,
        employeeCode: updatedEmployee.employeeCode,
        name: updatedEmployee.name,
        email: updatedEmployee.email
      }
    })

  } catch (error: any) {
    console.error('Error unlinking account:', error)
    return NextResponse.json(
      { error: `Failed to unlink account: ${error.message}` },
      { status: 500 }
    )
  }
}
