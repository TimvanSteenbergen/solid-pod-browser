import { useEffect, useState } from 'react'
import { authFetch } from './solid'

// A plain <img src="..."> never carries the app's Solid-OIDC bearer token,
// so it 401s against any non-public pod resource (Chrome then blocks the
// opaque error response via ORB instead of showing a broken image). This
// fetches the bytes with authFetch and renders them as a blob: URL.
// blob:/data: URLs (e.g. a freshly picked local file) are already
// loadable directly and bypass the fetch.
function isLocalUrl(url) {
  return url.startsWith('blob:') || url.startsWith('data:')
}

export default function AuthImage({ url, ...imgProps }) {
  const [src, setSrc] = useState(url && isLocalUrl(url) ? url : '')

  useEffect(() => {
    if (!url || isLocalUrl(url)) {
      setSrc(url || '')
      return undefined
    }

    let objectUrl = ''
    let cancelled = false

    authFetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        return res.blob()
      })
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setSrc('')
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url])

  if (!src) return null
  return <img src={src} {...imgProps} />
}
