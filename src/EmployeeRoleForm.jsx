import { useState } from 'react'

const EMPTY = {
  roleName: '',
  startDate: '',
  endDate: '',
  numberedPosition: '',
  employeeUrl: '',
  worksForUrl: '',
  baseSalary: '',
  salaryCurrency: '',
}

function personLabel(person) {
  return person.name || [person.givenName, person.familyName].filter(Boolean).join(' ') || person.url
}

function orgLabel(org) {
  return org.name || org.url
}

export default function EmployeeRoleForm({ initial, people, organizations, onSubmit, onCancel, busy }) {
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
        Functietitel (roleName)
        <input value={data.roleName} onChange={set('roleName')} placeholder="bv. Software Engineer" />
      </label>
      <label>
        Startdatum
        <input type="date" value={data.startDate} onChange={set('startDate')} />
      </label>
      <label>
        Einddatum
        <input type="date" value={data.endDate} onChange={set('endDate')} />
      </label>
      <label>
        Volgnummer (numberedPosition)
        <input type="number" value={data.numberedPosition} onChange={set('numberedPosition')} />
      </label>
      <label>
        Werknemer (employee)
        <select value={data.employeeUrl} onChange={set('employeeUrl')}>
          <option value="">— geen —</option>
          {people.map((person) => (
            <option key={person.url} value={person.url}>
              {personLabel(person)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Werkgever (worksFor)
        <select value={data.worksForUrl} onChange={set('worksForUrl')}>
          <option value="">— geen —</option>
          {organizations.map((org) => (
            <option key={org.url} value={org.url}>
              {orgLabel(org)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Basissalaris (baseSalary)
        <input type="number" step="any" value={data.baseSalary} onChange={set('baseSalary')} />
      </label>
      <label>
        Valuta (salaryCurrency)
        <input value={data.salaryCurrency} onChange={set('salaryCurrency')} placeholder="bv. EUR" />
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
