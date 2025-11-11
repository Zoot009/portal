import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/tags - Get all tags
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const isActive = searchParams.get('isActive')

    const where: any = {}

    if (category) {
      where.category = category
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    const tags = await prisma.tag.findMany({
      where,
      include: {
        _count: {
          select: {
            assignments: true,
            logs: true,
          },
        },
      },
      orderBy: {
        tagName: 'asc',
      },
    })

    return NextResponse.json({
      success: true,
      data: tags,
      count: tags.length,
    })
  } catch (error: any) {
    console.error('Error fetching tags:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tags',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// POST /api/tags - Create new tag
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tagName, timeMinutes, category } = body

    if (!tagName || !timeMinutes) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tag name and time minutes are required',
        },
        { status: 400 }
      )
    }

    const tag = await prisma.tag.create({
      data: {
        tagName,
        timeMinutes: parseInt(timeMinutes),
        category,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: tag,
        message: 'Tag created successfully',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating tag:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create tag',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
