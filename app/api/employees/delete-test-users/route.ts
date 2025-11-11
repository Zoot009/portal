import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * DELETE /api/employees/delete-test-users
 * Delete all test employees (Test Employee, Jane Smith, Admin User)
 */
export async function DELETE() {
  try {
    // Identify test users by email patterns or names
    const testUserEmails = [
      'employee@zootdigital.com',
      'jane@zootdigital.com',
      'admin@zootdigital.com'
    ]
    
    const testUserCodes = [
      'zoot1087', // Test Employee
      'zoot1088'  // Jane Smith
    ]

    // Find test users
    const testUsers = await prisma.employee.findMany({
      where: {
        OR: [
          { email: { in: testUserEmails } },
          { employeeCode: { in: testUserCodes } },
          { name: { in: ['Test Employee', 'Jane Smith', 'Admin User'] } }
        ]
      }
    })

    if (testUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No test users found to delete',
        deletedCount: 0
      })
    }

    // Get IDs of test users
    const testUserIds = testUsers.map(user => user.id)

    // Delete related records first (to avoid foreign key constraints)
    
    // Delete attendance records
    await prisma.attendanceRecord.deleteMany({
      where: { employeeId: { in: testUserIds } }
    })

    // Delete leave requests
    await prisma.leaveRequest.deleteMany({
      where: { employeeId: { in: testUserIds } }
    })

    // Delete warnings
    await prisma.warning.deleteMany({
      where: { employeeId: { in: testUserIds } }
    })

    // Delete penalties
    await prisma.penalty.deleteMany({
      where: { employeeId: { in: testUserIds } }
    })

    // Delete employee edit history
    await prisma.employeeEditHistory.deleteMany({
      where: { employeeId: { in: testUserIds } }
    })

    // Delete team memberships
    await prisma.teamMembership.deleteMany({
      where: { employeeId: { in: testUserIds } }
    })

    // Delete assignments
    await prisma.assignment.deleteMany({
      where: { employeeId: { in: testUserIds } }
    })

    // Delete asset assignments
    await prisma.assetAssignment.deleteMany({
      where: { employeeId: { in: testUserIds } }
    })

    // Finally, delete the employees
    const result = await prisma.employee.deleteMany({
      where: { id: { in: testUserIds } }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.count} test user(s)`,
      deletedCount: result.count,
      deletedUsers: testUsers.map(u => ({ 
        id: u.id, 
        name: u.name, 
        email: u.email,
        employeeCode: u.employeeCode 
      }))
    })

  } catch (error: any) {
    console.error('Error deleting test users:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete test users',
        message: error.message 
      },
      { status: 500 }
    )
  }
}
