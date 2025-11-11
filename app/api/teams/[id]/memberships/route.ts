import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Delete all memberships for a team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const teamId = parseInt(id)

    await prisma.teamMembership.deleteMany({
      where: { teamId },
    })

    return NextResponse.json({
      success: true,
      message: 'Team memberships deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting team memberships:', error)
    return NextResponse.json(
      { error: 'Failed to delete team memberships' },
      { status: 500 }
    )
  }
}
