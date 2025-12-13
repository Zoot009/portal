import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get all unique date ranges from attendance records
    const records = await prisma.attendanceRecord.findMany({
      select: {
        date: true
      },
      orderBy: {
        date: 'desc'
      }
    })

    if (records.length === 0) {
      return NextResponse.json([])
    }

    // Group records by pay cycles (6th to 5th of next month)
    const cycles: { [key: string]: { start: Date, end: Date, records: number } } = {}
    
    records.forEach(record => {
      const recordDate = new Date(record.date)
      
      // Calculate which pay cycle this date belongs to
      // Pay cycle: 6th of month to 5th of next month
      let cycleStart: Date
      let cycleEnd: Date
      
      if (recordDate.getDate() >= 6) {
        // Current month 6th to next month 5th
        cycleStart = new Date(recordDate.getFullYear(), recordDate.getMonth(), 6)
        cycleEnd = new Date(recordDate.getFullYear(), recordDate.getMonth() + 1, 5)
      } else {
        // Previous month 6th to current month 5th
        cycleStart = new Date(recordDate.getFullYear(), recordDate.getMonth() - 1, 6)
        cycleEnd = new Date(recordDate.getFullYear(), recordDate.getMonth(), 5)
      }
      
      const cycleKey = `${cycleStart.getFullYear()}-${(cycleStart.getMonth() + 1).toString().padStart(2, '0')}-${cycleStart.getDate()}`
      
      if (!cycles[cycleKey]) {
        cycles[cycleKey] = {
          start: cycleStart,
          end: cycleEnd,
          records: 0
        }
      }
      cycles[cycleKey].records++
    })

    // Convert to array and format for frontend
    const availableCycles = Object.entries(cycles)
      .map(([key, cycle]) => ({
        key,
        start: cycle.start.toISOString(),
        end: cycle.end.toISOString(),
        label: `${cycle.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${cycle.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        recordCount: cycle.records
      }))
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()) // Most recent first

    return NextResponse.json(availableCycles)
  } catch (error) {
    console.error('Error fetching pay cycles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pay cycles' },
      { status: 500 }
    )
  }
}