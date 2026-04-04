import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

export default function globalSetup() {
  const dataDir = path.join(process.cwd(), 'data')
  const tmpDir = path.join(process.cwd(), 'tmp')

  // Reset data directory with seeded admin
  fs.rmSync(dataDir, { recursive: true, force: true })
  fs.mkdirSync(dataDir)

  const admin = {
    id: randomUUID(),
    email: 'richie.morris@hotmail.com',
    role: 'admin',
    createdAt: new Date().toISOString(),
  }
  fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify([admin], null, 2))
  fs.writeFileSync(path.join(dataDir, 'magic-tokens.json'), JSON.stringify([], null, 2))

  // Clear emails log
  fs.mkdirSync(tmpDir, { recursive: true })
  fs.writeFileSync(path.join(tmpDir, 'emails.txt'), '')
}
