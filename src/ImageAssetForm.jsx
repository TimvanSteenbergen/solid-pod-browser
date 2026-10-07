import { useState, useEffect } from 'react'
import AuthImage from './AuthImage'
import { freezeFile } from './freezeFile'

const EMPTY = {
  caption: '',
  description: '',
  uploadDate: '',
  exampleOfWorkUrl: '',
}

function parentLabelFor(asset) {
  return asset.caption || asset.url
}

export default function ImageAssetForm({
  initial,
  parentOptions,
  parentFieldLabel,
  onSubmit,
  onCancel,
  busy,
}) {
  const [data, setData] = useState({ ...EMPTY, ...initial })
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(initial?.contentUrl || '')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  function set(field) {
    return (e) => setData((d) => ({ ...d, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      await onSubmit({ ...data, file })
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  return (
    <form className="data-form" onSubmit={handleSubmit}>
      <label>
        Afbeelding {initial ? '(laat leeg om huidige te behouden)' : ''}
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => setFile(await freezeFile(e.target.files[0] || null))}
        />
      </label>

      {previewUrl && <AuthImage className="image-preview" url={previewUrl} alt="" />}

      <label>
        Caption
        <input value={data.caption} onChange={set('caption')} />
      </label>
      <label>
        Beschrijving (description)
        <input value={data.description} onChange={set('description')} />
      </label>
      <label>
        Upload-datum (uploadDate)
        <input type="datetime-local" value={data.uploadDate} onChange={set('uploadDate')} />
      </label>

      {parentOptions && (
        <label>
          {parentFieldLabel}
          <select value={data.exampleOfWorkUrl} onChange={set('exampleOfWorkUrl')}>
            <option value="">— geen —</option>
            {parentOptions.map((asset) => (
              <option key={asset.url} value={asset.url}>
                {parentLabelFor(asset)}
              </option>
            ))}
          </select>
        </label>
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
