import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'

const DATA_DIR = path.join(process.cwd(), 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const ADMIN_EMAIL = 'richie.morris@hotmail.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin'

interface User {
  id: string
  email: string
  passwordHash: string
  role: 'admin'
  createdAt: string
}

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const users: User[] = fs.existsSync(USERS_FILE)
  ? JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'))
  : []

const existing = users.find((u) => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase())

if (existing && existing.passwordHash) {
  console.log(`Admin user already exists: ${ADMIN_EMAIL}`)
} else {
  const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10)

  if (existing) {
    existing.passwordHash = passwordHash
    console.log(`Updated password hash for existing admin: ${ADMIN_EMAIL}`)
  } else {
    users.push({
      id: uuidv4(),
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'admin',
      createdAt: new Date().toISOString(),
    })
    console.log(`Seeded admin user: ${ADMIN_EMAIL}`)
  }

  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))

  if (ADMIN_PASSWORD === 'admin') {
    console.log(`⚠  Using default password "admin" — set ADMIN_PASSWORD in .env.local to change it`)
  }
}
