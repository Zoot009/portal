import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST /api/warnings/[id]/mark-read - Mark warning as read by employee
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const warningId = parseInt(id);

    // Create date in IST timezone
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istDate = new Date(now.getTime() + istOffset);

    const warning = await prisma.warning.update({
      where: { id: warningId },
      data: {
        viewedByEmployee: true,
        viewedAt: istDate,
      },
    })

    return NextResponse.json({
      success: true,
      data: warning,
      message: 'Warning marked as read',
    })
  } catch (error: any) {
    console.error('Error marking warning as read:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to mark warning as read',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
