import { test, expect, type Page } from '@playwright/test'

// ── API helpers ────────────────────────────────────────────────────────────

type Competition = { id: string; field: Array<{ id: string }> }

async function signIn(page: Page) {
  await page.goto('/auth/signin')
  await page.fill('#email', 'admin@example.com')
  await page.fill('#password', 'admin')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/admin')
}

async function apiCreate(page: Page): Promise<Competition> {
  const res = await page.request.post('/api/competitions', {
    data: {
      name: 'Masters 2026',
      field: [
        { name: 'Tiger Woods', odds: 50 },
        { name: 'Rory McIlroy', odds: 50 },
        { name: 'Jon Rahm', odds: 50 },
      ],
    },
  })
  return res.json()
}

async function apiAdvance(page: Page, id: string) {
  await page.request.patch(`/api/competitions/${id}`, {
    data: { action: 'advance' },
  })
}

async function apiSubmitPick(page: Page, id: string, golferIds: string[]) {
  await page.request.post(`/api/competitions/${id}/picks`, {
    data: { participantName: 'Alice', golferIds },
  })
}

async function apiEnterScores(page: Page, id: string, scores: Record<string, string>) {
  await page.request.patch(`/api/competitions/${id}/golfers`, {
    data: { scores },
  })
}

async function apiSetCutline(page: Page, id: string, cutLine: number) {
  await page.request.patch(`/api/competitions/${id}`, {
    data: { action: 'setCutLine', cutLine },
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────

test('create draft competition', async ({ page }) => {
  await signIn(page)
  await page.goto('/admin/competitions/new')
  await page.fill('#comp-name', 'Masters 2026')

  await page.locator('.golfer-input-name').nth(0).fill('Tiger Woods')
  await page.locator('.golfer-input-odds').nth(0).fill('50')

  await page.click('.btn-add-golfer')
  await page.locator('.golfer-input-name').nth(1).fill('Rory McIlroy')
  await page.locator('.golfer-input-odds').nth(1).fill('50')

  await page.click('.btn-add-golfer')
  await page.locator('.golfer-input-name').nth(2).fill('Jon Rahm')
  await page.locator('.golfer-input-odds').nth(2).fill('50')

  await page.click('button[type="submit"]')

  await expect(page).toHaveURL(/\/admin\/competitions\/(?!new)[^/]+$/)
  await expect(page.locator('.status-badge')).toHaveText('Draft')
})

test('advance to open for picks', async ({ page }) => {
  await signIn(page)
  const { id } = await apiCreate(page)

  await page.goto(`/admin/competitions/${id}`)
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: /Open for Picks/ }).click()

  await expect(page.locator('.status-badge')).toHaveText('Open for Picks')
})

test('participant submits picks', async ({ page }) => {
  await signIn(page)
  const { id } = await apiCreate(page)
  await apiAdvance(page, id) // draft → open

  await page.goto(`/picks/${id}`)
  await page.fill('#participant-name', 'Alice')
  await page.locator('.pick-option', { hasText: 'Tiger Woods' }).click()
  await page.locator('.pick-option', { hasText: 'Rory McIlroy' }).click()
  await page.locator('.pick-option', { hasText: 'Jon Rahm' }).click()
  await page.getByRole('button', { name: 'Submit Picks' }).click()

  await expect(page.getByText('Submitted from this browser')).toBeVisible()
})

test('advance to live and enter scores', async ({ page }) => {
  await signIn(page)
  const { id } = await apiCreate(page)
  await apiAdvance(page, id) // draft → open

  await page.goto(`/admin/competitions/${id}`)
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: /Go Live/ }).click()

  await expect(page.locator('.status-badge')).toHaveText('Live')

  await page.locator('tr', { hasText: 'Tiger Woods' }).locator('.score-input').fill('5')
  await page.locator('tr', { hasText: 'Rory McIlroy' }).locator('.score-input').fill('3')
  await page.locator('tr', { hasText: 'Jon Rahm' }).locator('.score-input').fill('4')
  await page.click('button:has-text("Save Scores")')
  await expect(page.getByText('Scores saved.')).toBeVisible()
})

test('set cutline — one golfer cut, one in', async ({ page }) => {
  await signIn(page)
  const { id, field } = await apiCreate(page)
  const golferIds = field.map((g) => g.id)
  await apiAdvance(page, id) // draft → open
  await apiAdvance(page, id) // open → live
  // Tiger: 5, Rory: 3, Jon: 4 — cutline 4 cuts Tiger (5 > 4), Rory stays in (3 ≤ 4)
  await apiEnterScores(page, id, { [golferIds[0]]: '5', [golferIds[1]]: '3', [golferIds[2]]: '4' })

  await page.goto(`/admin/competitions/${id}`)
  const cutlineInput = page.locator('form', {
    has: page.getByRole('button', { name: 'Set Cut Line' }),
  }).locator('input')
  await cutlineInput.fill('4')
  await page.click('button:has-text("Set Cut Line")')
  await expect(page.getByText('Cut line saved.')).toBeVisible()

  await expect(page.locator('tr', { hasText: 'Tiger Woods' }).getByText('✕ Cut')).toBeVisible()
  await expect(page.locator('tr', { hasText: 'Rory McIlroy' }).getByText('✓ In')).toBeVisible()
})

test('advance to complete and verify winner', async ({ page }) => {
  await signIn(page)
  const { id, field } = await apiCreate(page)
  const golferIds = field.map((g) => g.id)
  await apiAdvance(page, id) // draft → open
  await apiSubmitPick(page, id, golferIds)
  await apiAdvance(page, id) // open → live
  await apiEnterScores(page, id, Object.fromEntries(golferIds.map((gid, i) => [gid, ['5', '3', '4'][i]])))
  await apiSetCutline(page, id, 6)

  await page.goto(`/admin/competitions/${id}`)
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: /Mark Complete/ }).click()

  await expect(page.locator('.status-badge')).toHaveText('Complete')
  await expect(page.getByText('Winner')).toBeVisible()
})
