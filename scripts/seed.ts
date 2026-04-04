import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const DATA_DIR = path.join(process.cwd(), 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const ADMIN_EMAIL = 'richie.morris@hotmail.com'

interface User {
  id: string
  email: string
  role: 'admin' | 'participant'
  createdAt: string
}

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const users: User[] = fs.existsSync(USERS_FILE)
  ? JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'))
  : []

const existing = users.find((u) => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase())

if (existing) {
  console.log(`Admin user already exists: ${ADMIN_EMAIL}`)
} else {
  users.push({
    id: uuidv4(),
    email: ADMIN_EMAIL,
    role: 'admin',
    createdAt: new Date().toISOString(),
  })
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
  console.log(`Seeded admin user: ${ADMIN_EMAIL}`)
}
