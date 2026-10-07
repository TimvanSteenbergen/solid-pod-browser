import { useState } from 'react'
import { CERTIFICATION_STATUS } from './vocab'
import AuthImage from './AuthImage'

const EMPTY = {
  name: '',
  description: '',
  certificationIdentification: '',
  certificationStatus: '',
  datePublished: '',
  validFrom: '',
  expires: '',
  auditDate: '',
  logoUrl: '',
  issuedByUrl: '',
  aboutUrl: '',
}

const STATUS_LABELS = {
  CertificationActive: 'Actief',
  CertificationInactive: 'Inactief',
}

function personLabel(person) {
  return person.name || [person.givenName, person.familyName].filter(Boolean).join(' ') || person.url
}

export default function CertificationForm({
  initial,
  organizations,
  people,
  places,
  images,
  onSubmit,
  onCancel,
  busy,
}) {
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

  const selectedLogo = images.find((image) => image.url === data.logoUrl)

  return (
    <form className="data-form" onSubmit={handleSubmit}>
      <label>
        Naam (name)
        <input value={data.name} onChange={set('name')} placeholder="bv. ISO 9001:2015" />
      </label>
      <label>
        Beschrijving (description)
        <input value={data.description} onChange={set('description')} />
      </label>
      <label>
        Identificatie (certificationIdentification)
        <input value={data.certificationIdentification} onChange={set('certificationIdentification')} />
      </label>
      <label>
        Status (certificationStatus)
        <select value={data.certificationStatus} onChange={set('certificationStatus')}>
          <option value="">— onbekend —</option>
          {Object.entries(CERTIFICATION_STATUS).map(([key, iri]) => (
            <option key={iri} value={iri}>
              {STATUS_LABELS[key]}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend>Data</legend>
        <label>
          Gepubliceerd (datePublished)
          <input type="date" value={data.datePublished} onChange={set('datePublished')} />
        </label>
        <label>
          Geldig vanaf (validFrom)
          <input type="date" value={data.validFrom} onChange={set('validFrom')} />
        </label>
        <label>
          Verloopt op (expires)
          <input type="date" value={data.expires} onChange={set('expires')} />
        </label>
        <label>
          Audit-datum (auditDate)
          <input type="date" value={data.auditDate} onChange={set('auditDate')} />
        </label>
      </fieldset>

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

      <label>
        Uitgegeven door (issuedBy)
        <select value={data.issuedByUrl} onChange={set('issuedByUrl')}>
          <option value="">— geen —</option>
          {organizations.map((org) => (
            <option key={org.url} value={org.url}>
              {org.name || org.url}
            </option>
          ))}
        </select>
      </label>

      <label>
        Gecertificeerde (about)
        <select value={data.aboutUrl} onChange={set('aboutUrl')}>
          <option value="">— geen —</option>
          {organizations.length > 0 && (
            <optgroup label="Organisaties">
              {organizations.map((org) => (
                <option key={org.url} value={org.url}>
                  {org.name || org.url}
                </option>
              ))}
            </optgroup>
          )}
          {people.length > 0 && (
            <optgroup label="Personen">
              {people.map((person) => (
                <option key={person.url} value={person.url}>
                  {personLabel(person)}
                </option>
              ))}
            </optgroup>
          )}
          {places.length > 0 && (
            <optgroup label="Locaties">
              {places.map((place) => (
                <option key={place.url} value={place.url}>
                  {place.name || place.url}
                </option>
              ))}
            </optgroup>
          )}
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
