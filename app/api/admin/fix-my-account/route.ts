import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/fix-my-account
 * Emergency endpoint to fix admin account linking
 * Unlinks current employee and links to specified employee code
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { targetEmployeeCode } = body

    if (!targetEmployeeCode) {
      return NextResponse.json(
        { error: 'Target employee code is required' },
        { status: 400 }
      )
    }

    // Find the target employee
    const targetEmployee = await prisma.employee.findUnique({
      where: { employeeCode: targetEmployeeCode }
    })

    if (!targetEmployee) {
      return NextResponse.json(
        { error: `Employee with code ${targetEmployeeCode} not found` },
        { status: 404 }
      )
    }

    // Find currently linked employee
    const currentEmployee = await prisma.employee.findUnique({
      where: { clerkUserId: userId }
    })

    // Unlink all employees with this Clerk user ID
    await prisma.employee.updateMany({
      where: { clerkUserId: userId },
      data: { clerkUserId: null }
    })

    console.log(`Unlinked ${currentEmployee?.employeeCode || 'unknown'} from Clerk user ${userId}`)

    // Link to target employee
    await prisma.employee.update({
      where: { employeeCode: targetEmployeeCode },
      data: { 
        clerkUserId: userId,
        lastLogin: new Date()
      }
    })

    console.log(`Linked ${targetEmployeeCode} to Clerk user ${userId}`)

    return NextResponse.json({
      success: true,
      message: `Successfully switched from ${currentEmployee?.employeeCode || 'unknown'} to ${targetEmployeeCode}`,
      previousCode: currentEmployee?.employeeCode,
      newCode: targetEmployeeCode
    })

  } catch (error: any) {
    console.error('Error fixing account:', error)
    return NextResponse.json(
      { error: `Failed to fix account: ${error.message}` },
      { status: 500 }
    )
  }
}
