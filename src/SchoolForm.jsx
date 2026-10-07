import { useState } from 'react'
import AuthImage from './AuthImage'

const EMPTY = {
  name: '',
  description: '',
  email: '',
  telephone: '',
  website: '',
  identifier: '',
  locationUrl: '',
  logoUrl: '',
  memberUrls: [],
  educationalLevel: '',
  alumniUrls: [],
}

function placeLabel(place) {
  return place.name || place.url
}

function personLabel(person) {
  return person.name || [person.givenName, person.familyName].filter(Boolean).join(' ') || person.url
}

export default function SchoolForm({ initial, places, images, people, onSubmit, onCancel, busy }) {
  const [data, setData] = useState({ ...EMPTY, ...initial })
  const [error, setError] = useState(null)

  function set(field) {
    return (e) => setData((d) => ({ ...d, [field]: e.target.value }))
  }

  function toggleListField(field, url) {
    setData((d) => ({
      ...d,
      [field]: d[field].includes(url) ? d[field].filter((u) => u !== url) : [...d[field], url],
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

  const selectedLogo = images.find((image) => image.url === data.logoUrl)

  return (
    <form className="data-form" onSubmit={handleSubmit}>
      <label>
        Naam (name)
        <input value={data.name} onChange={set('name')} placeholder="bv. Basisschool De Linde" />
      </label>
      <label>
        Beschrijving (description)
        <input value={data.description} onChange={set('description')} />
      </label>
      <label>
        Onderwijsniveau (educationalLevel)
        <input
          value={data.educationalLevel}
          onChange={set('educationalLevel')}
          placeholder="bv. basisonderwijs, voortgezet onderwijs, hoger onderwijs"
        />
      </label>
      <label>
        E-mail
        <input type="email" value={data.email} onChange={set('email')} />
      </label>
      <label>
        Telefoon
        <input type="tel" value={data.telephone} onChange={set('telephone')} />
      </label>
      <label>
        Website (url)
        <input type="url" value={data.website} onChange={set('website')} placeholder="https://..." />
      </label>
      <label>
        WebID (identifier)
        <input
          type="url"
          value={data.identifier}
          onChange={set('identifier')}
          placeholder="https://.../profile/card#me"
        />
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
        Logo
        <select value={data.logoUrl} onChange={set('logoUrl')}>
          <option value="">— geen —</option>
          {images.map((image) => (
            <option key={image.url} value={image.url}>
              {image.caption || image.url}
            </option>
          ))}
        </select>
      </label>
      {selectedLogo?.contentUrl && <AuthImage className="image-preview" url={selectedLogo.contentUrl} alt="" />}

      <fieldset>
        <legend>Leden (member)</legend>
        {people.length === 0 ? (
          <p className="muted">Nog geen personen - maak er eerst een paar aan in de tab "Personen".</p>
        ) : (
          <div className="image-picker">
            {people.map((person) => (
              <label key={person.url} className="image-picker-item">
                <input
                  type="checkbox"
                  checked={data.memberUrls.includes(person.url)}
                  onChange={() => toggleListField('memberUrls', person.url)}
                />
                <span>{personLabel(person)}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend>Alumni</legend>
        {people.length === 0 ? (
          <p className="muted">Nog geen personen om als alumnus te koppelen.</p>
        ) : (
          <div className="image-picker">
            {people.map((person) => (
              <label key={person.url} className="image-picker-item">
                <input
                  type="checkbox"
                  checked={data.alumniUrls.includes(person.url)}
                  onChange={() => toggleListField('alumniUrls', person.url)}
                />
                <span>{personLabel(person)}</span>
              </label>
            ))}
          </div>
        )}
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
