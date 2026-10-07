import { useEffect, useState, useCallback } from 'react'
import { authFetch } from './solid'
import { ensureOrganizationRoleRegistration, ensurePersonRegistration, ensureOrganizationRegistration } from './typeIndex'
import {
  listOrganizationRoles,
  getOrganizationRole,
  createOrganizationRole,
  updateOrganizationRole,
  deleteOrganizationRole,
} from './organizationRoles'
import { listPeople } from './people'
import { listOrganizations } from './organizations'
import OrganizationRoleForm from './OrganizationRoleForm'

function displayName(role) {
  return role.roleName || '(zonder functietitel)'
}

// view: 'list' | 'create' | 'edit'
export default function OrganizationRolesManager({ webId, podRootUrl }) {
  const [containerUrl, setContainerUrl] = useState(null)
  const [setupError, setSetupError] = useState(null)
  const [roles, setRoles] = useState([])
  const [people, setPeople] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [view, setView] = useState('list')
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSetupError(null)
    ensureOrganizationRoleRegistration(webId, podRootUrl, authFetch)
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
      const [roleList, personContainer, orgContainer] = await Promise.all([
        listOrganizationRoles(containerUrl, authFetch),
        ensurePersonRegistration(webId, podRootUrl, authFetch),
        ensureOrganizationRegistration(webId, podRootUrl, authFetch),
      ])
      const [peopleList, orgList] = await Promise.all([
        listPeople(personContainer.containerUrl, authFetch),
        listOrganizations(orgContainer.containerUrl, authFetch),
      ])
      setRoles(roleList)
      setPeople(peopleList)
      setOrganizations(orgList)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [containerUrl, webId, podRootUrl])

  useEffect(() => {
    refresh()
  }, [refresh])

  function personName(url) {
    const p = people.find((person) => person.url === url)
    return p ? p.name || [p.givenName, p.familyName].filter(Boolean).join(' ') || url : url
  }

  function orgName(url) {
    return organizations.find((org) => org.url === url)?.name || url
  }

  async function handleCreate(data) {
    setBusy(true)
    try {
      await createOrganizationRole(containerUrl, data, authFetch)
      setView('list')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function startEdit(url) {
    setError(null)
    try {
      const role = await getOrganizationRole(url, authFetch)
      setEditing(role)
      setView('edit')
    } catch (e) {
      setError(e.message || String(e))
    }
  }

  async function handleUpdate(data) {
    setBusy(true)
    try {
      await updateOrganizationRole(editing.url, data, authFetch)
      setView('list')
      setEditing(null)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(role) {
    const ok = window.confirm(`"${displayName(role)}" verwijderen?`)
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      await deleteOrganizationRole(role.url, authFetch)
      await refresh()
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  if (setupError) {
    return <p className="error">Kon schema:OrganizationRole niet registreren: {setupError}</p>
  }

  if (!containerUrl) {
    return <p>Type-index controleren...</p>
  }

  if (view === 'create') {
    return (
      <div className="resource-manager">
        <h2>Nieuwe rol</h2>
        <OrganizationRoleForm
          people={people}
          organizations={organizations}
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
        <h2>Rol bewerken</h2>
        <OrganizationRoleForm
          initial={editing}
          people={people}
          organizations={organizations}
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
          Nieuwe rol
        </button>
        <button onClick={refresh} disabled={busy || loading}>
          Vernieuwen
        </button>
      </div>

      {error && <p className="error">Fout: {error}</p>}

      {loading ? (
        <p>Laden...</p>
      ) : roles.length === 0 ? (
        <p className="muted">Nog geen rollen.</p>
      ) : (
        <ul className="entries">
          {roles.map((role) => (
            <li key={role.url} className="entry">
              <div className="entry-name">
                <strong>{displayName(role)}</strong>
                {role.memberUrl && <span className="muted"> · {personName(role.memberUrl)}</span>}
                {role.memberOfUrl && <span className="muted"> · {orgName(role.memberOfUrl)}</span>}
              </div>
              <div>
                <button onClick={() => startEdit(role.url)} disabled={busy}>
                  Bewerken
                </button>
                <button className="delete" onClick={() => handleDelete(role)} disabled={busy}>
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
