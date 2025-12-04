import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedGamificationData() {
  console.log('🎮 Seeding gamification data...')

  // Create achievements
  const achievements = [
    {
      name: 'Perfect Week',
      description: 'Maintain 100% attendance for a full week',
      badgeIcon: '📅',
      badgeColor: '#10B981',
      pointValue: 100,
      category: 'ATTENDANCE',
      requirements: {
        type: 'attendance_streak',
        target: 7,
        condition: 'consecutive_days'
      }
    },
    {
      name: 'Perfect Month',
      description: 'Maintain 100% attendance for a full month',
      badgeIcon: '🏆',
      badgeColor: '#F59E0B',
      pointValue: 50,
      category: 'ATTENDANCE' as const,
      requirements: {
        type: 'attendance_streak',
        target: 30,
        condition: 'consecutive_days'
      }
    },
    {
      name: 'Early Bird',
      description: 'Check in before 9:30 AM for 5 consecutive days',
      badgeIcon: '🌅',
      badgeColor: '#3B82F6',
      pointValue: 75,
      category: 'ATTENDANCE',
      requirements: {
        type: 'early_checkin',
        target: 5,
        time: '09:30'
      }
    },
    {
      name: 'Work Logger',
      description: 'Submit work logs for 5 consecutive days',
      badgeIcon: '📝',
      badgeColor: '#8B5CF6',
      pointValue: 80,
      category: 'PRODUCTIVITY' as const,
      requirements: {
        type: 'work_log_streak',
        target: 5,
        condition: 'consecutive_days'
      }
    },
    {
      name: 'Points Collector',
      description: 'Earn your first 500 points',
      badgeIcon: '⭐',
      badgeColor: '#EF4444',
      pointValue: 150,
      category: 'MILESTONE' as const,
      requirements: {
        type: 'total_points',
        target: 500
      }
    },
    {
      name: 'Consistency Champion',
      description: 'Submit work logs on time for 2 weeks',
      badgeIcon: '🎯',
      badgeColor: '#06B6D4',
      pointValue: 150,
      category: 'PRODUCTIVITY',
      requirements: {
        type: 'timely_submission',
        target: 14,
        deadline: '18:00'
      }
    },
    {
      name: 'Overtime Hero',
      description: 'Work 10 hours of overtime in a month',
      badgeIcon: '💪',
      badgeColor: '#F97316',
      pointValue: 200,
      category: 'PRODUCTIVITY',
      requirements: {
        type: 'overtime_hours',
        target: 10,
        period: 'monthly'
      }
    },
    {
      name: 'Team Player',
      description: 'Help resolve 3 team issues',
      badgeIcon: '🤝',
      badgeColor: '#84CC16',
      pointValue: 120,
      category: 'TEAMWORK',
      requirements: {
        type: 'team_issues_resolved',
        target: 3
      }
    }
  ]

  for (const achievement of achievements) {
    const existing = await prisma.achievement.findFirst({
      where: { name: achievement.name }
    })
    
    if (!existing) {
      await prisma.achievement.create({
        data: achievement
      })
    }
  }

  // Create rewards
  const rewards = [
    {
      name: 'Coffee Voucher',
      description: '₹200 coffee shop voucher',
      cost: 150,
      category: 'VOUCHER' as const,
      stock: 50,
      imageUrl: null
    },
    {
      name: 'Half Day Leave',
      description: 'Extra half day leave credit',
      cost: 300,
      category: 'TIME_OFF' as const,
      stock: 20,
      imageUrl: null
    },
    {
      name: 'Lunch Treat',
      description: '₹500 restaurant voucher',
      cost: 400,
      category: 'VOUCHER' as const,
      stock: 30,
      imageUrl: null
    },
    {
      name: 'Tech Gadget',
      description: 'Bluetooth earbuds or tech accessories',
      cost: 800,
      category: 'PHYSICAL' as const,
      stock: 10,
      imageUrl: null
    },
    {
      name: 'Full Day Leave',
      description: 'Extra full day leave credit',
      cost: 600,
      category: 'TIME_OFF' as const,
      stock: 15,
      imageUrl: null
    },
    {
      name: 'Shopping Voucher',
      description: '₹1000 shopping voucher',
      cost: 750,
      category: 'VOUCHER' as const,
      stock: 25,
      imageUrl: null
    },
    {
      name: 'Team Outing',
      description: 'Team lunch or entertainment',
      cost: 1200,
      category: 'EXPERIENCE' as const,
      stock: 5,
      imageUrl: null
    },
    {
      name: 'Work From Home',
      description: '3 days work from home privilege',
      cost: 500,
      category: 'TIME_OFF' as const,
      stock: 20,
      imageUrl: null
    }
  ]

  for (const reward of rewards) {
    const existing = await prisma.reward.findFirst({
      where: { name: reward.name }
    })
    
    if (!existing) {
      await prisma.reward.create({
        data: reward
      })
    }
  }

  console.log('✅ Gamification data seeded successfully!')
  console.log(`   - ${achievements.length} achievements created`)
  console.log(`   - ${rewards.length} rewards created`)
}

async function main() {
  try {
    await seedGamificationData()
  } catch (error) {
    console.error('❌ Error seeding data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

export { seedGamificationData }