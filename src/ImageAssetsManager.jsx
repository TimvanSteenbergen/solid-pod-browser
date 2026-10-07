import { useEffect, useState, useCallback } from 'react'
import { authFetch } from './solid'
import {
  listImageAssets,
  getImageAsset,
  createImageAsset,
  updateImageAsset,
  deleteImageAsset,
} from './imageAssets'
import ImageAssetForm from './ImageAssetForm'
import AuthImage from './AuthImage'

function displayCaption(asset) {
  return asset.caption || '(zonder caption)'
}

// Shared manager for schema:ImageObject and schema:ImageObjectSnapshot -
// identical behaviour, only the RDF class, container and (for snapshots)
// the parent-image dropdown differ. view: 'list' | 'create' | 'edit'
export default function ImageAssetsManager({
  webId,
  podRootUrl,
  forClass,
  ensureRegistration,
  newLabel,
  editLabel,
  emptyLabel,
  parentConfig,
}) {
  const [containerUrl, setContainerUrl] = useState(null)
  const [setupError, setSetupError] = useState(null)
  const [assets, setAssets] = useState([])
  const [parentOptions, setParentOptions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [view, setView] = useState('list')
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSetupError(null)
    ensureRegistration(webId, podRootUrl, authFetch)
      .then(({ containerUrl: url }) => {
        if (cancelled) return
        setContainerUrl(url)
      })
      .catch((e) => !cancelled && setSetupError(e.message || String(e)))
    return () => {
      cancelled = true
    }
  }, [webId, podRootUrl, ensureRegistration])

  const refresh = useCallback(async () => {
    if (!containerUrl) return
    setLoading(true)
    setError(null)
    try {
      const tasks = [listImageAssets(containerUrl, authFetch)]
      if (parentConfig) {
        tasks.push(
          parentConfig
            .ensureRegistration(webId, podRootUrl, authFetch)
            .then(({ containerUrl: parentContainer }) =>
              listImageAssets(parentContainer, authFetch),
            ),
        )
      }
      const [assetList, parentList] = await Promise.all(tasks)
      setAssets(assetList)
      if (parentConfig) setParentOptions(parentList)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [containerUrl, webId, podRootUrl, parentConfig])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleCreate(data) {
    setBusy(true)
    try {
      await createImageAsset(containerUrl, forClass, data, authFetch)
      setView('list')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function startEdit(url) {
    setError(null)
    try {
      const asset = await getImageAsset(url, authFetch)
      setEditing(asset)
      setView('edit')
    } catch (e) {
      setError(e.message || String(e))
    }
  }

  async function handleUpdate(data) {
    setBusy(true)
    try {
      await updateImageAsset(editing.url, forClass, data, editing.contentUrl, authFetch)
      setView('list')
      setEditing(null)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(asset) {
    const ok = window.confirm(`"${displayCaption(asset)}" verwijderen?`)
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      await deleteImageAsset(asset.url, asset.contentUrl, authFetch)
      await refresh()
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  if (setupError) {
    return <p className="error">Kon registratie niet aanmaken: {setupError}</p>
  }

  if (!containerUrl) {
    return <p>Type-index controleren...</p>
  }

  if (view === 'create') {
    return (
      <div className="resource-manager">
        <h2>{newLabel}</h2>
        <ImageAssetForm
          parentOptions={parentConfig ? parentOptions : null}
          parentFieldLabel={parentConfig?.label}
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
        <h2>{editLabel}</h2>
        <ImageAssetForm
          initial={editing}
          parentOptions={parentConfig ? parentOptions : null}
          parentFieldLabel={parentConfig?.label}
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
          {newLabel}
        </button>
        <button onClick={refresh} disabled={busy || loading}>
          Vernieuwen
        </button>
      </div>

      {error && <p className="error">Fout: {error}</p>}

      {loading ? (
        <p>Laden...</p>
      ) : assets.length === 0 ? (
        <p className="muted">{emptyLabel}</p>
      ) : (
        <ul className="entries">
          {assets.map((asset) => (
            <li key={asset.url} className="entry">
              {asset.contentUrl && (
                <AuthImage className="thumb" url={asset.contentUrl} alt="" />
              )}
              <div className="entry-name">
                <strong>{displayCaption(asset)}</strong>
                {asset.width && asset.height && (
                  <span className="muted">
                    {' '}
                    · {asset.width}×{asset.height}
                  </span>
                )}
              </div>
              <div>
                <button onClick={() => startEdit(asset.url)} disabled={busy}>
                  Bewerken
                </button>
                <button className="delete" onClick={() => handleDelete(asset)} disabled={busy}>
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
