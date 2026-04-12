import { test, expect, type Page } from '@playwright/test'

// ── API helpers ────────────────────────────────────────────────────────────

type Competition = { id: string; field: Array<{ id: string; name: string }> }

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
  await expect(res).toBeOK()
  return res.json()
}

async function apiAdvance(page: Page, id: string) {
  const res = await page.request.patch(`/api/competitions/${id}`, {
    data: { action: 'advance' },
  })
  await expect(res).toBeOK()
}

async function apiSubmitPick(page: Page, id: string, golferIds: string[]) {
  const res = await page.request.post(`/api/competitions/${id}/picks`, {
    data: { participantName: 'Alice', golferIds },
  })
  await expect(res).toBeOK()
}

async function apiSetCutline(page: Page, id: string, cutLine: number) {
  const res = await page.request.patch(`/api/competitions/${id}`, {
    data: { action: 'setCutLine', cutLine },
  })
  await expect(res).toBeOK()
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

test('advance to live', async ({ page }) => {
  await signIn(page)
  const { id } = await apiCreate(page)
  await apiAdvance(page, id) // draft → open

  await page.goto(`/admin/competitions/${id}`)
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: /Go Live/ }).click()

  await expect(page.locator('.status-badge')).toHaveText('Live')
})

test('test ESPN names shows match status', async ({ page }) => {
  await signIn(page)
  const { id, field } = await apiCreate(page)
  await apiAdvance(page, id) // draft → open
  await apiAdvance(page, id) // open → live

  await page.route(`**/api/competitions/${id}/import-scores`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tournament: 'Masters Tournament',
        golfers: [
          { id: field[0].id, name: 'Tiger Woods', score: 2, isMatched: true, espnHint: null },
          { id: field[1].id, name: 'Rory McIlroy', score: -3, isMatched: true, espnHint: null },
          { id: field[2].id, name: 'Jon Rahm', score: null, isMatched: false, espnHint: 'Jonny Rahm' },
        ],
      }),
    })
  })

  await page.goto(`/admin/competitions/${id}`)
  await page.getByRole('button', { name: 'Test ESPN Names' }).click()

  await expect(page.locator('tr', { hasText: 'Tiger Woods' }).getByText('✓ Matched')).toBeVisible()
  await expect(page.locator('tr', { hasText: 'Rory McIlroy' }).getByText('✓ Matched')).toBeVisible()
  await expect(page.locator('tr', { hasText: 'Jon Rahm' }).getByText('✗ No match')).toBeVisible()
  await expect(page.locator('tr', { hasText: 'Jon Rahm' }).getByText('ESPN: Jonny Rahm')).toBeVisible()
})

test('edit golfer name to fix ESPN mismatch', async ({ page }) => {
  await signIn(page)
  const { id, field } = await apiCreate(page)
  await apiAdvance(page, id) // draft → open
  await apiAdvance(page, id) // open → live

  // First test call returns Jon Rahm unmatched; second (after rename) returns all matched
  let callCount = 0
  await page.route(`**/api/competitions/${id}/import-scores`, async (route) => {
    callCount++
    const golfers =
      callCount === 1
        ? [
            { id: field[0].id, name: 'Tiger Woods', score: 2, isMatched: true, espnHint: null },
            { id: field[1].id, name: 'Rory McIlroy', score: -3, isMatched: true, espnHint: null },
            { id: field[2].id, name: 'Jon Rahm', score: null, isMatched: false, espnHint: 'Jonny Rahm' },
          ]
        : [
            { id: field[0].id, name: 'Tiger Woods', score: 2, isMatched: true, espnHint: null },
            { id: field[1].id, name: 'Rory McIlroy', score: -3, isMatched: true, espnHint: null },
            { id: field[2].id, name: 'Jonny Rahm', score: -1, isMatched: true, espnHint: null },
          ]
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tournament: 'Masters Tournament', golfers }),
    })
  })

  await page.goto(`/admin/competitions/${id}`)
  await page.getByRole('button', { name: 'Test ESPN Names' }).click()
  await expect(page.locator('tr', { hasText: 'Jon Rahm' }).getByText('✗ No match')).toBeVisible()

  // Click edit, update the name, save
  // Note: once editing starts the name cell becomes an input, so "Jon Rahm" text
  // disappears from the row — locate Save/input by role/type instead
  await page.getByRole('button', { name: 'Edit name' }).click()
  await page.locator('input[type="text"]').clear()
  await page.locator('input[type="text"]').fill('Jonny Rahm')
  await page.getByRole('button', { name: 'Save' }).click()

  // Re-test runs automatically — all should now be matched
  await expect(page.locator('tr', { hasText: 'Jonny Rahm' }).getByText('✓ Matched')).toBeVisible()
})

test('set cut line', async ({ page }) => {
  await signIn(page)
  const { id } = await apiCreate(page)
  await apiAdvance(page, id) // draft → open
  await apiAdvance(page, id) // open → live

  await page.goto(`/admin/competitions/${id}`)
  const cutlineInput = page.locator('form', {
    has: page.getByRole('button', { name: 'Set Cut Line' }),
  }).locator('input')
  await cutlineInput.fill('4')
  await page.click('button:has-text("Set Cut Line")')
  await expect(page.getByText('Cut line saved.')).toBeVisible()
})

test('advance to complete', async ({ page }) => {
  await signIn(page)
  const { id, field } = await apiCreate(page)
  const golferIds = field.map((g) => g.id)
  await apiAdvance(page, id) // draft → open
  await apiSubmitPick(page, id, golferIds)
  await apiAdvance(page, id) // open → live
  await apiSetCutline(page, id, 6)

  await page.goto(`/admin/competitions/${id}`)
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: /Mark Complete/ }).click()

  await expect(page.locator('.status-badge')).toHaveText('Complete')
})
