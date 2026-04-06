import fs from 'fs'
import path from 'path'
const DATA_DIR = path.join(process.cwd(), 'data')

export interface User {
  id: string
  email: string
  passwordHash: string
  role: 'admin'
  createdAt: string
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function ensureUsersFile() {
  ensureDataDir()
  const filePath = path.join(DATA_DIR, 'users.json')
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2))
  }
}

// Simple per-file mutex using a promise chain
const locks = new Map<string, Promise<void>>()

async function withLock<T>(file: string, fn: () => T): Promise<T> {
  const prev = locks.get(file) ?? Promise.resolve()
  let resolve!: () => void
  const next = new Promise<void>((r) => (resolve = r))
  locks.set(file, prev.then(() => next))
  await prev
  try {
    return fn()
  } finally {
    resolve()
  }
}

export async function readUsers(): Promise<User[]> {
  ensureUsersFile()
  return withLock('users', () => {
    const data = fs.readFileSync(path.join(DATA_DIR, 'users.json'), 'utf-8')
    return JSON.parse(data) as User[]
  })
}

export async function writeUsers(users: User[]): Promise<void> {
  ensureUsersFile()
  return withLock('users', () => {
    fs.writeFileSync(path.join(DATA_DIR, 'users.json'), JSON.stringify(users, null, 2))
  })
}

// ── Competitions ──────────────────────────────────────────────────────────────

export interface Golfer {
  id: string
  name: string
  odds: number
  strokeScore?: number
}

export interface Pick {
  id: string
  participantName: string
  golferIds: string[]
  submittedAt: string
}

export interface Competition {
  id: string
  name: string
  status: 'draft' | 'open' | 'live' | 'complete'
  field: Golfer[]
  picks: Pick[]
  cutLine?: number
  createdAt: string
}

function ensureCompetitionsFile() {
  ensureDataDir()
  const filePath = path.join(DATA_DIR, 'competitions.json')
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2))
  }
}

export async function readCompetitions(): Promise<Competition[]> {
  ensureCompetitionsFile()
  return withLock('competitions', () => {
    const data = fs.readFileSync(path.join(DATA_DIR, 'competitions.json'), 'utf-8')
    return JSON.parse(data) as Competition[]
  })
}

export async function writeCompetitions(competitions: Competition[]): Promise<void> {
  ensureCompetitionsFile()
  return withLock('competitions', () => {
    fs.writeFileSync(path.join(DATA_DIR, 'competitions.json'), JSON.stringify(competitions, null, 2))
  })
}
