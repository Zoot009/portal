import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentEmployee } from '@/lib/auth-utils'
import { auth } from '@clerk/nextjs/server'

/**
 * POST /api/admin/link-account
 * Manually link a Clerk user to an employee record
 * Admin only
 */
export async function POST(request: NextRequest) {
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
    const { employeeCode } = body

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

    // Find the employee (case-insensitive)
    const employee = await prisma.employee.findFirst({
      where: { 
        employeeCode: {
          equals: employeeCode,
          mode: 'insensitive'
        }
      }
    })

    if (!employee) {
      return NextResponse.json(
        { error: `Employee with code ${employeeCode} not found` },
        { status: 404 }
      )
    }

    // Check if employee is already linked
    if (employee.clerkUserId) {
      return NextResponse.json(
        { 
          error: `Employee ${employeeCode} is already linked to Clerk account: ${employee.clerkUserId}`,
          alreadyLinked: true 
        },
        { status: 400 }
      )
    }

    // Link the account
    const updatedEmployee = await prisma.employee.update({
      where: { id: employee.id },
      data: { 
        clerkUserId: userId,
        lastLogin: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully linked ${employeeCode} to Clerk account`,
      employee: {
        id: updatedEmployee.id,
        employeeCode: updatedEmployee.employeeCode,
        name: updatedEmployee.name,
        email: updatedEmployee.email,
        clerkUserId: updatedEmployee.clerkUserId
      }
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
 * GET /api/admin/link-account
 * Get all unlinked employees
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

    // Get all unlinked employees
    const unlinkedEmployees = await prisma.employee.findMany({
      where: {
        clerkUserId: null,
        isActive: true
      },
      select: {
        id: true,
        employeeCode: true,
        name: true,
        email: true,
        role: true,
        department: true
      },
      orderBy: {
        employeeCode: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      count: unlinkedEmployees.length,
      employees: unlinkedEmployees
    })

  } catch (error: any) {
    console.error('Error fetching unlinked employees:', error)
    return NextResponse.json(
      { error: `Failed to fetch unlinked employees: ${error.message}` },
      { status: 500 }
    )
  }
}
