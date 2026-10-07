import { useEffect, useState, useCallback } from 'react'
import {
  getSolidDataset,
  getContainedResourceUrlAll,
  getSourceUrl,
  isContainer,
  createContainerAt,
  deleteFile,
} from '@inrupt/solid-client'
import { authFetch } from './solid'

function nameOf(url) {
  const trimmed = url.endsWith('/') ? url.slice(0, -1) : url
  return decodeURIComponent(trimmed.split('/').pop()) || trimmed
}

export default function PodBrowser({ rootUrl }) {
  const [currentUrl, setCurrentUrl] = useState(rootUrl)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (url) => {
    setLoading(true)
    setError(null)
    try {
      const dataset = await getSolidDataset(url, { fetch: authFetch })
      const urls = getContainedResourceUrlAll(dataset)
      const items = urls
        .map((u) => ({ url: u, container: isContainer(u), name: nameOf(u) }))
        .sort((a, b) => {
          if (a.container !== b.container) return a.container ? -1 : 1
          return a.name.localeCompare(b.name)
        })
      setEntries(items)
      setCurrentUrl(getSourceUrl(dataset) || url)
    } catch (e) {
      setError(e.message || String(e))
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(rootUrl)
  }, [rootUrl, load])

  async function handleCreateContainer() {
    const name = window.prompt('Naam van de nieuwe map:')
    if (!name) return
    setBusy(true)
    setError(null)
    try {
      const target = `${currentUrl}${encodeURIComponent(name)}/`
      await createContainerAt(target, { fetch: authFetch })
      await load(currentUrl)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(entry) {
    const ok = window.confirm(
      entry.container
        ? `Map "${entry.name}" en alle inhoud verwijderen?`
        : `Bestand "${entry.name}" verwijderen?`,
    )
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      await deleteFile(entry.url, { fetch: authFetch })
      await load(currentUrl)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  const relativeToRoot = currentUrl.startsWith(rootUrl)
    ? currentUrl.slice(rootUrl.length)
    : currentUrl
  const segments = relativeToRoot.split('/').filter(Boolean)
  const canGoUp = currentUrl !== rootUrl

  function goUp() {
    const trimmed = currentUrl.endsWith('/') ? currentUrl.slice(0, -1) : currentUrl
    const parent = trimmed.slice(0, trimmed.lastIndexOf('/') + 1)
    load(parent.length >= rootUrl.length ? parent : rootUrl)
  }

  function goToBreadcrumb(index) {
    const path = segments.slice(0, index + 1).join('/')
    load(`${rootUrl}${path}/`)
  }

  return (
    <div className="pod-browser">
      <div className="breadcrumbs">
        <button className="link" onClick={() => load(rootUrl)}>
          pod-root
        </button>
        {segments.map((seg, i) => (
          <span key={i}>
            {' / '}
            <button className="link" onClick={() => goToBreadcrumb(i)}>
              {decodeURIComponent(seg)}
            </button>
          </span>
        ))}
      </div>

      <div className="toolbar">
        <button onClick={goUp} disabled={!canGoUp || busy}>
          Omhoog
        </button>
        <button onClick={handleCreateContainer} disabled={busy}>
          Nieuwe map
        </button>
        <button onClick={() => load(currentUrl)} disabled={busy}>
          Vernieuwen
        </button>
      </div>

      {error && <p className="error">Fout: {error}</p>}

      {loading ? (
        <p>Laden...</p>
      ) : entries.length === 0 ? (
        <p className="muted">Deze map is leeg.</p>
      ) : (
        <ul className="entries">
          {entries.map((entry) => (
            <li key={entry.url} className="entry">
              {entry.container ? (
                <button className="link entry-name" onClick={() => load(entry.url)}>
                  📁 {entry.name}/
                </button>
              ) : (
                <a
                  className="entry-name"
                  href={entry.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  📄 {entry.name}
                </a>
              )}
              <button
                className="delete"
                onClick={() => handleDelete(entry)}
                disabled={busy}
              >
                Verwijderen
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
