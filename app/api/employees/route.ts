import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// GET /api/employees - Get all employees with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const clerkUserId = searchParams.get('clerkUserId')
    const department = searchParams.get('department')
    const role = searchParams.get('role')
    const isActive = searchParams.get('isActive')

    const where: any = {}

    // Priority: clerkUserId lookup
    if (clerkUserId) {
      where.clerkUserId = clerkUserId
    } else if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (department) {
      where.department = department
    }

    if (role) {
      where.role = role
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    const employees = await prisma.employee.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        employeeCode: true,
        role: true,
        department: true,
        designation: true,
        joinDate: true,
        isActive: true,
        lastLogin: true,
        teamLeaderId: true,
        baseSalary: true,
        hourlyRate: true,
        salaryType: true,
        standardHours: true,
        fullName: true,
        dateOfBirth: true,
        contactNumber: true,
        profileCompleted: true,
        passportPhoto: true,
        createdAt: true,
        updatedAt: true,
        teamLeader: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: employees,
      count: employees.length,
    })
  } catch (error: any) {
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch employees',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// POST /api/employees - Create new employee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      email,
      employeeCode,
      password,
      role = 'EMPLOYEE',
      department,
      designation,
      joinDate,
      teamLeaderId,
      baseSalary,
      hourlyRate,
      salaryType = 'HOURLY',
      standardHours = 160,
      ...otherFields
    } = body

    // Validate required fields
    if (!name || !email || !employeeCode) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name, email, and employee code are required',
        },
        { status: 400 }
      )
    }

    // Check if email or employee code already exists
    const existing = await prisma.employee.findFirst({
      where: {
        OR: [{ email }, { employeeCode }],
      },
    })

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email or employee code already exists',
        },
        { status: 400 }
      )
    }

    // Hash password if provided
    let hashedPassword = null
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10)
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        employeeCode,
        password: hashedPassword,
        role,
        department,
        designation,
        joinDate: joinDate ? new Date(joinDate) : new Date(),
        teamLeaderId: teamLeaderId ? parseInt(teamLeaderId) : null,
        baseSalary: baseSalary ? parseFloat(baseSalary) : null,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        salaryType,
        standardHours: standardHours ? parseFloat(standardHours) : 160,
        ...otherFields,
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeCode: true,
        role: true,
        department: true,
        designation: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: employee,
        message: 'Employee created successfully',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating employee:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create employee',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
