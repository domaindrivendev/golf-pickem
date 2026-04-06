import bcrypt from 'bcryptjs'
import { readUsers, type User } from './storage'

export async function findUserByEmail(email: string): Promise<User | null> {
  const users = await readUsers()
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null
}

export async function verifyAdminPassword(email: string, password: string): Promise<User | null> {
  const user = await findUserByEmail(email)
  if (!user) return null
  const valid = await bcrypt.compare(password, user.passwordHash)
  return valid ? user : null
}
