import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated', needsAuth: true },
        { status: 401 }
      )
    }

    // Check if user is linked to an employee record
    const employee = await prisma.employee.findFirst({
      where: { clerkUserId: userId },
      select: {
        id: true,
        employeeCode: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    })

    if (employee) {
      return NextResponse.json({
        authenticated: true,
        linked: true,
        employee
      })
    }

    return NextResponse.json({
      authenticated: true,
      linked: false,
      needsLink: true
    })

  } catch (error: any) {
    console.error('Error in auth check:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
