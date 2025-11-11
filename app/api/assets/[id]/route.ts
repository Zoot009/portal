import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/assets/[id] - Get single asset
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const asset = await prisma.asset.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        assignments: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                employeeCode: true,
                email: true,
                department: true,
              },
            },
          },
          orderBy: {
            assignedDate: 'desc',
          },
        },
        maintenanceLogs: {
          orderBy: {
            maintenanceDate: 'desc',
          },
        },
      },
    })

    if (!asset) {
      return NextResponse.json(
        {
          success: false,
          error: 'Asset not found',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: asset,
    })
  } catch (error: any) {
    console.error('Error fetching asset:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch asset',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// PATCH /api/assets/[id] - Update asset
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json()
    const {
      assetName,
      assetType,
      condition,
      status,
      location,
      notes,
      warrantyExpiry,
    } = body

    const asset = await prisma.asset.update({
      where: { id: parseInt(id) },
      data: {
        ...(assetName && { assetName }),
        ...(assetType && { assetType }),
        ...(condition && { condition }),
        ...(status && { status }),
        ...(location !== undefined && { location }),
        ...(notes !== undefined && { notes }),
        ...(warrantyExpiry !== undefined && {
          warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      data: asset,
      message: 'Asset updated successfully',
    })
  } catch (error: any) {
    console.error('Error updating asset:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update asset',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// DELETE /api/assets/[id] - Delete asset
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.asset.delete({
      where: {
        id: parseInt(id),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Asset deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting asset:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete asset',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
