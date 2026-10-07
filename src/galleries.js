import {
  getSolidDataset,
  getThing,
  setThing,
  getUrlAll,
  getContainedResourceUrlAll,
  createSolidDataset,
  deleteFile,
  createThing,
  buildThing,
  getStringNoLocale,
} from '@inrupt/solid-client'
import { RDF, SCHEMA } from './vocab'
import { overwriteSolidDataset } from './saveDataset'

function thingToGallery(thing, url) {
  return {
    url,
    name: getStringNoLocale(thing, SCHEMA.name) || '',
    description: getStringNoLocale(thing, SCHEMA.description) || '',
    imageUrls: getUrlAll(thing, SCHEMA.hasPart),
  }
}

function buildGalleryThing(url, data) {
  let thing = buildThing(createThing({ url })).setUrl(RDF.type, SCHEMA.ImageGallery)
  if ((data.name || '').trim()) thing = thing.setStringNoLocale(SCHEMA.name, data.name.trim())
  if ((data.description || '').trim())
    thing = thing.setStringNoLocale(SCHEMA.description, data.description.trim())
  for (const imageUrl of data.imageUrls || []) {
    thing = thing.addUrl(SCHEMA.hasPart, imageUrl)
  }
  return thing.build()
}

export async function listGalleries(containerUrl, fetchFn) {
  const containerDataset = await getSolidDataset(containerUrl, { fetch: fetchFn })
  const urls = getContainedResourceUrlAll(containerDataset)

  return Promise.all(
    urls.map(async (url) => {
      try {
        const dataset = await getSolidDataset(url, { fetch: fetchFn })
        const thing = getThing(dataset, url)
        if (!thing) return { url, name: '(leeg)', error: null }
        return thingToGallery(thing, url)
      } catch (e) {
        return { url, name: '(fout)', error: e.message || String(e) }
      }
    }),
  )
}

export async function getGallery(url, fetchFn) {
  const dataset = await getSolidDataset(url, { fetch: fetchFn })
  const thing = getThing(dataset, url)
  if (!thing) throw new Error('Gallery-resource niet gevonden.')
  return thingToGallery(thing, url)
}

export async function createGallery(containerUrl, data, fetchFn) {
  const slug = crypto.randomUUID()
  const url = `${containerUrl}${slug}.ttl`
  const dataset = setThing(createSolidDataset(), buildGalleryThing(url, data))
  await overwriteSolidDataset(url, dataset, fetchFn)
  return url
}

export async function updateGallery(url, data, fetchFn) {
  const dataset = setThing(createSolidDataset(), buildGalleryThing(url, data))
  await overwriteSolidDataset(url, dataset, fetchFn)
}

export async function deleteGallery(url, fetchFn) {
  await deleteFile(url, { fetch: fetchFn })
}
