import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/assets/maintenance - Get maintenance logs
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const assetId = searchParams.get('assetId')
    const maintenanceType = searchParams.get('maintenanceType')

    const where: any = {}

    if (assetId) {
      where.assetId = parseInt(assetId)
    }

    if (maintenanceType && maintenanceType !== 'all') {
      where.maintenanceType = maintenanceType
    }

    const logs = await prisma.assetMaintenance.findMany({
      where,
      include: {
        asset: {
          select: {
            id: true,
            assetName: true,
            assetTag: true,
            serialNumber: true,
            assetType: true,
          },
        },
      },
      orderBy: {
        maintenanceDate: 'desc',
      },
    })

    // Format the response to be consistent
    const formattedLogs = logs.map(log => ({
      ...log,
      type: log.maintenanceType,
      date: log.maintenanceDate,
    }))

    return NextResponse.json({
      success: true,
      data: formattedLogs,
      count: formattedLogs.length,
    })
  } catch (error: any) {
    console.error('Error fetching maintenance logs:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch maintenance logs',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// POST /api/assets/maintenance - Create maintenance log
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      assetId,
      maintenanceType,
      description,
      maintenanceDate,
      cost,
      performedBy,
      notes,
      nextDueDate,
    } = body

    if (!assetId || !maintenanceType || !description) {
      return NextResponse.json(
        {
          success: false,
          error: 'Asset ID, maintenance type, and description are required',
        },
        { status: 400 }
      )
    }

    const maintenanceLog = await prisma.assetMaintenance.create({
      data: {
        assetId: parseInt(assetId),
        maintenanceType,
        description,
        maintenanceDate: maintenanceDate ? new Date(maintenanceDate) : new Date(),
        cost: cost ? parseFloat(cost) : null,
        performedBy,
        notes,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
      },
      include: {
        asset: {
          select: {
            id: true,
            assetName: true,
            assetTag: true,
            serialNumber: true,
          },
        },
      },
    })

    // If it's a repair or replacement, update asset condition based on the maintenance
    if (maintenanceType === 'REPAIR' || maintenanceType === 'REPLACEMENT') {
      await prisma.asset.update({
        where: { id: parseInt(assetId) },
        data: {
          status: 'IN_MAINTENANCE',
        },
      })
    }

    return NextResponse.json(
      {
        success: true,
        data: maintenanceLog,
        message: 'Maintenance record created successfully',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating maintenance log:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create maintenance log',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
