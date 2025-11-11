import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { prisma } from '@/lib/prisma'
import { awardPoints, POINT_VALUES } from '@/lib/gamification'

export async function POST(request: NextRequest) {
  let file: File | null = null
  let date: string | null = null
  
  try {
    const formData = await request.formData()
    file = formData.get('file') as File
    date = formData.get('date') as string

    console.log('Upload started:', { filename: file?.name, date })

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are allowed' },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads', 'flowace')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Save the file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Generate unique batch ID and filename
    const timestamp = new Date().getTime()
    const batchId = `flowace_${date}_${timestamp}`
    const filename = `${batchId}.csv`
    const filepath = join(uploadsDir, filename)
    
    await writeFile(filepath, buffer)
    console.log('File saved:', filepath)

    // Parse CSV to extract employee data
    const text = buffer.toString('utf-8')
    const lines = text.split('\n')
    
    console.log('Total lines in CSV:', lines.length)
    
    // Find the header row that contains "Member Name,Member Email,..."
    let headerIndex = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Member Name,Member Email')) {
        headerIndex = i
        break
      }
    }
    
    console.log('Header found at line:', headerIndex)
    
    if (headerIndex === -1) {
      return NextResponse.json(
        { error: 'Invalid CSV format: Member data header not found' },
        { status: 400 }
      )
    }
    
    // Parse headers
    const headers = lines[headerIndex].split(',').map(h => h.trim())
    
    // Parse employee data rows
    const dataLines = lines.slice(headerIndex + 1)
    const records = []
    
    for (const line of dataLines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith(',')) continue
      
      const values = trimmed.split(',').map(v => v.trim())
      if (values.length < headers.length) continue
      
      const record: any = {}
      headers.forEach((header, index) => {
        record[header] = values[index] || null
      })
      
      // Skip if no member name
      if (!record['Member Name']) continue
      
      records.push(record)
    }
    
    console.log('Employee records found:', records.length)
    
    // Save records to database
    let savedCount = 0
    const uploadDate = new Date(date)
    const createdRecords: any[] = []
    
    for (const record of records) {
      try {
        // Find employee by email or employee code
        const memberEmail = record['Member Email']
        const memberCode = record['Member Id'] || extractCodeFromEmail(memberEmail)
        const memberName = record['Member Name']?.trim()
        
        // Create unique identifier: use Member Id if valid, otherwise use email
        const uniqueIdentifier = (memberCode && memberCode !== '-') 
          ? memberCode 
          : memberEmail || memberName || 'UNKNOWN'
        
        const employee = await prisma.employee.findFirst({
          where: {
            OR: [
              { email: memberEmail },
              { employeeCode: memberCode }
            ]
          }
        })
        
        // Parse time strings to floats (HH:MM:SS format to hours)
        const parseTime = (timeStr: string): number => {
          if (!timeStr || timeStr === '-') return 0
          const parts = timeStr.split(':')
          const hours = parseInt(parts[0] || '0')
          const minutes = parseInt(parts[1] || '0')
          const seconds = parseInt(parts[2] || '0')
          return hours + (minutes / 60) + (seconds / 3600)
        }
        
        // Parse percentage strings
        const parsePercentage = (percentStr: string): number | null => {
          if (!percentStr || percentStr === '-') return null
          return parseFloat(percentStr.replace('%', ''))
        }
        
        const flowaceRecord = await prisma.flowaceRecord.upsert({
          where: {
            employee_date_batch: {
              employeeCode: uniqueIdentifier,
              date: uploadDate,
              batchId
            }
          },
          create: {
            employeeId: employee?.id,
            employeeCode: uniqueIdentifier,
            employeeName: record['Member Name'],
            memberEmail: memberEmail,
            teams: record['Teams'],
            date: uploadDate,
            
            // Time metrics
            loggedHours: parseTime(record['Logged Hours']),
            activeHours: parseTime(record['Active Hours']),
            idleHours: parseTime(record['Idle Hours']),
            productiveHours: parseTime(record['Productive Hours']),
            unproductiveHours: parseTime(record['Unproductive Hours']),
            neutralHours: parseTime(record['Neutral Hours']),
            classifiedHours: parseTime(record['Classified Hours']),
            unclassifiedHours: parseTime(record['Unclassified Hours']),
            availableHours: parseTime(record['Available Hours']),
            missingHours: parseTime(record['Missing Hours']),
            
            // Percentages
            activityPercentage: parsePercentage(record['Activity %']),
            productivityPercentage: parsePercentage(record['Productivity %']),
            classifiedPercentage: parsePercentage(record['Classified %']),
            
            // Durations (in minutes)
            classifiedBillableDuration: parseInt(record['Classified Billable Duration'] || '0'),
            classifiedNonBillableDuration: parseInt(record['Classified Non Billable Duration'] || '0'),
            
            // Work times
            workStartTime: record['Average Work Start Time'],
            workEndTime: record['Average Work End Time'],
            
            // Import tracking
            batchId,
            importSource: 'csv',
            uploadStatus: 'COMPLETED',
            uploadFilename: filename,
            uploadedAt: new Date(),
            
            // Store raw data for reference
            rawData: record
          },
          update: {
            employeeId: employee?.id,
            employeeName: record['Member Name'],
            memberEmail: memberEmail,
            teams: record['Teams'],
            
            // Time metrics
            loggedHours: parseTime(record['Logged Hours']),
            activeHours: parseTime(record['Active Hours']),
            idleHours: parseTime(record['Idle Hours']),
            productiveHours: parseTime(record['Productive Hours']),
            unproductiveHours: parseTime(record['Unproductive Hours']),
            neutralHours: parseTime(record['Neutral Hours']),
            classifiedHours: parseTime(record['Classified Hours']),
            unclassifiedHours: parseTime(record['Unclassified Hours']),
            availableHours: parseTime(record['Available Hours']),
            missingHours: parseTime(record['Missing Hours']),
            
            // Percentages
            activityPercentage: parsePercentage(record['Activity %']),
            productivityPercentage: parsePercentage(record['Productivity %']),
            classifiedPercentage: parsePercentage(record['Classified %']),
            
            // Durations (in minutes)
            classifiedBillableDuration: parseInt(record['Classified Billable Duration'] || '0'),
            classifiedNonBillableDuration: parseInt(record['Classified Non Billable Duration'] || '0'),
            
            // Work times
            workStartTime: record['Average Work Start Time'],
            workEndTime: record['Average Work End Time'],
            
            // Import tracking
            uploadStatus: 'COMPLETED',
            uploadFilename: filename,
            uploadedAt: new Date(),
            
            // Store raw data for reference
            rawData: record
          }
        })
        
        createdRecords.push(flowaceRecord)
        savedCount++
      } catch (error: any) {
        console.error('Error saving record:', record['Member Name'], error.message)
      }
    }
    
    console.log('Records saved to database:', savedCount)
    
    // Award points for productivity (run in background)
    awardProductivityPoints(createdRecords).catch((err) =>
      console.error('Error awarding productivity points:', err)
    )
    
    // Save upload history directly to database
    try {
      await prisma.uploadHistory.create({
        data: {
          filename: file.name,
          fileType: 'flowace_csv',
          status: 'COMPLETED',
          totalRecords: records.length,
          processedRecords: savedCount,
          errorRecords: records.length - savedCount,
          uploadedAt: new Date(),
          completedAt: new Date(),
          batchId: batchId,
          summary: {
            date: date,
            recordsFound: records.length,
            recordsSaved: savedCount,
            recordsFailed: records.length - savedCount,
            uploadFilename: filename
          }
        }
      })

      console.log('Upload history saved to database')

    } catch (historyError) {
      console.error('Error saving upload history:', historyError)
      // Don't fail the entire upload if history saving fails
    }
    
    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      filename,
      date,
      recordsProcessed: savedCount,
      totalRecords: records.length,
      batchId
    })

  } catch (error: any) {
    console.error('Error uploading Flowace CSV:', error)
    
    // Save failed upload to history
    try {
      const failedBatchId = `flowace_failed_${Date.now()}`
      
      await prisma.uploadHistory.create({
        data: {
          filename: file?.name || 'unknown',
          fileType: 'flowace_csv',
          status: 'FAILED',
          totalRecords: 0,
          processedRecords: 0,
          errorRecords: 0,
          uploadedAt: new Date(),
          completedAt: new Date(),
          batchId: failedBatchId,
          errors: {
            message: error.message,
            stack: error.stack
          }
        }
      })

      console.log('Failed upload history saved to database')

    } catch (historyError) {
      console.error('Error saving failed upload history:', historyError)
    }
    
    return NextResponse.json(
      { error: `Failed to upload file: ${error.message}` },
      { status: 500 }
    )
  }
}

// Helper function to extract employee code from email
function extractCodeFromEmail(email: string): string {
  if (!email) return 'UNKNOWN'
  return email.split('@')[0].toUpperCase()
}

// Helper function to award points based on productivity
async function awardProductivityPoints(records: any[]) {
  for (const record of records) {
    try {
      if (!record.employeeId) continue

      const productivity = record.productivityPercentage || 0

      let points = 0
      let description = ''

      if (productivity >= 90) {
        points = POINT_VALUES.PRODUCTIVITY_HIGH
        description = 'High productivity (90%+)'
      } else if (productivity >= 75) {
        points = POINT_VALUES.PRODUCTIVITY_MEDIUM
        description = 'Good productivity (75-89%)'
      } else if (productivity >= 60) {
        points = POINT_VALUES.PRODUCTIVITY_LOW
        description = 'Moderate productivity (60-74%)'
      }

      if (points > 0) {
        await awardPoints({
          employeeId: record.employeeId,
          points,
          type: 'earned',
          description,
          reference: `flowace:${record.id}`
        })
      }
    } catch (error) {
      console.error(`Error awarding productivity points for record ${record.id}:`, error)
    }
  }
}
