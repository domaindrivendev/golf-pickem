import { test, expect } from '@playwright/test'
import { getMagicLink, resetState } from './helpers'

const ADMIN_EMAIL = 'richie.morris@hotmail.com'

test.beforeEach(() => {
  resetState()
})

// ── Unauthenticated redirects ─────────────────────────────────────────────────

test('unauthenticated / redirects to sign-in', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL('/auth/signin')
})

test('unauthenticated /admin redirects to sign-in', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL('/auth/signin')
})

test('unauthenticated /picks redirects to sign-in', async ({ page }) => {
  await page.goto('/picks')
  await expect(page).toHaveURL('/auth/signin')
})

// ── Invalid token ─────────────────────────────────────────────────────────────

test('invalid token redirects to sign-in with error', async ({ page }) => {
  await page.goto('/auth/verify?token=notarealtoken')
  await expect(page).toHaveURL('/auth/signin?error=invalid-token')
})

// ── Admin sign-in flow ────────────────────────────────────────────────────────

test('admin can sign in and lands on /admin', async ({ page }) => {
  await page.goto('/auth/signin')
  await page.getByLabel('Email address').fill(ADMIN_EMAIL)
  await page.getByRole('button', { name: 'Send sign-in link' }).click()

  await expect(page.getByText('Check your email')).toBeVisible()

  const link = await getMagicLink(ADMIN_EMAIL)
  await page.goto(link)

  await expect(page).toHaveURL('/admin')
  await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible()
  await expect(page.getByText(ADMIN_EMAIL)).toBeVisible()
})

// ── Participant sign-in flow ──────────────────────────────────────────────────

test('new participant can sign in and lands on /picks', async ({ page }) => {
  const email = `participant-${Date.now()}@example.com`

  await page.goto('/auth/signin')
  await page.getByLabel('Email address').fill(email)
  await page.getByRole('button', { name: 'Send sign-in link' }).click()

  await expect(page.getByText('Check your email')).toBeVisible()

  const link = await getMagicLink(email)
  await page.goto(link)

  await expect(page).toHaveURL('/picks')
  await expect(page.getByRole('heading', { name: 'Submit Your Picks' })).toBeVisible()
  await expect(page.getByText(email)).toBeVisible()
})

// ── Role-based access ─────────────────────────────────────────────────────────

test('participant cannot access /admin — redirected to /picks', async ({ page }) => {
  const email = `p-${Date.now()}@example.com`

  await page.goto('/auth/signin')
  await page.getByLabel('Email address').fill(email)
  await page.getByRole('button', { name: 'Send sign-in link' }).click()
  const link = await getMagicLink(email)
  await page.goto(link)
  await expect(page).toHaveURL('/picks')

  await page.goto('/admin')
  await expect(page).toHaveURL('/picks')
})

test('admin cannot access /picks — redirected to /admin', async ({ page }) => {
  await page.goto('/auth/signin')
  await page.getByLabel('Email address').fill(ADMIN_EMAIL)
  await page.getByRole('button', { name: 'Send sign-in link' }).click()
  const link = await getMagicLink(ADMIN_EMAIL)
  await page.goto(link)
  await expect(page).toHaveURL('/admin')

  await page.goto('/picks')
  await expect(page).toHaveURL('/admin')
})

// ── Token can only be used once ───────────────────────────────────────────────

test('magic link cannot be used twice', async ({ page }) => {
  await page.goto('/auth/signin')
  await page.getByLabel('Email address').fill(ADMIN_EMAIL)
  await page.getByRole('button', { name: 'Send sign-in link' }).click()
  const link = await getMagicLink(ADMIN_EMAIL)

  await page.goto(link)
  await expect(page).toHaveURL('/admin')

  // Use a fresh browser context (no cookies) to verify the token is truly spent
  const context2 = await page.context().browser()!.newContext()
  const page2 = await context2.newPage()
  await page2.goto(link)
  await expect(page2).toHaveURL('/auth/signin?error=invalid-token')
  await context2.close()
})

// ── Sign out ──────────────────────────────────────────────────────────────────

test('signed-in user can sign out', async ({ page }) => {
  await page.goto('/auth/signin')
  await page.getByLabel('Email address').fill(ADMIN_EMAIL)
  await page.getByRole('button', { name: 'Send sign-in link' }).click()
  const link = await getMagicLink(ADMIN_EMAIL)
  await page.goto(link)
  await expect(page).toHaveURL('/admin')

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL('/auth/signin')

  // Session is gone — protected routes redirect again
  await page.goto('/admin')
  await expect(page).toHaveURL('/auth/signin')
})

// ── Authenticated sign-in page redirects ──────────────────────────────────────

test('already signed-in user visiting /auth/signin is redirected', async ({ page }) => {
  await page.goto('/auth/signin')
  await page.getByLabel('Email address').fill(ADMIN_EMAIL)
  await page.getByRole('button', { name: 'Send sign-in link' }).click()
  const link = await getMagicLink(ADMIN_EMAIL)
  await page.goto(link)
  await expect(page).toHaveURL('/admin')

  await page.goto('/auth/signin')
  await expect(page).toHaveURL('/admin')
})
