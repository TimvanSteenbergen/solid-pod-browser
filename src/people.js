import {
  getSolidDataset,
  getThing,
  setThing,
  getUrl,
  getContainedResourceUrlAll,
  createSolidDataset,
  saveSolidDatasetAt,
  deleteFile,
  createThing,
  buildThing,
  getStringNoLocale,
  getDate,
} from '@inrupt/solid-client'
import { RDF, SCHEMA } from './vocab'
import { toDateInputValue, fromDateInputValue } from './dateUtils'

function thingToPerson(thing, url) {
  return {
    url,
    name: getStringNoLocale(thing, SCHEMA.name) || '',
    givenName: getStringNoLocale(thing, SCHEMA.givenName) || '',
    familyName: getStringNoLocale(thing, SCHEMA.familyName) || '',
    email: getStringNoLocale(thing, SCHEMA.email) || '',
    telephone: getStringNoLocale(thing, SCHEMA.telephone) || '',
    birthDate: toDateInputValue(getDate(thing, SCHEMA.birthDate)),
    imageUrl: getUrl(thing, SCHEMA.image) || '',
  }
}

function applyPersonFields(thingBuilder, data) {
  let builder = thingBuilder.setUrl(RDF.type, SCHEMA.Person)
  const textFields = ['name', 'givenName', 'familyName', 'email', 'telephone']
  for (const field of textFields) {
    const value = (data[field] || '').trim()
    builder = value
      ? builder.setStringNoLocale(SCHEMA[field], value)
      : builder.removeAll(SCHEMA[field])
  }
  builder = data.birthDate
    ? builder.setDate(SCHEMA.birthDate, fromDateInputValue(data.birthDate))
    : builder.removeAll(SCHEMA.birthDate)
  builder = data.imageUrl ? builder.setUrl(SCHEMA.image, data.imageUrl) : builder.removeAll(SCHEMA.image)
  return builder
}

export async function listPeople(containerUrl, fetchFn) {
  const containerDataset = await getSolidDataset(containerUrl, { fetch: fetchFn })
  const resourceUrls = getContainedResourceUrlAll(containerDataset)

  return Promise.all(
    resourceUrls.map(async (url) => {
      try {
        const dataset = await getSolidDataset(url, { fetch: fetchFn })
        const thing = getThing(dataset, url)
        if (!thing) return { url, name: '(leeg)', error: null }
        return thingToPerson(thing, url)
      } catch (e) {
        return { url, name: '(fout)', error: e.message || String(e) }
      }
    }),
  )
}

export async function getPerson(url, fetchFn) {
  const dataset = await getSolidDataset(url, { fetch: fetchFn })
  const thing = getThing(dataset, url)
  if (!thing) throw new Error('Person-resource niet gevonden.')
  return thingToPerson(thing, url)
}

export async function createPerson(containerUrl, data, fetchFn) {
  const slug = crypto.randomUUID()
  const resourceUrl = `${containerUrl}${slug}.ttl`

  const thing = applyPersonFields(
    buildThing(createThing({ url: resourceUrl })),
    data,
  ).build()

  const dataset = createSolidDataset()
  await saveSolidDatasetAt(resourceUrl, setThing(dataset, thing), { fetch: fetchFn })
  return resourceUrl
}

export async function updatePerson(url, data, fetchFn) {
  const dataset = await getSolidDataset(url, { fetch: fetchFn })
  const existing = getThing(dataset, url) || createThing({ url })

  const thing = applyPersonFields(buildThing(existing), data).build()
  await saveSolidDatasetAt(url, setThing(dataset, thing), { fetch: fetchFn })
}

export async function deletePerson(url, fetchFn) {
  await deleteFile(url, { fetch: fetchFn })
}
