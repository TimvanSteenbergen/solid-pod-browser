import { useEffect, useState, useCallback } from 'react'
import { authFetch } from './solid'
import { ensurePersonRegistration, ensureImageObjectRegistration } from './typeIndex'
import { listPeople, getPerson, createPerson, updatePerson, deletePerson } from './people'
import { listImageAssets } from './imageAssets'
import PersonForm from './PersonForm'
import AuthImage from './AuthImage'

function displayName(person) {
  return person.name || [person.givenName, person.familyName].filter(Boolean).join(' ') || '(naamloos)'
}

// view: 'list' | 'create' | 'edit'
export default function PeopleManager({ webId, podRootUrl }) {
  const [containerUrl, setContainerUrl] = useState(null)
  const [setupError, setSetupError] = useState(null)
  const [people, setPeople] = useState([])
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [view, setView] = useState('list')
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSetupError(null)
    ensurePersonRegistration(webId, podRootUrl, authFetch)
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
      const [peopleList, imageContainer] = await Promise.all([
        listPeople(containerUrl, authFetch),
        ensureImageObjectRegistration(webId, podRootUrl, authFetch),
      ])
      const imageList = await listImageAssets(imageContainer.containerUrl, authFetch)
      setPeople(peopleList)
      setImages(imageList)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [containerUrl, webId, podRootUrl])

  function imageFor(url) {
    return images.find((image) => image.url === url)
  }

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleCreate(data) {
    setBusy(true)
    try {
      await createPerson(containerUrl, data, authFetch)
      setView('list')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function startEdit(url) {
    setError(null)
    try {
      const person = await getPerson(url, authFetch)
      setEditing(person)
      setView('edit')
    } catch (e) {
      setError(e.message || String(e))
    }
  }

  async function handleUpdate(data) {
    setBusy(true)
    try {
      await updatePerson(editing.url, data, authFetch)
      setView('list')
      setEditing(null)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(person) {
    const ok = window.confirm(`"${displayName(person)}" verwijderen?`)
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      await deletePerson(person.url, authFetch)
      await refresh()
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  if (setupError) {
    return <p className="error">Kon schema:Person niet registreren: {setupError}</p>
  }

  if (!containerUrl) {
    return <p>Type-index controleren...</p>
  }

  if (view === 'create') {
    return (
      <div className="resource-manager">
        <h2>Nieuwe persoon</h2>
        <PersonForm
          images={images}
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
        <h2>Persoon bewerken</h2>
        <PersonForm
          initial={editing}
          images={images}
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
          Nieuwe persoon
        </button>
        <button onClick={refresh} disabled={busy || loading}>
          Vernieuwen
        </button>
      </div>

      {error && <p className="error">Fout: {error}</p>}

      {loading ? (
        <p>Laden...</p>
      ) : people.length === 0 ? (
        <p className="muted">Nog geen personen.</p>
      ) : (
        <ul className="entries">
          {people.map((person) => (
            <li key={person.url} className="entry">
              {person.imageUrl && imageFor(person.imageUrl)?.contentUrl && (
                <AuthImage className="thumb" url={imageFor(person.imageUrl).contentUrl} alt="" />
              )}
              <div className="entry-name">
                <strong>{displayName(person)}</strong>
                {person.email && <span className="muted"> · {person.email}</span>}
                {person.telephone && <span className="muted"> · {person.telephone}</span>}
              </div>
              <div>
                <button onClick={() => startEdit(person.url)} disabled={busy}>
                  Bewerken
                </button>
                <button className="delete" onClick={() => handleDelete(person)} disabled={busy}>
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
