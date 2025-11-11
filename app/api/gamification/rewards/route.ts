import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'

// GET - Fetch rewards and employee's redemptions
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const myRewards = searchParams.get('myRewards') === 'true'
    
    // Get employee from Clerk ID
    const employee = await prisma.employee.findUnique({
      where: { clerkUserId: user.id }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const isAdmin = employee.role === 'ADMIN'

    if (myRewards) {
      // Get employee's redeemed rewards
      const targetEmployeeId = employeeId && isAdmin 
        ? parseInt(employeeId) 
        : employee.id

      const employeeRewards = await prisma.employeeReward.findMany({
        where: { employeeId: targetEmployeeId },
        include: {
          reward: true
        },
        orderBy: { redeemedAt: 'desc' }
      })

      return NextResponse.json({ 
        rewards: employeeRewards.map(er => ({
          id: er.id,
          rewardName: er.reward.name,
          rewardDescription: er.reward.description,
          pointsCost: er.reward.pointsCost,
          redeemedAt: er.redeemedAt,
          status: er.status
        }))
      })
    }

    if (isAdmin && !employeeId) {
      // Admin viewing all rewards (for management)
      const rewards = await prisma.reward.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          employeeRewards: {
            select: {
              id: true,
              status: true
            }
          }
        }
      })

      const rewardsWithStats = rewards.map(reward => ({
        ...reward,
        redemptionCount: reward.employeeRewards.length,
        employeeRewards: undefined
      }))

      return NextResponse.json({ rewards: rewardsWithStats })
    }

    // Employee or admin viewing rewards catalog
    const targetEmployeeId = employeeId && isAdmin 
      ? parseInt(employeeId) 
      : employee.id

    // Get employee points to check affordability
    const employeePoints = await prisma.employeePoints.findUnique({
      where: { employeeId: targetEmployeeId }
    })

    const currentPoints = employeePoints?.points || 0

    // Get all active rewards
    const rewards = await prisma.reward.findMany({
      where: { isActive: true },
      orderBy: { pointsCost: 'asc' }
    })

    const rewardsWithAffordability = rewards.map(reward => ({
      ...reward,
      canAfford: currentPoints >= reward.pointsCost,
      currentPoints
    }))

    return NextResponse.json({ rewards: rewardsWithAffordability })
  } catch (error) {
    console.error('Error fetching rewards:', error)
    return NextResponse.json({ error: 'Failed to fetch rewards' }, { status: 500 })
  }
}

// POST - Redeem reward or create new reward (Admin)
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    
    // Check if this is a redemption request or admin creating a reward
    if (body.rewardId) {
      // Employee redeeming a reward
      const { rewardId } = body

      // Get reward
      const reward = await prisma.reward.findUnique({
        where: { id: rewardId }
      })

      if (!reward || !reward.isActive) {
        return NextResponse.json({ error: 'Reward not available' }, { status: 404 })
      }

      // Check stock
      if (reward.stock !== null && reward.stock <= 0) {
        return NextResponse.json({ error: 'Reward out of stock' }, { status: 400 })
      }

      // Get employee points
      const employeePoints = await prisma.employeePoints.findUnique({
        where: { employeeId: employee.id }
      })

      if (!employeePoints || employeePoints.points < reward.pointsCost) {
        return NextResponse.json({ error: 'Insufficient points' }, { status: 400 })
      }

      // Process redemption in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Deduct points
        await tx.employeePoints.update({
          where: { employeeId: employee.id },
          data: {
            points: { decrement: reward.pointsCost }
          }
        })

        // Create point transaction
        await tx.pointTransaction.create({
          data: {
            employeeId: employee.id,
            points: -reward.pointsCost,
            type: 'spent',
            description: `Redeemed: ${reward.name}`,
            reference: `reward:${reward.id}`
          }
        })

        // Update stock if limited
        if (reward.stock !== null) {
          await tx.reward.update({
            where: { id: rewardId },
            data: {
              stock: { decrement: 1 }
            }
          })
        }

        // Create redemption record
        const employeeReward = await tx.employeeReward.create({
          data: {
            employeeId: employee.id,
            rewardId: reward.id,
            status: 'pending'
          }
        })

        return employeeReward
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Reward redeemed successfully',
        employeeReward: result
      })
    } else {
      // Admin creating a new reward
      if (employee.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { name, description, icon, pointsCost, category, stock } = body

      if (!name || !description || !pointsCost || !category) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      const reward = await prisma.reward.create({
        data: {
          name,
          description,
          icon: icon || '🎁',
          pointsCost,
          category,
          stock: stock === '' ? null : parseInt(stock)
        }
      })

      return NextResponse.json({ success: true, reward })
    }
  } catch (error) {
    console.error('Error processing reward request:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}

// PUT - Update reward or redemption status (Admin only)
export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const employee = await prisma.employee.findUnique({
      where: { clerkUserId: user.id }
    })

    if (!employee || employee.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, type, ...updateData } = body

    if (!id || !type) {
      return NextResponse.json({ error: 'ID and type required' }, { status: 400 })
    }

    if (type === 'reward') {
      // Update reward
      const reward = await prisma.reward.update({
        where: { id },
        data: updateData
      })
      return NextResponse.json({ success: true, reward })
    } else if (type === 'redemption') {
      // Update redemption status
      const employeeReward = await prisma.employeeReward.update({
        where: { id },
        data: { status: updateData.status }
      })
      return NextResponse.json({ success: true, employeeReward })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Error updating reward:', error)
    return NextResponse.json({ error: 'Failed to update reward' }, { status: 500 })
  }
}

// DELETE - Delete reward (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const employee = await prisma.employee.findUnique({
      where: { clerkUserId: user.id }
    })

    if (!employee || employee.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Reward ID required' }, { status: 400 })
    }

    await prisma.reward.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting reward:', error)
    return NextResponse.json({ error: 'Failed to delete reward' }, { status: 500 })
  }
}
