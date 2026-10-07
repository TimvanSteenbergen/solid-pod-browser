import { useEffect, useState, useCallback } from 'react'
import { authFetch } from './solid'
import { ensureScheduleRegistration } from './typeIndex'
import { listSchedules, getSchedule, createSchedule, updateSchedule, deleteSchedule } from './schedules'
import ScheduleForm from './ScheduleForm'

function displayName(schedule) {
  const days = (schedule.byDay || []).join(', ')
  const time = [schedule.startTime, schedule.endTime].filter(Boolean).join('–')
  return [days, time].filter(Boolean).join(' · ') || '(zonder patroon)'
}

// view: 'list' | 'create' | 'edit'
export default function SchedulesManager({ webId, podRootUrl }) {
  const [containerUrl, setContainerUrl] = useState(null)
  const [setupError, setSetupError] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [view, setView] = useState('list')
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSetupError(null)
    ensureScheduleRegistration(webId, podRootUrl, authFetch)
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
      setSchedules(await listSchedules(containerUrl, authFetch))
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
      await createSchedule(containerUrl, data, authFetch)
      setView('list')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function startEdit(url) {
    setError(null)
    try {
      const schedule = await getSchedule(url, authFetch)
      setEditing(schedule)
      setView('edit')
    } catch (e) {
      setError(e.message || String(e))
    }
  }

  async function handleUpdate(data) {
    setBusy(true)
    try {
      await updateSchedule(editing.url, data, authFetch)
      setView('list')
      setEditing(null)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(schedule) {
    const ok = window.confirm(`"${displayName(schedule)}" verwijderen?`)
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      await deleteSchedule(schedule.url, authFetch)
      await refresh()
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  if (setupError) {
    return <p className="error">Kon schema:Schedule niet registreren: {setupError}</p>
  }

  if (!containerUrl) {
    return <p>Type-index controleren...</p>
  }

  if (view === 'create') {
    return (
      <div className="resource-manager">
        <h2>Nieuwe schedule</h2>
        <ScheduleForm onSubmit={handleCreate} onCancel={() => setView('list')} busy={busy} />
      </div>
    )
  }

  if (view === 'edit' && editing) {
    return (
      <div className="resource-manager">
        <h2>Schedule bewerken</h2>
        <ScheduleForm
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
          Nieuwe schedule
        </button>
        <button onClick={refresh} disabled={busy || loading}>
          Vernieuwen
        </button>
      </div>

      {error && <p className="error">Fout: {error}</p>}

      {loading ? (
        <p>Laden...</p>
      ) : schedules.length === 0 ? (
        <p className="muted">Nog geen schedules.</p>
      ) : (
        <ul className="entries">
          {schedules.map((schedule) => (
            <li key={schedule.url} className="entry">
              <div className="entry-name">
                <strong>{displayName(schedule)}</strong>
                {schedule.repeatFrequency && (
                  <span className="muted"> · {schedule.repeatFrequency}</span>
                )}
              </div>
              <div>
                <button onClick={() => startEdit(schedule.url)} disabled={busy}>
                  Bewerken
                </button>
                <button className="delete" onClick={() => handleDelete(schedule)} disabled={busy}>
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
