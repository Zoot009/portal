import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentEmployee } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    // Get the current employee from session
    const currentEmployee = await getCurrentEmployee()
    
    console.log('[Employee Profile API] Current employee:', currentEmployee)
    
    if (!currentEmployee) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Fetch full employee details including standardHours
    const employee = await prisma.employee.findUnique({
      where: {
        id: currentEmployee.id
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeCode: true,
        department: true,
        designation: true,
        standardHours: true,
        baseSalary: true,
        hourlyRate: true,
        salaryType: true,
        role: true,
        isActive: true,
        joinDate: true
      }
    })
    
    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }
    
    console.log('[Employee Profile API] Found employee:', employee.employeeCode, 'standardHours:', employee.standardHours)
    
    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        employeeCode: employee.employeeCode,
        department: employee.department,
        designation: employee.designation,
        standardHours: employee.standardHours || 160, // Default to 160 if null
        baseSalary: employee.baseSalary,
        hourlyRate: employee.hourlyRate,
        salaryType: employee.salaryType,
        role: employee.role,
        isActive: employee.isActive,
        joinDate: employee.joinDate?.toISOString()
      }
    })
    
  } catch (error: any) {
    console.error('[Employee Profile API] Error:', error)
    return NextResponse.json(
      { error: `Failed to fetch profile: ${error.message}` },
      { status: 500 }
    )
  }
}
