import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { login, appears } from './login.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEST_IMAGE_PATH = path.join(__dirname, 'fixtures', 'test-image.png')

const IMAGE_CAPTION = 'testprofielfoto'
const PERSON_GIVEN_NAME = 'Test'
const PERSON_FAMILY_NAME = 'vd Test'
const PERSON_EMAIL = 'test@test.org'
const PERSON_PHONE = '01324'

test.describe.serial('regressie: afbeelding + persoon met profielfoto', () => {
  test.beforeEach(async ({ page }) => {
    // Auto-accept any confirm() dialog (used by the "Verwijderen" buttons).
    page.on('dialog', (dialog) => dialog.accept())
    await login(page)
  })

  test('nieuwe afbeelding verschijnt in de lijst na opslaan', async ({ page }) => {
    await page.getByRole('button', { name: 'Afbeeldingen (schema:ImageObject)' }).click()
    await page.getByRole('button', { name: 'Nieuwe afbeelding' }).click()

    await page.getByLabel('Caption').fill(IMAGE_CAPTION)
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE_PATH)

    await page.getByRole('button', { name: 'Opslaan' }).click()

    await expect(page.getByText(IMAGE_CAPTION)).toBeVisible({ timeout: 15000 })
  })

  test('nieuwe persoon met profielfoto verschijnt in de lijst na opslaan', async ({ page }) => {
    await page.getByRole('button', { name: 'Personen (schema:Person)' }).click()
    await page.getByRole('button', { name: 'Nieuwe persoon' }).click()

    await page.getByLabel('Voornaam (givenName)').fill(PERSON_GIVEN_NAME)
    await page.getByLabel('Achternaam (familyName)').fill(PERSON_FAMILY_NAME)
    await page.getByLabel('E-mail').fill(PERSON_EMAIL)
    await page.getByLabel('Telefoon').fill(PERSON_PHONE)
    await page.getByLabel('Profielfoto (image)').selectOption({ label: IMAGE_CAPTION })

    await page.getByRole('button', { name: 'Opslaan' }).click()

    const entry = page.locator('.entry', { hasText: PERSON_FAMILY_NAME })
    await expect(entry).toBeVisible({ timeout: 15000 })
    await expect(entry).toContainText(PERSON_GIVEN_NAME)
    await expect(entry).toContainText(PERSON_EMAIL)
    await expect(entry).toContainText(PERSON_PHONE)
  })

  // Deletes every entry matching `text` (there may be more than one if an
  // earlier run's cleanup didn't run), waiting out the list's loading
  // state instead of snapshotting it too early.
  async function deleteAllEntries(page, text) {
    const entries = page.locator('.entry', { hasText: text })
    if (!(await appears(entries.first(), 10000))) return
    let count = await entries.count()
    while (count > 0) {
      await entries.first().getByRole('button', { name: 'Verwijderen' }).click()
      count -= 1
      await expect(entries).toHaveCount(count, { timeout: 10000 })
    }
  }

  test.afterAll(async ({ browser }) => {
    // Clean up the fixtures so repeated runs don't accumulate test data.
    const page = await browser.newPage()
    page.on('dialog', (dialog) => dialog.accept())
    await login(page)

    await page.getByRole('button', { name: 'Personen (schema:Person)' }).click()
    await deleteAllEntries(page, PERSON_FAMILY_NAME)

    await page.getByRole('button', { name: 'Afbeeldingen (schema:ImageObject)' }).click()
    await deleteAllEntries(page, IMAGE_CAPTION)

    await page.close()
  })
})
