import { useState } from 'react'
import { DAY_OF_WEEK } from './vocab'

const DAY_LABELS = {
  Monday: 'ma',
  Tuesday: 'di',
  Wednesday: 'wo',
  Thursday: 'do',
  Friday: 'vr',
  Saturday: 'za',
  Sunday: 'zo',
}

const EMPTY = {
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  repeatFrequency: '',
  scheduleTimezone: '',
  byDay: [],
}

export default function ScheduleForm({ initial, onSubmit, onCancel, busy }) {
  const [data, setData] = useState({ ...EMPTY, ...initial })
  const [error, setError] = useState(null)

  function set(field) {
    return (e) => setData((d) => ({ ...d, [field]: e.target.value }))
  }

  function toggleDay(day) {
    setData((d) => ({
      ...d,
      byDay: d.byDay.includes(day) ? d.byDay.filter((x) => x !== day) : [...d.byDay, day],
    }))
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
      <fieldset>
        <legend>Periode</legend>
        <label>
          Startdatum
          <input type="date" value={data.startDate} onChange={set('startDate')} />
        </label>
        <label>
          Einddatum
          <input type="date" value={data.endDate} onChange={set('endDate')} />
        </label>
        <label>
          Starttijd
          <input type="time" value={data.startTime} onChange={set('startTime')} />
        </label>
        <label>
          Eindtijd
          <input type="time" value={data.endTime} onChange={set('endTime')} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Herhaling</legend>
        <label>
          Herhalingsfrequentie (repeatFrequency, ISO 8601)
          <input
            value={data.repeatFrequency}
            onChange={set('repeatFrequency')}
            placeholder="bv. P1W voor wekelijks"
          />
        </label>
        <div className="day-picker">
          {Object.keys(DAY_OF_WEEK).map((day) => (
            <label key={day} className="day-checkbox">
              <input
                type="checkbox"
                checked={data.byDay.includes(day)}
                onChange={() => toggleDay(day)}
              />
              {DAY_LABELS[day]}
            </label>
          ))}
        </div>
      </fieldset>

      <label>
        Tijdzone (scheduleTimezone)
        <input value={data.scheduleTimezone} onChange={set('scheduleTimezone')} placeholder="bv. Europe/Amsterdam" />
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
