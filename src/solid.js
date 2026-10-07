import {
  getDefaultSession,
  handleIncomingRedirect,
} from '@inrupt/solid-client-authn-browser'

export const session = getDefaultSession()

// Plain session.fetch lets the browser's HTTP cache serve a stale
// container listing after a create/update/delete (observed as "new items
// only show up after restarting the server" - the browser was reusing a
// cached GET for the container URL instead of revalidating it). Routing
// every read/write through this wrapper forces a real network request.
//
// It also bounds every request with a timeout: fetch() never times out on
// its own, so a request that never gets a response (a large upload stuck
// behind slow disk I/O, antivirus scanning, ...) left the UI hanging
// forever - "Opslaan"/"Annuleren" stayed disabled with no error, because
// the save's promise never settled. Aborting after a while turns that
// into a normal, visible error instead.
const REQUEST_TIMEOUT_MS = 60_000

export function authFetch(url, init) {
  return session.fetch(url, {
    ...init,
    cache: 'no-store',
    signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
}

export async function restoreSession() {
  await handleIncomingRedirect({ restorePreviousSession: true })
  return session
}

export async function login(oidcIssuer) {
  await session.login({
    oidcIssuer,
    redirectUrl: window.location.href.split('#')[0].split('?')[0],
    clientName: 'Solid Pod Browser',
  })
}

export async function logout() {
  await session.logout()
}
