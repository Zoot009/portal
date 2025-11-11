import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const records = await prisma.flowaceRecord.findMany({
      select: {
        id: true,
        employeeCode: true,
        employeeName: true,
        date: true,
        batchId: true,
      },
      orderBy: { employeeName: 'asc' }
    })

    const groupedByEmployee = records.reduce((acc: any, record) => {
      if (!acc[record.employeeCode]) {
        acc[record.employeeCode] = []
      }
      acc[record.employeeCode].push(record.employeeName)
      return acc
    }, {})

    return NextResponse.json({
      totalRecords: records.length,
      uniqueEmployees: Object.keys(groupedByEmployee).length,
      groupedByEmployee,
      allRecords: records
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
