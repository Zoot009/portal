// import { PrismaClient } from "@prisma/client"

// const prisma = new PrismaClient()

export async function halfBreaksForEmployee(): Promise<void> {
  // Under development
}

/*
// export async function halfBreaksForEmployee(employeeId: number): Promise<void> {
//     try {
//         const records = await prisma.break.findMany({
//             where: { 
//                 employeeId,
//                 breakInTime: { not: null },
//                 breakOutTime: { not: null }
//             }
//         })

        if (records.length === 0) {
            console.log(`No complete breaks found for employee ${employeeId}`)
            return
        }

        const updates = records.map(record => {
            const start = new Date(record.breakInTime!).getTime()
            const end = new Date(record.breakOutTime!).getTime()
            const originalDuration = end - start
            const halfDuration = Math.floor(originalDuration / 2)
            const newEndTime = new Date(start + halfDuration)

            return prisma.break.update({
                where: { id: record.id },
                data: {
                    breakOutTime: newEndTime,
                    breakDuration: Math.floor(halfDuration / 60000), // Convert to minutes
                }
            })
        })

        await Promise.all(updates)
        console.log(`Updated ${records.length} breaks for employee ${employeeId}`)

    } catch (error) {
        console.error('Error updating breaks:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

// halfBreaksForEmployee(0).catch((e) => {
//     console.error(e)
//     process.exit(1)
// })
*/