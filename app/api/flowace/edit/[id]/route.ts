import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      loggedHours,
      activeHours,
      productiveHours,
      idleHours,
      activityPercentage,
      productivityPercentage,
      editReason
    } = body

    // Update the record
    const updatedRecord = await prisma.flowaceRecord.update({
      where: { id },
      data: {
        loggedHours: loggedHours ?? undefined,
        activeHours: activeHours ?? undefined,
        productiveHours: productiveHours ?? undefined,
        idleHours: idleHours ?? undefined,
        activityPercentage: activityPercentage ?? undefined,
        productivityPercentage: productivityPercentage ?? undefined,
        // You might want to add an editHistory field to track changes
        // For now, we'll just update the values
      },
      include: {
        employee: {
          select: {
            name: true,
            employeeCode: true
          }
        }
      }
    })

    // Optional: Log the edit for audit trail
    console.log(`Flowace record ${id} edited by user ${userId}. Reason: ${editReason}`)

    return NextResponse.json({
      success: true,
      record: updatedRecord
    })
  } catch (error: any) {
    console.error('Error updating Flowace record:', error)
    return NextResponse.json(
      { error: 'Failed to update record', details: error.message },
      { status: 500 }
    )
  }
}
