import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import type { User } from './storage'

export async function findUserByEmail(email: string): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    role: user.role as 'admin',
    createdAt: user.createdAt.toISOString(),
  }
}

export async function verifyAdminPassword(email: string, password: string): Promise<User | null> {
  const user = await findUserByEmail(email)
  if (!user) return null
  const valid = await bcrypt.compare(password, user.passwordHash)
  return valid ? user : null
}
