import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'

// POST - Redeem coins for special rewards
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { rewardId, coinAmount, additionalData } = body

    // Get employee from Clerk ID
    const employee = await prisma.employee.findUnique({
      where: { clerkUserId: user.id },
      include: {
        employeePoints: true
      }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Get or create employee points
    let employeePoints = employee.employeePoints
    if (!employeePoints) {
      employeePoints = await prisma.employeePoints.create({
        data: {
          employeeId: employee.id,
          points: 0,
          coins: 0,
          lifetimePoints: 0,
          lifetimeCoins: 0,
          level: 1,
          experience: 0,
          rank: 'Beginner'
        }
      })
    }

    // Get reward details
    const reward = await prisma.reward.findUnique({
      where: { id: rewardId }
    })

    if (!reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 })
    }

    // Check if reward is coin-based
    if (reward.rewardType !== 'coins' && reward.rewardType !== 'both') {
      return NextResponse.json({ error: 'This reward is not available for coin redemption' }, { status: 400 })
    }

    const coinsRequired = reward.coinsCost || 0

    // Check if employee has enough coins
    if (employeePoints.coins < coinsRequired) {
      return NextResponse.json({ 
        error: 'Insufficient coins', 
        required: coinsRequired, 
        current: employeePoints.coins 
      }, { status: 400 })
    }

    // Check stock availability
    if (reward.stock !== null && reward.stock <= 0) {
      return NextResponse.json({ error: 'Reward out of stock' }, { status: 400 })
    }

    // Special validation for cash conversion (minimum 100 coins)
    if (reward.name === 'Cash Conversion' && coinAmount) {
      if (coinAmount < 100) {
        return NextResponse.json({ error: 'Minimum 100 coins required for cash conversion' }, { status: 400 })
      }
      if (employeePoints.coins < coinAmount) {
        return NextResponse.json({ 
          error: 'Insufficient coins for this amount', 
          required: coinAmount, 
          current: employeePoints.coins 
        }, { status: 400 })
      }
    }

    // Calculate final coin cost
    const finalCoinCost = coinAmount || coinsRequired

    // Create redemption record with pending approval status
    const redemption = await prisma.employeeReward.create({
      data: {
        employeeId: employee.id,
        rewardId: reward.id,
        status: 'pending'
      }
    })

    // Deduct coins
    await prisma.employeePoints.update({
      where: { id: employeePoints.id },
      data: {
        coins: { decrement: finalCoinCost }
      }
    })

    // Create coin transaction
    await prisma.coinTransaction.create({
      data: {
        employeeId: employee.id,
        coins: -finalCoinCost,
        type: 'spent',
        description: `Redeemed: ${reward.name}`,
        reference: `redemption:${redemption.id}`
      }
    })

    // Update stock if applicable
    if (reward.stock !== null) {
      await prisma.reward.update({
        where: { id: reward.id },
        data: { stock: { decrement: 1 } }
      })
    }

    return NextResponse.json({ 
      success: true, 
      redemption,
      message: 'Redemption request submitted. Pending admin approval.',
      coinsDeducted: finalCoinCost,
      remainingCoins: employeePoints.coins - finalCoinCost
    })
  } catch (error) {
    console.error('Error redeeming coins:', error)
    return NextResponse.json({ error: 'Failed to redeem coins' }, { status: 500 })
  }
}

// GET - Get all coin redemption requests (for employees to track their requests)
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const employee = await prisma.employee.findUnique({
      where: { clerkUserId: user.id }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Fetch employee's coin redemptions
    const redemptions = await prisma.employeeReward.findMany({
      where: { 
        employeeId: employee.id
      },
      include: {
        reward: true
      },
      orderBy: { redeemedAt: 'desc' }
    })

    // Filter for coin-based rewards
    const coinRedemptions = redemptions.filter(r => 
      r.reward.rewardType === 'coins' || r.reward.rewardType === 'both'
    )

    return NextResponse.json({ redemptions: coinRedemptions })
  } catch (error) {
    console.error('Error fetching coin redemptions:', error)
    return NextResponse.json({ error: 'Failed to fetch redemptions' }, { status: 500 })
  }
}
