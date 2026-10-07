import { useEffect, useState, useCallback } from 'react'
import { authFetch } from './solid'
import { ensureImageObjectRegistration } from './typeIndex'
import { listImageAssets, createImageAsset, getImageAsset } from './imageAssets'
import { getProfileImageUrl, setProfileImage } from './profile'
import { SCHEMA } from './vocab'
import AuthImage from './AuthImage'
import { freezeFile } from './freezeFile'

export default function ProfilePhoto({ webId, podRootUrl }) {
  const [containerUrl, setContainerUrl] = useState(null)
  const [images, setImages] = useState([])
  const [currentImageUrl, setCurrentImageUrl] = useState('')
  const [currentContentUrl, setCurrentContentUrl] = useState('')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState('')

  useEffect(() => {
    if (!file) {
      setFilePreviewUrl('')
      return
    }
    const objectUrl = URL.createObjectURL(file)
    setFilePreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  const refresh = useCallback(async () => {
    try {
      const { containerUrl: url } = await ensureImageObjectRegistration(webId, podRootUrl, authFetch)
      setContainerUrl(url)
      const [imageList, profileImageUrl] = await Promise.all([
        listImageAssets(url, authFetch),
        getProfileImageUrl(webId, authFetch),
      ])
      setImages(imageList)
      setCurrentImageUrl(profileImageUrl || '')
      setSelected(profileImageUrl || '')
      if (profileImageUrl) {
        const asset = imageList.find((img) => img.url === profileImageUrl)
        if (asset) {
          setCurrentContentUrl(asset.contentUrl)
        } else {
          try {
            const asset2 = await getImageAsset(profileImageUrl, authFetch)
            setCurrentContentUrl(asset2.contentUrl)
          } catch {
            setCurrentContentUrl('')
          }
        }
      } else {
        setCurrentContentUrl('')
      }
    } catch (e) {
      setError(e.message || String(e))
    }
  }, [webId, podRootUrl])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleSave() {
    setBusy(true)
    setError(null)
    try {
      let imageUrl = selected
      if (file) {
        imageUrl = await createImageAsset(
          containerUrl,
          SCHEMA.ImageObject,
          { caption: 'Profielfoto', file },
          authFetch,
        )
      }
      await setProfileImage(webId, imageUrl || null, authFetch)
      setFile(null)
      setOpen(false)
      await refresh()
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    setBusy(true)
    setError(null)
    try {
      await setProfileImage(webId, null, authFetch)
      setFile(null)
      setSelected('')
      setOpen(false)
      await refresh()
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  const selectedAsset = images.find((image) => image.url === selected)
  const previewUrl = filePreviewUrl || selectedAsset?.contentUrl || currentContentUrl

  return (
    <div className="profile-photo">
      <button
        type="button"
        className="profile-photo-button"
        onClick={() => setOpen((o) => !o)}
        title="Profielfoto wijzigen"
      >
        {currentContentUrl ? (
          <AuthImage url={currentContentUrl} alt="Profielfoto" />
        ) : (
          <span className="profile-photo-placeholder">?</span>
        )}
      </button>

      {open && (
        <div className="profile-photo-panel">
          {previewUrl && (
            <AuthImage className="profile-photo-preview" url={previewUrl} alt="Profielfoto voorbeeld" />
          )}

          <label>
            Kies een bestaande Afbeelding
            <select
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value)
                setFile(null)
              }}
            >
              <option value="">— geen —</option>
              {images.map((image) => (
                <option key={image.url} value={image.url}>
                  {image.caption || image.url}
                </option>
              ))}
            </select>
          </label>
          <label>
            Of upload een nieuwe foto
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                setFile(await freezeFile(e.target.files[0] || null))
                setSelected('')
              }}
            />
          </label>

          {error && <p className="error">Fout: {error}</p>}

          <div className="form-actions">
            <button type="button" onClick={handleSave} disabled={busy}>
              Opslaan
            </button>
            {currentImageUrl && (
              <button type="button" onClick={handleRemove} disabled={busy}>
                Verwijderen
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} disabled={busy}>
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
