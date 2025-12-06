import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const exportType = searchParams.get('exportType') || 'all'
    const employeeId = searchParams.get('employeeId')

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
      exportType,
      employeeId,
      parsedStart: start.toISOString(), 
      parsedEnd: end.toISOString() 
    })

    // Build where clause based on export type
    const whereClause: any = {
      breakDate: {
        gte: start,
        lte: end
      }
    }

    // Add employee filter if individual export is selected
    if (exportType === 'individual' && employeeId) {
      whereClause.employeeId = parseInt(employeeId)
    }

    // Fetch breaks data within date range
    const breaks = await prisma.break.findMany({
      where: whereClause,
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

    // Helper function to format time (Excel-friendly HH:MM:SS format)
    const formatTime = (date: Date | null): string => {
      if (!date) return '-'
      try {
        // Use ISO time format (HH:MM:SS) which Excel handles consistently
        return date.toISOString().substring(11, 19)
      } catch {
        return '-'
      }
    }

    // Helper function to format date (Excel-friendly YYYY-MM-DD format)
    const formatDate = (date: Date): string => {
      try {
        // Use ISO date format (YYYY-MM-DD) which Excel handles perfectly
        return date.toISOString().split('T')[0]
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

    // Generate CSV content with only requested columns
    const headers = [
      'Date',
      'Employee Code', 
      'Employee Name',
      'Break In',
      'Break Out',
      'Duration (Formatted)'
    ]

    const csvRows = breaks.map(breakSession => [
      formatDate(breakSession.breakDate),
      breakSession.employee.employeeCode,
      breakSession.employee.name,
      formatTime(breakSession.breakInTime),
      formatTime(breakSession.breakOutTime),
      formatDuration(breakSession.breakDuration || 0)
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
    
    let filename = 'breaks_export'
    if (exportType === 'individual' && breaks.length > 0) {
      const employee = breaks[0]?.employee
      if (employee) {
        filename = `breaks_${employee.employeeCode}_${employee.name.replace(/\s+/g, '_')}`
      }
    } else {
      filename = 'breaks_all_employees'
    }
    filename += `_${startStr}_to_${endStr}.csv`

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