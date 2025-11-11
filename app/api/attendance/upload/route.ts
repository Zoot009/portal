import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { awardPoints, POINT_VALUES } from '@/lib/gamification'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const date = formData.get('date') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!date) {
      return NextResponse.json({ error: 'No date provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['.srp', '.txt', '.csv']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!allowedTypes.includes(fileExtension)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only .srp, .txt, and .csv files are allowed.' 
      }, { status: 400 })
    }

    // Read file content
    const fileContent = await file.text()
    
    if (!fileContent.trim()) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 })
    }

    // Parse attendance data based on file type
    const attendanceRecords: any[] = []
    
    try {
      if (fileExtension === '.csv' || fileExtension === '.txt') {
        // Parse CSV/TXT format (assuming comma or tab separated)
        const lines = fileContent.trim().split('\n')
        const headers = lines[0].split(/[,\t]/).map(h => h.trim())
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(/[,\t]/).map(v => v.trim())
          if (values.length >= headers.length && values[0]) {
            const record: any = {
              employeeCode: values[0] || '',
              employeeName: values[1] || '',
              checkInTime: values[2] || null,
              checkOutTime: values[3] || null,
              breakInTime: values[4] || null,
              breakOutTime: values[5] || null,
              status: values[6] || 'PRESENT',
              date: date,
              totalHours: values[7] ? parseFloat(values[7]) : 0
            }
            attendanceRecords.push(record)
          }
        }
      } else if (fileExtension === '.srp') {
        // Parse SRP format based on the actual file structure
        const lines = fileContent.trim().split('\n')
        
        for (const line of lines) {
          // Skip header lines and empty lines
          if (line.trim() && 
              !line.includes('Zoot Digital') && 
              !line.includes('Page No.') && 
              !line.includes('Run Date') && 
              !line.includes('Daily Performance') && 
              !line.includes('-------') && 
              !line.includes('Srl') && 
              !line.includes('No.')) {
            
            // Parse each data line - SRP format has fixed-width columns
            const trimmedLine = line.trim()
            
            // Extract serial number to identify data rows
            const serialMatch = trimmedLine.match(/^\s*(\d+)\s/)
            if (serialMatch) {
              try {
                // Parse the line using regex to extract fields
                // Format: Srl EmpCode Cardno EmployeeName Shift Start In LunchOut LunchIn Out Hours Status
                const match = trimmedLine.match(/^\s*(\d+)\s+(\w+)\s+(\d+)\s+([A-Za-z\s]+?)\s+(S\d+)\s+(\d{2}:\d{2})\s*(\d{2}:\d{2})?\s*(\d{2}:\d{2})?\s*(\d{2}:\d{2})?\s*(\d{2}:\d{2})?\s*(\d+\.\d+)?\s*([PA])\s*/)
                
                if (match) {
                  const [, serialNo, empCode, cardNo, employeeName, shift, shiftStart, checkIn, lunchOut, lunchIn, checkOut, hoursWorked, status] = match
                  
                  const record: any = {
                    employeeCode: empCode.trim(),
                    employeeName: employeeName.trim(),
                    shift: shift.trim(),
                    shiftStart: shiftStart.trim(),
                    checkInTime: checkIn || null,
                    breakInTime: lunchOut || null, // lunch out = break in (when employee goes for lunch)
                    breakOutTime: lunchIn || null, // lunch in = break out (when employee comes back from lunch)
                    checkOutTime: checkOut || null,
                    totalHours: hoursWorked ? parseFloat(hoursWorked) : 0,
                    status: status === 'P' ? 'PRESENT' : status === 'A' ? 'ABSENT' : 'PRESENT',
                    date: date
                  }
                  
                  attendanceRecords.push(record)
                  console.log('Parsed SRP record:', record)
                } else {
                  // Alternative parsing for lines that don't match the main pattern
                  // Try to extract at least empcode, name and status
                  const parts = trimmedLine.split(/\s+/)
                  if (parts.length >= 4) {
                    const empCode = parts[1]
                    let employeeName = ''
                    let status = 'PRESENT'
                    let hoursWorked = 0
                    
                    // Find employee name (usually after card number)
                    for (let i = 3; i < parts.length; i++) {
                      if (parts[i].match(/S\d+/)) { // Found shift, stop here
                        break
                      }
                      if (!parts[i].match(/^\d/)) { // Not a number, likely part of name
                        employeeName += parts[i] + ' '
                      }
                    }
                    
                    // Find status (P or A)
                    for (let i = 0; i < parts.length; i++) {
                      if (parts[i] === 'P' || parts[i] === 'A') {
                        status = parts[i] === 'P' ? 'PRESENT' : 'ABSENT'
                        break
                      }
                    }
                    
                    // Find hours worked (decimal number)
                    for (let i = 0; i < parts.length; i++) {
                      if (parts[i].match(/^\d+\.\d+$/)) {
                        hoursWorked = parseFloat(parts[i])
                        break
                      }
                    }
                    
                    if (empCode && employeeName.trim()) {
                      const record: any = {
                        employeeCode: empCode.trim(),
                        employeeName: employeeName.trim(),
                        checkInTime: null,
                        breakInTime: null,
                        breakOutTime: null,
                        checkOutTime: null,
                        totalHours: hoursWorked,
                        status: status,
                        date: date
                      }
                      
                      attendanceRecords.push(record)
                      console.log('Parsed SRP record (alternative):', record)
                    }
                  }
                }
              } catch (parseError) {
                console.warn('Error parsing SRP line:', trimmedLine, parseError)
              }
            }
          }
        }
      }

      if (attendanceRecords.length === 0) {
        return NextResponse.json({ 
          error: 'No valid attendance records found in the file. Please check the file format.' 
        }, { status: 400 })
      }

      // Save to database using Prisma
      console.log('Saving attendance records to database:', attendanceRecords)

      // Helper function to parse date and time strings safely
      function parseDateTime(dateStr: string, timeStr: string | null | undefined): Date | undefined {
        if (!timeStr || timeStr === 'null' || timeStr === '' || timeStr === 'undefined' || timeStr === 'Invalid Date') {
          return undefined
        }
        
        try {
          const timeStr_clean = timeStr.toString().trim()
          const timeParts = timeStr_clean.split(':')
          
          if (timeParts.length >= 2) {
            const hours = parseInt(timeParts[0])
            const minutes = parseInt(timeParts[1])
            const seconds = timeParts[2] ? parseInt(timeParts[2]) : 0
            
            if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
              const dateObj = new Date(dateStr)
              const year = dateObj.getFullYear()
              const month = String(dateObj.getMonth() + 1).padStart(2, '0')
              const day = String(dateObj.getDate()).padStart(2, '0')
              
              const isoString = `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.000Z`
              return new Date(isoString)
            }
          }
          return undefined
        } catch (error) {
          return undefined
        }
      }

      // Use Prisma transaction to save records
      // Generate a single batch ID for this upload
      const batchId = `upload_${Date.now()}`
      
      const savedRecords = await prisma.$transaction(async (tx) => {
        const created = []
        
        for (const record of attendanceRecords) {
          try {
            // Generate a unique employeeId from employeeCode if it's not a number
            let employeeId: number
            if (isNaN(parseInt(record.employeeCode))) {
              // Create a hash-based ID from employeeCode
              employeeId = Math.abs(record.employeeCode.split('').reduce((a: number, b: string) => {
                a = ((a << 5) - a) + b.charCodeAt(0)
                return a
              }, 0))
            } else {
              employeeId = parseInt(record.employeeCode)
            }

            // Ensure employee exists - use employeeCode as unique identifier (case-insensitive)
            // First try to find existing employee with case-insensitive match
            let employee = await tx.employee.findFirst({
              where: { 
                employeeCode: {
                  equals: record.employeeCode,
                  mode: 'insensitive'
                }
              }
            })

            if (employee) {
              // Update existing employee
              employee = await tx.employee.update({
                where: { id: employee.id },
                data: {
                  name: record.employeeName
                }
              })
            } else {
              // Create new employee
              employee = await tx.employee.create({
                data: {
                  name: record.employeeName,
                  email: `${record.employeeCode.toLowerCase()}@company.com`,
                  employeeCode: record.employeeCode
                }
              })
            }
            
            // Use the actual employee ID from database
            employeeId = employee.id

            // Create attendance record with the SAME batch ID for all records
            const attendanceRecord = await tx.attendanceRecord.upsert({
              where: {
                employee_date_attendance: {
                  employeeId: employeeId,
                  date: new Date(record.date)
                }
              },
              update: {
                status: record.status === 'PRESENT' ? 'PRESENT' : 'ABSENT',
                checkInTime: parseDateTime(record.date, record.checkInTime),
                checkOutTime: parseDateTime(record.date, record.checkOutTime),
                breakInTime: parseDateTime(record.date, record.breakInTime),
                breakOutTime: parseDateTime(record.date, record.breakOutTime),
                totalHours: record.totalHours || 0,
                shift: record.shift || null,
                shiftStart: record.shiftStart || null,
                hasBeenEdited: false,
                importSource: 'srp_upload',
                importBatch: batchId  // Use the single batch ID
              },
              create: {
                employeeId: employeeId,
                date: new Date(record.date),
                status: record.status === 'PRESENT' ? 'PRESENT' : 'ABSENT',
                checkInTime: parseDateTime(record.date, record.checkInTime),
                checkOutTime: parseDateTime(record.date, record.checkOutTime),
                breakInTime: parseDateTime(record.date, record.breakInTime),
                breakOutTime: parseDateTime(record.date, record.breakOutTime),
                totalHours: record.totalHours || 0,
                hasTagWork: false,
                hasFlowaceWork: false,
                tagWorkMinutes: 0,
                flowaceMinutes: 0,
                hasException: false,
                shift: record.shift || null,
                shiftStart: record.shiftStart || null,
                overtime: 0,
                importSource: 'srp_upload',
                importBatch: batchId,  // Use the single batch ID
                hasBeenEdited: false
              }
            })

            created.push(attendanceRecord)
          } catch (error: any) {
            console.error('Error saving record:', error.message)
            throw error
          }
        }
        return created
      })

      console.log('Successfully saved attendance records:', savedRecords.length)

      // Award points for attendance (run in background, don't block response)
      awardAttendancePoints(savedRecords).catch(err => 
        console.error('Error awarding attendance points:', err)
      )

      // Save to upload history
      try {
        const uploadHistoryEntry = {
          id: batchId,  // Use the same batch ID
          fileName: file.name,
          uploadDate: date,
          recordCount: savedRecords.length,
          uploadedAt: new Date().toISOString(),
          fileContent: fileContent
        }

        // Save to upload history API
        await fetch(`${request.nextUrl.origin}/api/upload-history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(uploadHistoryEntry)
        })

        console.log('Upload history saved successfully')
      } catch (historyError) {
        console.error('Failed to save upload history:', historyError)
        // Don't fail the upload if history save fails
      }

      return NextResponse.json({ 
        success: true, 
        recordsProcessed: savedRecords.length,
        message: `Successfully uploaded and saved ${savedRecords.length} attendance records for ${date}`
      })

    } catch (parseError) {
      console.error('Parse error:', parseError)
      return NextResponse.json({ 
        error: 'Failed to parse file content. Please check the file format.' 
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ 
      error: 'Internal server error during file upload' 
    }, { status: 500 })
  }
}

// Helper function to award points for attendance records
async function awardAttendancePoints(records: any[]) {
  for (const record of records) {
    try {
      if (record.status === 'PRESENT') {
        // Award points for being present
        await awardPoints({
          employeeId: record.employeeId,
          points: POINT_VALUES.ATTENDANCE_PRESENT,
          type: 'earned',
          description: 'Daily attendance',
          reference: `attendance:${record.id}`
        })

        // Bonus for early check-in (before 9 AM)
        if (record.checkInTime) {
          const checkInHour = new Date(record.checkInTime).getHours()
          if (checkInHour < 9) {
            await awardPoints({
              employeeId: record.employeeId,
              points: POINT_VALUES.EARLY_CHECKIN,
              type: 'bonus',
              description: 'Early check-in bonus',
              reference: `attendance:${record.id}`
            })
          }
        }
      } else if (record.status === 'ABSENT') {
        // Penalty for absence
        await awardPoints({
          employeeId: record.employeeId,
          points: POINT_VALUES.ABSENCE_PENALTY,
          type: 'penalty',
          description: 'Absence penalty',
          reference: `attendance:${record.id}`
        })
      }
    } catch (error) {
      console.error(`Error awarding points for attendance record ${record.id}:`, error)
    }
  }
}