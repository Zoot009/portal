import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentEmployee } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const currentEmployee = await getCurrentEmployee()
    
    if (!currentEmployee) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { rewardId } = await request.json()

    if (!rewardId) {
      return NextResponse.json({ error: 'Reward ID is required' }, { status: 400 })
    }

    // Get the reward
    const reward = await prisma.reward.findUnique({
      where: { id: parseInt(rewardId) }
    })

    if (!reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 })
    }

    if (!reward.isActive) {
      return NextResponse.json({ error: 'Reward is not available' }, { status: 400 })
    }

    // Check stock
    if (reward.stock !== null && reward.stock <= 0) {
      return NextResponse.json({ error: 'Reward is out of stock' }, { status: 400 })
    }

    // Get employee's total points
    const totalPointsResult = await prisma.gamificationPoints.aggregate({
      where: { employeeId: currentEmployee.id },
      _sum: { points: true }
    })

    const totalPoints = totalPointsResult._sum.points || 0

    if (totalPoints < reward.cost) {
      return NextResponse.json({ 
        error: 'Insufficient points',
        required: reward.cost,
        available: totalPoints
      }, { status: 400 })
    }

    // Create redemption transaction
    const redemption = await prisma.$transaction(async (tx) => {
      // Create redemption record
      const redemption = await tx.rewardRedemption.create({
        data: {
          employeeId: currentEmployee.id,
          rewardId: parseInt(rewardId),
          pointsUsed: reward.cost,
          status: 'PENDING'
        }
      })

      // Deduct points from employee
      await tx.gamificationPoints.create({
        data: {
          employeeId: currentEmployee.id,
          points: -reward.cost,
          pointType: 'PENALTY',
          reason: `Redeemed: ${reward.name}`,
          relatedId: redemption.id,
          relatedType: 'reward_redemption'
        }
      })

      // Update stock if applicable
      if (reward.stock !== null) {
        await tx.reward.update({
          where: { id: reward.id },
          data: {
            stock: {
              decrement: 1
            }
          }
        })
      }

      return redemption
    })

    return NextResponse.json({
      success: true,
      data: {
        redemptionId: redemption.id,
        rewardName: reward.name,
        pointsUsed: reward.cost,
        status: redemption.status,
        message: 'Reward redeemed successfully! An admin will process your request.'
      }
    })

  } catch (error: any) {
    console.error('Error redeeming reward:', error)
    return NextResponse.json(
      { error: 'Failed to redeem reward' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentEmployee = await getCurrentEmployee()
    
    if (!currentEmployee) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get employee's redemptions
    const redemptions = await prisma.rewardRedemption.findMany({
      where: { employeeId: currentEmployee.id },
      include: {
        reward: {
          select: {
            name: true,
            description: true,
            category: true,
            imageUrl: true
          }
        }
      },
      orderBy: { redeemedAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: redemptions.map(redemption => ({
        id: redemption.id,
        rewardName: redemption.reward.name,
        rewardDescription: redemption.reward.description,
        rewardCategory: redemption.reward.category,
        rewardImageUrl: redemption.reward.imageUrl,
        pointsUsed: redemption.pointsUsed,
        status: redemption.status,
        redeemedAt: redemption.redeemedAt,
        fulfilledAt: redemption.fulfilledAt,
        notes: redemption.notes
      }))
    })

  } catch (error: any) {
    console.error('Error fetching redemptions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch redemptions' },
      { status: 500 }
    )
  }
}