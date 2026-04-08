import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

export default async function globalSetup() {
  const prisma = new PrismaClient()
  try {
    const passwordHash = await bcrypt.hash('admin', 10)
    await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: { passwordHash },
      create: { email: 'admin@example.com', passwordHash, role: 'admin' },
    })
  } finally {
    await prisma.$disconnect()
  }
}
