import { useEffect, useState } from 'react'
import { getPodUrlAll } from '@inrupt/solid-client'
import { session, authFetch, restoreSession, login, logout } from './solid'
import PodBrowser from './PodBrowser'
import PeopleManager from './PeopleManager'
import LocationsManager from './LocationsManager'
import EventsManager from './EventsManager'
import SchedulesManager from './SchedulesManager'
import GalleriesManager from './GalleriesManager'
import ImageAssetsManager from './ImageAssetsManager'
import OrganizationsManager from './OrganizationsManager'
import OrganizationRolesManager from './OrganizationRolesManager'
import EmployeeRolesManager from './EmployeeRolesManager'
import SchoolsManager from './SchoolsManager'
import CertificationsManager from './CertificationsManager'
import ProfilePhoto from './ProfilePhoto'
import { ensureImageObjectRegistration, ensureImageObjectSnapshotRegistration } from './typeIndex'
import { SCHEMA } from './vocab'
import './App.css'

const PROVIDER_PRESETS = [
  { label: 'Inrupt PodSpaces', issuer: 'https://login.inrupt.com' },
  { label: 'solidcommunity.net', issuer: 'https://solidcommunity.net' },
  { label: 'solidweb.org', issuer: 'https://solidweb.org' },
]

function App() {
  const [ready, setReady] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [webId, setWebId] = useState(null)
  const [issuer, setIssuer] = useState(PROVIDER_PRESETS[0].issuer)
  const [podUrls, setPodUrls] = useState([])
  const [selectedPod, setSelectedPod] = useState(null)
  const [loginError, setLoginError] = useState(null)
  const [podError, setPodError] = useState(null)
  const [tab, setTab] = useState('files')

  useEffect(() => {
    restoreSession().then(() => {
      setLoggedIn(session.info.isLoggedIn)
      setWebId(session.info.webId || null)
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (!loggedIn || !webId) return
    setPodError(null)
    getPodUrlAll(webId, { fetch: authFetch })
      .then((urls) => {
        setPodUrls(urls)
        setSelectedPod(urls[0] || null)
      })
      .catch((e) => setPodError(e.message || String(e)))
  }, [loggedIn, webId])

  async function handleLogin(e) {
    e.preventDefault()
    setLoginError(null)
    try {
      await login(issuer)
    } catch (e) {
      setLoginError(e.message || String(e))
    }
  }

  async function handleLogout() {
    await logout()
    setLoggedIn(false)
    setWebId(null)
    setPodUrls([])
    setSelectedPod(null)
  }

  if (!ready) {
    return (
      <div className="page">
        <p>Laden...</p>
      </div>
    )
  }

  if (!loggedIn) {
    return (
      <div className="page">
        <div className="login-card">
          <h1>Solid Pod Browser</h1>
          <p>Log in met je Solid Identity Provider om je pod te bekijken.</p>
          <form onSubmit={handleLogin}>
            <label htmlFor="issuer">Identity Provider</label>
            <input
              id="issuer"
              list="provider-presets"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="https://jouw-provider.example"
            />
            <datalist id="provider-presets">
              {PROVIDER_PRESETS.map((p) => (
                <option key={p.issuer} value={p.issuer}>
                  {p.label}
                </option>
              ))}
            </datalist>
            <button type="submit">Inloggen met Solid</button>
          </form>
          {loginError && <p className="error">Fout: {loginError}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <strong>Ingelogd als</strong>{' '}
          <a href={webId} target="_blank" rel="noreferrer">
            {webId}
          </a>
        </div>
        <div className="topbar-actions">
          {selectedPod && <ProfilePhoto webId={webId} podRootUrl={selectedPod} key={selectedPod} />}
          <button onClick={handleLogout}>Uitloggen</button>
        </div>
      </header>

      {podError && <p className="error">Kon pods niet vinden: {podError}</p>}

      {podUrls.length > 1 && (
        <div className="pod-select">
          <label htmlFor="pod">Pod:</label>
          <select
            id="pod"
            value={selectedPod || ''}
            onChange={(e) => setSelectedPod(e.target.value)}
          >
            {podUrls.map((url) => (
              <option key={url} value={url}>
                {url}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedPod ? (
        <>
          <nav className="tabs">
            <button
              className={tab === 'files' ? 'tab active' : 'tab'}
              onClick={() => setTab('files')}
            >
              Bestanden
            </button>
            <button
              className={tab === 'people' ? 'tab active' : 'tab'}
              onClick={() => setTab('people')}
            >
              Personen (schema:Person)
            </button>
            <button
              className={tab === 'locations' ? 'tab active' : 'tab'}
              onClick={() => setTab('locations')}
            >
              Locaties (schema:Place)
            </button>
            <button
              className={tab === 'events' ? 'tab active' : 'tab'}
              onClick={() => setTab('events')}
            >
              Events (schema:Event)
            </button>
            <button
              className={tab === 'schedules' ? 'tab active' : 'tab'}
              onClick={() => setTab('schedules')}
            >
              Schedules (schema:Schedule)
            </button>
            <button
              className={tab === 'galleries' ? 'tab active' : 'tab'}
              onClick={() => setTab('galleries')}
            >
              Galerijen (schema:ImageGallery)
            </button>
            <button
              className={tab === 'images' ? 'tab active' : 'tab'}
              onClick={() => setTab('images')}
            >
              Afbeeldingen (schema:ImageObject)
            </button>
            <button
              className={tab === 'snapshots' ? 'tab active' : 'tab'}
              onClick={() => setTab('snapshots')}
            >
              Snapshots (schema:ImageObjectSnapshot)
            </button>
            <button
              className={tab === 'organizations' ? 'tab active' : 'tab'}
              onClick={() => setTab('organizations')}
            >
              Organisaties (schema:Organization)
            </button>
            <button
              className={tab === 'organizationRoles' ? 'tab active' : 'tab'}
              onClick={() => setTab('organizationRoles')}
            >
              Rollen (schema:OrganizationRole)
            </button>
            <button
              className={tab === 'employeeRoles' ? 'tab active' : 'tab'}
              onClick={() => setTab('employeeRoles')}
            >
              Dienstverbanden (schema:EmployeeRole)
            </button>
            <button
              className={tab === 'schools' ? 'tab active' : 'tab'}
              onClick={() => setTab('schools')}
            >
              Scholen (schema:School)
            </button>
            <button
              className={tab === 'certifications' ? 'tab active' : 'tab'}
              onClick={() => setTab('certifications')}
            >
              Certificeringen (schema:Certification)
            </button>
          </nav>

          {tab === 'files' && <PodBrowser rootUrl={selectedPod} key={selectedPod} />}
          {tab === 'people' && (
            <PeopleManager webId={webId} podRootUrl={selectedPod} key={selectedPod} />
          )}
          {tab === 'locations' && (
            <LocationsManager webId={webId} podRootUrl={selectedPod} key={selectedPod} />
          )}
          {tab === 'events' && (
            <EventsManager webId={webId} podRootUrl={selectedPod} key={selectedPod} />
          )}
          {tab === 'schedules' && (
            <SchedulesManager webId={webId} podRootUrl={selectedPod} key={selectedPod} />
          )}
          {tab === 'galleries' && (
            <GalleriesManager webId={webId} podRootUrl={selectedPod} key={selectedPod} />
          )}
          {tab === 'images' && (
            <ImageAssetsManager
              webId={webId}
              podRootUrl={selectedPod}
              forClass={SCHEMA.ImageObject}
              ensureRegistration={ensureImageObjectRegistration}
              newLabel="Nieuwe afbeelding"
              editLabel="Afbeelding bewerken"
              emptyLabel="Nog geen afbeeldingen."
              key={selectedPod}
            />
          )}
          {tab === 'snapshots' && (
            <ImageAssetsManager
              webId={webId}
              podRootUrl={selectedPod}
              forClass={SCHEMA.ImageObjectSnapshot}
              ensureRegistration={ensureImageObjectSnapshotRegistration}
              newLabel="Nieuwe snapshot"
              editLabel="Snapshot bewerken"
              emptyLabel="Nog geen snapshots."
              parentConfig={{
                ensureRegistration: ensureImageObjectRegistration,
                label: 'Bron-afbeelding (exampleOfWork)',
              }}
              key={selectedPod}
            />
          )}
          {tab === 'organizations' && (
            <OrganizationsManager webId={webId} podRootUrl={selectedPod} key={selectedPod} />
          )}
          {tab === 'organizationRoles' && (
            <OrganizationRolesManager webId={webId} podRootUrl={selectedPod} key={selectedPod} />
          )}
          {tab === 'employeeRoles' && (
            <EmployeeRolesManager webId={webId} podRootUrl={selectedPod} key={selectedPod} />
          )}
          {tab === 'schools' && (
            <SchoolsManager webId={webId} podRootUrl={selectedPod} key={selectedPod} />
          )}
          {tab === 'certifications' && (
            <CertificationsManager webId={webId} podRootUrl={selectedPod} key={selectedPod} />
          )}
        </>
      ) : (
        !podError && <p>Geen pod-locatie gevonden in je profiel.</p>
      )}
    </div>
  )
}

export default App
