import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prisma: PrismaClient

if (process.env.DATABASE_URL) {
  const connectionString = process.env.DATABASE_URL
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  
  prisma = globalForPrisma.prisma ?? new PrismaClient({ 
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
} else {
  throw new Error('DATABASE_URL environment variable is required')
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export { prisma }