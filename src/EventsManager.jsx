import { useEffect, useState, useCallback } from 'react'
import { authFetch } from './solid'
import { ensureEventRegistration, ensurePlaceRegistration, ensureScheduleRegistration } from './typeIndex'
import { listEvents, getEvent, createEvent, updateEvent, deleteEvent } from './events'
import { listPlaces } from './places'
import { listSchedules } from './schedules'
import EventForm from './EventForm'

function displayName(event) {
  return event.name || '(naamloos)'
}

// view: 'list' | 'create' | 'edit'
export default function EventsManager({ webId, podRootUrl }) {
  const [containerUrl, setContainerUrl] = useState(null)
  const [setupError, setSetupError] = useState(null)
  const [events, setEvents] = useState([])
  const [places, setPlaces] = useState([])
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
    ensureEventRegistration(webId, podRootUrl, authFetch)
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
      const [eventList, placeContainer, scheduleContainer] = await Promise.all([
        listEvents(containerUrl, authFetch),
        ensurePlaceRegistration(webId, podRootUrl, authFetch),
        ensureScheduleRegistration(webId, podRootUrl, authFetch),
      ])
      const [placeList, scheduleList] = await Promise.all([
        listPlaces(placeContainer.containerUrl, authFetch),
        listSchedules(scheduleContainer.containerUrl, authFetch),
      ])
      setEvents(eventList)
      setPlaces(placeList)
      setSchedules(scheduleList)
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

  function scheduleName(url) {
    const schedule = schedules.find((s) => s.url === url)
    if (!schedule) return url
    const days = (schedule.byDay || []).join(', ')
    return days || schedule.url
  }

  async function handleCreate(data) {
    setBusy(true)
    try {
      await createEvent(containerUrl, data, authFetch)
      setView('list')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function startEdit(url) {
    setError(null)
    try {
      const event = await getEvent(url, authFetch)
      setEditing(event)
      setView('edit')
    } catch (e) {
      setError(e.message || String(e))
    }
  }

  async function handleUpdate(data) {
    setBusy(true)
    try {
      await updateEvent(editing.url, data, authFetch)
      setView('list')
      setEditing(null)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(event) {
    const ok = window.confirm(`"${displayName(event)}" verwijderen?`)
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      await deleteEvent(event.url, authFetch)
      await refresh()
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  if (setupError) {
    return <p className="error">Kon schema:Event niet registreren: {setupError}</p>
  }

  if (!containerUrl) {
    return <p>Type-index controleren...</p>
  }

  if (view === 'create') {
    return (
      <div className="resource-manager">
        <h2>Nieuw event</h2>
        <EventForm
          places={places}
          schedules={schedules}
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
        <h2>Event bewerken</h2>
        <EventForm
          initial={editing}
          places={places}
          schedules={schedules}
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
          Nieuw event
        </button>
        <button onClick={refresh} disabled={busy || loading}>
          Vernieuwen
        </button>
      </div>

      {error && <p className="error">Fout: {error}</p>}

      {loading ? (
        <p>Laden...</p>
      ) : events.length === 0 ? (
        <p className="muted">Nog geen events.</p>
      ) : (
        <ul className="entries">
          {events.map((event) => (
            <li key={event.url} className="entry">
              <div className="entry-name">
                <strong>{displayName(event)}</strong>
                {event.startDate && <span className="muted"> · {event.startDate.replace('T', ' ')}</span>}
                {event.locationUrl && <span className="muted"> · {placeName(event.locationUrl)}</span>}
                {event.eventScheduleUrl && (
                  <span className="muted"> · {scheduleName(event.eventScheduleUrl)}</span>
                )}
              </div>
              <div>
                <button onClick={() => startEdit(event.url)} disabled={busy}>
                  Bewerken
                </button>
                <button className="delete" onClick={() => handleDelete(event)} disabled={busy}>
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
