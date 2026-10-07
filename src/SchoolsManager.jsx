import { useEffect, useState, useCallback } from 'react'
import { authFetch } from './solid'
import {
  ensureSchoolRegistration,
  ensurePlaceRegistration,
  ensureImageObjectRegistration,
  ensurePersonRegistration,
} from './typeIndex'
import { listSchools, getSchool, createSchool, updateSchool, deleteSchool } from './schools'
import { listPlaces } from './places'
import { listImageAssets } from './imageAssets'
import { listPeople } from './people'
import SchoolForm from './SchoolForm'

function displayName(school) {
  return school.name || '(naamloos)'
}

// view: 'list' | 'create' | 'edit'
export default function SchoolsManager({ webId, podRootUrl }) {
  const [containerUrl, setContainerUrl] = useState(null)
  const [setupError, setSetupError] = useState(null)
  const [schools, setSchools] = useState([])
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
    ensureSchoolRegistration(webId, podRootUrl, authFetch)
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
      const [schoolList, placeContainer, imageContainer, personContainer] = await Promise.all([
        listSchools(containerUrl, authFetch),
        ensurePlaceRegistration(webId, podRootUrl, authFetch),
        ensureImageObjectRegistration(webId, podRootUrl, authFetch),
        ensurePersonRegistration(webId, podRootUrl, authFetch),
      ])
      const [placeList, imageList, peopleList] = await Promise.all([
        listPlaces(placeContainer.containerUrl, authFetch),
        listImageAssets(imageContainer.containerUrl, authFetch),
        listPeople(personContainer.containerUrl, authFetch),
      ])
      setSchools(schoolList)
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
      await createSchool(containerUrl, data, authFetch)
      setView('list')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function startEdit(url) {
    setError(null)
    try {
      const school = await getSchool(url, authFetch)
      setEditing(school)
      setView('edit')
    } catch (e) {
      setError(e.message || String(e))
    }
  }

  async function handleUpdate(data) {
    setBusy(true)
    try {
      await updateSchool(editing.url, data, authFetch)
      setView('list')
      setEditing(null)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(school) {
    const ok = window.confirm(`"${displayName(school)}" verwijderen?`)
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      await deleteSchool(school.url, authFetch)
      await refresh()
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  if (setupError) {
    return <p className="error">Kon schema:School niet registreren: {setupError}</p>
  }

  if (!containerUrl) {
    return <p>Type-index controleren...</p>
  }

  if (view === 'create') {
    return (
      <div className="resource-manager">
        <h2>Nieuwe school</h2>
        <SchoolForm
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
        <h2>School bewerken</h2>
        <SchoolForm
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
          Nieuwe school
        </button>
        <button onClick={refresh} disabled={busy || loading}>
          Vernieuwen
        </button>
      </div>

      {error && <p className="error">Fout: {error}</p>}

      {loading ? (
        <p>Laden...</p>
      ) : schools.length === 0 ? (
        <p className="muted">Nog geen scholen.</p>
      ) : (
        <ul className="entries">
          {schools.map((school) => (
            <li key={school.url} className="entry">
              <div className="entry-name">
                <strong>{displayName(school)}</strong>
                {school.educationalLevel && (
                  <span className="muted"> · {school.educationalLevel}</span>
                )}
                {school.locationUrl && <span className="muted"> · {placeName(school.locationUrl)}</span>}
                {school.alumniUrls.length > 0 && (
                  <span className="muted"> · {school.alumniUrls.length} alumni</span>
                )}
              </div>
              <div>
                <button onClick={() => startEdit(school.url)} disabled={busy}>
                  Bewerken
                </button>
                <button className="delete" onClick={() => handleDelete(school)} disabled={busy}>
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
