import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// GET /api/employees/[id] - Get single employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const employee = await prisma.employee.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        teamLeader: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
          },
        },
        teamMembers: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            department: true,
          },
        },
        attendanceRecords: {
          take: 30,
          orderBy: {
            date: 'desc',
          },
        },
        leaveRequests: {
          take: 10,
          orderBy: {
            requestedAt: 'desc',
          },
        },
        warnings: {
          where: {
            isActive: true,
          },
          orderBy: {
            warningDate: 'desc',
          },
        },
        penalties: {
          orderBy: {
            penaltyDate: 'desc',
          },
          take: 10,
        },
      },
    })

    if (!employee) {
      return NextResponse.json(
        {
          success: false,
          error: 'Employee not found',
        },
        { status: 404 }
      )
    }

    // Remove password from response
    const { password, salaryPin, ...employeeData } = employee

    return NextResponse.json({
      success: true,
      data: employeeData,
    })
  } catch (error: any) {
    console.error('Error fetching employee:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch employee',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// PUT /api/employees/[id] - Update employee
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json()
    const { password, editedBy, editedByName, changeReason, ...updateData } = body

    // Hash password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    // Convert empty strings to null for date fields and other optional fields
    if (updateData.dateOfBirth === '') updateData.dateOfBirth = null
    if (updateData.fullName === '') updateData.fullName = null
    if (updateData.motherName === '') updateData.motherName = null
    if (updateData.contactNumber === '') updateData.contactNumber = null
    if (updateData.permanentAddress === '') updateData.permanentAddress = null
    if (updateData.educationQualification === '') updateData.educationQualification = null
    if (updateData.salaryPin === '') updateData.salaryPin = null
    if (updateData.department === '') updateData.department = null
    if (updateData.designation === '') updateData.designation = null
    
    // Set default role if empty or invalid
    if (!updateData.role || updateData.role === '') {
      updateData.role = 'EMPLOYEE'
    }
    
    // Validate role is one of the allowed enum values
    const validRoles = ['EMPLOYEE', 'TEAMLEADER', 'ADMIN']
    if (!validRoles.includes(updateData.role)) {
      updateData.role = 'EMPLOYEE'
    }

    // Update employee
    const updatedEmployee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        employeeCode: true,
        role: true,
        department: true,
        designation: true,
        isActive: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedEmployee,
      message: 'Employee updated successfully',
    })
  } catch (error: any) {
    console.error('Error updating employee:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update employee',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// PATCH /api/employees/[id] - Update employee
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json()
    const { password, editedBy, editedByName, changeReason, ...updateData } = body

    // Get current employee data for edit history
    const currentEmployee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
    })

    if (!currentEmployee) {
      return NextResponse.json(
        {
          success: false,
          error: 'Employee not found',
        },
        { status: 404 }
      )
    }

    // Hash password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    // Convert empty strings to null for date fields and other optional fields
    if (updateData.dateOfBirth === '') updateData.dateOfBirth = null
    if (updateData.fullName === '') updateData.fullName = null
    if (updateData.motherName === '') updateData.motherName = null
    if (updateData.contactNumber === '') updateData.contactNumber = null
    if (updateData.permanentAddress === '') updateData.permanentAddress = null
    if (updateData.educationQualification === '') updateData.educationQualification = null
    if (updateData.salaryPin === '') updateData.salaryPin = null
    if (updateData.department === '') updateData.department = null
    if (updateData.designation === '') updateData.designation = null
    
    // Set default role if empty or invalid
    if (!updateData.role || updateData.role === '') {
      updateData.role = 'EMPLOYEE'
    }
    
    // Validate role is one of the allowed enum values
    const validRoles = ['EMPLOYEE', 'TEAMLEADER', 'ADMIN']
    if (!validRoles.includes(updateData.role)) {
      updateData.role = 'EMPLOYEE'
    }

    // Update employee
    const updatedEmployee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        employeeCode: true,
        role: true,
        department: true,
        designation: true,
        isActive: true,
        updatedAt: true,
      },
    })

    // Create edit history if editedBy is provided
    if (editedBy) {
      const changedFields = Object.keys(updateData).filter(
        (key) => currentEmployee[key as keyof typeof currentEmployee] !== updateData[key]
      )

      await Promise.all(
        changedFields.map((field) =>
          prisma.employeeEditHistory.create({
            data: {
              employeeId: parseInt(id),
              editedBy: parseInt(editedBy),
              editedByName: editedByName || 'Admin',
              editedByRole: 'ADMIN',
              fieldChanged: field,
              oldValue: String(currentEmployee[field as keyof typeof currentEmployee] || ''),
              newValue: String(updateData[field] || ''),
              changeReason: changeReason || 'Profile update',
            },
          })
        )
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedEmployee,
      message: 'Employee updated successfully',
    })
  } catch (error: any) {
    console.error('Error updating employee:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update employee',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// DELETE /api/employees/[id] - Delete employee (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Soft delete by setting isActive to false
    await prisma.employee.update({
      where: { id: parseInt(id) },
      data: {
        isActive: false,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Employee deactivated successfully',
    })
  } catch (error: any) {
    console.error('Error deleting employee:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete employee',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
