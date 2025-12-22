import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/penalties/[id]/mark-read - Mark penalty as read by employee
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const penaltyId = parseInt(id);

    // Create date in IST timezone
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istDate = new Date(now.getTime() + istOffset);

    const penalty = await prisma.penalty.update({
      where: { id: penaltyId },
      data: {
        viewedByEmployee: true,
        viewedAt: istDate,
      },
    })

    return NextResponse.json({
      success: true,
      data: penalty,
      message: 'Penalty marked as read',
    })
  } catch (error: any) {
    console.error('Error marking penalty as read:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to mark penalty as read',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
