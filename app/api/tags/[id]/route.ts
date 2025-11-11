import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/tags/[id] - Get single tag
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tag = await prisma.tag.findUnique({
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
                department: true,
              },
            },
          },
        },
        logs: {
          take: 100,
          orderBy: {
            logDate: 'desc',
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
            logs: true,
          },
        },
      },
    })

    if (!tag) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tag not found',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: tag,
    })
  } catch (error: any) {
    console.error('Error fetching tag:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tag',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// PATCH /api/tags/[id] - Update tag
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json()
    const { tagName, timeMinutes, category, isActive } = body

    const tag = await prisma.tag.update({
      where: { id: parseInt(id) },
      data: {
        ...(tagName && { tagName }),
        ...(timeMinutes !== undefined && { timeMinutes: parseInt(timeMinutes) }),
        ...(category && { category }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json({
      success: true,
      data: tag,
      message: 'Tag updated successfully',
    })
  } catch (error: any) {
    console.error('Error updating tag:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update tag',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// DELETE /api/tags/[id] - Delete tag
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.tag.delete({
      where: {
        id: parseInt(id),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Tag deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting tag:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete tag',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
