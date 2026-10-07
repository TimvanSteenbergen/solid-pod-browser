import { useEffect, useState, useCallback } from 'react'
import { authFetch } from './solid'
import { ensureImageGalleryRegistration, ensureImageObjectRegistration } from './typeIndex'
import { listGalleries, getGallery, createGallery, updateGallery, deleteGallery } from './galleries'
import { listImageAssets } from './imageAssets'
import GalleryForm from './GalleryForm'

function displayName(gallery) {
  return gallery.name || '(naamloos)'
}

// view: 'list' | 'create' | 'edit'
export default function GalleriesManager({ webId, podRootUrl }) {
  const [containerUrl, setContainerUrl] = useState(null)
  const [setupError, setSetupError] = useState(null)
  const [galleries, setGalleries] = useState([])
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
    ensureImageGalleryRegistration(webId, podRootUrl, authFetch)
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
      const [galleryList, imageContainer] = await Promise.all([
        listGalleries(containerUrl, authFetch),
        ensureImageObjectRegistration(webId, podRootUrl, authFetch),
      ])
      const imageList = await listImageAssets(imageContainer.containerUrl, authFetch)
      setGalleries(galleryList)
      setImages(imageList)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [containerUrl, webId, podRootUrl])

  useEffect(() => {
    refresh()
  }, [refresh])

  function imageSummary(gallery) {
    return `${gallery.imageUrls.length} afbeelding${gallery.imageUrls.length === 1 ? '' : 'en'}`
  }

  async function handleCreate(data) {
    setBusy(true)
    try {
      await createGallery(containerUrl, data, authFetch)
      setView('list')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function startEdit(url) {
    setError(null)
    try {
      const gallery = await getGallery(url, authFetch)
      setEditing(gallery)
      setView('edit')
    } catch (e) {
      setError(e.message || String(e))
    }
  }

  async function handleUpdate(data) {
    setBusy(true)
    try {
      await updateGallery(editing.url, data, authFetch)
      setView('list')
      setEditing(null)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(gallery) {
    const ok = window.confirm(`"${displayName(gallery)}" verwijderen?`)
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      await deleteGallery(gallery.url, authFetch)
      await refresh()
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  if (setupError) {
    return <p className="error">Kon schema:ImageGallery niet registreren: {setupError}</p>
  }

  if (!containerUrl) {
    return <p>Type-index controleren...</p>
  }

  if (view === 'create') {
    return (
      <div className="resource-manager">
        <h2>Nieuwe galerij</h2>
        <GalleryForm imageOptions={images} onSubmit={handleCreate} onCancel={() => setView('list')} busy={busy} />
      </div>
    )
  }

  if (view === 'edit' && editing) {
    return (
      <div className="resource-manager">
        <h2>Galerij bewerken</h2>
        <GalleryForm
          initial={editing}
          imageOptions={images}
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
          Nieuwe galerij
        </button>
        <button onClick={refresh} disabled={busy || loading}>
          Vernieuwen
        </button>
      </div>

      {error && <p className="error">Fout: {error}</p>}

      {loading ? (
        <p>Laden...</p>
      ) : galleries.length === 0 ? (
        <p className="muted">Nog geen galerijen.</p>
      ) : (
        <ul className="entries">
          {galleries.map((gallery) => (
            <li key={gallery.url} className="entry">
              <div className="entry-name">
                <strong>{displayName(gallery)}</strong>
                <span className="muted"> · {imageSummary(gallery)}</span>
              </div>
              <div>
                <button onClick={() => startEdit(gallery.url)} disabled={busy}>
                  Bewerken
                </button>
                <button className="delete" onClick={() => handleDelete(gallery)} disabled={busy}>
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
