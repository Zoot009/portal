import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  console.log('🚀 Starting file upload process...')
  try {
    console.log('📝 Reading form data...')
    const formData = await request.formData()
    const file = formData.get('file') as File
    const date = formData.get('date') as string

    console.log('📋 Upload details:', {
      fileName: file?.name,
      fileSize: file?.size,
      date: date
    })

    if (!file) {
      console.error('❌ No file provided')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!date) {
      console.error('❌ No date provided')
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
    console.log('📖 Reading file content...')
    const fileContent = await file.text()
    
    if (!fileContent.trim()) {
      console.error('❌ File is empty')
      return NextResponse.json({ error: 'File is empty' }, { status: 400 })
    }

    console.log('✅ File content loaded, size:', fileContent.length, 'characters')

    // Parse attendance data based on file type
    const attendanceRecords: any[] = []
    console.log('🔍 Starting to parse attendance records...')
    
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
                // Format can be:
                // 1. Regular: Srl EmpCode Cardno EmployeeName Shift Start In LunchOut LunchIn Out Hours Status
                // 2. OFF day: Srl EmpCode Cardno EmployeeName OFF [checkIn] [lunchOut] [lunchIn] [checkOut] [Hours] [Status] [Manual]
                
                // Split line into parts for flexible parsing
                const parts = trimmedLine.split(/\s+/)
                
                if (parts.length >= 4) {
                  const serialNo = parts[0]
                  const empCode = parts[1]
                  const cardNo = parts[2]
                  
                  // Extract employee name (can be multiple words until we hit OFF, shift pattern, or time)
                  let nameEndIndex = 3
                  let employeeName = ''
                  for (let i = 3; i < parts.length; i++) {
                    if (parts[i].match(/^(OFF|S\d+|\d{2}:\d{2})$/)) {
                      nameEndIndex = i
                      break
                    }
                    employeeName += parts[i] + ' '
                  }
                  employeeName = employeeName.trim()
                  
                  // Determine if it's an OFF day or regular shift day
                  const isOffDay = parts[nameEndIndex] === 'OFF'
                  
                  let shift = null
                  let shiftStart = null
                  let checkIn = null
                  let lunchOut = null
                  let lunchIn = null
                  let checkOut = null
                  let hoursWorked = 0
                  let status = 'ABSENT'
                  let hasManualMark = false
                  
                  if (isOffDay) {
                    // OFF day format: after OFF, look for time entries
                    const timeIndex = nameEndIndex + 1
                    const timeValues = []
                    
                    // Collect all time values and numeric values
                    for (let i = timeIndex; i < parts.length; i++) {
                      if (parts[i].match(/^\d{2}:\d{2}$/)) {
                        timeValues.push(parts[i])
                      } else if (parts[i].match(/^\d+\.\d+$/)) {
                        hoursWorked = parseFloat(parts[i])
                      } else if (parts[i] === 'WO') {
                        status = 'ABSENT' // Weekly Off without work
                      } else if (parts[i] === 'POW') {
                        status = 'PRESENT' // Present On Weekend/Weekly Off
                      } else if (parts[i] === 'Y') {
                        hasManualMark = true
                      }
                    }
                    
                    // Assign time values based on count
                    if (timeValues.length >= 1) checkIn = timeValues[0]
                    if (timeValues.length >= 2) lunchOut = timeValues[1]
                    if (timeValues.length >= 3) lunchIn = timeValues[2]
                    if (timeValues.length >= 4) checkOut = timeValues[3]
                    
                    // If there are time entries, it's a POW (Present On Weekend)
                    if (timeValues.length > 0 || hoursWorked > 0) {
                      status = 'PRESENT'
                    }
                    
                  } else {
                    // Regular shift day format
                    shift = parts[nameEndIndex]
                    shiftStart = parts[nameEndIndex + 1]
                    
                    // Look for time entries and status
                    const timeValues = []
                    for (let i = nameEndIndex + 2; i < parts.length; i++) {
                      if (parts[i].match(/^\d{2}:\d{2}$/)) {
                        timeValues.push(parts[i])
                      } else if (parts[i].match(/^\d+\.\d+$/)) {
                        hoursWorked = parseFloat(parts[i])
                      } else if (parts[i] === 'P' || parts[i] === 'A') {
                        status = parts[i] === 'P' ? 'PRESENT' : 'ABSENT'
                      } else if (parts[i] === 'Y') {
                        hasManualMark = true
                      }
                    }
                    
                    if (timeValues.length >= 1) checkIn = timeValues[0]
                    if (timeValues.length >= 2) lunchOut = timeValues[1]
                    if (timeValues.length >= 3) lunchIn = timeValues[2]
                    if (timeValues.length >= 4) checkOut = timeValues[3]
                  }
                  
                  // Create record if we have at least employee code and name
                  if (empCode && employeeName) {
                    const record: any = {
                      employeeCode: empCode.trim(),
                      employeeName: employeeName.trim(),
                      shift: shift,
                      shiftStart: shiftStart,
                      checkInTime: checkIn,
                      breakInTime: lunchOut, // lunch out = break in (when employee goes for lunch)
                      breakOutTime: lunchIn, // lunch in = break out (when employee comes back from lunch)
                      checkOutTime: checkOut,
                      totalHours: hoursWorked,
                      status: status,
                      date: date,
                      isOffDay: isOffDay
                    }
                    
                    attendanceRecords.push(record)
                    console.log('Parsed SRP record:', record)
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
        console.error('❌ No valid attendance records found in the file')
        return NextResponse.json({ 
          error: 'No valid attendance records found in the file. Please check the file format.' 
        }, { status: 400 })
      }

      console.log('✅ Parsed', attendanceRecords.length, 'attendance records')
      console.log('📊 Sample record:', JSON.stringify(attendanceRecords[0], null, 2))

      // Save to database using Prisma
      console.log('💾 Starting database save operation...')

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

      // Process records individually to avoid transaction timeout
      // Generate a single batch ID for this upload
      const batchId = `upload_${Date.now()}`
      
      console.log(`💾 Processing ${attendanceRecords.length} records individually...`)
      const savedRecords = []
      const errors = []

      for (let i = 0; i < attendanceRecords.length; i++) {
        const record = attendanceRecords[i]
        console.log(`🔄 Processing record ${i + 1}/${attendanceRecords.length}: ${record.employeeCode} - ${record.employeeName}`)
        
        try {
          // Find or create employee (without unnecessary updates)
          console.log(`  🔍 Looking for employee: ${record.employeeCode}`)
          let employee = await prisma.employee.findFirst({
            where: { 
              employeeCode: {
                equals: record.employeeCode,
                mode: 'insensitive'
              }
            }
          })

          if (!employee) {
            console.log(`  👤 Creating new employee: ${record.employeeCode}`)
            employee = await prisma.employee.create({
              data: {
                name: record.employeeName,
                email: `${record.employeeCode.toLowerCase()}@company.com`,
                employeeCode: record.employeeCode
              }
            })
          } else {
            console.log(`  ✅ Employee found: ID ${employee.id}`)
          }
          
          // Create attendance record
          console.log(`  📝 Creating attendance record...`)
          const attendanceRecord = await prisma.attendanceRecord.upsert({
            where: {
              employee_date_attendance: {
                employeeId: employee.id,
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
              importBatch: batchId
            },
            create: {
              employeeId: employee.id,
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
              importBatch: batchId,
              hasBeenEdited: false
            }
          })
          
          console.log(`  ✅ Successfully saved attendance record for ${record.employeeCode}`)
          savedRecords.push(attendanceRecord)
          
        } catch (error: any) {
          console.error(`  ❌ Error processing ${record.employeeCode}:`, error.message)
          errors.push({
            employeeCode: record.employeeCode,
            error: error.message
          })
          // Continue processing other records instead of failing everything
        }
      }

      console.log(`✅ Processing complete! Successfully saved: ${savedRecords.length}, Errors: ${errors.length}`)

      if (errors.length > 0) {
        console.log('❌ Errors encountered:', errors)
      }

      // Award points for attendance (run in background, don't block response)
      if (savedRecords.length > 0) {
        awardAttendancePoints(savedRecords).catch(err => 
          console.error('Error awarding attendance points:', err)
        )
      }

      // Save to upload history
      try {
        const uploadHistoryEntry = {
          id: batchId,
          fileName: file.name,
          uploadDate: date,
          recordCount: savedRecords.length,
          uploadedAt: new Date().toISOString(),
          fileContent: fileContent
        }

        await fetch(`${request.nextUrl.origin}/api/upload-history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(uploadHistoryEntry)
        })

        console.log('📋 Upload history saved successfully')
      } catch (historyError) {
        console.error('Failed to save upload history:', historyError)
      }

      // Return appropriate response
      if (savedRecords.length === 0) {
        return NextResponse.json({
          error: `Failed to process any records. Errors: ${errors.map(e => `${e.employeeCode}: ${e.error}`).join(', ')}`
        }, { status: 400 })
      } else if (errors.length > 0) {
        return NextResponse.json({
          success: true,
          recordsProcessed: savedRecords.length,
          recordsFailed: errors.length,
          message: `Partially successful: ${savedRecords.length} records saved, ${errors.length} failed`,
          errors: errors
        })
      } else {
        return NextResponse.json({
          success: true,
          recordsProcessed: savedRecords.length,
          message: `Successfully uploaded and saved all ${savedRecords.length} attendance records for ${date}`
        })
      }

    } catch (parseError) {
      console.error('Parse error:', parseError)
      return NextResponse.json({ 
        error: 'Failed to parse file content. Please check the file format.' 
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Upload error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      error: error
    })
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error during file upload',
      details: error instanceof Error ? error.stack : 'No additional details'
    }, { status: 500 })
  }
}

// Helper function to award points for attendance records
async function awardAttendancePoints(records: any[]) {
  try {
    // Gamification system disabled
    // const { awardAttendancePoints: awardPoints } = await import('@/lib/gamification-utils')
    
    for (const record of records) {
      if (record.employeeId && (record.status === 'PRESENT' || record.status === 'WFH_APPROVED')) {
        // await awardPoints(record.employeeId, record)
      }
    }
  } catch (error) {
    console.error('Error awarding attendance points:', error)
  }
}