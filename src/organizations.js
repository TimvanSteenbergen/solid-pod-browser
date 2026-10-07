import {
  getSolidDataset,
  getThing,
  setThing,
  getUrl,
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

function thingToOrganization(thing, url) {
  return {
    url,
    name: getStringNoLocale(thing, SCHEMA.name) || '',
    description: getStringNoLocale(thing, SCHEMA.description) || '',
    email: getStringNoLocale(thing, SCHEMA.email) || '',
    telephone: getStringNoLocale(thing, SCHEMA.telephone) || '',
    website: getUrl(thing, SCHEMA.url) || '',
    identifier: getUrl(thing, SCHEMA.identifier) || '',
    locationUrl: getUrl(thing, SCHEMA.location) || '',
    logoUrl: getUrl(thing, SCHEMA.logo) || '',
    memberUrls: getUrlAll(thing, SCHEMA.member),
  }
}

// Replaces the whole Organization resource on every save, like the other
// link-heavy types (Event, Gallery): simpler than patching in place and
// avoids leftover triples when a link or member is removed.
function buildOrganizationThing(url, data) {
  let thing = buildThing(createThing({ url })).setUrl(RDF.type, SCHEMA.Organization)

  const textFields = ['name', 'description', 'email', 'telephone']
  for (const field of textFields) {
    const value = (data[field] || '').trim()
    if (value) thing = thing.setStringNoLocale(SCHEMA[field], value)
  }

  if ((data.website || '').trim()) thing = thing.setUrl(SCHEMA.url, data.website.trim())
  if ((data.identifier || '').trim()) thing = thing.setUrl(SCHEMA.identifier, data.identifier.trim())
  if (data.locationUrl) thing = thing.setUrl(SCHEMA.location, data.locationUrl)
  if (data.logoUrl) thing = thing.setUrl(SCHEMA.logo, data.logoUrl)
  for (const memberUrl of data.memberUrls || []) {
    thing = thing.addUrl(SCHEMA.member, memberUrl)
  }

  return thing.build()
}

export async function listOrganizations(containerUrl, fetchFn) {
  const containerDataset = await getSolidDataset(containerUrl, { fetch: fetchFn })
  const urls = getContainedResourceUrlAll(containerDataset)

  return Promise.all(
    urls.map(async (url) => {
      try {
        const dataset = await getSolidDataset(url, { fetch: fetchFn })
        const thing = getThing(dataset, url)
        if (!thing) return { url, name: '(leeg)', error: null }
        return thingToOrganization(thing, url)
      } catch (e) {
        return { url, name: '(fout)', error: e.message || String(e) }
      }
    }),
  )
}

export async function getOrganization(url, fetchFn) {
  const dataset = await getSolidDataset(url, { fetch: fetchFn })
  const thing = getThing(dataset, url)
  if (!thing) throw new Error('Organization-resource niet gevonden.')
  return thingToOrganization(thing, url)
}

export async function createOrganization(containerUrl, data, fetchFn) {
  const slug = crypto.randomUUID()
  const url = `${containerUrl}${slug}.ttl`
  const dataset = setThing(createSolidDataset(), buildOrganizationThing(url, data))
  await overwriteSolidDataset(url, dataset, fetchFn)
  return url
}

export async function updateOrganization(url, data, fetchFn) {
  const dataset = setThing(createSolidDataset(), buildOrganizationThing(url, data))
  await overwriteSolidDataset(url, dataset, fetchFn)
}

export async function deleteOrganization(url, fetchFn) {
  await deleteFile(url, { fetch: fetchFn })
}
