import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentEmployee } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    // Get the current employee from session
    const currentEmployee = await getCurrentEmployee()
    
    console.log('[Employee Attendance API] Current employee:', currentEmployee)
    
    if (!currentEmployee) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    console.log('[Employee Attendance API] Fetching records for employee ID:', currentEmployee.id)
    
    // Fetch attendance records for this employee only
    const records = await prisma.attendanceRecord.findMany({
      where: {
        employeeId: currentEmployee.id
      },
      orderBy: {
        date: 'desc' // Most recent first
      },
      include: {
        editHistory: {
          orderBy: { editedAt: 'desc' },
          include: {
            editedByEmployee: {
              select: {
                name: true,
                role: true
              }
            }
          }
        }
      }
    })
    
    console.log('[Employee Attendance API] Found', records.length, 'records for employee', currentEmployee.employeeCode)
    
    // Format records for frontend
    const formattedRecords = records.map(record => ({
      id: record.id,
      date: record.date.toISOString().split('T')[0],
      status: record.status,
      checkInTime: record.checkInTime?.toISOString() || null,
      checkOutTime: record.checkOutTime?.toISOString() || null,
      breakInTime: record.breakInTime?.toISOString() || null,
      breakOutTime: record.breakOutTime?.toISOString() || null,
      totalHours: record.totalHours || 0,
      overtime: record.overtime || 0,
      hasBeenEdited: record.hasBeenEdited || false,
      editedAt: record.editedAt?.toISOString() || null,
      editReason: record.editReason || null,
      editHistory: record.editHistory.map(edit => ({
        id: edit.id,
        fieldChanged: edit.fieldChanged,
        oldValue: edit.oldValue,
        newValue: edit.newValue,
        changeReason: edit.changeReason,
        editedAt: edit.editedAt.toISOString(),
        editedBy: edit.editedByName || edit.editedByEmployee?.name || 'System',
        editedByRole: edit.editedByRole || edit.editedByEmployee?.role || 'ADMIN'
      }))
    }))
    
    return NextResponse.json({
      success: true,
      records: formattedRecords,
      employeeCode: currentEmployee.employeeCode,
      employeeName: currentEmployee.name
    })
    
  } catch (error: any) {
    console.error('Error fetching employee attendance records:', error)
    return NextResponse.json(
      { error: `Failed to fetch attendance records: ${error.message}` },
      { status: 500 }
    )
  }
}
