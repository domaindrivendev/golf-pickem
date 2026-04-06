import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const ADMIN_EMAIL = 'richie.morris@hotmail.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin'

async function main() {
  const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10)

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'admin',
    },
    update: { passwordHash },
  })

  console.log(`Seeded admin user: ${ADMIN_EMAIL}`)

  if (ADMIN_PASSWORD === 'admin') {
    console.log(`⚠  Using default password "admin" — set ADMIN_PASSWORD in .env.local to change it`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
