import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const batchId = searchParams.get('batchId')

    // Build where clause
    const where: any = {}
    
    if (date) {
      where.date = new Date(date)
    }
    
    if (batchId) {
      where.batchId = batchId
    }

    const records = await prisma.flowaceRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { activeHours: 'desc' }
      ]
    })

    // Calculate aggregated stats
    const topPerformer = records.length > 0
      ? records.reduce((max, record) => 
          record.activeHours > (max?.activeHours || 0) ? record : max
        , records[0])
      : null

    const stats = {
      totalEmployees: new Set(records.map(r => r.employeeCode)).size,
      avgProductivity: records.length > 0 
        ? records.reduce((acc, r) => acc + (r.productivityPercentage || 0), 0) / records.length 
        : 0,
      totalHours: records.reduce((acc, r) => acc + r.loggedHours, 0),
      topPerformer
    }

    return NextResponse.json({
      success: true,
      records,
      stats
    })
  } catch (error: any) {
    console.error('Error fetching Flowace records:', error)
    return NextResponse.json(
      { error: 'Failed to fetch records', details: error.message },
      { status: 500 }
    )
  }
}
