import { useEffect, useState, useCallback } from 'react'
import { authFetch } from './solid'
import {
  ensureCertificationRegistration,
  ensureOrganizationRegistration,
  ensurePersonRegistration,
  ensurePlaceRegistration,
  ensureImageObjectRegistration,
} from './typeIndex'
import {
  listCertifications,
  getCertification,
  createCertification,
  updateCertification,
  deleteCertification,
} from './certifications'
import { listOrganizations } from './organizations'
import { listPeople } from './people'
import { listPlaces } from './places'
import { listImageAssets } from './imageAssets'
import CertificationForm from './CertificationForm'

function displayName(cert) {
  return cert.name || '(naamloos)'
}

// view: 'list' | 'create' | 'edit'
export default function CertificationsManager({ webId, podRootUrl }) {
  const [containerUrl, setContainerUrl] = useState(null)
  const [setupError, setSetupError] = useState(null)
  const [certifications, setCertifications] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [people, setPeople] = useState([])
  const [places, setPlaces] = useState([])
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
    ensureCertificationRegistration(webId, podRootUrl, authFetch)
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
      const [certList, orgContainer, personContainer, placeContainer, imageContainer] = await Promise.all([
        listCertifications(containerUrl, authFetch),
        ensureOrganizationRegistration(webId, podRootUrl, authFetch),
        ensurePersonRegistration(webId, podRootUrl, authFetch),
        ensurePlaceRegistration(webId, podRootUrl, authFetch),
        ensureImageObjectRegistration(webId, podRootUrl, authFetch),
      ])
      const [orgList, peopleList, placeList, imageList] = await Promise.all([
        listOrganizations(orgContainer.containerUrl, authFetch),
        listPeople(personContainer.containerUrl, authFetch),
        listPlaces(placeContainer.containerUrl, authFetch),
        listImageAssets(imageContainer.containerUrl, authFetch),
      ])
      setCertifications(certList)
      setOrganizations(orgList)
      setPeople(peopleList)
      setPlaces(placeList)
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

  function subjectName(url) {
    const org = organizations.find((o) => o.url === url)
    if (org) return org.name || url
    const person = people.find((p) => p.url === url)
    if (person) return person.name || [person.givenName, person.familyName].filter(Boolean).join(' ') || url
    const place = places.find((p) => p.url === url)
    if (place) return place.name || url
    return url
  }

  async function handleCreate(data) {
    setBusy(true)
    try {
      await createCertification(containerUrl, data, authFetch)
      setView('list')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function startEdit(url) {
    setError(null)
    try {
      const cert = await getCertification(url, authFetch)
      setEditing(cert)
      setView('edit')
    } catch (e) {
      setError(e.message || String(e))
    }
  }

  async function handleUpdate(data) {
    setBusy(true)
    try {
      await updateCertification(editing.url, data, authFetch)
      setView('list')
      setEditing(null)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(cert) {
    const ok = window.confirm(`"${displayName(cert)}" verwijderen?`)
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      await deleteCertification(cert.url, authFetch)
      await refresh()
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  if (setupError) {
    return <p className="error">Kon schema:Certification niet registreren: {setupError}</p>
  }

  if (!containerUrl) {
    return <p>Type-index controleren...</p>
  }

  if (view === 'create') {
    return (
      <div className="resource-manager">
        <h2>Nieuwe certificering</h2>
        <CertificationForm
          organizations={organizations}
          people={people}
          places={places}
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
        <h2>Certificering bewerken</h2>
        <CertificationForm
          initial={editing}
          organizations={organizations}
          people={people}
          places={places}
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
          Nieuwe certificering
        </button>
        <button onClick={refresh} disabled={busy || loading}>
          Vernieuwen
        </button>
      </div>

      {error && <p className="error">Fout: {error}</p>}

      {loading ? (
        <p>Laden...</p>
      ) : certifications.length === 0 ? (
        <p className="muted">Nog geen certificeringen.</p>
      ) : (
        <ul className="entries">
          {certifications.map((cert) => (
            <li key={cert.url} className="entry">
              <div className="entry-name">
                <strong>{displayName(cert)}</strong>
                {cert.aboutUrl && <span className="muted"> · {subjectName(cert.aboutUrl)}</span>}
                {cert.expires && <span className="muted"> · verloopt {cert.expires}</span>}
              </div>
              <div>
                <button onClick={() => startEdit(cert.url)} disabled={busy}>
                  Bewerken
                </button>
                <button className="delete" onClick={() => handleDelete(cert)} disabled={busy}>
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
