import { v4 as uuidv4 } from 'uuid'
import { readUsers, writeUsers, type User } from './storage'

export async function findUserByEmail(email: string): Promise<User | null> {
  const users = await readUsers()
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null
}

export async function findUserById(id: string): Promise<User | null> {
  const users = await readUsers()
  return users.find((u) => u.id === id) ?? null
}

export async function findOrCreateUser(email: string): Promise<User> {
  const existing = await findUserByEmail(email)
  if (existing) return existing

  const users = await readUsers()
  const newUser: User = {
    id: uuidv4(),
    email: email.toLowerCase(),
    role: 'participant',
    createdAt: new Date().toISOString(),
  }
  users.push(newUser)
  await writeUsers(users)
  return newUser
}
