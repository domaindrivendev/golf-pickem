import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const [ADMIN_EMAIL, ADMIN_PASSWORD] = process.argv.slice(2)

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('Usage: seed.ts <email> <password>')
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
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
