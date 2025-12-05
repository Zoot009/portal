const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function setupPunctualityAchievement() {
  try {
    console.log('Setting up Punctuality Master achievement...')
    
    // Check if achievement already exists
    const existingAchievement = await prisma.achievement.findUnique({
      where: { name: 'Punctuality Master' }
    })
    
    if (existingAchievement) {
      console.log('✅ Punctuality Master achievement already exists!')
      console.log('Achievement details:', {
        id: existingAchievement.id,
        name: existingAchievement.name,
        description: existingAchievement.description,
        pointValue: existingAchievement.pointValue
      })
      return existingAchievement
    }
    
    // Create new achievement
    const achievement = await prisma.achievement.create({
      data: {
        name: 'Punctuality Master',
        description: 'Be punctual for 10 days in a month. Check-in between 10:00-10:30 AM and check-out between 7:00-7:30 PM.',
        badgeIcon: '⏰',
        badgeColor: '#10b981', // Green color
        pointValue: 50, // Bonus points for completing achievement
        category: 'ATTENDANCE',
        requirements: {
          type: 'punctuality',
          targetDays: 10,
          period: 'monthly',
          checkInWindow: { start: '10:00', end: '10:30' },
          checkOutWindow: { start: '19:00', end: '19:30' }
        }
      }
    })
    
    console.log('✅ Punctuality Master achievement created successfully!')
    console.log('Achievement details:', {
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      pointValue: achievement.pointValue,
      category: achievement.category
    })
    
    return achievement
    
  } catch (error) {
    console.error('❌ Failed to setup punctuality achievement:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

setupPunctualityAchievement()