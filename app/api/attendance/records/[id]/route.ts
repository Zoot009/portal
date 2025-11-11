import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Helper function to parse date and time strings safely
function parseDateTime(dateStr: string, timeStr: string | null | undefined): Date | null {
  if (!timeStr || timeStr === 'null' || timeStr === '' || timeStr === 'undefined' || timeStr === 'Invalid Date') {
    return null
  }
  
  try {
    // If timeStr is already a full ISO string, parse it directly
    if (timeStr.includes('T') && timeStr.includes('Z')) {
      return new Date(timeStr)
    }
    
    // Parse the time part (assuming format like "09:30" or "9:30:45")
    const timeStr_clean = timeStr.toString().trim()
    const timeParts = timeStr_clean.split(':')
    
    if (timeParts.length >= 2) {
      const hours = parseInt(timeParts[0])
      const minutes = parseInt(timeParts[1])
      const seconds = timeParts[2] ? parseInt(timeParts[2]) : 0
      
      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        // Create datetime string in ISO format
        const date = new Date(dateStr)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        
        // Create ISO datetime string: YYYY-MM-DDTHH:MM:SS.000Z
        const isoString = `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.000Z`
        const dateTime = new Date(isoString)
        
        return dateTime
      }
    }
    
    return null
  } catch (error) {
    console.warn('Failed to parse date/time:', dateStr, timeStr, error)
    return null
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)
    const data = await request.json()
    
    console.log('=== PUT REQUEST DEBUG ===')
    console.log('Updating record with ID:', id)
    console.log('Received data:', JSON.stringify(data, null, 2))
    console.log('Data keys:', Object.keys(data))
    console.log('=========================')
    
    // Prepare update data
    const updateData: any = {
      status: data.status || 'PRESENT',
      shift: data.shift || null,
      shiftStart: data.shiftTime || null,
      checkInTime: data.checkInTime ? parseDateTime(data.date, data.checkInTime) : null,
      checkOutTime: data.checkOutTime ? parseDateTime(data.date, data.checkOutTime) : null,
      breakInTime: data.breakInTime ? parseDateTime(data.date, data.breakInTime) : null,
      breakOutTime: data.breakOutTime ? parseDateTime(data.date, data.breakOutTime) : null,
      totalHours: typeof data.totalHours === 'number' ? data.totalHours : 0,
      overtime: typeof data.overtime === 'number' ? data.overtime : 0,
      hasBeenEdited: true,
      editedAt: new Date(),
      editReason: data.editReason || 'Manual edit via admin interface'
    }
    
    // Remove null values to avoid overwriting existing data with null
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === null || updateData[key] === undefined) {
        delete updateData[key]
      }
    })
    
    console.log('Prepared update data:', updateData)
    
    // Get the original record for comparison
    const originalRecord = await prisma.attendanceRecord.findUnique({
      where: { id: id },
      include: {
        employee: {
          select: {
            name: true,
            employeeCode: true
          }
        }
      }
    })

    if (!originalRecord) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      )
    }
    
    // Update the record
    const updatedRecord = await prisma.attendanceRecord.update({
      where: { id: id },
      data: updateData,
      include: {
        employee: {
          select: {
            name: true,
            employeeCode: true
          }
        }
      }
    })

    // Create detailed edit history entries for each changed field
    const editHistoryEntries = []
    const editReason = data.editReason || 'Manual edit via admin interface'
    
    // Helper function to format values for comparison
    const formatValue = (value: any) => {
      if (value === null || value === undefined) return 'Not set'
      if (value instanceof Date) return value.toISOString().substring(0, 16).replace('T', ' ')
      return String(value)
    }

    // Check each field for changes
    const fieldsToCheck = [
      { field: 'status', old: originalRecord.status, new: data.status },
      { field: 'shift', old: originalRecord.shift, new: data.shift },
      { field: 'shiftStart', old: originalRecord.shiftStart, new: data.shiftTime },
      { field: 'checkInTime', old: originalRecord.checkInTime, new: updateData.checkInTime },
      { field: 'checkOutTime', old: originalRecord.checkOutTime, new: updateData.checkOutTime },
      { field: 'breakInTime', old: originalRecord.breakInTime, new: updateData.breakInTime },
      { field: 'breakOutTime', old: originalRecord.breakOutTime, new: updateData.breakOutTime },
      { field: 'totalHours', old: originalRecord.totalHours, new: updateData.totalHours },
      { field: 'overtime', old: originalRecord.overtime, new: updateData.overtime }
    ]

    for (const { field, old, new: newVal } of fieldsToCheck) {
      const oldFormatted = formatValue(old)
      const newFormatted = formatValue(newVal)
      
      if (oldFormatted !== newFormatted) {
        editHistoryEntries.push({
          attendanceId: id,
          editedBy: null, // System edit - no specific user (made optional in schema)
          editedByName: 'System Admin',
          editedByRole: 'ADMIN',
          fieldChanged: field,
          oldValue: oldFormatted,
          newValue: newFormatted,
          changeReason: editReason
        })
      }
    }

    // Save edit history entries
    if (editHistoryEntries.length > 0) {
      await prisma.attendanceEditHistory.createMany({
        data: editHistoryEntries
      })
      console.log(`Created ${editHistoryEntries.length} edit history entries`)
    }
    
    console.log('Successfully updated record:', updatedRecord.id)
    
    // Format response
    const formattedRecord = {
      id: updatedRecord.id,
      employeeId: updatedRecord.employeeId.toString(),
      employeeCode: updatedRecord.employee?.employeeCode || updatedRecord.employeeId.toString(),
      employeeName: updatedRecord.employee?.name || `Employee ${updatedRecord.employeeId}`,
      date: updatedRecord.date.toISOString().split('T')[0],
      status: updatedRecord.status,
      shift: updatedRecord.shift || null,
      shiftTime: updatedRecord.shiftStart || null,
      checkInTime: updatedRecord.checkInTime?.toISOString() || null,
      checkOutTime: updatedRecord.checkOutTime?.toISOString() || null,
      breakInTime: updatedRecord.breakInTime?.toISOString() || null,
      breakOutTime: updatedRecord.breakOutTime?.toISOString() || null,
      totalHours: updatedRecord.totalHours || 0,
      overtime: updatedRecord.overtime || 0
    }
    
    return NextResponse.json({
      success: true,
      message: 'Record updated successfully',
      record: formattedRecord
    })
    
  } catch (error: any) {
    console.error('=== API ERROR DEBUG ===')
    console.error('Error updating attendance record:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Full error:', JSON.stringify(error, null, 2))
    console.error('======================')
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: `Failed to update record: ${error.message}` },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)
    const url = new URL(request.url)
    const includeHistory = url.searchParams.get('includeHistory') === 'true'
    
    const record = await prisma.attendanceRecord.findUnique({
      where: { id: id },
      include: {
        employee: {
          select: {
            name: true,
            employeeCode: true
          }
        },
        ...(includeHistory && {
          editHistory: {
            orderBy: { editedAt: 'desc' },
            include: {
              editedByEmployee: {
                select: {
                  name: true,
                  employeeCode: true
                }
              }
            }
          }
        })
      }
    })
    
    if (!record) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      )
    }
    
    // Format response
    const formattedRecord = {
      id: record.id,
      employeeId: record.employeeId.toString(),
      employeeCode: record.employee?.employeeCode || record.employeeId.toString(),
      employeeName: record.employee?.name || `Employee ${record.employeeId}`,
      date: record.date.toISOString().split('T')[0],
      status: record.status,
      shift: record.shift || null,
      shiftTime: record.shiftStart || null,
      checkInTime: record.checkInTime?.toISOString() || null,
      checkOutTime: record.checkOutTime?.toISOString() || null,
      breakInTime: record.breakInTime?.toISOString() || null,
      breakOutTime: record.breakOutTime?.toISOString() || null,
      totalHours: record.totalHours || 0,
      overtime: record.overtime || 0
    }
    
    return NextResponse.json({
      success: true,
      record: formattedRecord
    })
    
  } catch (error: any) {
    console.error('Error fetching attendance record:', error)
    return NextResponse.json(
      { error: `Failed to fetch record: ${error.message}` },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)
    
    await prisma.attendanceRecord.delete({
      where: { id: id }
    })
    
    console.log('Successfully deleted record:', id)
    
    return NextResponse.json({
      success: true,
      message: 'Record deleted successfully'
    })
    
  } catch (error: any) {
    console.error('Error deleting attendance record:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: `Failed to delete record: ${error.message}` },
      { status: 500 }
    )
  }
}