import { useState } from 'react'

const EMPTY = {
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  locationUrl: '',
  eventScheduleUrl: '',
}

function placeLabel(place) {
  return place.name || place.url
}

function scheduleLabel(schedule) {
  const days = (schedule.byDay || []).join(', ')
  const time = [schedule.startTime, schedule.endTime].filter(Boolean).join('–')
  return [days, time].filter(Boolean).join(' · ') || schedule.url
}

export default function EventForm({ initial, places, schedules, onSubmit, onCancel, busy }) {
  const [data, setData] = useState({ ...EMPTY, ...initial })
  const [error, setError] = useState(null)

  function set(field) {
    return (e) => setData((d) => ({ ...d, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      await onSubmit(data)
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  return (
    <form className="data-form" onSubmit={handleSubmit}>
      <label>
        Naam (name)
        <input value={data.name} onChange={set('name')} placeholder="bv. Teamoverleg" />
      </label>
      <label>
        Beschrijving (description)
        <input value={data.description} onChange={set('description')} />
      </label>
      <label>
        Start (startDate)
        <input type="datetime-local" value={data.startDate} onChange={set('startDate')} />
      </label>
      <label>
        Einde (endDate)
        <input type="datetime-local" value={data.endDate} onChange={set('endDate')} />
      </label>
      <label>
        Locatie (location)
        <select value={data.locationUrl} onChange={set('locationUrl')}>
          <option value="">— geen —</option>
          {places.map((place) => (
            <option key={place.url} value={place.url}>
              {placeLabel(place)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Schedule (eventSchedule)
        <select value={data.eventScheduleUrl} onChange={set('eventScheduleUrl')}>
          <option value="">— geen —</option>
          {schedules.map((schedule) => (
            <option key={schedule.url} value={schedule.url}>
              {scheduleLabel(schedule)}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="error">Fout: {error}</p>}

      <div className="form-actions">
        <button type="submit" disabled={busy}>
          Opslaan
        </button>
        <button type="button" onClick={onCancel} disabled={busy}>
          Annuleren
        </button>
      </div>
    </form>
  )
}
