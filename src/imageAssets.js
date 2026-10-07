import {
  getSolidDataset,
  getThing,
  setThing,
  getUrl,
  getContainedResourceUrlAll,
  createSolidDataset,
  deleteFile,
  overwriteFile,
  createThing,
  buildThing,
  getStringNoLocale,
  getInteger,
  getDatetime,
} from '@inrupt/solid-client'
import { RDF, SCHEMA } from './vocab'
import { toDatetimeInputValue, fromDatetimeInputValue } from './dateUtils'
import { overwriteSolidDataset } from './saveDataset'

// Shared CRUD for schema:ImageObject and schema:ImageObjectSnapshot: both
// have identical fields (the only difference is the RDF class, and a
// Snapshot additionally points back to its source ImageObject via
// schema:exampleOfWork). Each asset is a metadata resource (`<slug>.ttl`)
// plus the actual uploaded image file (`<slug>.<ext>`) next to it in the
// same container, linked via schema:contentUrl.

function thingToImageAsset(thing, url) {
  return {
    url,
    caption: getStringNoLocale(thing, SCHEMA.caption) || '',
    description: getStringNoLocale(thing, SCHEMA.description) || '',
    contentUrl: getUrl(thing, SCHEMA.contentUrl) || '',
    width: getInteger(thing, SCHEMA.width) ?? '',
    height: getInteger(thing, SCHEMA.height) ?? '',
    encodingFormat: getStringNoLocale(thing, SCHEMA.encodingFormat) || '',
    uploadDate: toDatetimeInputValue(getDatetime(thing, SCHEMA.uploadDate)),
    exampleOfWorkUrl: getUrl(thing, SCHEMA.exampleOfWork) || '',
  }
}

// A file dropped onto the input straight from the OS file manager can
// arrive with an empty file.type - Chromium doesn't always resolve the
// MIME type from a drag payload the way it does for the file picker
// dialog. solid-client then PUTs with an empty Content-Type header
// (`typeof '' === 'string'`, so it's taken as a deliberate override, not
// "unset"), which the server hangs on indefinitely instead of rejecting
// cleanly. So never trust file.type alone - fall back to the extension.
const EXTENSION_MIME_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
  tif: 'image/tiff',
  tiff: 'image/tiff',
}

function nameExtension(file) {
  return file.name && file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : ''
}

function contentTypeFor(file) {
  if (file.type) return file.type
  return EXTENSION_MIME_TYPES[nameExtension(file)] || 'application/octet-stream'
}

function extensionFor(file) {
  const fromName = nameExtension(file)
  if (fromName && fromName.length <= 5) return fromName
  const fromType = contentTypeFor(file).split('/').pop()
  return fromType || 'bin'
}

function readImageDimensions(file) {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const done = (result) => {
      clearTimeout(timer)
      URL.revokeObjectURL(objectUrl)
      resolve(result)
    }
    // Belt-and-suspenders: neither onload nor onerror should normally be
    // skipped, but this is purely a nice-to-have (width/height), so never
    // let it be the reason the whole save hangs if it somehow is.
    const timer = setTimeout(() => done({ width: null, height: null }), 10_000)
    const img = new Image()
    img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => done({ width: null, height: null })
    img.src = objectUrl
  })
}

async function buildImageAssetThing(metaUrl, forClass, data, existingContentUrl, fetchFn) {
  let contentUrl = existingContentUrl || data.contentUrl || ''
  let width = data.width || ''
  let height = data.height || ''
  let encodingFormat = data.encodingFormat || ''

  if (data.file) {
    const slug = metaUrl.slice(metaUrl.lastIndexOf('/') + 1).replace(/\.ttl$/, '')
    const containerUrl = metaUrl.slice(0, metaUrl.lastIndexOf('/') + 1)
    const newContentUrl = `${containerUrl}${slug}.${extensionFor(data.file)}`

    if (existingContentUrl && existingContentUrl !== newContentUrl) {
      try {
        await deleteFile(existingContentUrl, { fetch: fetchFn })
      } catch {
        // old file may already be gone - fine
      }
    }
    const resolvedContentType = contentTypeFor(data.file)
    await overwriteFile(newContentUrl, data.file, { contentType: resolvedContentType, fetch: fetchFn })
    contentUrl = newContentUrl
    encodingFormat = resolvedContentType

    const dims = await readImageDimensions(data.file)
    if (dims.width) width = dims.width
    if (dims.height) height = dims.height
  }

  let thing = buildThing(createThing({ url: metaUrl })).setUrl(RDF.type, forClass)
  if (contentUrl) thing = thing.setUrl(SCHEMA.contentUrl, contentUrl)
  if ((data.caption || '').trim()) thing = thing.setStringNoLocale(SCHEMA.caption, data.caption.trim())
  if ((data.description || '').trim())
    thing = thing.setStringNoLocale(SCHEMA.description, data.description.trim())
  if (width) thing = thing.setInteger(SCHEMA.width, Number(width))
  if (height) thing = thing.setInteger(SCHEMA.height, Number(height))
  if ((encodingFormat || '').trim())
    thing = thing.setStringNoLocale(SCHEMA.encodingFormat, encodingFormat.trim())
  thing = thing.setDatetime(
    SCHEMA.uploadDate,
    data.uploadDate ? fromDatetimeInputValue(data.uploadDate) : new Date(),
  )
  if (data.exampleOfWorkUrl) thing = thing.setUrl(SCHEMA.exampleOfWork, data.exampleOfWorkUrl)

  return thing.build()
}

export async function listImageAssets(containerUrl, fetchFn) {
  const containerDataset = await getSolidDataset(containerUrl, { fetch: fetchFn })
  const urls = getContainedResourceUrlAll(containerDataset).filter((u) => u.endsWith('.ttl'))

  return Promise.all(
    urls.map(async (url) => {
      try {
        const dataset = await getSolidDataset(url, { fetch: fetchFn })
        const thing = getThing(dataset, url)
        if (!thing) return { url, caption: '(leeg)', error: null }
        return thingToImageAsset(thing, url)
      } catch (e) {
        return { url, caption: '(fout)', error: e.message || String(e) }
      }
    }),
  )
}

export async function getImageAsset(url, fetchFn) {
  const dataset = await getSolidDataset(url, { fetch: fetchFn })
  const thing = getThing(dataset, url)
  if (!thing) throw new Error('Resource niet gevonden.')
  return thingToImageAsset(thing, url)
}

export async function createImageAsset(containerUrl, forClass, data, fetchFn) {
  const slug = crypto.randomUUID()
  const metaUrl = `${containerUrl}${slug}.ttl`
  const thing = await buildImageAssetThing(metaUrl, forClass, data, null, fetchFn)
  const dataset = setThing(createSolidDataset(), thing)
  await overwriteSolidDataset(metaUrl, dataset, fetchFn)
  return metaUrl
}

export async function updateImageAsset(url, forClass, data, existingContentUrl, fetchFn) {
  const thing = await buildImageAssetThing(url, forClass, data, existingContentUrl, fetchFn)
  const dataset = setThing(createSolidDataset(), thing)
  await overwriteSolidDataset(url, dataset, fetchFn)
}

export async function deleteImageAsset(url, contentUrl, fetchFn) {
  if (contentUrl) {
    try {
      await deleteFile(contentUrl, { fetch: fetchFn })
    } catch {
      // metadata is the source of truth - fine if the binary is already gone
    }
  }
  await deleteFile(url, { fetch: fetchFn })
}
