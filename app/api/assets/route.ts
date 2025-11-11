import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/assets - Get all assets
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const assetType = searchParams.get('assetType')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: any = {}

    if (assetType) {
      where.assetType = assetType
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (search) {
      where.OR = [
        { assetName: { contains: search, mode: 'insensitive' } },
        { assetTag: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
      ]
    }

    const assets = await prisma.asset.findMany({
      where,
      include: {
        assignments: {
          where: {
            status: 'ACTIVE',
          },
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                employeeCode: true,
              },
            },
          },
        },
        _count: {
          select: {
            assignments: true,
            maintenanceLogs: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: assets,
      count: assets.length,
    })
  } catch (error: any) {
    console.error('Error fetching assets:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch assets',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// POST /api/assets - Create new asset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      assetName,
      assetType,
      assetTag,
      serialNumber,
      model,
      brand,
      purchaseDate,
      warrantyExpiry,
      purchasePrice,
      condition = 'GOOD',
      status = 'AVAILABLE',
      location,
      description,
      notes,
    } = body

    if (!assetName || !assetType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Asset name and type are required',
        },
        { status: 400 }
      )
    }

    // Check if asset tag already exists
    if (assetTag) {
      const existing = await prisma.asset.findUnique({
        where: { assetTag },
      })

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: 'Asset tag already exists',
          },
          { status: 400 }
        )
      }
    }

    const asset = await prisma.asset.create({
      data: {
        assetName,
        assetType,
        assetTag,
        serialNumber,
        model,
        brand,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        condition,
        status,
        location,
        description,
        notes,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: asset,
        message: 'Asset created successfully',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating asset:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create asset',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
