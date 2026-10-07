// Shared login helper for the regression tests. Drives the full
// Solid-OIDC flow against the local Community Solid Server test pod
// (see /css-server/README.md for how that server and its seed account
// are started).
export const APP_URL = 'http://localhost:5173/'
export const TEST_ISSUER = 'http://localhost:3000/'
export const TEST_EMAIL = 'test@example.org'
export const TEST_PASSWORD = 'test1234'

// locator.isVisible() snapshots the DOM once and never waits, which races
// with async UI (the OIDC redirect chain below, a list loading after a tab
// switch, ...). waitFor() actively polls, so wrap it to get an "appeared
// within N ms, or didn't" boolean instead.
export async function appears(locator, timeout) {
  return locator
    .waitFor({ state: 'visible', timeout })
    .then(() => true)
    .catch(() => false)
}

// Waits for whichever of several locators shows up first (all polled
// concurrently for the same budget) and returns its key, or null if none
// appeared in time. Used to tell apart the different places the
// Solid-OIDC flow can land on next, instead of guessing one and timing
// out uninformatively if it guessed wrong.
async function waitForAny(entries, timeout) {
  const results = await Promise.all(
    entries.map(([key, locator]) => appears(locator, timeout).then((ok) => (ok ? key : null))),
  )
  return results.find(Boolean) ?? null
}

// Fails fast with a clear message instead of a 30s timeout buried three
// layers deep if the dev server or the local test pod isn't running.
export async function checkServersRunning() {
  const checks = [
    ['de app (npm run dev)', APP_URL],
    ['de lokale testpod (css-server)', TEST_ISSUER],
  ]
  const problems = []
  for (const [label, url] of checks) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(5000) })
    } catch (e) {
      problems.push(`- ${label} is niet bereikbaar op ${url} (${e.message})`)
    }
  }
  if (problems.length > 0) {
    throw new Error(
      `Kan niet inloggen, want:\n${problems.join('\n')}\n\n` +
        'Start eerst "npm run dev" (poort 5173) en de lokale testpod ' +
        '"npm run dev" in css-server/ (poort 3000) voordat je de regressietest draait.',
    )
  }
}

export async function login(page) {
  await checkServersRunning()
  await page.goto('/')

  // Already logged in from a previous run in this browser context.
  if (await appears(page.getByText('Ingelogd als'), 2000)) {
    return
  }

  await page.getByLabel('Identity Provider').fill(TEST_ISSUER)
  await page.getByRole('button', { name: 'Inloggen met Solid' }).click()

  // From here the flow can land on: the CSS login form, the consent
  // screen (client already remembered), straight back in the app (pod
  // session already authenticated), or an in-app error paragraph if the
  // login() call itself failed.
  const emailField = page.getByLabel('Email')
  const authorizeButton = page.getByRole('button', { name: 'Authorize' })
  const loggedInText = page.getByText('Ingelogd als')
  const errorText = page.locator('.error')

  const afterClickingLogin = await waitForAny(
    [
      ['email', emailField],
      ['authorize', authorizeButton],
      ['loggedIn', loggedInText],
      ['error', errorText],
    ],
    15000,
  )

  if (afterClickingLogin === 'error') {
    const message = await errorText.innerText().catch(() => '(onbekende fout)')
    throw new Error(
      `Inloggen via Solid-OIDC gaf een fout in de app: "${message}". ` +
        `Controleer of de lokale testpod op ${TEST_ISSUER} draait.`,
    )
  }
  if (afterClickingLogin === null) {
    throw new Error(
      'Na het klikken op "Inloggen met Solid" verscheen binnen 15s geen ' +
        'login-formulier, consent-scherm, foutmelding of de app zelf. ' +
        `Controleer of de lokale testpod op ${TEST_ISSUER} draait.`,
    )
  }

  if (afterClickingLogin === 'email') {
    await emailField.fill(TEST_EMAIL)
    await page.getByLabel('Password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Log in' }).click()

    // After submitting credentials: the consent screen, or (if this
    // client was already approved before) straight back into the app.
    const afterCredentials = await waitForAny(
      [
        ['authorize', authorizeButton],
        ['loggedIn', loggedInText],
      ],
      15000,
    )
    if (afterCredentials === 'authorize') {
      await authorizeButton.click()
    } else if (afterCredentials === null) {
      throw new Error(
        'Na het inloggen met e-mail/wachtwoord verscheen geen consent-scherm ' +
          'of de app zelf. Zijn test@example.org / test1234 nog steeds het ' +
          `seed-account op ${TEST_ISSUER}?`,
      )
    }
  } else if (afterClickingLogin === 'authorize') {
    await authorizeButton.click()
  }

  await page.getByText('Ingelogd als').waitFor({ timeout: 15000 })
}
