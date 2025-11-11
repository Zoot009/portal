import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/flowace - Get flowace records
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const employeeId = searchParams.get('employeeId')
    const employeeCode = searchParams.get('employeeCode')
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}

    if (employeeId) {
      where.employeeId = parseInt(employeeId)
    }

    if (employeeCode) {
      where.employeeCode = employeeCode
    }

    if (date) {
      where.date = new Date(date)
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const records = await prisma.flowaceRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            department: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: records,
      count: records.length,
    })
  } catch (error: any) {
    console.error('Error fetching flowace records:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch flowace records',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// POST /api/flowace - Create flowace record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const records = Array.isArray(body) ? body : [body]

    const created = await Promise.allSettled(
      records.map(async (record: any) => {
        return prisma.flowaceRecord.create({
          data: {
            ...record,
            date: new Date(record.date),
          },
        })
      })
    )

    const successful = created.filter((r) => r.status === 'fulfilled').length
    const failed = created.filter((r) => r.status === 'rejected').length

    return NextResponse.json({
      success: true,
      message: `Created ${successful} flowace records`,
      stats: {
        total: records.length,
        successful,
        failed,
      },
    })
  } catch (error: any) {
    console.error('Error creating flowace records:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create flowace records',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
