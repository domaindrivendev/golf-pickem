require('dotenv').config()
const { execSync } = require('child_process')
execSync('npx prisma migrate deploy', {
  env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
  stdio: 'inherit',
})
