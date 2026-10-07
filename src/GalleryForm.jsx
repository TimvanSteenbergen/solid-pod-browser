import { useState } from 'react'
import AuthImage from './AuthImage'

const EMPTY = { name: '', description: '', imageUrls: [] }

export default function GalleryForm({ initial, imageOptions, onSubmit, onCancel, busy }) {
  const [data, setData] = useState({ ...EMPTY, ...initial })
  const [error, setError] = useState(null)

  function set(field) {
    return (e) => setData((d) => ({ ...d, [field]: e.target.value }))
  }

  function toggleImage(url) {
    setData((d) => ({
      ...d,
      imageUrls: d.imageUrls.includes(url)
        ? d.imageUrls.filter((u) => u !== url)
        : [...d.imageUrls, url],
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
      <label>
        Naam (name)
        <input value={data.name} onChange={set('name')} placeholder="bv. Vakantie 2026" />
      </label>
      <label>
        Beschrijving (description)
        <input value={data.description} onChange={set('description')} />
      </label>

      <fieldset>
        <legend>Afbeeldingen (hasPart)</legend>
        {imageOptions.length === 0 ? (
          <p className="muted">Nog geen afbeeldingen - upload er eerst een paar in de tab "Afbeeldingen".</p>
        ) : (
          <div className="image-picker">
            {imageOptions.map((image) => (
              <label key={image.url} className="image-picker-item">
                <input
                  type="checkbox"
                  checked={data.imageUrls.includes(image.url)}
                  onChange={() => toggleImage(image.url)}
                />
                {image.contentUrl && <AuthImage className="thumb" url={image.contentUrl} alt="" />}
                <span>{image.caption || image.url}</span>
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
