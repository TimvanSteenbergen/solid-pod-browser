import { useEffect, useState, useCallback } from 'react'
import { authFetch } from './solid'
import {
  ensureOrganizationRegistration,
  ensurePlaceRegistration,
  ensureImageObjectRegistration,
  ensurePersonRegistration,
} from './typeIndex'
import {
  listOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from './organizations'
import { listPlaces } from './places'
import { listImageAssets } from './imageAssets'
import { listPeople } from './people'
import OrganizationForm from './OrganizationForm'

function displayName(org) {
  return org.name || '(naamloos)'
}

// view: 'list' | 'create' | 'edit'
export default function OrganizationsManager({ webId, podRootUrl }) {
  const [containerUrl, setContainerUrl] = useState(null)
  const [setupError, setSetupError] = useState(null)
  const [organizations, setOrganizations] = useState([])
  const [places, setPlaces] = useState([])
  const [images, setImages] = useState([])
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [view, setView] = useState('list')
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSetupError(null)
    ensureOrganizationRegistration(webId, podRootUrl, authFetch)
      .then(({ containerUrl: url }) => {
        if (cancelled) return
        setContainerUrl(url)
      })
      .catch((e) => !cancelled && setSetupError(e.message || String(e)))
    return () => {
      cancelled = true
    }
  }, [webId, podRootUrl])

  const refresh = useCallback(async () => {
    if (!containerUrl) return
    setLoading(true)
    setError(null)
    try {
      const [orgList, placeContainer, imageContainer, personContainer] = await Promise.all([
        listOrganizations(containerUrl, authFetch),
        ensurePlaceRegistration(webId, podRootUrl, authFetch),
        ensureImageObjectRegistration(webId, podRootUrl, authFetch),
        ensurePersonRegistration(webId, podRootUrl, authFetch),
      ])
      const [placeList, imageList, peopleList] = await Promise.all([
        listPlaces(placeContainer.containerUrl, authFetch),
        listImageAssets(imageContainer.containerUrl, authFetch),
        listPeople(personContainer.containerUrl, authFetch),
      ])
      setOrganizations(orgList)
      setPlaces(placeList)
      setImages(imageList)
      setPeople(peopleList)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [containerUrl, webId, podRootUrl])

  useEffect(() => {
    refresh()
  }, [refresh])

  function placeName(url) {
    return places.find((p) => p.url === url)?.name || url
  }

  async function handleCreate(data) {
    setBusy(true)
    try {
      await createOrganization(containerUrl, data, authFetch)
      setView('list')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function startEdit(url) {
    setError(null)
    try {
      const org = await getOrganization(url, authFetch)
      setEditing(org)
      setView('edit')
    } catch (e) {
      setError(e.message || String(e))
    }
  }

  async function handleUpdate(data) {
    setBusy(true)
    try {
      await updateOrganization(editing.url, data, authFetch)
      setView('list')
      setEditing(null)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(org) {
    const ok = window.confirm(`"${displayName(org)}" verwijderen?`)
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      await deleteOrganization(org.url, authFetch)
      await refresh()
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  if (setupError) {
    return <p className="error">Kon schema:Organization niet registreren: {setupError}</p>
  }

  if (!containerUrl) {
    return <p>Type-index controleren...</p>
  }

  if (view === 'create') {
    return (
      <div className="resource-manager">
        <h2>Nieuwe organisatie</h2>
        <OrganizationForm
          places={places}
          images={images}
          people={people}
          onSubmit={handleCreate}
          onCancel={() => setView('list')}
          busy={busy}
        />
      </div>
    )
  }

  if (view === 'edit' && editing) {
    return (
      <div className="resource-manager">
        <h2>Organisatie bewerken</h2>
        <OrganizationForm
          initial={editing}
          places={places}
          images={images}
          people={people}
          onSubmit={handleUpdate}
          onCancel={() => {
            setView('list')
            setEditing(null)
          }}
          busy={busy}
        />
      </div>
    )
  }

  return (
    <div className="resource-manager">
      <div className="toolbar">
        <button onClick={() => setView('create')} disabled={busy}>
          Nieuwe organisatie
        </button>
        <button onClick={refresh} disabled={busy || loading}>
          Vernieuwen
        </button>
      </div>

      {error && <p className="error">Fout: {error}</p>}

      {loading ? (
        <p>Laden...</p>
      ) : organizations.length === 0 ? (
        <p className="muted">Nog geen organisaties.</p>
      ) : (
        <ul className="entries">
          {organizations.map((org) => (
            <li key={org.url} className="entry">
              <div className="entry-name">
                <strong>{displayName(org)}</strong>
                {org.email && <span className="muted"> · {org.email}</span>}
                {org.locationUrl && <span className="muted"> · {placeName(org.locationUrl)}</span>}
                {org.memberUrls.length > 0 && (
                  <span className="muted">
                    {' '}
                    · {org.memberUrls.length} {org.memberUrls.length === 1 ? 'lid' : 'leden'}
                  </span>
                )}
              </div>
              <div>
                <button onClick={() => startEdit(org.url)} disabled={busy}>
                  Bewerken
                </button>
                <button className="delete" onClick={() => handleDelete(org)} disabled={busy}>
                  Verwijderen
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
