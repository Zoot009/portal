import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create or update admin user zoot1086
  const admin = await prisma.employee.upsert({
    where: { employeeCode: 'zoot1086' },
    update: {
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      employeeCode: 'zoot1086',
      name: 'Admin User',
      email: 'admin@zootdigital.com',
      role: UserRole.ADMIN,
      department: 'Administration',
      designation: 'System Administrator',
      isActive: true,
      fullName: 'Admin User',
    },
  })

  console.log('✅ Admin user created/updated:', admin.employeeCode)

  // Optionally create a few test employees
  const testEmployees = [
    {
      employeeCode: 'zoot1087',
      name: 'Test Employee',
      email: 'employee@zootdigital.com',
      role: UserRole.EMPLOYEE,
      department: 'Development',
      designation: 'Software Developer',
    },
    {
      employeeCode: 'zoot1088',
      name: 'Jane Smith',
      email: 'jane@zootdigital.com',
      role: UserRole.EMPLOYEE,
      department: 'Design',
      designation: 'UI/UX Designer',
    },
  ]

  for (const emp of testEmployees) {
    const employee = await prisma.employee.upsert({
      where: { employeeCode: emp.employeeCode },
      update: {
        role: emp.role,
        isActive: true,
      },
      create: {
        ...emp,
        isActive: true,
        fullName: emp.name,
      },
    })
    console.log('✅ Test employee created/updated:', employee.employeeCode)
  }

  // Seed Achievements
  console.log('🏆 Seeding achievements...')
  
  const achievements = [
    {
      name: 'Perfect Attendance',
      description: 'Complete 30 consecutive days of attendance without absence',
      icon: '📅',
      points: 100,
      coins: 10,
      category: 'attendance',
      criteria: { type: 'attendance_streak', threshold: 30 }
    },
    {
      name: 'Early Bird',
      description: 'Check in before 8:30 AM for 14 consecutive days',
      icon: '🌅',
      points: 75,
      coins: 8,
      category: 'attendance',
      criteria: { type: 'attendance_streak', threshold: 14, earlierThan: '08:30' }
    },
    {
      name: 'Top Performer',
      description: 'Maintain 90%+ productivity for 7 consecutive days',
      icon: '⭐',
      points: 200,
      coins: 20,
      category: 'performance',
      criteria: { type: 'productivity_streak', threshold: 7, minProductivity: 90 }
    },
    {
      name: 'Productivity Master',
      description: 'Maintain 85%+ productivity for 14 consecutive days',
      icon: '🎯',
      points: 150,
      coins: 15,
      category: 'performance',
      criteria: { type: 'productivity_streak', threshold: 14, minProductivity: 85 }
    },
    {
      name: 'Consistent Contributor',
      description: 'Submit tags for 20 consecutive days',
      icon: '📝',
      points: 100,
      coins: 10,
      category: 'attendance',
      criteria: { type: 'tags_submitted', threshold: 20 }
    },
    {
      name: 'Break Master',
      description: 'Take 30 compliant breaks (15-60 minutes)',
      icon: '☕',
      points: 50,
      coins: 5,
      category: 'attendance',
      criteria: { type: 'breaks_compliant', threshold: 30 }
    },
    {
      name: 'First 100',
      description: 'Reach 100 total points',
      icon: '💯',
      points: 25,
      coins: 5,
      category: 'milestones',
      criteria: { type: 'points', threshold: 100 }
    },
    {
      name: 'Rising Star',
      description: 'Reach 500 total points',
      icon: '🌟',
      points: 50,
      coins: 10,
      category: 'milestones',
      criteria: { type: 'points', threshold: 500 }
    },
    {
      name: 'Elite Player',
      description: 'Reach 1000 total points',
      icon: '👑',
      points: 100,
      coins: 25,
      category: 'milestones',
      criteria: { type: 'points', threshold: 1000 }
    },
    {
      name: 'Level 5 Master',
      description: 'Reach level 5',
      icon: '🏅',
      points: 75,
      coins: 10,
      category: 'milestones',
      criteria: { type: 'level', threshold: 5 }
    },
    {
      name: 'Level 10 Legend',
      description: 'Reach level 10',
      icon: '🏆',
      points: 150,
      coins: 20,
      category: 'milestones',
      criteria: { type: 'level', threshold: 10 }
    }
  ]

  for (const achievement of achievements) {
    const existing = await prisma.achievement.findFirst({
      where: { name: achievement.name }
    })
    
    if (existing) {
      await prisma.achievement.update({
        where: { id: existing.id },
        data: achievement
      })
    } else {
      await prisma.achievement.create({
        data: achievement
      })
    }
    console.log('✅ Achievement created/updated:', achievement.name)
  }

  // Seed Rewards
  console.log('🎁 Seeding rewards...')
  
  const rewards = [
    // Point-based rewards
    {
      name: 'Coffee Voucher',
      description: 'Free coffee from the office cafeteria',
      icon: '☕',
      pointsCost: 50,
      rewardType: 'points',
      category: 'perks',
      stock: 100
    },
    {
      name: 'Extra Break (30 min)',
      description: 'Get an additional 30-minute break',
      icon: '⏰',
      pointsCost: 100,
      rewardType: 'points',
      category: 'perks',
      stock: 50
    },
    {
      name: 'Team Lunch',
      description: 'Free lunch with your team',
      icon: '🍕',
      pointsCost: 200,
      rewardType: 'points',
      category: 'perks',
      stock: 20
    },
    {
      name: 'Work From Home Day',
      description: 'One day of remote work',
      icon: '🏠',
      pointsCost: 300,
      rewardType: 'points',
      category: 'perks',
      stock: 30
    },
    {
      name: 'Gift Card ₹500',
      description: 'Amazon/Flipkart gift card worth ₹500',
      icon: '�',
      pointsCost: 500,
      rewardType: 'points',
      category: 'rewards',
      stock: 10
    },
    {
      name: 'Gift Card ₹1000',
      description: 'Amazon/Flipkart gift card worth ₹1000',
      icon: '🎁',
      pointsCost: 1000,
      rewardType: 'points',
      category: 'rewards',
      stock: 5
    },
    {
      name: 'Premium Parking Spot',
      description: 'Reserved parking spot for one month',
      icon: '🅿️',
      pointsCost: 400,
      rewardType: 'points',
      category: 'perks',
      stock: 5
    },
    {
      name: 'Flexible Hours Day',
      description: 'Choose your own working hours for a day',
      icon: '🕐',
      pointsCost: 250,
      rewardType: 'points',
      category: 'perks',
      stock: 25
    },
    {
      name: 'Early Checkout (2 hours)',
      description: 'Leave 2 hours early with full attendance',
      icon: '🚪',
      pointsCost: 150,
      rewardType: 'points',
      category: 'perks',
      stock: 40
    },
    {
      name: 'Employee of the Month',
      description: 'Be featured as Employee of the Month',
      icon: '�',
      pointsCost: 1500,
      rewardType: 'points',
      category: 'rewards',
      stock: 1
    },
    // Coin-based rewards
    {
      name: 'Cash Conversion',
      description: 'Convert coins to cash (₹10 per coin, minimum 100 coins)',
      icon: '💰',
      coinsCost: 100,
      cashValue: 1000.00,
      rewardType: 'coins',
      category: 'special',
      stock: 999
    },
    {
      name: 'Paid Leave Day',
      description: 'Get one extra paid leave day',
      icon: '�️',
      coinsCost: 50,
      leaveDays: 1,
      rewardType: 'coins',
      category: 'special',
      stock: 50
    },
    {
      name: 'Remove Penalty',
      description: 'Remove one attendance penalty from your record',
      icon: '❌',
      coinsCost: 30,
      rewardType: 'coins',
      category: 'special',
      stock: 100
    },
    {
      name: 'Remove Warning',
      description: 'Remove one warning from your record',
      icon: '⚠️',
      coinsCost: 25,
      rewardType: 'coins',
      category: 'special',
      stock: 100
    },
    {
      name: 'Early Checkout Hour (Coin)',
      description: 'Leave 1 hour early with full attendance',
      icon: '⏱️',
      coinsCost: 20,
      rewardType: 'coins',
      category: 'special',
      stock: 100
    },
    {
      name: 'Flexible Hours Day (Coin)',
      description: 'Choose your own working hours for a day',
      icon: '⏰',
      coinsCost: 40,
      rewardType: 'coins',
      category: 'special',
      stock: 50
    }
  ]

  for (const reward of rewards) {
    const existing = await prisma.reward.findFirst({
      where: { name: reward.name }
    })
    
    if (existing) {
      await prisma.reward.update({
        where: { id: existing.id },
        data: reward
      })
    } else {
      await prisma.reward.create({
        data: reward
      })
    }
    console.log('✅ Reward created/updated:', reward.name)
  }

  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
