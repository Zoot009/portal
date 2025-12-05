const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testPunctualitySystem() {
  try {
    console.log('🧪 Testing Punctuality Achievement System...')
    
    // Check if achievement exists
    const achievement = await prisma.achievement.findUnique({
      where: { name: 'Punctuality Master' }
    })
    
    if (!achievement) {
      console.log('❌ Punctuality Master achievement not found!')
      return
    }
    
    console.log('✅ Punctuality Master achievement found:')
    console.log(`   - ID: ${achievement.id}`)
    console.log(`   - Description: ${achievement.description}`)
    console.log(`   - Points: ${achievement.pointValue}`)
    console.log(`   - Category: ${achievement.category}`)
    
    // Check recent attendance records for punctual employees
    const recentRecords = await prisma.attendanceRecord.findMany({
      where: {
        date: { gte: new Date(new Date().setDate(new Date().getDate() - 7)) },
        status: 'PRESENT',
        checkInTime: { not: null },
        checkOutTime: { not: null }
      },
      include: {
        employee: {
          select: { name: true, employeeCode: true }
        }
      },
      take: 10
    })
    
    console.log(`\n📊 Checking ${recentRecords.length} recent attendance records...`)
    
    let punctualRecords = 0
    
    for (const record of recentRecords) {
      const checkInHour = record.checkInTime.getUTCHours()
      const checkInMinute = record.checkInTime.getUTCMinutes()
      const checkOutHour = record.checkOutTime.getUTCHours()
      const checkOutMinute = record.checkOutTime.getUTCMinutes()
      
      // Check punctuality criteria (10:00-10:30 check-in, 7:00-7:30 check-out)
      const punctualCheckIn = (checkInHour === 10 && checkInMinute >= 0 && checkInMinute <= 30)
      const punctualCheckOut = (checkOutHour === 19 && checkOutMinute >= 0 && checkOutMinute <= 30)
      
      if (punctualCheckIn && punctualCheckOut) {
        punctualRecords++
        console.log(`   ⏰ PUNCTUAL: ${record.employee.name} (${record.employee.employeeCode}) on ${record.date.toDateString()}`)
        console.log(`      Check-in: ${checkInHour}:${checkInMinute.toString().padStart(2, '0')} | Check-out: ${checkOutHour}:${checkOutMinute.toString().padStart(2, '0')}`)
      }
    }
    
    console.log(`\n📈 Summary:`)
    console.log(`   - Total records checked: ${recentRecords.length}`)
    console.log(`   - Punctual records found: ${punctualRecords}`)
    console.log(`   - Punctuality rate: ${recentRecords.length > 0 ? ((punctualRecords / recentRecords.length) * 100).toFixed(1) : 0}%`)
    
    // Check existing punctuality points
    const punctualityPoints = await prisma.gamificationPoints.findMany({
      where: {
        pointType: 'PUNCTUALITY_BONUS',
        relatedType: 'punctuality_daily'
      },
      include: {
        employee: {
          select: { name: true, employeeCode: true }
        }
      },
      take: 5,
      orderBy: { earnedAt: 'desc' }
    })
    
    console.log(`\n🏆 Recent punctuality points awarded: ${punctualityPoints.length}`)
    punctualityPoints.forEach(point => {
      console.log(`   - ${point.employee.name} (${point.employee.employeeCode}): ${point.points} points - ${point.reason}`)
    })
    
    console.log('\n✅ Punctuality system test completed!')
    console.log('\n📝 How to test:')
    console.log('   1. Create attendance records with check-in between 10:00-10:30 AM')
    console.log('   2. Set check-out between 7:00-7:30 PM')
    console.log('   3. Run attendance point calculation')
    console.log('   4. Employee will receive 15 points per punctual day')
    console.log('   5. After 10 punctual days in 30 days, they unlock "Punctuality Master" achievement')
    
  } catch (error) {
    console.error('❌ Error testing punctuality system:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPunctualitySystem()