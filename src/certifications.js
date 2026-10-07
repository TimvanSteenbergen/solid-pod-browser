import {
  getSolidDataset,
  getThing,
  setThing,
  getUrl,
  getContainedResourceUrlAll,
  createSolidDataset,
  deleteFile,
  createThing,
  buildThing,
  getStringNoLocale,
  getDate,
} from '@inrupt/solid-client'
import { RDF, SCHEMA } from './vocab'
import { toDateInputValue, fromDateInputValue } from './dateUtils'
import { overwriteSolidDataset } from './saveDataset'

function thingToCertification(thing, url) {
  return {
    url,
    name: getStringNoLocale(thing, SCHEMA.name) || '',
    description: getStringNoLocale(thing, SCHEMA.description) || '',
    certificationIdentification: getStringNoLocale(thing, SCHEMA.certificationIdentification) || '',
    certificationStatus: getUrl(thing, SCHEMA.certificationStatus) || '',
    datePublished: toDateInputValue(getDate(thing, SCHEMA.datePublished)),
    validFrom: toDateInputValue(getDate(thing, SCHEMA.validFrom)),
    expires: toDateInputValue(getDate(thing, SCHEMA.expires)),
    auditDate: toDateInputValue(getDate(thing, SCHEMA.auditDate)),
    logoUrl: getUrl(thing, SCHEMA.logo) || '',
    issuedByUrl: getUrl(thing, SCHEMA.issuedBy) || '',
    aboutUrl: getUrl(thing, SCHEMA.about) || '',
  }
}

// Replaces the whole Certification resource on every save, like the other
// link-heavy types.
function buildCertificationThing(url, data) {
  let thing = buildThing(createThing({ url })).setUrl(RDF.type, SCHEMA.Certification)

  const textFields = ['name', 'description', 'certificationIdentification']
  for (const field of textFields) {
    const value = (data[field] || '').trim()
    if (value) thing = thing.setStringNoLocale(SCHEMA[field], value)
  }

  if (data.certificationStatus) thing = thing.setUrl(SCHEMA.certificationStatus, data.certificationStatus)

  const dateFields = ['datePublished', 'validFrom', 'expires', 'auditDate']
  for (const field of dateFields) {
    if (data[field]) thing = thing.setDate(SCHEMA[field], fromDateInputValue(data[field]))
  }

  if (data.logoUrl) thing = thing.setUrl(SCHEMA.logo, data.logoUrl)
  if (data.issuedByUrl) thing = thing.setUrl(SCHEMA.issuedBy, data.issuedByUrl)
  if (data.aboutUrl) thing = thing.setUrl(SCHEMA.about, data.aboutUrl)

  return thing.build()
}

export async function listCertifications(containerUrl, fetchFn) {
  const containerDataset = await getSolidDataset(containerUrl, { fetch: fetchFn })
  const urls = getContainedResourceUrlAll(containerDataset)

  return Promise.all(
    urls.map(async (url) => {
      try {
        const dataset = await getSolidDataset(url, { fetch: fetchFn })
        const thing = getThing(dataset, url)
        if (!thing) return { url, name: '(leeg)', error: null }
        return thingToCertification(thing, url)
      } catch (e) {
        return { url, name: '(fout)', error: e.message || String(e) }
      }
    }),
  )
}

export async function getCertification(url, fetchFn) {
  const dataset = await getSolidDataset(url, { fetch: fetchFn })
  const thing = getThing(dataset, url)
  if (!thing) throw new Error('Certification-resource niet gevonden.')
  return thingToCertification(thing, url)
}

export async function createCertification(containerUrl, data, fetchFn) {
  const slug = crypto.randomUUID()
  const url = `${containerUrl}${slug}.ttl`
  const dataset = setThing(createSolidDataset(), buildCertificationThing(url, data))
  await overwriteSolidDataset(url, dataset, fetchFn)
  return url
}

export async function updateCertification(url, data, fetchFn) {
  const dataset = setThing(createSolidDataset(), buildCertificationThing(url, data))
  await overwriteSolidDataset(url, dataset, fetchFn)
}

export async function deleteCertification(url, fetchFn) {
  await deleteFile(url, { fetch: fetchFn })
}
