import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Convert camelCase to snake_case for database
function toSnakeCase(obj: any) {
  const snakeCaseObj: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
    snakeCaseObj[snakeKey] = value
  }
  return snakeCaseObj
}

// Convert snake_case to camelCase for frontend
function toCamelCase(obj: any) {
  const camelCaseObj: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    camelCaseObj[camelKey] = value
  }
  return camelCaseObj
}

// Helper function to parse date and time strings safely
function parseDateTime(dateStr: string, timeStr: string | null | undefined): Date | undefined {
  if (!timeStr || timeStr === 'null' || timeStr === '' || timeStr === 'undefined' || timeStr === 'Invalid Date') {
    return undefined
  }
  
  try {
    // Parse the time part (assuming format like "09:30" or "9:30:45")
    const timeStr_clean = timeStr.toString().trim()
    const timeParts = timeStr_clean.split(':')
    
    if (timeParts.length >= 2) {
      const hours = parseInt(timeParts[0])
      const minutes = parseInt(timeParts[1])
      const seconds = timeParts[2] ? parseInt(timeParts[2]) : 0
      
      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        // Create datetime string in ISO format without timezone conversion
        // Parse date string to get year, month, day
        const date = new Date(dateStr)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        
        // Create ISO datetime string: YYYY-MM-DDTHH:MM:SS.000Z
        const isoString = `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.000Z`
        const dateTime = new Date(isoString)
        
        console.log(`Parsed ${timeStr_clean} on ${dateStr} to:`, dateTime.toISOString())
        return dateTime
      }
    }
    
    console.warn('Could not parse time string:', timeStr_clean)
    return undefined
  } catch (error) {
    console.warn('Failed to parse date/time:', dateStr, timeStr, error)
    return undefined
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const newRecords = data.records || data

    console.log('Received data:', { 
      dataType: typeof data, 
      isArray: Array.isArray(data),
      hasRecords: 'records' in data,
      recordsLength: newRecords?.length,
      firstRecord: newRecords?.[0]
    })

    // Validate the incoming data
    if (!Array.isArray(newRecords) || newRecords.length === 0) {
      console.error('Validation failed:', { newRecords, isArray: Array.isArray(newRecords), length: newRecords?.length })
      return NextResponse.json(
        { error: `Invalid or empty records array. Received: ${typeof newRecords}, length: ${newRecords?.length}` },
        { status: 400 }
      )
    }

    // Prepare records for Prisma insertion
    const attendanceRecords = newRecords.map((record: any) => {
      console.log('Processing record:', { 
        id: record.id, 
        employeeName: record.employeeName,
        employeeCode: record.employeeCode,
        date: record.date, 
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime 
      })
      
      return {
        // Don't include ID - let Prisma auto-increment it
        employeeId: parseInt(record.employeeId),
        date: new Date(record.date),
        status: record.status === 'PRESENT' ? 'PRESENT' as const : 'ABSENT' as const,
        checkInTime: parseDateTime(record.date, record.checkInTime),
        checkOutTime: parseDateTime(record.date, record.checkOutTime),
        totalHours: record.totalHours || 0,
        hasTagWork: false,
        hasFlowaceWork: false,
        tagWorkMinutes: 0,
        flowaceMinutes: 0,
        hasException: false,
        lunchOutTime: parseDateTime(record.date, record.breakOutTime),
        lunchInTime: parseDateTime(record.date, record.breakInTime),
        breakOutTime: parseDateTime(record.date, record.breakOutTime),
        breakInTime: parseDateTime(record.date, record.breakInTime),
        shift: record.shiftTime || '10:00',
        shiftStart: record.shiftTime || '10:00',
        overtime: 0,
        importSource: 'srp_upload',
        importBatch: `batch_${Date.now()}`,
        hasBeenEdited: false
      }
    })

    // Use Prisma transaction to insert records
    const insertedRecords = await prisma.$transaction(async (tx) => {
      const created = []
      
      // First, ensure all employees exist with their correct names
      const uniqueEmployees = newRecords.reduce((acc: any[], record: any) => {
        if (!acc.find(emp => emp.id === parseInt(record.employeeId))) {
          acc.push({
            id: parseInt(record.employeeId),
            name: record.employeeName || `Employee ${record.employeeId}`,
            employeeCode: record.employeeCode || record.employeeId.toString().padStart(3, '0')
          })
        }
        return acc
      }, [])
      
      console.log('Ensuring employees exist with correct names:', uniqueEmployees)
      
      for (const employee of uniqueEmployees) {
        try {
          await tx.employee.upsert({
            where: { id: employee.id },
            update: {
              name: employee.name,
              employeeCode: employee.employeeCode
            },
            create: {
              id: employee.id,
              name: employee.name,
              email: `emp${employee.id}@company.com`,
              employeeCode: employee.employeeCode
            }
          })
          console.log(`Employee ${employee.id} upserted with name: ${employee.name}`)
        } catch (error) {
          console.log(`Employee ${employee.id} upsert error:`, error)
        }
      }
      
      // Now create/update attendance records using upsert
      for (const record of attendanceRecords) {
        try {
          console.log('Upserting attendance record:', { 
            employeeId: record.employeeId,
            date: record.date,
            status: record.status 
          })
          
          const upsertedRecord = await tx.attendanceRecord.upsert({
            where: {
              employee_date_attendance: {
                employeeId: record.employeeId,
                date: record.date
              }
            },
            update: record,
            create: record
          })
          created.push(upsertedRecord)
          console.log('Successfully upserted record for employee:', record.employeeId)
        } catch (error: any) {
          console.error('Error upserting record:', error.message)
          throw error
        }
      }
      return created
    })
    
    console.log('Successfully saved attendance records to database:', newRecords.length)

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully saved ${newRecords.length} attendance records`,
      recordsCount: newRecords.length,
      data: insertedRecords || []
    })

  } catch (error: any) {
    console.error('Error saving attendance records:', error)
    return NextResponse.json(
      { error: `Failed to save attendance records: ${error.message}` },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const editedOnly = searchParams.get('edited') === 'true'
    
    // Build the query conditions
    const whereCondition: any = {}
    
    // Filter for edited records only if requested
    if (editedOnly) {
      whereCondition.hasBeenEdited = true
    }
    
    // Fetch records from Prisma database
    const records = await prisma.attendanceRecord.findMany({
      where: whereCondition,
      orderBy: {
        updatedAt: 'desc' // Show most recently updated first
      },
      include: {
        employee: {
          select: {
            name: true,
            employeeCode: true
          }
        },
        editHistory: editedOnly ? {
          orderBy: { editedAt: 'desc' },
          include: {
            editedByEmployee: true
          }
        } : false
      }
    })
    
    console.log('Fetching attendance records from database:', records?.length || 0)
    
    // Convert to frontend format
    const formattedRecords = records.map(record => ({
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
      overtime: record.overtime || 0,
      hasBeenEdited: record.hasBeenEdited || false,
      editedAt: record.editedAt?.toISOString() || null,
      editReason: record.editReason || null,
      updatedAt: record.updatedAt?.toISOString() || record.createdAt?.toISOString() || null,
      editCount: editedOnly && record.editHistory ? record.editHistory.length : undefined,
      editHistory: editedOnly && record.editHistory ? record.editHistory.map(edit => ({
        id: edit.id,
        fieldChanged: edit.fieldChanged,
        oldValue: edit.oldValue,
        newValue: edit.newValue,
        changeReason: edit.changeReason,
        editedAt: edit.editedAt.toISOString(),
        editedBy: edit.editedByName || 'System',
        editedByRole: edit.editedByRole || 'ADMIN'
      })) : undefined
    }))
    
    return NextResponse.json({
      success: true,
      records: formattedRecords
    })
    
  } catch (error: any) {
    console.error('Error fetching attendance records:', error)
    return NextResponse.json(
      { error: `Failed to fetch attendance records: ${error.message}` },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { uploadDate, uploadId, id, deleteAll } = body
    
    if (deleteAll) {
      // First, get the count of all records
      const totalCount = await prisma.attendanceRecord.count()
      
      // Delete all records from database
      const deleteResult = await prisma.attendanceRecord.deleteMany({})
      
      const deletedCount = deleteResult.count || 0
      console.log('Successfully deleted ALL records from database. Count:', deletedCount)
      
      return NextResponse.json({
        success: true,
        message: `Successfully deleted all ${deletedCount} records`,
        deletedCount: deletedCount
      })
      
    } else if (uploadDate && uploadId) {
      // Delete records by upload date from database
      const deleteResult = await prisma.attendanceRecord.deleteMany({
        where: {
          date: new Date(uploadDate)
        }
      })
      
      if (deleteResult.count === 0) {
        return NextResponse.json(
          { error: 'No records found for the specified upload date' },
          { status: 404 }
        )
      }
      
      console.log('Successfully deleted records for upload from database:', uploadId, 'Count:', deleteResult.count)
      
      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${deleteResult.count} records`,
        deletedCount: deleteResult.count || 0
      })
      
    } else if (id) {
      // Delete single record by ID from database
      const deleteResult = await prisma.attendanceRecord.delete({
        where: {
          id: id
        }
      })
      
      console.log('Successfully deleted record from database:', id)
      
      return NextResponse.json({
        success: true,
        message: 'Record deleted successfully'
      })
      
    } else {
      return NextResponse.json(
        { error: 'Either record ID, upload date with upload ID, or deleteAll flag is required' },
        { status: 400 }
      )
    }
    
  } catch (error: any) {
    console.error('Error deleting attendance record(s):', error)
    return NextResponse.json(
      { error: `Failed to delete attendance record(s): ${error.message}` },
      { status: 500 }
    )
  }
}