import { useState } from 'react'
import AuthImage from './AuthImage'

const EMPTY = {
  name: '',
  givenName: '',
  familyName: '',
  email: '',
  telephone: '',
  birthDate: '',
  imageUrl: '',
}

function imageLabel(image) {
  return image.caption || image.url
}

export default function PersonForm({ initial, images, onSubmit, onCancel, busy }) {
  const [data, setData] = useState({ ...EMPTY, ...initial })
  const [error, setError] = useState(null)

  function set(field) {
    return (e) => setData((d) => ({ ...d, [field]: e.target.value }))
  }

  const selectedImage = images.find((image) => image.url === data.imageUrl)

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
        Voornaam (givenName)
        <input value={data.givenName} onChange={set('givenName')} />
      </label>
      <label>
        Achternaam (familyName)
        <input value={data.familyName} onChange={set('familyName')} />
      </label>
      <label>
        Volledige naam (name)
        <input value={data.name} onChange={set('name')} placeholder="bv. Voornaam Achternaam" />
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
        Geboortedatum
        <input type="date" value={data.birthDate} onChange={set('birthDate')} />
      </label>
      <label>
        Profielfoto (image)
        <select value={data.imageUrl} onChange={set('imageUrl')}>
          <option value="">— geen —</option>
          {images.map((image) => (
            <option key={image.url} value={image.url}>
              {imageLabel(image)}
            </option>
          ))}
        </select>
      </label>
      {selectedImage?.contentUrl && (
        <AuthImage className="image-preview" url={selectedImage.contentUrl} alt="" />
      )}

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
