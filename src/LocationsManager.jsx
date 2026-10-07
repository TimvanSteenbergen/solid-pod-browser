import { useEffect, useState, useCallback } from 'react'
import { authFetch } from './solid'
import { ensurePlaceRegistration } from './typeIndex'
import { listPlaces, getPlace, createPlace, updatePlace, deletePlace } from './places'
import LocationForm from './LocationForm'

function displayName(place) {
  return place.name || '(naamloos)'
}

function displaySummary(place) {
  const parts = [place.addressLocality, place.addressCountry].filter(Boolean)
  return parts.join(', ')
}

// view: 'list' | 'create' | 'edit'
export default function LocationsManager({ webId, podRootUrl }) {
  const [containerUrl, setContainerUrl] = useState(null)
  const [setupError, setSetupError] = useState(null)
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [view, setView] = useState('list')
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSetupError(null)
    ensurePlaceRegistration(webId, podRootUrl, authFetch)
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
      setPlaces(await listPlaces(containerUrl, authFetch))
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [containerUrl])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleCreate(data) {
    setBusy(true)
    try {
      await createPlace(containerUrl, data, authFetch)
      setView('list')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function startEdit(url) {
    setError(null)
    try {
      const place = await getPlace(url, authFetch)
      setEditing(place)
      setView('edit')
    } catch (e) {
      setError(e.message || String(e))
    }
  }

  async function handleUpdate(data) {
    setBusy(true)
    try {
      await updatePlace(editing.url, data, authFetch)
      setView('list')
      setEditing(null)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(place) {
    const ok = window.confirm(`"${displayName(place)}" verwijderen?`)
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      await deletePlace(place.url, authFetch)
      await refresh()
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  if (setupError) {
    return <p className="error">Kon schema:Place niet registreren: {setupError}</p>
  }

  if (!containerUrl) {
    return <p>Type-index controleren...</p>
  }

  if (view === 'create') {
    return (
      <div className="resource-manager">
        <h2>Nieuwe locatie</h2>
        <LocationForm onSubmit={handleCreate} onCancel={() => setView('list')} busy={busy} />
      </div>
    )
  }

  if (view === 'edit' && editing) {
    return (
      <div className="resource-manager">
        <h2>Locatie bewerken</h2>
        <LocationForm
          initial={editing}
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
          Nieuwe locatie
        </button>
        <button onClick={refresh} disabled={busy || loading}>
          Vernieuwen
        </button>
      </div>

      {error && <p className="error">Fout: {error}</p>}

      {loading ? (
        <p>Laden...</p>
      ) : places.length === 0 ? (
        <p className="muted">Nog geen locaties.</p>
      ) : (
        <ul className="entries">
          {places.map((place) => (
            <li key={place.url} className="entry">
              <div className="entry-name">
                <strong>{displayName(place)}</strong>
                {displaySummary(place) && <span className="muted"> · {displaySummary(place)}</span>}
              </div>
              <div>
                <button onClick={() => startEdit(place.url)} disabled={busy}>
                  Bewerken
                </button>
                <button className="delete" onClick={() => handleDelete(place)} disabled={busy}>
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
