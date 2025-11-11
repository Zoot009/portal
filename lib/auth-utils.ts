import { auth, currentUser, clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

/**
 * Get the current authenticated employee from the database
 * Links Clerk user ID to employee record
 */
export async function getCurrentEmployee() {
  const { userId } = await auth()
  
  if (!userId) {
    return null
  }

  const employee = await prisma.employee.findUnique({
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
    }
  })

  return employee
}

/**
 * Get employee by employee code (case-insensitive)
 */
export async function getEmployeeByCode(employeeCode: string) {
  const employee = await prisma.employee.findFirst({
    where: { 
      employeeCode: {
        equals: employeeCode,
        mode: 'insensitive'
      }
    },
  })

  return employee
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin() {
  const employee = await getCurrentEmployee()
  return employee?.role === UserRole.ADMIN
}

/**
 * Check if the current user is an employee
 */
export async function isEmployee() {
  const employee = await getCurrentEmployee()
  return employee?.role === UserRole.EMPLOYEE
}

/**
 * Get the current user's employee code
 * Returns null if not authenticated or not linked to an employee
 */
export async function getCurrentEmployeeCode() {
  const employee = await getCurrentEmployee()
  return employee?.employeeCode || null
}

/**
 * Link a Clerk user to an employee record
 * Called during sign-up process
 */
export async function linkClerkUserToEmployee(
  clerkUserId: string,
  employeeCode: string
) {
  try {
    // Find employee with case-insensitive search
    const employee = await prisma.employee.findFirst({
      where: { 
        employeeCode: {
          equals: employeeCode,
          mode: 'insensitive'
        }
      },
    })

    if (!employee) {
      return { success: false, error: "Employee code not found" }
    }

    // Update with the actual employee code from database
    const updatedEmployee = await prisma.employee.update({
      where: { id: employee.id },
      data: { clerkUserId },
    })

    return { success: true, employee: updatedEmployee }
  } catch (error) {
    console.error("Error linking Clerk user to employee:", error)
    return { success: false, error: "Failed to link user to employee" }
  }
}

/**
 * Verify if an employee code exists in the database
 * Used during sign-up validation (case-insensitive)
 */
export async function verifyEmployeeCode(employeeCode: string, currentUserId?: string) {
  const employee = await prisma.employee.findFirst({
    where: { 
      employeeCode: {
        equals: employeeCode,
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      employeeCode: true,
      name: true,
      email: true,
      clerkUserId: true,
    }
  })

  if (!employee) {
    return { exists: false, message: "Employee code not found" }
  }

  if (employee.clerkUserId) {
    // Check if linked to the current user
    const linkedToCurrentUser = currentUserId ? employee.clerkUserId === currentUserId : false
    
    return { 
      exists: true, 
      linked: true,
      linkedToCurrentUser,
      message: linkedToCurrentUser 
        ? "This employee code is already linked to your account" 
        : "This employee code is already linked to another account" 
    }
  }

  return { 
    exists: true, 
    linked: false,
    linkedToCurrentUser: false,
    employee,
    message: "Employee code verified" 
  }
}

/**
 * Check if user has permission to access a specific employee's data
 * Admins can access any employee's data
 * Employees can only access their own data
 */
export async function canAccessEmployeeData(targetEmployeeCode: string) {
  const currentEmp = await getCurrentEmployee()
  
  if (!currentEmp) {
    return false
  }

  // Admins can access any employee's data
  if (currentEmp.role === UserRole.ADMIN) {
    return true
  }

  // Employees can only access their own data (case-insensitive comparison)
  return currentEmp.employeeCode.toLowerCase() === targetEmployeeCode.toLowerCase()
}

/**
 * Require admin role or throw error
 */
export async function requireAdmin() {
  const employee = await getCurrentEmployee()
  
  if (!employee || employee.role !== UserRole.ADMIN) {
    throw new Error("Unauthorized: Admin access required")
  }

  return employee
}

/**
 * Require authentication (any role)
 */
export async function requireAuth() {
  const employee = await getCurrentEmployee()
  
  if (!employee) {
    throw new Error("Unauthorized: Authentication required")
  }

  return employee
}

/**
 * Sync employee role changes to Clerk metadata
 * Call this whenever you update an employee's role, status, or code in the database
 */
export async function syncEmployeeToClerk(employeeCode: string) {
  try {
    // Get employee from database (case-insensitive)
    const employee = await prisma.employee.findFirst({
      where: { 
        employeeCode: {
          equals: employeeCode,
          mode: 'insensitive'
        }
      },
      select: {
        clerkUserId: true,
        role: true,
        employeeCode: true,
        isActive: true,
      }
    })

    if (!employee || !employee.clerkUserId) {
      return {
        success: false,
        error: 'Employee not found or not linked to Clerk account'
      }
    }

    // Update Clerk metadata
    const client = await clerkClient()
    await client.users.updateUserMetadata(employee.clerkUserId, {
      publicMetadata: {
        role: employee.role,
        employeeCode: employee.employeeCode,
        isActive: employee.isActive,
      }
    })

    return {
      success: true,
      message: 'Employee metadata synced to Clerk successfully'
    }

  } catch (error) {
    console.error('Error syncing employee to Clerk:', error)
    return {
      success: false,
      error: 'Failed to sync employee metadata'
    }
  }
}
