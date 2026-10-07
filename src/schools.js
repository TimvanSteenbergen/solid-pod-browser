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

// schema:School has no properties of its own - it inherits everything
// from Organization (via EducationalOrganization). So a School carries
// every Organization field, plus `alumni` (Persons who attended) and
// `educationalLevel` (onderwijsniveau). Asserting both rdf:type
// schema:School and schema:Organization keeps it discoverable by
// anything that only understands the more generic Organization.

function thingToSchool(thing, url) {
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
    educationalLevel: getStringNoLocale(thing, SCHEMA.educationalLevel) || '',
    alumniUrls: getUrlAll(thing, SCHEMA.alumni),
  }
}

// Replaces the whole School resource on every save, same as Organization.
function buildSchoolThing(url, data) {
  let thing = buildThing(createThing({ url }))
    .setUrl(RDF.type, SCHEMA.School)
    .addUrl(RDF.type, SCHEMA.Organization)

  const textFields = ['name', 'description', 'email', 'telephone', 'educationalLevel']
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
  for (const alumnusUrl of data.alumniUrls || []) {
    thing = thing.addUrl(SCHEMA.alumni, alumnusUrl)
  }

  return thing.build()
}

export async function listSchools(containerUrl, fetchFn) {
  const containerDataset = await getSolidDataset(containerUrl, { fetch: fetchFn })
  const urls = getContainedResourceUrlAll(containerDataset)

  return Promise.all(
    urls.map(async (url) => {
      try {
        const dataset = await getSolidDataset(url, { fetch: fetchFn })
        const thing = getThing(dataset, url)
        if (!thing) return { url, name: '(leeg)', error: null }
        return thingToSchool(thing, url)
      } catch (e) {
        return { url, name: '(fout)', error: e.message || String(e) }
      }
    }),
  )
}

export async function getSchool(url, fetchFn) {
  const dataset = await getSolidDataset(url, { fetch: fetchFn })
  const thing = getThing(dataset, url)
  if (!thing) throw new Error('School-resource niet gevonden.')
  return thingToSchool(thing, url)
}

export async function createSchool(containerUrl, data, fetchFn) {
  const slug = crypto.randomUUID()
  const url = `${containerUrl}${slug}.ttl`
  const dataset = setThing(createSolidDataset(), buildSchoolThing(url, data))
  await overwriteSolidDataset(url, dataset, fetchFn)
  return url
}

export async function updateSchool(url, data, fetchFn) {
  const dataset = setThing(createSolidDataset(), buildSchoolThing(url, data))
  await overwriteSolidDataset(url, dataset, fetchFn)
}

export async function deleteSchool(url, fetchFn) {
  await deleteFile(url, { fetch: fetchFn })
}
