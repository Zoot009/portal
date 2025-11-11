import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/employees/extract-from-attendance - Extract employees from attendance records
export async function POST(request: NextRequest) {
  try {
    console.log('Starting employee extraction from attendance records...')

    // Get unique employee data from attendance records
    const uniqueEmployees = await prisma.attendanceRecord.findMany({
      select: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeCode: true,
            role: true,
            department: true,
            designation: true,
            isActive: true,
          }
        }
      },
      distinct: ['employeeId']
    })

    console.log(`Found ${uniqueEmployees.length} unique employees from attendance records`)

    if (uniqueEmployees.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No attendance records found. Please upload an SRP file first.',
        extractedCount: 0
      })
    }

    // Random data generators
    const departments = ['Development', 'Marketing', 'Sales', 'HR', 'Operations', 'Finance', 'IT Support']
    const designations = {
      'Development': ['Senior Developer', 'Junior Developer', 'Full Stack Developer', 'Frontend Developer', 'Backend Developer', 'Tech Lead'],
      'Marketing': ['Marketing Manager', 'Digital Marketing Specialist', 'Content Creator', 'SEO Specialist', 'Social Media Manager'],
      'Sales': ['Sales Manager', 'Sales Executive', 'Account Manager', 'Business Development Executive', 'Sales Coordinator'],
      'HR': ['HR Manager', 'HR Executive', 'Recruiter', 'HR Business Partner', 'Training Coordinator'],
      'Operations': ['Operations Manager', 'Project Manager', 'Operations Executive', 'Quality Analyst', 'Process Specialist'],
      'Finance': ['Finance Manager', 'Accountant', 'Financial Analyst', 'Accounts Payable Specialist', 'Budget Analyst'],
      'IT Support': ['IT Support Specialist', 'System Administrator', 'Network Administrator', 'Help Desk Technician', 'IT Manager']
    }

    const roles = ['EMPLOYEE', 'TEAMLEADER', 'ADMIN']
    const salaryTypes = ['FIXED_MONTHLY', 'HOURLY']

    // Generate random data for each employee
    const updatedEmployees = []

    for (const record of uniqueEmployees) {
      const employee = record.employee
      
      if (!employee) continue

      // Skip if employee already has complete profile
      if (employee.department && employee.designation && employee.role) {
        updatedEmployees.push(employee)
        continue
      }

      // Generate random department
      const randomDepartment = departments[Math.floor(Math.random() * departments.length)]
      
      // Generate random designation based on department
      const departmentDesignations = designations[randomDepartment as keyof typeof designations]
      const randomDesignation = departmentDesignations[Math.floor(Math.random() * departmentDesignations.length)]
      
      // Generate random role (80% EMPLOYEE, 15% TEAMLEADER, 5% ADMIN)
      const roleRandom = Math.random()
      let randomRole = 'EMPLOYEE'
      if (roleRandom > 0.95) {
        randomRole = 'ADMIN'
      } else if (roleRandom > 0.80) {
        randomRole = 'TEAMLEADER'
      }

      // Generate random salary based on role and department
      const baseSalaryRanges = {
        'ADMIN': { min: 80000, max: 150000 },
        'TEAMLEADER': { min: 60000, max: 120000 },
        'EMPLOYEE': { min: 35000, max: 85000 }
      }
      
      const salaryRange = baseSalaryRanges[randomRole as keyof typeof baseSalaryRanges]
      const randomBaseSalary = Math.floor(Math.random() * (salaryRange.max - salaryRange.min + 1)) + salaryRange.min
      
      // Random salary type
      const randomSalaryType = salaryTypes[Math.floor(Math.random() * salaryTypes.length)]
      
      // Generate random join date (within last 2 years)
      const currentDate = new Date()
      const twoYearsAgo = new Date()
      twoYearsAgo.setFullYear(currentDate.getFullYear() - 2)
      const randomJoinDate = new Date(twoYearsAgo.getTime() + Math.random() * (currentDate.getTime() - twoYearsAgo.getTime()))

      // Random hourly rate (if salary type is hourly)
      const randomHourlyRate = randomSalaryType === 'HOURLY' ? Math.floor(randomBaseSalary / 160 * 100) / 100 : null

      try {
        // Update the employee with generated data
        const updatedEmployee = await prisma.employee.update({
          where: { id: employee.id },
          data: {
            department: randomDepartment,
            designation: randomDesignation,
            role: randomRole as any,
            baseSalary: randomSalaryType === 'FIXED_MONTHLY' ? randomBaseSalary : null,
            hourlyRate: randomHourlyRate,
            salaryType: randomSalaryType as any,
            joinDate: randomJoinDate,
            standardHours: 160,
            isActive: true,
            profileCompleted: true,
          },
          select: {
            id: true,
            name: true,
            email: true,
            employeeCode: true,
            role: true,
            department: true,
            designation: true,
            baseSalary: true,
            hourlyRate: true,
            salaryType: true,
            joinDate: true,
            isActive: true,
            profileCompleted: true,
          }
        })

        updatedEmployees.push(updatedEmployee)
        console.log(`Updated employee: ${updatedEmployee.employeeCode} - ${updatedEmployee.name}`)
      } catch (updateError) {
        console.error(`Error updating employee ${employee.employeeCode}:`, updateError)
      }
    }

    console.log(`Successfully processed ${updatedEmployees.length} employees`)

    return NextResponse.json({
      success: true,
      message: `Successfully extracted and populated ${updatedEmployees.length} employees from attendance records`,
      extractedCount: updatedEmployees.length,
      data: updatedEmployees
    })

  } catch (error: any) {
    console.error('Error extracting employees from attendance:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to extract employees from attendance records',
      message: error.message,
      extractedCount: 0
    }, { status: 500 })
  }
}