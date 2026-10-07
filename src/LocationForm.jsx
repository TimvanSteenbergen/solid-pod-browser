import { useState } from 'react'

const EMPTY = {
  name: '',
  description: '',
  streetAddress: '',
  postalCode: '',
  addressLocality: '',
  addressCountry: '',
  latitude: '',
  longitude: '',
}

export default function LocationForm({ initial, onSubmit, onCancel, busy }) {
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
        <input value={data.name} onChange={set('name')} placeholder="bv. Kantoor Amsterdam" />
      </label>
      <label>
        Beschrijving (description)
        <input value={data.description} onChange={set('description')} />
      </label>

      <fieldset>
        <legend>Adres</legend>
        <label>
          Straat + huisnummer
          <input value={data.streetAddress} onChange={set('streetAddress')} />
        </label>
        <label>
          Postcode
          <input value={data.postalCode} onChange={set('postalCode')} />
        </label>
        <label>
          Plaats
          <input value={data.addressLocality} onChange={set('addressLocality')} />
        </label>
        <label>
          Land
          <input value={data.addressCountry} onChange={set('addressCountry')} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Coördinaten</legend>
        <label>
          Latitude
          <input type="number" step="any" value={data.latitude} onChange={set('latitude')} />
        </label>
        <label>
          Longitude
          <input type="number" step="any" value={data.longitude} onChange={set('longitude')} />
        </label>
      </fieldset>

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
