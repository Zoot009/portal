import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { startDate, endDate } = body

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    // Parse dates and set time boundaries (prevent timezone issues)
    const start = new Date(startDate + 'T00:00:00.000Z')
    const end = new Date(endDate + 'T23:59:59.999Z')
    
    console.log('Export date range:', { 
      startDate, 
      endDate, 
      parsedStart: start.toISOString(), 
      parsedEnd: end.toISOString() 
    })

    // Fetch breaks data within date range
    const breaks = await prisma.break.findMany({
      where: {
        breakDate: {
          gte: start,
          lte: end
        }
      },
      include: {
        employee: {
          select: {
            name: true,
            employeeCode: true,
            department: true
          }
        }
      },
      orderBy: [
        { breakDate: 'desc' },
        { employee: { employeeCode: 'asc' } },
        { breakInTime: 'asc' }
      ]
    })

    // Helper function to format time
    const formatTime = (date: Date | null): string => {
      if (!date) return '-'
      try {
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'UTC'
        })
      } catch {
        return '-'
      }
    }

    // Helper function to format date
    const formatDate = (date: Date): string => {
      try {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'UTC'
        })
      } catch {
        return '-'
      }
    }

    // Helper function to format duration
    const formatDuration = (minutes: number): string => {
      if (!minutes || minutes === 0) return '0 minutes'
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      if (hours > 0) {
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
      }
      return `${mins}m`
    }

    // Helper function to calculate status
    const getBreakStatus = (breakSession: any): string => {
      if (!breakSession.breakInTime) return 'Not Started'
      if (breakSession.breakInTime && !breakSession.breakOutTime) return 'Active'
      if (breakSession.breakInTime && breakSession.breakOutTime) return 'Completed'
      return 'Unknown'
    }

    // Generate CSV content
    const headers = [
      'Date',
      'Employee Code', 
      'Employee Name',
      'Department',
      'Break In Time',
      'Break Out Time', 
      'Duration (Minutes)',
      'Duration (Formatted)',
      'Status',
      'Has Been Edited'
    ]

    const csvRows = breaks.map(breakSession => [
      formatDate(breakSession.breakDate),
      breakSession.employee.employeeCode,
      breakSession.employee.name,
      breakSession.employee.department || 'Not Specified',
      formatTime(breakSession.breakInTime),
      formatTime(breakSession.breakOutTime),
      breakSession.breakDuration?.toString() || '0',
      formatDuration(breakSession.breakDuration || 0),
      getBreakStatus(breakSession),
      breakSession.hasBeenEdited ? 'Yes' : 'No'
    ])

    // Combine headers and data
    const csvContent = [headers, ...csvRows]
      .map(row => row.map(field => `"${field?.toString().replace(/"/g, '""') || ''}"`).join(','))
      .join('\n')

    // Add UTF-8 BOM for proper Excel compatibility
    const csvWithBOM = '\ufeff' + csvContent

    // Generate filename with date range
    const startStr = start.toISOString().split('T')[0]
    const endStr = end.toISOString().split('T')[0]
    const filename = `breaks_export_${startStr}_to_${endStr}.csv`

    // Return CSV data
    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Error exporting breaks data:', error)
    return NextResponse.json(
      { error: 'Failed to export breaks data' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}